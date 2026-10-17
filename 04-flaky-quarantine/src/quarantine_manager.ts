import { MarkovAnalyzer } from './markov_analyzer.ts';
import type { MarkovAnalysisResult, TestOutcome } from './markov_analyzer.ts';
import { AntiPatternScanner } from './anti_pattern_scanner.ts';
import type { FileScanReport } from './anti_pattern_scanner.ts';
import type { JUnitTestSuiteReport } from './junit_parser.ts';

export interface QuarantinedTestEntry {
  testId: string;
  name: string;
  classname: string;
  markovResult: MarkovAnalysisResult;
  staticViolationsCount: number;
  quarantinedAt: string;
  reason: string;
}

export interface QuarantineManifest {
  version: string;
  generatedAt: string;
  totalQuarantined: number;
  quarantinedTests: QuarantinedTestEntry[];
  configSnippets: {
    playwrightGrepInvert: string;
    jestPathIgnore: string[];
    pytestArgs: string;
  };
}

export class QuarantineManager {
  private testHistories = new Map<string, { name: string; classname: string; outcomes: TestOutcome[] }>();

  /**
   * Ingests a parsed JUnit suite report into the history database.
   */
  public ingestJUnitSuite(suite: JUnitTestSuiteReport): void {
    for (const tc of suite.testcases) {
      const testId = `${tc.classname}#${tc.name}`;
      if (!this.testHistories.has(testId)) {
        this.testHistories.set(testId, {
          name: tc.name,
          classname: tc.classname,
          outcomes: []
        });
      }
      this.testHistories.get(testId)!.outcomes.push(tc.passed ? 'PASS' : 'FAIL');
    }
  }

  /**
   * Generates the Quarantine Manifest by computing Markov flakiness
   * and optionally incorporating static anti-pattern scan reports.
   */
  public generateManifest(
    staticReports: FileScanReport[] = [],
    maxAllowedQuarantines = Infinity
  ): QuarantineManifest {
    const quarantined: QuarantinedTestEntry[] = [];

    // Map total violations by file/class if matching
    const violationsCount = staticReports.reduce((acc, r) => acc + r.violations.length, 0);

    for (const [testId, entry] of this.testHistories.entries()) {
      const markov = MarkovAnalyzer.analyze(entry.outcomes);

      if (markov.isFlaky) {
        if (quarantined.length >= maxAllowedQuarantines) {
          break;
        }

        quarantined.push({
          testId,
          name: entry.name,
          classname: entry.classname,
          markovResult: markov,
          staticViolationsCount: violationsCount,
          quarantinedAt: new Date().toISOString(),
          reason: `Markov instability coefficient ${(markov.flakinessScore * 100).toFixed(0)}% (flips: ${markov.flipCount}/${markov.totalRuns - 1})`
        });
      }
    }

    const testNamesPattern = quarantined.map(q => q.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

    return {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      totalQuarantined: quarantined.length,
      quarantinedTests: quarantined,
      configSnippets: {
        playwrightGrepInvert: quarantined.length > 0 ? `/(?:${testNamesPattern})/` : '',
        jestPathIgnore: quarantined.map(q => q.classname),
        pytestArgs: quarantined.length > 0 ? `-k "not (${quarantined.map(q => q.name).join(' and not ')})"` : ''
      }
    };
  }

  /**
   * Generates a GitHub PR Comment / Job Summary Markdown string.
   */
  public static generatePrSummaryMarkdown(manifest: QuarantineManifest): string {
    if (manifest.totalQuarantined === 0) {
      return `### 🛡️ Flaky Quarantine Report\n\n✅ **Zero flaky tests detected.** All test sequences demonstrated deterministic stability.\n`;
    }

    let md = `### 🛡️ Flaky Quarantine Report\n\n`;
    md += `⚠️ **${manifest.totalQuarantined} flaky tests identified and quarantined.**\n`;
    md += `CI pipeline unblocked — unstable tests isolated from main branch.\n\n`;
    md += `| Test Name | Suite / Class | Flakiness Score | State Flips | Action |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;

    for (const q of manifest.quarantinedTests) {
      const scorePct = `${(q.markovResult.flakinessScore * 100).toFixed(0)}%`;
      md += `| \`${q.name}\` | \`${q.classname}\` | **${scorePct}** | ${q.markovResult.flipCount} flips | 🔒 Quarantined |\n`;
    }

    md += `\n**Playwright Exclude Flag**:\n\`\`\`bash\nnpx playwright test --grep-invert "${manifest.configSnippets.playwrightGrepInvert}"\n\`\`\`\n`;
    md += `\n> 🔓 [**Unlock Unlimited CI Quarantines & Team Analytics ($29/mo via Polar.sh)**](https://polar.sh/checkout?product_id=8d6ecbdc-7be3-41a0-a108-29865b8898e4&ref=github_step_summary)\n`;
    return md;
  }
}
