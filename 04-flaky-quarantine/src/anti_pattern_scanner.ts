export type FlakyAntiPatternType =
  | 'ARBITRARY_SLEEP_TIMEOUT'
  | 'FLOATING_UNWAIT_PROMISE'
  | 'NON_DETERMINISTIC_TIME_SEED'
  | 'SHARED_MUTABLE_GLOBAL_STATE'
  | 'UNBOUNDED_POLLING_RACE';

export interface AntiPatternViolation {
  type: FlakyAntiPatternType;
  line: number;
  snippet: string;
  explanation: string;
  remediation: string;
}

export interface FileScanReport {
  filePath: string;
  violations: AntiPatternViolation[];
  riskScore: number; // 0 (clean) to 100 (extreme risk)
}

export class AntiPatternScanner {
  /**
   * Scans test source code text for known flakiness anti-patterns.
   */
  public static scanSource(sourceCode: string, filePath = 'test.spec.ts'): FileScanReport {
    const lines = sourceCode.split('\n');
    const violations: AntiPatternViolation[] = [];

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comments
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        continue;
      }

      // 1. Anti-Pattern: Arbitrary sleep/timeout
      if (
        /waitForTimeout\s*\(/.test(line) ||
        /setTimeout\s*\(/.test(line) ||
        /time\.sleep\s*\(/.test(line) ||
        /Thread\.sleep\s*\(/.test(line)
      ) {
        violations.push({
          type: 'ARBITRARY_SLEEP_TIMEOUT',
          line: lineNum,
          snippet: trimmed,
          explanation: 'Hardcoded sleep introduces nondeterministic CI races under runner CPU throttling.',
          remediation: 'Replace with event-driven locators (e.g. `page.locator().waitFor({ state: "visible" })`).'
        });
      }

      // 2. Anti-Pattern: Floating unawaited async promise
      if (
        /(?<!await\s+)(?:page\.(?:click|fill|goto|waitForSelector|press|type)\s*\()/.test(line) ||
        /(?<!await\s+)(?:expect\s*\([^)]+\)\.(?:toBeVisible|toHaveText|toHaveCount)\s*\()/.test(line)
      ) {
        violations.push({
          type: 'FLOATING_UNWAIT_PROMISE',
          line: lineNum,
          snippet: trimmed,
          explanation: 'Unawaited async Playwright/Jest call will float and complete after test teardown.',
          remediation: 'Prepend with `await` keyword to enforce deterministic sequence.'
        });
      }

      // 3. Anti-Pattern: Non-deterministic time / date / random seed
      if (
        /(?:Date\.now\(\)|new\s+Date\(\)|Math\.random\(\))/.test(line) &&
        !line.includes('jest.setSystemTime') &&
        !line.includes('vi.setSystemTime')
      ) {
        violations.push({
          type: 'NON_DETERMINISTIC_TIME_SEED',
          line: lineNum,
          snippet: trimmed,
          explanation: 'Dynamic wall clock or unseeded random values cause brittle boundary test failures.',
          remediation: 'Use frozen fake timers (`page.clock.setFixedTime(...)` or `vi.useFakeTimers()`).'
        });
      }

      // 4. Anti-Pattern: Shared mutable global state
      if (
        /process\.env\[[^\]]+\]\s*=/.test(line) ||
        /global\.[a-zA-Z0-9_$]+\s*=/.test(line) ||
        /window\.[a-zA-Z0-9_$]+\s*=/.test(line)
      ) {
        violations.push({
          type: 'SHARED_MUTABLE_GLOBAL_STATE',
          line: lineNum,
          snippet: trimmed,
          explanation: 'Mutating global process/window properties pollutes downstream concurrent tests.',
          remediation: 'Isolate via scoped fixtures or restore initial state in `afterEach` teardown.'
        });
      }

      // 5. Anti-Pattern: Unbounded polling race condition
      if (
        /while\s*\([^)]*\)\s*\{/.test(line) &&
        !line.includes('timeout') &&
        !line.includes('maxAttempts')
      ) {
        violations.push({
          type: 'UNBOUNDED_POLLING_RACE',
          line: lineNum,
          snippet: trimmed,
          explanation: 'Unbounded while loop can deadlock CI workers during delayed state transitions.',
          remediation: 'Use bounded retry utilities with maximum timeout.'
        });
      }
    }

    // Compute risk score based on violations (capped at 100)
    let riskScore = 0;
    for (const v of violations) {
      if (v.type === 'ARBITRARY_SLEEP_TIMEOUT') riskScore += 35;
      else if (v.type === 'FLOATING_UNWAIT_PROMISE') riskScore += 40;
      else if (v.type === 'NON_DETERMINISTIC_TIME_SEED') riskScore += 20;
      else if (v.type === 'SHARED_MUTABLE_GLOBAL_STATE') riskScore += 30;
      else if (v.type === 'UNBOUNDED_POLLING_RACE') riskScore += 35;
    }

    return {
      filePath,
      violations,
      riskScore: Math.min(100, riskScore)
    };
  }
}
