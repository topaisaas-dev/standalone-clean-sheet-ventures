import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { InflowPaywall } from '../dist/index.js';

describe('In-Flow Paywall Engine Test Suite', () => {

  test('1. Within Free Limit Allows Execution Without Banner', () => {
    const res = InflowPaywall.evaluate({
      productName: 'SQLTwin Stream',
      metricName: 'rows',
      currentValue: 5000,
      freeLimit: 10000,
      checkoutUrl: 'https://polar.sh/checkout/sqltwin',
      priceText: '$49 one-time'
    });

    assert.equal(res.allowed, true);
    assert.equal(res.isEmergencyGrace, false);
    assert.equal(res.ansiBanner, undefined);
  });

  test('2. Over Free Limit Triggers High-Converting Paywall & 402 Payload', () => {
    const res = InflowPaywall.evaluate({
      productName: 'SQLTwin Stream',
      metricName: 'rows',
      currentValue: 25000,
      freeLimit: 10000,
      checkoutUrl: 'https://polar.sh/checkout/sqltwin',
      priceText: '$49 one-time'
    });

    assert.equal(res.allowed, false);
    assert.equal(res.isEmergencyGrace, false);
    assert.ok(res.ansiBanner);
    assert.ok(res.ansiBanner.includes('SQLTWIN STREAM QUOTA EXCEEDED'));
    assert.ok(res.ansiBanner.includes('https://polar.sh/checkout/sqltwin'));
    assert.ok(res.ansiBanner.includes('$49 one-time'));
    assert.equal(res.json402Payload?.httpCode, 402);
    assert.equal(res.json402Payload?.currentValue, 25000);
  });

  test('3. Emergency 24h Grace Flag Unblocks Pipeline While Warning', () => {
    const res = InflowPaywall.evaluate({
      productName: 'TerraCost Blast',
      metricName: 'resources',
      currentValue: 45,
      freeLimit: 20,
      checkoutUrl: 'https://polar.sh/checkout/terracost',
      priceText: '$49/mo'
    }, false, true); // hasEmergencyFlag = true

    assert.equal(res.allowed, true);
    assert.equal(res.isEmergencyGrace, true);
    assert.ok(res.ansiBanner);
    assert.ok(res.ansiBanner.includes('EMERGENCY GRACE PASS ACTIVE'));
    assert.ok(res.ansiBanner.includes('https://polar.sh/checkout/terracost'));
  });

  test('4. Commercial License Bypasses All Quota Limits', () => {
    const res = InflowPaywall.evaluate({
      productName: 'TerraCost Blast',
      metricName: 'resources',
      currentValue: 500,
      freeLimit: 20,
      checkoutUrl: 'https://polar.sh/checkout/terracost',
      priceText: '$49/mo'
    }, true, false); // hasValidCommercialLicense = true

    assert.equal(res.allowed, true);
    assert.equal(res.isEmergencyGrace, false);
  });

});
