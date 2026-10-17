export interface BloatViolation {
  ruleId: string;
  line: number;
  directive: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  title: string;
  wastedMbEstimate: number;
  explanation: string;
  remediation: string;
}

export interface DockerAuditReport {
  filePath: string;
  leanScore: number; // 0 to 100
  wastedMegabytesEstimate: number;
  isMultiStage: boolean;
  totalStages: number;
  isRootUser: boolean;
  violations: BloatViolation[];
  suggestedFixes: string[];
}

export class DockerfileLinter {
  /**
   * Statically audits a Dockerfile content without requiring a Docker daemon.
   */
  public static audit(dockerfileContent: string, filePath = 'Dockerfile'): DockerAuditReport {
    const lines = dockerfileContent.split('\n');
    const violations: BloatViolation[] = [];
    const stages: string[] = [];

    let hasNonRootUser = false;
    let hasCopiedWholeContextEarly = false;
    let hasInstalledDepsLater = false;
    let consecutiveRunCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const lineNum = i + 1;

      if (!trimmed || trimmed.startsWith('#')) {
        consecutiveRunCount = 0;
        continue;
      }

      // 1. Stage tracking (FROM)
      const fromMatch = trimmed.match(/^FROM\s+([^\s]+)(?:\s+[aA][sS]\s+([^\s]+))?/);
      if (fromMatch) {
        stages.push(fromMatch[2] || fromMatch[1]);
        consecutiveRunCount = 0;

        // Check latest tag
        if (fromMatch[1].endsWith(':latest') || !fromMatch[1].includes(':')) {
          violations.push({
            ruleId: 'LATEST_TAG_PINNING',
            line: lineNum,
            directive: 'FROM',
            severity: 'MEDIUM',
            title: 'Unpinned or :latest Base Image',
            wastedMbEstimate: 0,
            explanation: `Base image '${fromMatch[1]}' uses ':latest' or is unpinned, causing non-deterministic builds.`,
            remediation: `Pin to specific digest or immutable tag, e.g. '${fromMatch[1]}-alpine' or sha256 hash.`
          });
        }
      }

      // 2. User check
      if (/^USER\s+(?!root\b)(\w+)/i.test(trimmed)) {
        hasNonRootUser = true;
      }

      // 3. COPY . . before dependency install (Cache Invalidation)
      if (/^COPY\s+\.\s+\./.test(trimmed)) {
        hasCopiedWholeContextEarly = true;
      }
      if (hasCopiedWholeContextEarly && /(npm\s+install|yarn\s+install|pnpm\s+install|go\s+mod\s+download)/i.test(trimmed)) {
        hasInstalledDepsLater = true;
        violations.push({
          ruleId: 'UNOPTIMIZED_COPY_ORDER',
          line: lineNum,
          directive: 'COPY',
          severity: 'HIGH',
          title: 'Layer Cache Invalidation on Every Code Change',
          wastedMbEstimate: 150,
          explanation: `'COPY . .' was executed before installing dependencies, forcing full package reinstall on every commit.`,
          remediation: `Copy only manifest files (package.json, lockfile) first, run install, then copy source code.`
        });
      }

      // 4. Consecutive RUN statements creating extra layers
      if (/^RUN\s+/.test(trimmed)) {
        consecutiveRunCount++;
        if (consecutiveRunCount >= 3) {
          violations.push({
            ruleId: 'MULTIPLE_CONSECUTIVE_RUNS',
            line: lineNum,
            directive: 'RUN',
            severity: 'MEDIUM',
            title: 'Multiple Consecutive RUN Directives',
            wastedMbEstimate: 30,
            explanation: `Separate RUN instructions create distinct immutable layers with redundant metadata.`,
            remediation: `Chain commands using '&& \\' in a single RUN instruction.`
          });
        }
      } else {
        consecutiveRunCount = 0;
      }

      // 5. APT Cache not purged
      if (/apt-get\s+install/.test(trimmed)) {
        if (!trimmed.includes('--no-install-recommends')) {
          violations.push({
            ruleId: 'UNNECESSARY_PACKAGE_RECOMMENDS',
            line: lineNum,
            directive: 'RUN',
            severity: 'MEDIUM',
            title: 'Unnecessary Recommended Packages Installed',
            wastedMbEstimate: 45,
            explanation: `'apt-get install' without '--no-install-recommends' pulls hundreds of MBs of optional dependencies.`,
            remediation: `Add '--no-install-recommends' to apt-get install.`
          });
        }

        if (!trimmed.includes('rm -rf /var/lib/apt/lists/*')) {
          violations.push({
            ruleId: 'APT_UNPURGED_CACHE',
            line: lineNum,
            directive: 'RUN',
            severity: 'CRITICAL',
            title: 'Unpurged APT Cache Layer',
            wastedMbEstimate: 75,
            explanation: `APT package indices in /var/lib/apt/lists are stored permanently in the image layer.`,
            remediation: `Append '&& rm -rf /var/lib/apt/lists/*' at the end of the same RUN instruction.`
          });
        }
      }

      // 6. Pipe curl to bash security risk
      if (/(curl|wget).*?\|\s*(bash|sh)/i.test(trimmed)) {
        violations.push({
          ruleId: 'CURL_BASH_PIPE',
          line: lineNum,
          directive: 'RUN',
          severity: 'CRITICAL',
          title: 'Arbitrary Remote Execution via curl | bash',
          wastedMbEstimate: 0,
          explanation: `Piping remote script directly to shell creates severe supply chain security and audit vulnerabilities.`,
          remediation: `Download script, verify SHA256 checksum, then execute.`
        });
      }

      // 7. ADD used instead of COPY
      if (/^ADD\s+(?!https?:\/\/)/i.test(trimmed) && !trimmed.includes('.tar') && !trimmed.includes('.gz')) {
        violations.push({
          ruleId: 'ADD_INSTEAD_OF_COPY',
          line: lineNum,
          directive: 'ADD',
          severity: 'INFO',
          title: 'ADD Used for Local Files',
          wastedMbEstimate: 0,
          explanation: `'COPY' is preferred over 'ADD' for local files to avoid unexpected auto-extraction.`,
          remediation: `Replace 'ADD' with 'COPY'.`
        });
      }
    }

