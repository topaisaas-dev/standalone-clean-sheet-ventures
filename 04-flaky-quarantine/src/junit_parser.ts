export interface JUnitTestcaseRecord {
  name: string;
  classname: string;
  time: number;
  passed: boolean;
  failureMessage?: string;
}

export interface JUnitTestSuiteReport {
  totalTests: number;
  failures: number;
  errors: number;
  skipped: number;
  testcases: JUnitTestcaseRecord[];
}

export class JUnitParser {
  /**
   * Fast zero-dependency XML parser for standard JUnit test reports.
   */
  public static parse(xmlContent: string): JUnitTestSuiteReport {
    const testcases: JUnitTestcaseRecord[] = [];

    // Match each <testcase ...> ... </testcase> or self-closing <testcase ... />
    const testcaseRegex = /<testcase\b([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/testcase>)/gi;
    let match: RegExpExecArray | null;

    let failures = 0;
    let errors = 0;
    let skipped = 0;

    while ((match = testcaseRegex.exec(xmlContent)) !== null) {
      const attrsStr = match[1] || '';
      const body = match[2] || '';

      const nameMatch = /name="([^"]*)"/.exec(attrsStr);
      const classMatch = /classname="([^"]*)"/.exec(attrsStr);
      const timeMatch = /time="([^"]*)"/.exec(attrsStr);

      const name = nameMatch ? nameMatch[1] : 'unnamed_test';
      const classname = classMatch ? classMatch[1] : 'default';
      const time = timeMatch ? parseFloat(timeMatch[1]) || 0 : 0;

      const hasFailure = /<failure\b/i.test(body);
      const hasError = /<error\b/i.test(body);
      const isSkipped = /<skipped\b/i.test(body);

      if (hasFailure) failures++;
      if (hasError) errors++;
      if (isSkipped) skipped++;

      const failureMessageMatch = /<(?:failure|error)[^>]*message="([^"]*)"/i.exec(body);
      const failureMessage = failureMessageMatch ? failureMessageMatch[1] : undefined;

      testcases.push({
        name,
        classname,
        time,
        passed: !hasFailure && !hasError && !isSkipped,
        failureMessage
      });
    }

    return {
      totalTests: testcases.length,
      failures,
      errors,
      skipped,
      testcases
    };
  }
}
