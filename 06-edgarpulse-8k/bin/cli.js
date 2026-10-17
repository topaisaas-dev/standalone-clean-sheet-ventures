#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { Form4Parser } from '../src/form4_parser.ts';
import { Form8KParser } from '../src/form8k_parser.ts';
import { SignalEngine } from '../src/signal_engine.ts';
import { verifyOfflineLicenseKey } from '../src/license_verifier.ts';
import { InflowPaywall } from '../../shared/inflow-paywall/src/inflow_paywall.ts';

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(`
📈 EdgarPulse 8-K — Real-Time SEC Form 4 Insider Alpha & 8-K Catalyst Engine
Usage:
  edgarpulse parse-form4 <filing.xml> [--json]
  edgarpulse parse-8k <filing.txt> [--json]
  edgarpulse scan --filings <directory-or-files> [--min-score 50] [--license <KEY>] [--json] [--csv]

Commands:
  parse-form4             Extracts open-market purchases (Code P) and ownership from Form 4 XML
  parse-8k                Extracts material event items from Form 8-K disclosure
  scan                    Evaluates a batch of filings, detects multi-insider clusters, and ranks by conviction

Options:
  --min-score <N>         Filter signals below conviction score N (default: 0)
  --license <KEY>         Ed25519 commercial quant desk license (or EDGARPULSE_LICENSE_KEY)
  --emergency-pass-24h    24-hour temporary grace period bypass for urgent production/backtest runs
  --json                  Output machine-readable JSON signals
  --csv                   Output CSV format for pandas/backtesting
`);
  process.exit(0);
}

const command = args[0];

function getArgValue(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const licenseKey = getArgValue('--license') || process.env.EDGARPULSE_LICENSE_KEY;
const license = verifyOfflineLicenseKey(licenseKey);
const hasEmergencyGrace = args.includes('--emergency-pass-24h') || !!process.env.EDGARPULSE_EMERGENCY_GRACE;

if (command === 'parse-form4') {
  const filePath = args[1];
  if (!filePath || filePath.startsWith('-')) {
    console.error('Error: File path to Form 4 XML is required.');
    process.exit(1);
  }
  const xml = fs.readFileSync(filePath, 'utf8');
  const filing = Form4Parser.parse(xml);
  const signal = SignalEngine.evaluateFiling(filing);

  if (args.includes('--json')) {
    console.log(JSON.stringify({ filing, signal, license }, null, 2));
  } else {
    console.log(`\n📋 SEC Form 4: ${filing.issuerSymbol} (${filing.issuerName})`);
    console.log(`  Insider:        ${filing.ownerName} [${filing.relationship.officerTitle || 'Director/Officer'}]`);
    console.log(`  Report Period:  ${filing.periodOfReport}`);
    console.log(`  Open Market P:  ${filing.hasOpenMarketPurchases ? 'YES (Code P)' : 'NO'}`);
    console.log(`  Total Deployed: $${filing.totalOpenMarketPurchaseValue.toLocaleString()}`);

    if (signal) {
      console.log(`\n⚡ Quantitative Conviction: ${signal.convictionScore}/100 [${signal.verdict}]`);
      signal.catalystNotes.forEach(n => console.log(`  ↳ ${n}`));
    }
  }
} else if (command === 'parse-8k') {
  const filePath = args[1];
  if (!filePath || filePath.startsWith('-')) {
    console.error('Error: File path to Form 8-K is required.');
    process.exit(1);
  }
  const text = fs.readFileSync(filePath, 'utf8');
  const filing = Form8KParser.parse(text);

  if (args.includes('--json')) {
    console.log(JSON.stringify(filing, null, 2));
  } else {
    console.log(`\n📰 SEC Form 8-K Disclosure:`);
    console.log(`  Company:    ${filing.issuerName}`);
    console.log(`  Disclosed Items (${filing.items.length}):`);
    filing.items.forEach(it => {
      console.log(`  • Item ${it.itemNumber}: ${it.itemTitle} [${it.isMaterialCorporateChange ? 'MATERIAL' : 'Informational'}]`);
    });
  }
} else if (command === 'scan') {
  const filingsDir = getArgValue('--filings');
  if (!filingsDir) {
    console.error('Error: --filings <pathOrDir> is required.');
    process.exit(1);
  }

  const files = [];
  if (fs.statSync(filingsDir).isDirectory()) {
    for (const f of fs.readdirSync(filingsDir)) {
      if (f.endsWith('.xml') || f.endsWith('.txt')) {
        files.push(path.join(filingsDir, f));
      }
    }
  } else {
    files.push(filingsDir);
  }

  const form4Filings = [];
  const form8kFilings = [];

  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('<edgarSubmission>') || content.includes('<ownershipDocument>')) {
      form4Filings.push(Form4Parser.parse(content));
    } else if (content.includes('8-K') || content.includes('Item ')) {
      form8kFilings.push(Form8KParser.parse(content));
    }
  }

  const minScore = parseInt(getArgValue('--min-score') || '0', 10);
  const allSignals = SignalEngine.analyzeClusters(form4Filings, form8kFilings)
    .filter(s => s.convictionScore >= minScore);

  const paywallStatus = InflowPaywall.evaluate({
    productName: 'EdgarPulse 8-K Insider Alpha Stream',
    metricName: 'alpha signals',
    currentValue: allSignals.length,
    freeLimit: license.maxSignalsPerRun,
    checkoutUrl: 'https://buy.polar.sh/polar_cl_6FsrpUqrkka6YEmbvDERxCuZ0jJxd3muVtvsB2wRGOR',
    priceText: '$49/month'
  }, license.valid, hasEmergencyGrace);

  if (allSignals.length > license.maxSignalsPerRun && !license.valid) {
    if (paywallStatus.ansiBanner) {
      process.stderr.write(paywallStatus.ansiBanner);
    }
  }

  let signals = (paywallStatus.isEmergencyGrace || license.valid)
    ? allSignals
    : allSignals.slice(0, license.maxSignalsPerRun);

  if (args.includes('--json')) {
    console.log(JSON.stringify({ signals, license }, null, 2));
  } else if (args.includes('--csv')) {
    console.log('symbol,filingDate,insiderName,title,purchaseValue,sharesBought,convictionScore,verdict,isCluster');
    for (const s of signals) {
      console.log(`"${s.symbol}","${s.filingDate}","${s.insiderName}","${s.officerTitle || ''}",${s.totalPurchaseValue},${s.totalSharesBought},${s.convictionScore},"${s.verdict}",${s.isCluster}`);
    }
  } else {
    console.log(`\n📈 EdgarPulse Insider Alpha Signals (${signals.length} high-conviction alerts):`);
    for (const s of signals) {
      console.log(`\n  [${s.symbol}] Conviction: ${s.convictionScore}/100 — ${s.verdict}`);
      console.log(`    Insider:  ${s.insiderName} (${s.officerTitle || 'Director/Officer'})`);
      console.log(`    Capital:  $${s.totalPurchaseValue.toLocaleString()} (${s.totalSharesBought.toLocaleString()} shares @ $${s.averagePrice})`);
      if (s.isCluster) {
        console.log(`    🔥 Cluster: ${s.distinctInsidersInCluster} insiders bought total $${s.clusterTotalValue.toLocaleString()}`);
      }
      s.catalystNotes.forEach(n => console.log(`    ↳ ${n}`));
    }
  }
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}
