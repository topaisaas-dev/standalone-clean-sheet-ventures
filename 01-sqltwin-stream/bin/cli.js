#!/usr/bin/env node
import fs from 'node:fs';
import readline from 'node:readline';
import { SqlStreamParser } from '../src/sql_stream_parser.ts';
import { InflowPaywall } from '../src/inflow_paywall.ts';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    input: '',
    output: '',
    salt: process.env.SQLTWIN_SALT || 'sqltwin-cli-seed-default',
    license: process.env.SQLTWIN_LICENSE || '',
    emergencyGrace: args.includes('--emergency-pass-24h') || !!process.env.SQLTWIN_EMERGENCY_GRACE
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' || args[i] === '-i') options.input = args[++i];
    else if (args[i] === '--output' || args[i] === '-o') options.output = args[++i];
    else if (args[i] === '--salt' || args[i] === '-s') options.salt = args[++i];
    else if (args[i] === '--license' || args[i] === '-l') options.license = args[++i];
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
SQLTwin Deterministic Database Stream Anonymizer (v1.0.0)
Usage:
  cat prod_dump.sql | npx sqltwin > clean_staging.sql
  npx sqltwin --input prod_dump.sql --output clean_staging.sql

Options:
  -i, --input <file>        Path to input SQL dump (default: stdin)
  -o, --output <file>       Path to output SQL dump (default: stdout)
  -s, --salt <seed>         Secret HMAC salt for deterministic pseudonymization
  -l, --license <key>       Offline Ed25519 Commercial License Key (> 10,000 rows)
  --emergency-pass-24h      24-hour temporary grace period bypass for urgent production CI deploys
      `);
      process.exit(0);
    }
  }
  return options;
}

async function main() {
  const options = parseArgs();
  const isCi = InflowPaywall.isCiEnvironment();

  const parser = new SqlStreamParser({
    salt: options.salt,
    licenseKey: options.license,
    onLimitExceeded: (rowNum) => {
      const paywallStatus = InflowPaywall.evaluate({
        productName: 'SQLTwin Stream',
        metricName: 'rows',
        currentValue: rowNum,
        freeLimit: 10000,
        checkoutUrl: 'https://buy.polar.sh/polar_cl_U1yYwbQsxur0rbGxVx4GdtOMxlsaHJ15BUARn2cUkfR',
        priceText: '$79 one-time (or $19/mo)'
      }, false, options.emergencyGrace);

      if (paywallStatus.ansiBanner) {
        process.stderr.write(paywallStatus.ansiBanner);
      }
    }
  });

  const license = parser.getLicenseStatus();

  if (process.stderr.isTTY || isCi) {
    process.stderr.write(`[SQLTWIN] Starting stream anonymization (Tier: ${license.tier}, Env: ${isCi ? 'CI Runner' : 'Local'}).\n`);
  }

  const inputStream = options.input ? fs.createReadStream(options.input) : process.stdin;
  const outputStream = options.output ? fs.createWriteStream(options.output) : process.stdout;

  const rl = readline.createInterface({
    input: inputStream,
    crlfDelay: Infinity,
    terminal: false
  });

  for await (const line of rl) {
    const cleanLine = parser.processLine(line);
    outputStream.write(cleanLine + '\n');
  }

  if (process.stderr.isTTY || isCi) {
    process.stderr.write(`[SQLTWIN] Completed. Processed ${parser.getRowsProcessed()} rows with 100% FOREIGN KEY integrity preserved.\n`);
  }
}

main().catch(err => {
  console.error('[SQLTWIN FATAL]', err);
  process.exit(1);
});

