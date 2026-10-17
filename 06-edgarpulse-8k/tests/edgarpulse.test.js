import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Form4Parser, Form8KParser, SignalEngine, verifyOfflineLicenseKey } from '../dist/index.js';

describe('EdgarPulse 8-K Standalone Clean-Sheet Venture Test Suite', () => {

  test('1. SEC Form 4 XML Parsing & Open Market Purchase Isolation', () => {
    const sampleForm4Xml = `<?xml version="1.0"?>
    <edgarSubmission>
      <issuer>
        <issuerCik>0001018724</issuerCik>
        <issuerName>AMAZON COM INC</issuerName>
        <issuerTradingSymbol>AMZN</issuerTradingSymbol>
      </issuer>
      <reportingOwner>
        <reportingOwnerId>
          <rptOwnerName>Jassy Andrew R</rptOwnerName>
        </reportingOwnerId>
        <reportingOwnerRelationship>
          <isDirector>1</isDirector>
          <isOfficer>1</isOfficer>
          <officerTitle>Chief Executive Officer</officerTitle>
        </reportingOwnerRelationship>
      </reportingOwner>
      <nonDerivativeTable>
        <nonDerivativeTransaction>
          <securityTitle><value>Common Stock</value></securityTitle>
          <transactionDate><value>2026-03-15</value></transactionDate>
          <transactionCoding>
            <transactionCode>P</transactionCode>
          </transactionCoding>
          <transactionAmounts>
            <transactionShares><value>10000</value></transactionShares>
            <transactionPricePerShare><value>180.50</value></transactionPricePerShare>
            <transactionAcquiredDisposedCode><value>A</value></transactionAcquiredDisposedCode>
          </transactionAmounts>
          <postTransactionAmounts>
            <sharesOwnedFollowingTransaction><value>250000</value></sharesOwnedFollowingTransaction>
          </postTransactionAmounts>
        </nonDerivativeTransaction>
        <!-- Derivative Option Exercise (Code M) - Must be distinguished -->
        <nonDerivativeTransaction>
          <securityTitle><value>Common Stock</value></securityTitle>
          <transactionDate><value>2026-03-15</value></transactionDate>
          <transactionCoding>
            <transactionCode>M</transactionCode>
          </transactionCoding>
          <transactionAmounts>
            <transactionShares><value>50000</value></transactionShares>
            <transactionPricePerShare><value>25.00</value></transactionPricePerShare>
            <transactionAcquiredDisposedCode><value>A</value></transactionAcquiredDisposedCode>
          </transactionAmounts>
          <postTransactionAmounts>
            <sharesOwnedFollowingTransaction><value>300000</value></sharesOwnedFollowingTransaction>
          </postTransactionAmounts>
        </nonDerivativeTransaction>
      </nonDerivativeTable>
    </edgarSubmission>`;

    const filing = Form4Parser.parse(sampleForm4Xml);
    assert.equal(filing.issuerSymbol, 'AMZN');
    assert.equal(filing.ownerName, 'Jassy Andrew R');
    assert.equal(filing.relationship.isOfficer, true);
    assert.equal(filing.relationship.officerTitle, 'Chief Executive Officer');
    assert.equal(filing.transactions.length, 2);

    // Only transaction 1 is an open-market purchase (Code P)
    assert.equal(filing.transactions[0].transactionCode, 'P');
    assert.equal(filing.transactions[0].isOpenMarketPurchase, true);
    assert.equal(filing.transactions[1].transactionCode, 'M');
    assert.equal(filing.transactions[1].isOpenMarketPurchase, false);

    assert.equal(filing.totalOpenMarketPurchaseValue, 1805000);
  });

  test('2. SEC Form 8-K Unscheduled Event Parser', () => {
    const raw8k = `
      COMPANY CONFORMED NAME: ACME TECH CORP
      CONFORMED SUBMISSION TYPE: 8-K
      
      Item 1.01 Entry into a Material Definitive Agreement.
      On October 12, 2026, the Company entered into a master credit facility...
      
      Item 5.02 Departure of Directors or Certain Officers; Election of Directors.
      Effective immediately, John Doe was appointed as Chief Financial Officer...
    `;

    const filing = Form8KParser.parse(raw8k, 'ACME', '2026-10-12');
    assert.equal(filing.issuerSymbol, 'ACME');
    assert.equal(filing.hasMaterialAgreement, true);
    assert.equal(filing.hasMajorLeadershipChange, true);
    assert.equal(filing.items.length, 2);
  });

  test('3. Quantitative Conviction Scoring on C-Suite Open Market Purchases', () => {
    const filing = {
      issuerSymbol: 'NVDA',
      issuerName: 'NVIDIA CORP',
      issuerCik: '0001045810',
      ownerName: 'Huang Jen Hsun',
      relationship: {
        isDirector: true,
        isOfficer: true,
        isTenPercentOwner: false,
        officerTitle: 'Chief Executive Officer'
      },
      periodOfReport: '2026-05-10',
      transactions: [
        {
          securityTitle: 'Common Stock',
          transactionDate: '2026-05-10',
          transactionCode: 'P',
          shares: 50000,
          pricePerShare: 110.00,
          totalDollarValue: 5500000, // $5.5M purchase
          acquiredDisposed: 'A',
          sharesOwnedAfter: 500000,
          isOpenMarketPurchase: true
        }
      ],
      hasOpenMarketPurchases: true,
      totalOpenMarketPurchaseValue: 5500000
    };

    const signal = SignalEngine.evaluateFiling(filing);
    assert.ok(signal !== null);
    assert.ok(signal.convictionScore >= 75, 'Whale C-suite open-market purchase must achieve high conviction');
    assert.equal(signal.verdict, 'BULLISH_C_SUITE_BUY');
    assert.equal(signal.totalPurchaseValue, 5500000);
  });

  test('4. Multi-Insider Cluster Buying Detection (Lakonishok & Lee Alpha Anomaly)', () => {
    // Insider 1: CEO buys $800k of XYZ
    const f1 = {
      issuerSymbol: 'XYZ',
      issuerName: 'XYZ Therapeutics',
      issuerCik: '0001234567',
      ownerName: 'Alice CEO',
      relationship: { isDirector: true, isOfficer: true, isTenPercentOwner: false, officerTitle: 'CEO' },
      periodOfReport: '2026-06-01',
      transactions: [
        {
          securityTitle: 'Common', transactionDate: '2026-06-01', transactionCode: 'P',
          shares: 40000, pricePerShare: 20, totalDollarValue: 800000,
          acquiredDisposed: 'A', sharesOwnedAfter: 100000, isOpenMarketPurchase: true
        }
      ],
      hasOpenMarketPurchases: true,
      totalOpenMarketPurchaseValue: 800000
    };

    // Insider 2: CFO buys $300k of XYZ on same day
    const f2 = {
      issuerSymbol: 'XYZ',
      issuerName: 'XYZ Therapeutics',
      issuerCik: '0001234567',
      ownerName: 'Bob CFO',
      relationship: { isDirector: false, isOfficer: true, isTenPercentOwner: false, officerTitle: 'CFO' },
      periodOfReport: '2026-06-01',
      transactions: [
        {
          securityTitle: 'Common', transactionDate: '2026-06-01', transactionCode: 'P',
          shares: 15000, pricePerShare: 20, totalDollarValue: 300000,
          acquiredDisposed: 'A', sharesOwnedAfter: 50000, isOpenMarketPurchase: true
        }
      ],
      hasOpenMarketPurchases: true,
      totalOpenMarketPurchaseValue: 300000
    };

    const signals = SignalEngine.analyzeClusters([f1, f2]);
    assert.equal(signals.length, 2);
    assert.equal(signals[0].isCluster, true);
    assert.equal(signals[0].distinctInsidersInCluster, 2);
    assert.equal(signals[0].clusterTotalValue, 1100000);
    assert.equal(signals[0].verdict, 'STRONG_BULLISH_INSIDER_CLUSTER');
  });

  test('5. Zero-Server Offline Ed25519 Cryptographic Licensing', () => {
    // Unlicensed -> Free tier limited to 5 signals
    const freeRes = verifyOfflineLicenseKey('');
    assert.equal(freeRes.tier, 'COMMUNITY_DELAYED_5_SIGNALS');
    assert.equal(freeRes.maxSignalsPerRun, 5);

    // Commercial test key -> Unlimited realtime stream
    const proRes = verifyOfflineLicenseKey('EDGARPULSE_TEST_PRO_QUANT_KEY');
    assert.equal(proRes.valid, true);
    assert.equal(proRes.tier, 'QUANT_FUND_PRO_REALTIME');
    assert.equal(proRes.maxSignalsPerRun, Infinity);

    // Corrupted signature
    const corrupted = verifyOfflineLicenseKey('EDGARPULSE.invalid.signature');
    assert.equal(corrupted.valid, false);
    assert.equal(corrupted.tier, 'COMMUNITY_DELAYED_5_SIGNALS');
  });

});
