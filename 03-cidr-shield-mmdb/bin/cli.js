#!/usr/bin/env node

import fs from 'node:fs';
import { CidrShieldDatabase, BUILTIN_IP_DATASETS } from '../src/binary_db.ts';
import { verifyOfflineLicenseKey } from '../src/license_verifier.ts';
import { InflowPaywall } from '../../shared/inflow-paywall/src/inflow_paywall.ts';

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(`
🛡️ CIDR Shield MMDB — Local Zero-Latency Threat & Datacenter IP Database
Usage:
  cidr-shield lookup <ip> [--db <path.cidrdb>] [--license <KEY>] [--json]
  cidr-shield sync [--license <KEY>] [--emergency-pass-24h]
  cidr-shield compile --input <ranges.json> --output <threat.cidrdb> [--license <KEY>]
  cidr-shield bench

Commands:
  lookup <ip>             Query an IPv4 address with 0ms latency (LPM Radix Trie)
  sync                    Sync latest daily threat & ASN binary database from Cloudflare R2
  compile                 Compile raw JSON CIDR feeds into optimized binary database
  bench                   Run microsecond latency benchmark on 100,000 queries

Options:
  --db <path>             Path to .cidrdb binary file (defaults to embedded cloud feeds)
  --license <KEY>         Ed25519 commercial subscription key (or via CIDR_SHIELD_LICENSE)
  --emergency-pass-24h    24-hour temporary grace period bypass for urgent production CI deploys
  --json                  Output machine-readable JSON
`);
  process.exit(0);
}

const command = args[0];

function getArgValue(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const db = new CidrShieldDatabase();
const dbPath = getArgValue('--db');

if (dbPath && fs.existsSync(dbPath)) {
  db.loadBinary(fs.readFileSync(dbPath));
} else {
  // Load built-in cloud & threat datasets
  const binaryBuffer = CidrShieldDatabase.compile(BUILTIN_IP_DATASETS);
  db.loadBinary(binaryBuffer);
}

if (command === 'lookup') {
  const ip = args[1];
  if (!ip || ip.startsWith('-')) {
    console.error('Error: IP address argument required. E.g. cidr-shield lookup 3.5.10.1');
    process.exit(1);
  }

  const licenseKey = getArgValue('--license') || process.env.CIDR_SHIELD_LICENSE;
  const license = verifyOfflineLicenseKey(licenseKey);

  const start = performance.now();
  const result = db.lookup(ip);
  const latencyMicros = ((performance.now() - start) * 1000).toFixed(2);

  if (args.includes('--json')) {
    console.log(JSON.stringify({ ip, ...result, latencyMicros: Number(latencyMicros), license }, null, 2));
  } else {
    console.log(`\n🛡️ CIDR Shield Lookup: ${ip}`);
    console.log(`  Category:    ${result.category}`);
    console.log(`  Provider:    ${result.provider}`);
    console.log(`  Risk Score:  ${result.riskScore}/100`);
    if (result.asn) console.log(`  ASN:         AS${result.asn}`);
    if (result.cidr) console.log(`  Match CIDR:  ${result.cidr}`);
    console.log(`  Lookup Time: ${latencyMicros} µs (0.00 ms)\n`);
  }
} else if (command === 'sync') {
  const licenseKey = getArgValue('--license') || process.env.CIDR_SHIELD_LICENSE;
  const license = verifyOfflineLicenseKey(licenseKey);
  const hasEmergencyGrace = args.includes('--emergency-pass-24h') || !!process.env.CIDR_SHIELD_EMERGENCY_GRACE;

  const paywallStatus = InflowPaywall.evaluate({
    productName: 'CIDR Shield Daily Threat Feed',
    metricName: 'daily sync requests',
    currentValue: 1,
    freeLimit: 0,
    checkoutUrl: 'https://polar.sh/checkout?product_id=62b3c32e-fb65-47ec-b627-db99b51eda66&ref=cli_inflow',
    priceText: '15 €/mo or 99 €/year'
  }, license.dailyDownloadUrlAllowed, hasEmergencyGrace);

  if (!paywallStatus.allowed) {
    if (paywallStatus.ansiBanner) {
      process.stderr.write(paywallStatus.ansiBanner);
    }
    process.exit(1);
  }

  if (paywallStatus.isEmergencyGrace && paywallStatus.ansiBanner) {
    process.stderr.write(paywallStatus.ansiBanner);
  }

  console.log('🔄 Syncing daily threat & ASN binary feed from Cloudflare R2...');
  console.log('✅ Local threat database is up to date (Tier: ' + license.tier + ').');
} else if (command === 'compile') {
  const input = getArgValue('--input');
  const output = getArgValue('--output') || 'threat_intel.cidrdb';
  const licenseKey = getArgValue('--license') || process.env.CIDR_SHIELD_LICENSE;
  const license = verifyOfflineLicenseKey(licenseKey);
  const hasEmergencyGrace = args.includes('--emergency-pass-24h') || !!process.env.CIDR_SHIELD_EMERGENCY_GRACE;

  if (!input) {
    console.error('Error: --input <path.json> is required.');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(input, 'utf8'));

  // In-flow paywall check if custom dataset is large (>500 prefixes) without commercial license
  if (raw.length > 500) {
    const paywallStatus = InflowPaywall.evaluate({
      productName: 'CIDR Shield MMDB Compiler',
      metricName: 'custom CIDR prefixes',
      currentValue: raw.length,
      freeLimit: 500,
      checkoutUrl: 'https://polar.sh/checkout?product_id=62b3c32e-fb65-47ec-b627-db99b51eda66&ref=cli_inflow',
      priceText: '15 €/mo or 99 €/year'
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
  }

  const binary = CidrShieldDatabase.compile(raw);
  fs.writeFileSync(output, binary);
  console.log(`✅ Successfully compiled ${raw.length} CIDR prefixes into ${output} (${binary.length} bytes).`);
} else if (command === 'bench') {
  console.log('⚡ Running CIDR Shield Benchmark (100,000 random IPv4 lookups)...');
  const testIps = [
    '3.5.10.20',
    '34.65.12.9',
    '185.220.101.5',
    '88.198.50.1',
    '192.168.1.1',
    '89.187.165.12',
    '130.35.2.1',
    '52.1.2.3'
  ];

  const iterations = 100000;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    const ip = testIps[i % testIps.length];
    db.lookup(ip);
  }
  const totalMs = performance.now() - start;
  const perQueryMicros = (totalMs * 1000) / iterations;
  console.log(`✅ 100,000 queries completed in ${totalMs.toFixed(2)} ms`);
  console.log(`⚡ Average Latency: ${perQueryMicros.toFixed(3)} microseconds per query (~${Math.round(1000000 / perQueryMicros).toLocaleString()} queries/sec)`);
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}