    // Check root user
    if (!hasNonRootUser) {
      violations.push({
        ruleId: 'ROOT_USER_CONTAINER',
        line: lines.length,
        directive: 'USER',
        severity: 'HIGH',
        title: 'Container Runs as Privileged Root User',
        wastedMbEstimate: 0,
        explanation: `Container defaults to root user without dropping privileges via 'USER appuser'.`,
        remediation: `Create a dedicated unprivileged user (e.g. 'RUN addgroup -S app && adduser -S app -G app') and set 'USER app'.`
      });
    }

    // Check multi-stage
    const isMultiStage = stages.length > 1;
    if (!isMultiStage && (dockerfileContent.includes('npm run build') || dockerfileContent.includes('cargo build') || dockerfileContent.includes('go build'))) {
      violations.push({
        ruleId: 'MISSING_MULTI_STAGE',
        line: 1,
        directive: 'FROM',
        severity: 'CRITICAL',
        title: 'Missing Multi-Stage Build for Compiled App',
        wastedMbEstimate: 400,
        explanation: `Build tooling and compiler SDKs are shipped into the production container image.`,
        remediation: `Use a builder stage ('FROM ... AS builder') and copy only the compiled binary/dist to a minimal runtime image.`
      });
    }

    const wastedMegabytesEstimate = violations.reduce((acc, v) => acc + v.wastedMbEstimate, 0);

    let score = 100;
    score -= violations.filter(v => v.severity === 'CRITICAL').length * 25;
    score -= violations.filter(v => v.severity === 'HIGH').length * 15;
    score -= violations.filter(v => v.severity === 'MEDIUM').length * 8;
    score -= violations.filter(v => v.severity === 'INFO').length * 2;
    score = Math.max(0, Math.min(100, score));

    const suggestedFixes = violations.map(v => `[Line ${v.line}] ${v.title}: ${v.remediation}`);

    return {
      filePath,
      leanScore: score,
      wastedMegabytesEstimate,
      isMultiStage,
      totalStages: stages.length,
      isRootUser: !hasNonRootUser,
      violations,
      suggestedFixes
    };
  }

  /**
   * Generates a GitHub Pull Request markdown comment.
   */
  public static generateMarkdownReport(report: DockerAuditReport): string {
    const statusIcon = report.leanScore >= 80 ? '✅' : '🛑';
    const statusText = report.leanScore >= 80 ? 'OPTIMIZED — Minimal Bloat' : 'BLOATED — High Inefficiency & Security Risks';

    let md = `## DockerLean: ${statusIcon} ${statusText}\n\n`;
    md += `| Metric | Value |\n`;
    md += `| :--- | :--- |\n`;
    md += `| **Lean Score** | **${report.leanScore}/100** |\n`;
    md += `| **Wasted Storage (Est.)** | **~${report.wastedMegabytesEstimate} MB per image** |\n`;
    md += `| **Multi-Stage Build** | ${report.isMultiStage ? '✅ Yes (' + report.totalStages + ' stages)' : '❌ No'} |\n`;
    md += `| **Non-Root User** | ${report.isRootUser ? '❌ Running as Root' : '✅ Non-Root Enforced'} |\n\n`;

    if (report.violations.length > 0) {
      md += `### 🔍 Detected Bloat & Security Flaws\n`;
      md += `| Line | Severity | Flaw | Estimated Waste | Remediation |\n`;
      md += `| :---: | :--- | :--- | :---: | :--- |\n`;
      for (const v of report.violations) {
        md += `| ${v.line} | \`${v.severity}\` | **${v.title}** | ${v.wastedMbEstimate > 0 ? '~' + v.wastedMbEstimate + ' MB' : '-'} | ${v.remediation} |\n`;
      }
      md += `\n`;
    }

    return md;
  }
}
