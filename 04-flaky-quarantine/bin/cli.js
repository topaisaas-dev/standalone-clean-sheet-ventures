#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { JUnitParser } from '../src/junit_parser.ts';
import { AntiPatternScanner } from '../src/anti_pattern_scanner.ts';
import { QuarantineManager } from '../src/quarantine_manager.ts';
import { verifyOfflineLicenseKey } from '../src/license_verifier.ts';
import { InflowPaywall } from '../../shared/inflow-paywall/src/inflow_paywall.ts';

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(`
🛡️ Flaky Quarantine — Mathematical Markov Flaky Test Isolator & Anti-Pattern Scanner
Usage:
  flaky-quarantine analyze --reports <file1.xml,file2.xml,...> [--output manifest.json] [--license <KEY>]
  flaky-quarantine scan --path <tests-dir-or-file>

Commands:
  analyze                 Ingests multiple JUnit XML runs, computes Markov instability, and isolates flaky tests
  scan                    Scans source code for the 5 top flaky anti-patterns (waitForTimeout, unawaited promises, etc.)

Options:
  --reports <paths>       Comma-separated list of JUnit XML test reports
  --path <path>           Test file or directory to scan for anti-patterns
  --output <file>         Path to output quarantine manifest (default: .flaky-quarantine.json)
  --license <KEY>         Ed25519 commercial license key (or FLAKY_QUARANTINE_LICENSE)
  --emergency-pass-24h    24-hour temporary grace period bypass for urgent production CI deploys
  --markdown              Print Pull Request Markdown summary to stdout
`);
  process.exit(0);
}

const command = args[0];

function getArgValue(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const licenseKey = getArgValue('--license') || process.env.FLAKY_QUARANTINE_LICENSE;
const license = verifyOfflineLicenseKey(licenseKey);
const hasEmergencyGrace = args.includes('--emergency-pass-24h') || !!process.env.FLAKY_QUARANTINE_EMERGENCY_GRACE;

if (command === 'scan') {
  const targetPath = getArgValue('--path') || args[1];
  if (!targetPath) {
    console.error('Error: --path <fileOrDir> is required.');
    process.exit(1);
  }

  const filesToScan = [];
  if (fs.statSync(targetPath).isDirectory()) {
    const listFiles = (dir) => {
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) listFiles(full);
        else if (/\.(spec|test)\.[jt]sx?$/.test(item)) filesToScan.push(full);
      }
    };
    listFiles(targetPath);
  } else {
    filesToScan.push(targetPath);
  }

  console.log(`\n🔍 Scanning ${filesToScan.length} test files for flaky anti-patterns...\n`);
  let totalViolations = 0;

  for (const file of filesToScan) {
    const content = fs.readFileSync(file, 'utf8');
    const report = AntiPatternScanner.scanSource(content, file);
    if (report.violations.length > 0) {
      console.log(`📄 ${file} (Risk Score: ${report.riskScore}/100)`);
      for (const v of report.violations) {
        totalViolations++;
        console.log(`  [Line ${v.line}] ⚠️ ${v.type}: ${v.snippet}`);
        console.log(`    ↳ Explanation: ${v.explanation}`);
        console.log(`    ↳ Fix: ${v.remediation}`);
      }
      console.log('');
    }
  }

  console.log(`Scan completed. ${totalViolations} flakiness risk pattern(s) identified.`);
} else if (command === 'analyze') {
  const reportsArg = getArgValue('--reports');
  if (!reportsArg) {
    console.error('Error: --reports <path1.xml,path2.xml> is required.');
    process.exit(1);
  }

  const reportPaths = reportsArg.split(',').map(s => s.trim()).filter(Boolean);
  const manager = new QuarantineManager();

  for (const p of reportPaths) {
    if (fs.existsSync(p)) {
      const xml = fs.readFileSync(p, 'utf8');
      const suite = JUnitParser.parse(xml);
      manager.ingestJUnitSuite(suite);
    } else {
      console.warn(`Warning: Report file not found: ${p}`);
    }
  }

  const unconstrainedManifest = manager.generateManifest([], Infinity);
  const totalFlakyDetected = unconstrainedManifest.totalQuarantined;

  const paywallStatus = InflowPaywall.evaluate({
    productName: 'Flaky Quarantine Team CI/CD Pass',
    metricName: 'quarantined flaky tests',
    currentValue: totalFlakyDetected,
    freeLimit: license.maxQuarantines,
    checkoutUrl: 'https://buy.polar.sh/polar_cl_iel9yWlONZUVA92iPTUR0WgdhRoWjYWCDtypa47534c',
    priceText: '$29/month'
  }, license.valid, hasEmergencyGrace);

  if (!paywallStatus.allowed) {
    if (paywallStatus.ansiBanner) {
      process.stderr.write(paywallStatus.ansiBanner);
    }
    process.exit(1);
  }

  if (paywallStatus.isEmergencyGrace && paywallStatus.ansiBanner) {
    process.stderr.write(paywallStatus.ansiBanner);
  }

  const manifest = manager.generateManifest([], paywallStatus.isEmergencyGrace || license.valid ? Infinity : license.maxQuarantines);
  const outputPath = getArgValue('--output') || '.flaky-quarantine.json';
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      fs.appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        QuarantineManager.generatePrSummaryMarkdown(manifest) + '\n',
        'utf8'
      );
    } catch {
      // Ignore
    }
  }

  if (args.includes('--markdown')) {
    console.log(QuarantineManager.generatePrSummaryMarkdown(manifest));
  } else {
    console.log(`\n🛡️ Flaky Quarantine Analysis:`);
    console.log(`  Total tests quarantined: ${manifest.totalQuarantined} (Tier: ${license.tier})`);
    manifest.quarantinedTests.forEach(q => {
      console.log(`  • [${(q.markovResult.flakinessScore * 100).toFixed(0)}% Flaky] ${q.name} (${q.markovResult.flipCount} flips)`);
    });
    console.log(`\n✅ Quarantine manifest written to ${outputPath}`);
    if (manifest.configSnippets.playwrightGrepInvert) {
      console.log(`👉 Playwright exclusion: --grep-invert "${manifest.configSnippets.playwrightGrepInvert}"`);
    }
  }
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}
