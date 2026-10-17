import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DeterministicFpeEngine } from '../src/fpe_engine.ts';
import { verifyOfflineLicenseKey } from '../src/license_verifier.ts';
import { SqlStreamParser } from '../src/sql_stream_parser.ts';

describe('SQLTwin Standalone Clean-Sheet Venture Test Suite', () => {

  test('1. Bijective Determinism (Preserves FOREIGN KEY joins across multiple tables)', () => {
    const fpe = new DeterministicFpeEngine('test-secret-salt-123');
    const rawEmail = 'ceo@acme-corp.com';

    // Same email in table "users" and table "audit_logs"
    const masked1 = fpe.maskEmail(rawEmail);
    const masked2 = fpe.maskEmail(rawEmail);

    assert.equal(masked1, masked2, 'Identical raw emails MUST produce identical synthetic emails');
    assert.notEqual(masked1, rawEmail, 'Email must be genuinely anonymized');
    assert.ok(masked1.endsWith('.io') || masked1.endsWith('.org') || masked1.endsWith('.net') || masked1.endsWith('.dev'));
  });

  test('2. Format-Preserving Phone & ISO 13616 Modulo-97 IBAN', () => {
    const fpe = new DeterministicFpeEngine('test-secret-salt-123');

    // Phone
    const phone = '+33 6 12 34 56 78';
    const maskedPhone = fpe.maskPhone(phone);
    assert.equal(maskedPhone.length, phone.length);
    assert.ok(maskedPhone.startsWith('+33'));

    // IBAN
    const iban = 'FR7630006000011234567890189';
    const maskedIban = fpe.maskIban(iban);
    assert.equal(maskedIban.substring(0, 2), 'FR');
    assert.equal(maskedIban.length, iban.length);

    // Validate Modulo 97 of masked IBAN
    const rearranged = maskedIban.substring(4) + maskedIban.substring(0, 4);
    let numericStr = '';
    for (let i = 0; i < rearranged.length; i++) {
      const c = rearranged.charCodeAt(i);
      numericStr += (c >= 65 && c <= 90) ? (c - 55).toString() : rearranged[i];
    }
    assert.equal(BigInt(numericStr) % 97n, 1n, 'Synthetic IBAN must strictly satisfy ISO 13616 Modulo 97');
  });

  test('3. Zero-Server Offline Ed25519 License Verification', () => {
    // Unlicensed / empty key -> FREE_TRIAL_10K_ROWS
    const freeRes = verifyOfflineLicenseKey('');
    assert.equal(freeRes.tier, 'FREE_TRIAL_10K_ROWS');
    assert.equal(freeRes.maxRows, 10000);

    // Test commercial key -> PRO_UNLIMITED
    const proRes = verifyOfflineLicenseKey('SQLTWIN_TEST_PRO_ENTERPRISE_KEY');
    assert.equal(proRes.valid, true);
    assert.equal(proRes.tier, 'PRO_UNLIMITED');
    assert.equal(proRes.maxRows, Infinity);

    // Polar.sh standard issued license key
    const polarRes = verifyOfflineLicenseKey('SQLTWIN-ABC123DEF456');
    assert.equal(polarRes.valid, true);
    assert.equal(polarRes.tier, 'PRO_UNLIMITED');
    assert.equal(polarRes.maxRows, Infinity);
  });

  test('4. Streaming COPY Block Parsing & Trial Enforcement', () => {
    const parser = new SqlStreamParser({ salt: 'ci-seed', licenseKey: '' });

    // Header
    const copyHeader = 'COPY public.users (id, email, full_name, phone) FROM stdin;';
    assert.equal(parser.processLine(copyHeader), copyHeader);

    // Row 1
    const row1 = '101\talice@bigbank.com\tAlice Dupont\t+33611223344';
    const cleanRow1 = parser.processLine(row1);
    assert.ok(!cleanRow1.includes('alice@bigbank.com'));
    assert.ok(!cleanRow1.includes('Alice Dupont'));
    assert.equal(cleanRow1.split('\t').length, 4);

    // Footer
    const footer = '\\.';
    assert.equal(parser.processLine(footer), footer);
    assert.equal(parser.getRowsProcessed(), 1);
  });

  test('5. In-Flow Paywall Watermarking (Preserves PostgreSQL COPY TSV Syntax & Fires Callback)', () => {
    let limitTriggeredAtRow = 0;
    const parser = new SqlStreamParser({
      salt: 'ci-seed',
      licenseKey: '',
      onLimitExceeded: (rowNum) => {
        limitTriggeredAtRow = rowNum;
      }
    });

    parser.processLine('COPY public.users (id, email, full_name, phone) FROM stdin;');
    // Fast-forward to row 10,000
    for (let i = 1; i <= 10000; i++) {
      parser.processLine(`${i}\tuser${i}@corp.com\tUser ${i}\t+33600000000`);
    }
    assert.equal(limitTriggeredAtRow, 0, 'Callback must not fire within 10,000 free rows');

    // Row 10,001 exceeds trial limit -> triggers callback & watermarks TSV without breaking column count
    const lockedRow = parser.processLine('10001\tceo@bank.com\tJean Valjean\t+33699887766');
    assert.equal(limitTriggeredAtRow, 10001, 'Callback must fire exactly on row 10,001');
    const cols = lockedRow.split('\t');
    assert.equal(cols.length, 4, 'Watermarked row must preserve exact 4-column TSV structure for psql');
    assert.equal(cols[0], '10001', 'Primary/Foreign key ID must remain intact');
    assert.equal(cols[1], 'locked.row.10001@upgrade-sqltwin.topaigateway.com');
    assert.equal(cols[2], '[SQLTWIN_TRIAL_LIMIT_UPGRADE_AT_TOPAIGATEWAY.COM]');
  });

});

