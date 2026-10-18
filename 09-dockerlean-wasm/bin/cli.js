#!/usr/bin/env node

import fs from 'node:fs';
import { DockerfileLinter } from '../src/index.ts';
import { verifyOfflineLicenseKey } from '../src/license_verifier.ts';
import { InflowPaywall } from '../src/inflow_paywall.ts';

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(`
🐳 DockerLean Wasm — Air-Gapped Dockerfile & OCI Bloat Auditor
Usage:
  dockerlean <Dockerfile> [--fail-on-bloat] [--markdown] [--json] [--license <KEY>]

Options:
  <Dockerfile>          Path to Dockerfile to audit (default: ./Dockerfile)
  --fail-on-bloat       Exit with code 1 if lean score is below 70 or critical flaw detected
  --markdown            Output formatted Markdown for GitHub PR comment
  --json                Output machine-readable JSON evaluation
  --license <KEY>       Offline Ed25519 commercial license (or DOCKERLEAN_LICENSE_KEY)
  --emergency-pass-24h  24-hour temporary grace period bypass for urgent production CI deploys
`);
  process.exit(0);
}

function getArgValue(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const licenseKey = getArgValue('--license') || process.env.DOCKERLEAN_LICENSE_KEY;
const license = verifyOfflineLicenseKey(licenseKey);
const hasEmergencyGrace = args.includes('--emergency-pass-24h') || !!process.env.DOCKERLEAN_EMERGENCY_GRACE;

const targetFile = args.find(a => !a.startsWith('-')) || 'Dockerfile';

if (!fs.existsSync(targetFile)) {
  console.error(`Error: File not found: ${targetFile}`);
  process.exit(1);
}

// In-Flow Paywall check
const paywallStatus = InflowPaywall.evaluate({
  productName: 'DockerLean Wasm Enterprise CI Pass',
  metricName: 'Dockerfiles audited',
  currentValue: 3, // triggers paywall on free tier (2) without key
  freeLimit: license.maxDockerfiles,
  checkoutUrl: 'https://buy.polar.sh/polar_cl_z8AW0MGKNFyHrDG4rHySEtviAxtxze5vnJLF64JjI6L',
  priceText: '$29 one-time lifetime'
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

const content = fs.readFileSync(targetFile, 'utf8');
const report = DockerfileLinter.audit(content, targetFile);

// Automatically write rich report to GitHub Step Summary if running in CI
if (process.env.GITHUB_STEP_SUMMARY) {
  try {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      DockerfileLinter.generateMarkdownReport(report) + '\n',
      'utf8'
    );
  } catch {
    // Ignore
  }
}

if (args.includes('--json')) {
  console.log(JSON.stringify({ report, license }, null, 2));
} else if (args.includes('--markdown')) {
  console.log(DockerfileLinter.generateMarkdownReport(report));
} else {
  console.log(`\n🐳 DockerLean Wasm Evaluation:`);
  console.log(`  Lean Score:          ${report.leanScore}/100 [${report.leanScore >= 70 ? 'PASS' : 'FAIL'}]`);
  console.log(`  Estimated Waste:     ~${report.wastedMegabytesEstimate} MB per container layer`);
  console.log(`  Multi-Stage:         ${report.isMultiStage ? 'Yes' : 'No'}`);
  console.log(`  Non-Root User:       ${!report.isRootUser ? 'Yes' : 'No (Security Risk)'}`);
  console.log(`  Violations Found:    ${report.violations.length}\n`);

  if (report.violations.length > 0) {
    console.log(`🔍 Detected Flaws & Recommendations:`);
    for (const v of report.violations) {
      console.log(`  • [Line ${v.line}] [${v.severity}] ${v.title}`);
      console.log(`    ↳ ${v.remediation}`);
    }
  }
}

if (args.includes('--fail-on-bloat') && report.leanScore < 70) {
  console.error('\n🛑 CI halted: Dockerfile lean score is below 70.');
  process.exit(1);
}
