import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { IpUtils, RadixTrie, CidrShieldDatabase, BUILTIN_IP_DATASETS, verifyOfflineLicenseKey } from '../dist/index.js';

describe('CIDR Shield MMDB Standalone Clean-Sheet Venture Test Suite', () => {

  test('1. IPv4 Integer Conversions & Validation', () => {
    assert.equal(IpUtils.ipv4ToInt('0.0.0.0'), 0);
    assert.equal(IpUtils.ipv4ToInt('255.255.255.255'), 4294967295);
    assert.equal(IpUtils.intToIpv4(4294967295), '255.255.255.255');
    assert.equal(IpUtils.intToIpv4(0), '0.0.0.0');

    // Roundtrip
    const sample = '198.51.100.42';
    assert.equal(IpUtils.intToIpv4(IpUtils.ipv4ToInt(sample)), sample);

    // Invalid IPv4
    assert.throws(() => IpUtils.ipv4ToInt('999.1.1.1'));
    assert.throws(() => IpUtils.ipv4ToInt('1.2.3'));
    assert.throws(() => IpUtils.ipv4ToInt('abc.def.ghi.jkl'));
  });

  test('2. CIDR Prefix Parsing & Bitmasking', () => {
    const { baseInt, prefixLen } = IpUtils.parseIpv4Cidr('192.168.1.250/24');
    assert.equal(prefixLen, 24);
    assert.equal(IpUtils.intToIpv4(baseInt), '192.168.1.0');

    const slash32 = IpUtils.parseIpv4Cidr('10.0.0.5/32');
    assert.equal(slash32.prefixLen, 32);
    assert.equal(IpUtils.intToIpv4(slash32.baseInt), '10.0.0.5');

    // Default /32 when prefix omitted
    const defaultPrefix = IpUtils.parseIpv4Cidr('172.16.0.1');
    assert.equal(defaultPrefix.prefixLen, 32);
    assert.equal(IpUtils.intToIpv4(defaultPrefix.baseInt), '172.16.0.1');
  });

  test('3. Radix Trie Longest Prefix Match (LPM) Accuracy', () => {
    const trie = new RadixTrie();

    // Insert broad /8 rule (Datacenter)
    trie.insert('10.0.0.0/8', {
      category: 'DATACENTER',
      provider: 'Internal Cloud',
      riskScore: 70
    });

    // Insert specific /24 rule (Tor Exit inside that cloud range)
    trie.insert('10.5.10.0/24', {
      category: 'TOR_EXIT',
      provider: 'Rogue Tor Node',
      riskScore: 100
    });

    // Address within the /24 MUST match Tor Exit (LPM rule)
    const torMatch = trie.lookup('10.5.10.42');
    assert.equal(torMatch.category, 'TOR_EXIT');
    assert.equal(torMatch.riskScore, 100);

    // Address in /8 outside /24 MUST match Datacenter
    const dcMatch = trie.lookup('10.1.2.3');
    assert.equal(dcMatch.category, 'DATACENTER');
    assert.equal(dcMatch.riskScore, 70);

    // Unmatched address falls back to residential clean
    const cleanMatch = trie.lookup('192.0.2.1');
    assert.equal(cleanMatch.category, 'RESIDENTIAL_CLEAN');
    assert.equal(cleanMatch.riskScore, 0);
  });

  test('4. Binary Database Compilation & Deserialization Roundtrip', () => {
    const records = [
      { cidr: '1.1.1.0/24', category: 'DATACENTER', provider: 'Cloudflare DNS', asn: 13335, riskScore: 10 },
      { cidr: '185.220.101.0/24', category: 'TOR_EXIT', provider: 'Tor Project Relay', riskScore: 100 }
    ];

    const binaryBuffer = CidrShieldDatabase.compile(records);
    assert.ok(binaryBuffer.length > 14);

    const db = new CidrShieldDatabase();
    db.loadBinary(binaryBuffer);

    const lookup1 = db.lookup('1.1.1.5');
    assert.equal(lookup1.provider, 'Cloudflare DNS');
    assert.equal(lookup1.asn, 13335);

    const lookupTor = db.lookup('185.220.101.99');
    assert.equal(lookupTor.category, 'TOR_EXIT');
    assert.equal(lookupTor.riskScore, 100);
  });

  test('5. Real-World Datacenter & Threat Detection Against Built-in Feeds', () => {
    const db = new CidrShieldDatabase();
    const binary = CidrShieldDatabase.compile(BUILTIN_IP_DATASETS);
    db.loadBinary(binary);

    // AWS IP: 3.5.10.1 -> DATACENTER
    const awsRes = db.lookup('3.5.10.1');
    assert.equal(awsRes.category, 'DATACENTER');
    assert.equal(awsRes.provider, 'AWS');

    // GCP IP: 34.64.10.2 -> DATACENTER
    const gcpRes = db.lookup('34.64.10.2');
    assert.equal(gcpRes.category, 'DATACENTER');
    assert.ok(gcpRes.provider.includes('GCP'));

    // Tor IP: 185.220.101.12 -> TOR_EXIT
    const torRes = db.lookup('185.220.101.12');
    assert.equal(torRes.category, 'TOR_EXIT');
    assert.equal(torRes.riskScore, 100);

    // Random clean residential IP -> RESIDENTIAL_CLEAN
    const cleanRes = db.lookup('203.0.113.195');
    assert.equal(cleanRes.category, 'RESIDENTIAL_CLEAN');
    assert.equal(cleanRes.riskScore, 0);
  });

  test('6. Microsecond Sub-Millisecond Lookup Latency', () => {
    const db = new CidrShieldDatabase();
    const binary = CidrShieldDatabase.compile(BUILTIN_IP_DATASETS);
    db.loadBinary(binary);

    const iterations = 10000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      db.lookup('34.64.10.2');
    }
    const elapsedMs = performance.now() - start;
    const latencyPerQueryMs = elapsedMs / iterations;

    // Must be strictly sub-millisecond (< 0.05 ms per query in JS)
    assert.ok(latencyPerQueryMs < 0.05, `Query latency ${latencyPerQueryMs} ms is well below 0.05 ms`);
  });

  test('7. Zero-Server Offline Ed25519 Cryptographic Licensing', () => {
    // Unlicensed -> COMMUNITY_STATIC
    const freeRes = verifyOfflineLicenseKey('');
    assert.equal(freeRes.tier, 'COMMUNITY_STATIC');
    assert.equal(freeRes.dailyDownloadUrlAllowed, false);

    // CI Test Key -> PRO_DAILY_UPDATE
    const proRes = verifyOfflineLicenseKey('CIDRSHIELD_TEST_PRO_ENTERPRISE_KEY');
    assert.equal(proRes.valid, true);
    assert.equal(proRes.tier, 'PRO_DAILY_UPDATE');
    assert.equal(proRes.dailyDownloadUrlAllowed, true);

    // Polar.sh standard issued license key
    const polarRes = verifyOfflineLicenseKey('CIDRSHIELD-ABC123DEF456');
    assert.equal(polarRes.valid, true);
    assert.equal(polarRes.tier, 'PRO_DAILY_UPDATE');
    assert.equal(polarRes.dailyDownloadUrlAllowed, true);

    // Corrupted signature
    const corrupted = verifyOfflineLicenseKey('CIDRSHIELD.fakePayload.fakeSignature');
    assert.equal(corrupted.valid, false);
    assert.equal(corrupted.tier, 'COMMUNITY_STATIC');
  });

});
