#!/usr/bin/env node

import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { AgentPrGuard } from '../src/index.ts';
import { verifyOfflineLicenseKey } from '../src/license_verifier.ts';
import { InflowPaywall } from '../src/inflow_paywall.ts';

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(`
🛡️ Agent-PR Guard — Pull Request & Git Hook Auditor for AI-Generated Code
Usage:
  agentpr-guard audit [--diff <diff-file>] [--fail-on-reject] [--markdown] [--json] [--license <KEY>]
  agentpr-guard pre-commit [--fail-on-reject]

Commands:
  audit                 Audits a git diff for hallucinated packages, typosquatting & boundary leaks
  pre-commit            Inspects git staged changes (git diff --cached) before commit

Options:
  --diff <path>         Path to diff file (defaults to stdin or git diff origin/main)
  --fail-on-reject      Exit with code 1 if integrity score < 75 or critical violation found
  --markdown            Output formatted Markdown for GitHub PR comment
  --json                Output machine-readable JSON evaluation
  --license <KEY>       Offline Ed25519 commercial license (or AGENTPR_LICENSE_KEY)
  --emergency-pass-24h  24-hour temporary grace period bypass for urgent production CI deploys
`);
  process.exit(0);
}

const command = args[0] === 'pre-commit' ? 'pre-commit' : 'audit';

function getArgValue(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const licenseKey = getArgValue('--license') || process.env.AGENTPR_LICENSE_KEY;
const license = verifyOfflineLicenseKey(licenseKey);
const hasEmergencyGrace = args.includes('--emergency-pass-24h') || !!process.env.AGENTPR_EMERGENCY_GRACE;

let diffContent = '';

if (command === 'pre-commit') {
  try {
    diffContent = execSync('git diff --cached', { encoding: 'utf8' });
    if (!diffContent.trim()) {
      console.log('✅ Agent-PR Guard: No staged changes to audit.');
      process.exit(0);
    }
  } catch (err) {
    console.error('Error reading git staged changes:', err.message);
    process.exit(1);
  }
} else {
  const diffPath = getArgValue('--diff');
  if (diffPath && fs.existsSync(diffPath)) {
    diffContent = fs.readFileSync(diffPath, 'utf8');
  } else if (!process.stdin.isTTY) {
    diffContent = fs.readFileSync(0, 'utf8');
  } else {
    try {
      diffContent = execSync('git diff origin/main...HEAD || git diff HEAD~1', { encoding: 'utf8' });
    } catch {
      diffContent = execSync('git diff', { encoding: 'utf8' });
    }
  }
}

if (!diffContent.trim()) {
  console.log('✅ Agent-PR Guard: Empty diff. Nothing to audit.');
  process.exit(0);
}

// In-Flow Paywall check
const paywallStatus = InflowPaywall.evaluate({
  productName: 'Agent-PR Guard Team CI/CD Pass',
  metricName: 'audited PRs',
  currentValue: 4, // triggers paywall if on free limit (3) without commercial key
  freeLimit: license.maxPrsPerDay,
  checkoutUrl: 'https://buy.polar.sh/polar_cl_OUy6Q7GoY78aXhbdaFyoJ646wtXgD7mszAadt4FgJHz',
  priceText: '$39/month or $99 Lifetime'
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

const report = AgentPrGuard.auditDiff(diffContent);

// Automatically write rich report to GitHub Step Summary if running in CI
if (process.env.GITHUB_STEP_SUMMARY) {
  try {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      AgentPrGuard.generateMarkdownReport(report) + '\n',
      'utf8'
    );
  } catch {
    // Ignore
  }
}

if (args.includes('--json')) {
  console.log(JSON.stringify({ report, license }, null, 2));
} else if (args.includes('--markdown')) {
  console.log(AgentPrGuard.generateMarkdownReport(report));
} else {
  console.log(`\n🛡️ Agent-PR Guard Evaluation:`);
  console.log(`  Integrity Score:     ${report.integrityScore}/100 [${report.isApproved ? 'APPROVED' : 'REJECTED'}]`);
  console.log(`  Files Audited:       ${report.filesAnalyzed} (+${report.totalAdditions} lines)`);
  console.log(`  Supply Chain Risks:  ${report.supplyChainViolations.length}`);
  console.log(`  Architecture Leaks:  ${report.architectureViolations.length}\n`);

  if (report.supplyChainViolations.length > 0) {
    console.log(`🚨 Supply Chain & Hallucination Violations:`);
    for (const v of report.supplyChainViolations) {
      console.log(`  • [${v.type}] ${v.packageName} - ${v.reason}`);
    }
  }

  if (report.architectureViolations.length > 0) {
    console.log(`\n⚠️ Architecture Boundary Breaches:`);
    for (const a of report.architectureViolations) {
      console.log(`  • [${a.rule}] ${a.file} - ${a.message}`);
    }
  }
}

if (args.includes('--fail-on-reject') && !report.isApproved) {
  console.error('\n🛑 Pull Request rejected: Integrity score below 75 or critical violations detected.');
  process.exit(1);
}
