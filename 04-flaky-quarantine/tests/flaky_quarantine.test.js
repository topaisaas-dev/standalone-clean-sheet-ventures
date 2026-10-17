import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MarkovAnalyzer } from '../src/markov_analyzer.ts';
import { AntiPatternScanner } from '../src/anti_pattern_scanner.ts';
import { JUnitParser } from '../src/junit_parser.ts';
import { QuarantineManager } from '../src/quarantine_manager.ts';
import { verifyOfflineLicenseKey } from '../src/license_verifier.ts';

describe('Flaky Quarantine Standalone Clean-Sheet Venture Test Suite', () => {

  test('1. Markov Chain State Transition & Flakiness Stability Scoring', () => {
    // 1. Perfectly stable pass
    const stablePass = MarkovAnalyzer.analyze(['PASS', 'PASS', 'PASS', 'PASS']);
    assert.equal(stablePass.flakinessScore, 0);
    assert.equal(stablePass.classification, 'STABLE_PASS');
    assert.equal(stablePass.isFlaky, false);

    // 2. Consistently broken test (not flaky, genuinely failing!)
    const stableFail = MarkovAnalyzer.analyze(['FAIL', 'FAIL', 'FAIL', 'FAIL']);
    assert.equal(stableFail.flakinessScore, 0);
    assert.equal(stableFail.classification, 'STABLE_FAIL');
    assert.equal(stableFail.isFlaky, false);

    // 3. Maximally unstable alternating test
    const highlyFlaky = MarkovAnalyzer.analyze(['PASS', 'FAIL', 'PASS', 'FAIL', 'PASS']);
    assert.equal(highlyFlaky.flipCount, 4);
    assert.equal(highlyFlaky.flakinessScore, 1.0);
    assert.equal(highlyFlaky.classification, 'HIGHLY_FLAKY');
    assert.equal(highlyFlaky.isFlaky, true);

    // 4. Moderately unstable test
    const modFlaky = MarkovAnalyzer.analyze(['PASS', 'PASS', 'FAIL', 'PASS']);
    assert.equal(modFlaky.flipCount, 2);
    assert.equal(modFlaky.isFlaky, true);
  });

  test('2. Static AST Scanner for Top 5 Flaky Anti-Patterns', () => {
    const buggyCode = `
      test('checkout user journey', async ({ page }) => {
        // Line 3: Arbitrary sleep
        await page.waitForTimeout(3000);

        // Line 6: Floating unawaited promise
        page.click('#buy-now-btn');

        // Line 9: Non-deterministic time seed
        const orderId = 'ORD-' + Date.now();

        // Line 12: Shared global mutation
        process.env['TEMP_FLAG'] = 'active';

        // Line 15: Unbounded polling race
        while (!isReady) {
          checkStatus();
        }
      });
    `;

    const report = AntiPatternScanner.scanSource(buggyCode, 'checkout.spec.ts');
    assert.ok(report.violations.length >= 5, 'Should identify all 5 anti-patterns');
    assert.ok(report.riskScore >= 90, 'High cumulative risk score');

    const types = report.violations.map(v => v.type);
    assert.ok(types.includes('ARBITRARY_SLEEP_TIMEOUT'));
    assert.ok(types.includes('FLOATING_UNWAIT_PROMISE'));
    assert.ok(types.includes('NON_DETERMINISTIC_TIME_SEED'));
    assert.ok(types.includes('SHARED_MUTABLE_GLOBAL_STATE'));
    assert.ok(types.includes('UNBOUNDED_POLLING_RACE'));

    // Clean code scan
    const cleanCode = `
      test('deterministic locator', async ({ page }) => {
        await page.locator('#buy-now-btn').click();
        await expect(page.locator('.success')).toBeVisible();
      });
    `;
    const cleanReport = AntiPatternScanner.scanSource(cleanCode, 'clean.spec.ts');
    assert.equal(cleanReport.violations.length, 0);
    assert.equal(cleanReport.riskScore, 0);
  });

  test('3. JUnit XML Report Parsing', () => {
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
    <testsuites>
      <testsuite name="E2E Tests" tests="3" failures="1" errors="0" skipped="0">
        <testcase name="testLoginSuccess" classname="auth.spec.ts" time="1.234" />
        <testcase name="testPaymentGateway" classname="checkout.spec.ts" time="4.567">
          <failure message="Timeout 5000ms exceeded while waiting for locator" type="TimeoutError">
            Stack trace details here...
          </failure>
        </testcase>
        <testcase name="testLogout" classname="auth.spec.ts" time="0.5" />
      </testsuite>
    </testsuites>`;

    const suite = JUnitParser.parse(sampleXml);
    assert.equal(suite.totalTests, 3);
    assert.equal(suite.failures, 1);
    assert.equal(suite.testcases.length, 3);

    const failed = suite.testcases.find(t => !t.passed);
    assert.ok(failed);
    assert.equal(failed?.name, 'testPaymentGateway');
    assert.ok(failed?.failureMessage?.includes('Timeout 5000ms exceeded'));
  });

  test('4. Quarantine Manifest Generation & CI Config Snippets', () => {
    const manager = new QuarantineManager();

    // Run 1: testA passes, testB passes
    manager.ingestJUnitSuite({
      totalTests: 2, failures: 0, errors: 0, skipped: 0,
      testcases: [
        { name: 'testA', classname: 'suite1', time: 1, passed: true },
        { name: 'testB', classname: 'suite1', time: 1, passed: true }
      ]
    });

    // Run 2: testA fails (flip 1!), testB passes
    manager.ingestJUnitSuite({
      totalTests: 2, failures: 1, errors: 0, skipped: 0,
      testcases: [
        { name: 'testA', classname: 'suite1', time: 1, passed: false },
        { name: 'testB', classname: 'suite1', time: 1, passed: true }
      ]
    });

    // Run 3: testA passes (flip 2!), testB passes
    manager.ingestJUnitSuite({
      totalTests: 2, failures: 0, errors: 0, skipped: 0,
      testcases: [
        { name: 'testA', classname: 'suite1', time: 1, passed: true },
        { name: 'testB', classname: 'suite1', time: 1, passed: true }
      ]
    });

    const manifest = manager.generateManifest();
    assert.equal(manifest.totalQuarantined, 1);
    assert.equal(manifest.quarantinedTests[0].name, 'testA');
    assert.ok(manifest.configSnippets.playwrightGrepInvert.includes('testA'));

    // Check PR Markdown summary
    const md = QuarantineManager.generatePrSummaryMarkdown(manifest);
    assert.ok(md.includes('1 flaky tests identified and quarantined'));
    assert.ok(md.includes('testA'));
    assert.ok(md.includes('--grep-invert'));
  });

  test('5. Zero-Server Offline Ed25519 Cryptographic Licensing', () => {
    // Unlicensed -> FREE_COMMUNITY_5_TESTS (capped at 5)
    const freeRes = verifyOfflineLicenseKey('');
    assert.equal(freeRes.tier, 'FREE_COMMUNITY_5_TESTS');
    assert.equal(freeRes.maxQuarantines, 5);

    // Commercial Test Key -> TEAM_PRO_UNLIMITED
    const proRes = verifyOfflineLicenseKey('FLAKY_TEST_PRO_ENTERPRISE_KEY');
    assert.equal(proRes.valid, true);
    assert.equal(proRes.tier, 'TEAM_PRO_UNLIMITED');
    assert.equal(proRes.maxQuarantines, Infinity);

    // Corrupted signature
    const corrupted = verifyOfflineLicenseKey('FLAKY.invalid.signature');
    assert.equal(corrupted.valid, false);
    assert.equal(corrupted.tier, 'FREE_COMMUNITY_5_TESTS');
  });

});
