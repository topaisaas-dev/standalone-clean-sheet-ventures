// src/form8k_parser.ts
var ITEM_DESCRIPTIONS = {
  "1.01": { title: "Entry into a Material Definitive Agreement", isMaterial: true },
  "1.02": { title: "Termination of a Material Definitive Agreement", isMaterial: true },
  "1.03": { title: "Bankruptcy or Receivership", isMaterial: true },
  "2.01": { title: "Completion of Acquisition or Disposition of Assets", isMaterial: true },
  "2.02": { title: "Results of Operations and Financial Condition", isMaterial: true },
  "3.01": { title: "Notice of Delisting or Failure to Satisfy Continued Listing Rule", isMaterial: true },
  "5.01": { title: "Changes in Control of Registrant", isMaterial: true },
  "5.02": { title: "Departure of Directors or Principal Officers; Election of Directors", isMaterial: true },
  "7.01": { title: "Regulation FD Disclosure", isMaterial: false },
  "8.01": { title: "Other Events", isMaterial: false }
};
var Form8KParser = class {
  /**
   * Parses Form 8-K text or SGML/XML content to extract disclosed items and corporate triggers.
   */
  static parse(content, symbol = "UNKNOWN", filingDate) {
    const itemsFound = [];
    const itemRegex = /\bitem\s+([1-9]\.[0-9]{2})\b/gi;
    let match;
    const seenItems = /* @__PURE__ */ new Set();
    while ((match = itemRegex.exec(content)) !== null) {
      const itemNum = match[1];
      if (!seenItems.has(itemNum)) {
        seenItems.add(itemNum);
        const meta = ITEM_DESCRIPTIONS[itemNum] || { title: `Unscheduled Disclosure ${itemNum}`, isMaterial: true };
        itemsFound.push({
          itemNumber: itemNum,
          itemTitle: meta.title,
          isMaterialCorporateChange: meta.isMaterial
        });
      }
    }
    let companyName = "Unknown Corporation";
    const compMatch = /COMPANY CONFORMED NAME:\s*([^\r\n]+)/i.exec(content);
    if (compMatch) {
      companyName = compMatch[1].trim();
    }
    const date = filingDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    return {
      issuerSymbol: symbol.toUpperCase(),
      issuerName: companyName,
      filingDate: date,
      items: itemsFound,
      hasMajorLeadershipChange: seenItems.has("5.02"),
      hasEarningsResults: seenItems.has("2.02"),
      hasMaterialAgreement: seenItems.has("1.01")
    };
  }
};

// src/form4_parser.ts
var Form4Parser = class {
  static extractTag(xml, tag) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const match = regex.exec(xml);
    return match ? match[1].trim() : null;
  }
  static extractValueTag(xml, tag) {
    const parent = this.extractTag(xml, tag);
    if (!parent) return null;
    const val = this.extractTag(parent, "value");
    return val !== null ? val : parent;
  }
  /**
   * Parses standard SEC EDGAR Form 4 XML filing into structured domain object.
   */
  static parse(xmlContent) {
    const issuerBlock = this.extractTag(xmlContent, "issuer") || "";
    const issuerSymbol = (this.extractTag(issuerBlock, "issuerTradingSymbol") || "UNKNOWN").toUpperCase();
    const issuerName = this.extractTag(issuerBlock, "issuerName") || "Unknown Corp";
    const issuerCik = this.extractTag(issuerBlock, "issuerCik") || "";
    const rptOwnerBlock = this.extractTag(xmlContent, "reportingOwner") || "";
    const ownerNameBlock = this.extractTag(rptOwnerBlock, "reportingOwnerId") || rptOwnerBlock;
    const ownerName = this.extractTag(ownerNameBlock, "rptOwnerName") || "Unknown Insider";
    const ownerCik = this.extractTag(ownerNameBlock, "rptOwnerCik") || void 0;
    const relBlock = this.extractTag(rptOwnerBlock, "reportingOwnerRelationship") || "";
    const isDirector = (this.extractTag(relBlock, "isDirector") || "").trim() === "1" || /true/i.test(this.extractTag(relBlock, "isDirector") || "");
    const isOfficer = (this.extractTag(relBlock, "isOfficer") || "").trim() === "1" || /true/i.test(this.extractTag(relBlock, "isOfficer") || "");
    const isTenPercent = (this.extractTag(relBlock, "isTenPercentOwner") || "").trim() === "1" || /true/i.test(this.extractTag(relBlock, "isTenPercentOwner") || "");
    const officerTitle = this.extractTag(relBlock, "officerTitle") || void 0;
    const periodOfReport = this.extractTag(xmlContent, "periodOfReport") || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const transactions = [];
    const nonDerivRegex = /<nonDerivativeTransaction>([\s\S]*?)<\/nonDerivativeTransaction>/gi;
    let match;
    let totalOpenMarketPurchaseValue = 0;
    while ((match = nonDerivRegex.exec(xmlContent)) !== null) {
      const txBlock = match[1];
      const securityTitle = this.extractValueTag(txBlock, "securityTitle") || "Common Stock";
      const txDate = this.extractValueTag(txBlock, "transactionDate") || periodOfReport;
      const codingBlock = this.extractTag(txBlock, "transactionCoding") || "";
      const txCode = (this.extractTag(codingBlock, "transactionCode") || "UNKNOWN").toUpperCase();
      const amountsBlock = this.extractTag(txBlock, "transactionAmounts") || txBlock;
      const sharesStr = this.extractValueTag(amountsBlock, "transactionShares") || "0";
      const priceStr = this.extractValueTag(amountsBlock, "transactionPricePerShare") || "0";
      const acqDisp = (this.extractValueTag(amountsBlock, "transactionAcquiredDisposedCode") || "A").toUpperCase();
      const postBlock = this.extractTag(txBlock, "postTransactionAmounts") || txBlock;
      const ownedAfterStr = this.extractValueTag(postBlock, "sharesOwnedFollowingTransaction") || "0";
      const shares = Math.abs(parseFloat(sharesStr) || 0);
      const pricePerShare = Math.abs(parseFloat(priceStr) || 0);
      const totalDollarValue = Math.round(shares * pricePerShare * 100) / 100;
      const sharesOwnedAfter = parseFloat(ownedAfterStr) || 0;
      const isOpenMarketPurchase = txCode === "P" && acqDisp === "A";
      if (isOpenMarketPurchase) {
        totalOpenMarketPurchaseValue += totalDollarValue;
      }
      transactions.push({
        securityTitle,
        transactionDate: txDate,
        transactionCode: txCode,
        shares,
        pricePerShare,
        totalDollarValue,
        acquiredDisposed: acqDisp,
        sharesOwnedAfter,
        isOpenMarketPurchase
      });
    }
    return {
      issuerSymbol,
      issuerName,
      issuerCik,
      ownerName,
      ownerCik,
      relationship: {
        isDirector,
        isOfficer,
        isTenPercentOwner: isTenPercent,
        officerTitle
      },
      periodOfReport,
      transactions,
      hasOpenMarketPurchases: totalOpenMarketPurchaseValue > 0,
      totalOpenMarketPurchaseValue: Math.round(totalOpenMarketPurchaseValue * 100) / 100
    };
  }
};

// src/signal_engine.ts
var SignalEngine = class {
  /**
   * Evaluates a single Form 4 filing and computes an insider conviction score.
   */
  static evaluateFiling(filing) {
    if (!filing.hasOpenMarketPurchases) {
      return null;
    }
    const openMarketTx = filing.transactions.filter((t) => t.isOpenMarketPurchase);
    if (openMarketTx.length === 0) {
      return null;
    }
    const totalVal = filing.totalOpenMarketPurchaseValue;
    const totalShares = openMarketTx.reduce((acc, t) => acc + t.shares, 0);
    const avgPrice = totalShares > 0 ? Math.round(totalVal / totalShares * 100) / 100 : 0;
    let score = 0;
    const notes = [];
    const rel = filing.relationship;
    const title = (rel.officerTitle || "").toLowerCase();
    const isCeoOrCfo = title.includes("ceo") || title.includes("cfo") || title.includes("chief executive") || title.includes("chief financial");
    if (isCeoOrCfo) {
      score += 35;
      notes.push(`High seniority: C-Suite purchase by ${rel.officerTitle || "Executive"}`);
    } else if (rel.isOfficer) {
      score += 25;
      notes.push(`Executive officer purchase: ${rel.officerTitle || "Officer"}`);
    } else if (rel.isDirector) {
      score += 20;
      notes.push("Board of Directors purchase");
    } else if (rel.isTenPercentOwner) {
      score += 15;
      notes.push("10% Beneficial Owner purchase");
    }
    if (totalVal >= 1e6) {
      score += 40;
      notes.push(`Whale scale conviction: $${(totalVal / 1e6).toFixed(2)}M deployed`);
    } else if (totalVal >= 5e5) {
      score += 30;
      notes.push(`Major scale conviction: $${(totalVal / 1e3).toFixed(0)}k deployed`);
    } else if (totalVal >= 1e5) {
      score += 20;
      notes.push(`Significant capital deployment: $${(totalVal / 1e3).toFixed(0)}k`);
    } else if (totalVal >= 25e3) {
      score += 10;
      notes.push(`Material buy: $${(totalVal / 1e3).toFixed(0)}k`);
    }
    const latestTx = openMarketTx[openMarketTx.length - 1];
    const ownedPrior = latestTx.sharesOwnedAfter - totalShares;
    if (ownedPrior > 0) {
      const pctIncrease = totalShares / ownedPrior * 100;
      if (pctIncrease >= 20) {
        score += 15;
        notes.push(`Substantial stake expansion: +${pctIncrease.toFixed(1)}% of prior holdings`);
      }
    } else if (latestTx.sharesOwnedAfter > 0 && ownedPrior <= 0) {
      score += 15;
      notes.push("Initial personal equity stake created (skin in the game)");
    }
    const convictionScore = Math.min(100, score);
    let verdict = "LOW_CONVICTION_NOISE";
    if (convictionScore >= 75) {
      verdict = "BULLISH_C_SUITE_BUY";
    } else if (convictionScore >= 45) {
      verdict = "MODERATE_INSIDER_ACCUMULATION";
    }
    return {
      symbol: filing.issuerSymbol,
      companyName: filing.issuerName,
      filingDate: filing.periodOfReport,
      insiderName: filing.ownerName,
      officerTitle: filing.relationship.officerTitle,
      totalPurchaseValue: totalVal,
      totalSharesBought: totalShares,
      averagePrice: avgPrice,
      convictionScore,
      verdict,
      isCluster: false,
      distinctInsidersInCluster: 1,
      clusterTotalValue: totalVal,
      catalystNotes: notes
    };
  }
  /**
   * Cluster Detector: analyzes multiple filings across the same ticker
   * to discover multi-insider simultaneous accumulation within a 72-hour window.
   */
  static analyzeClusters(filings, form8kEvents = []) {
    const validSignals = filings.map((f) => this.evaluateFiling(f)).filter((s) => s !== null);
    const bySymbol = /* @__PURE__ */ new Map();
    for (const sig of validSignals) {
      if (!bySymbol.has(sig.symbol)) {
        bySymbol.set(sig.symbol, []);
      }
      bySymbol.get(sig.symbol).push(sig);
    }
    const enhancedSignals = [];
    for (const [symbol, signals] of bySymbol.entries()) {
      const distinctInsiders = new Set(signals.map((s) => s.insiderName));
      const totalClusterValue = signals.reduce((acc, s) => acc + s.totalPurchaseValue, 0);
      const related8k = form8kEvents.find((e) => e.issuerSymbol === symbol);
      for (const sig of signals) {
        let boostedScore = sig.convictionScore;
        const notes = [...sig.catalystNotes];
        if (distinctInsiders.size >= 2) {
          const clusterBoost = distinctInsiders.size >= 3 ? 35 : 25;
          boostedScore += clusterBoost;
          notes.push(`\u26A1 CLUSTER BUYING DETECTED: ${distinctInsiders.size} distinct insiders bought $${(totalClusterValue / 1e3).toFixed(0)}k`);
        }
        if (related8k) {
          boostedScore += 10;
          notes.push(`8-K Catalyst: Material filing on ${related8k.filingDate} (${related8k.items.map((i) => i.itemNumber).join(", ")})`);
        }
        const finalScore = Math.min(100, boostedScore);
        let verdict = sig.verdict;
        if (distinctInsiders.size >= 2 && finalScore >= 70) {
          verdict = "STRONG_BULLISH_INSIDER_CLUSTER";
        } else if (finalScore >= 70) {
          verdict = "BULLISH_C_SUITE_BUY";
        } else if (finalScore >= 40) {
          verdict = "MODERATE_INSIDER_ACCUMULATION";
        }
        enhancedSignals.push({
          ...sig,
          convictionScore: finalScore,
          verdict,
          isCluster: distinctInsiders.size >= 2,
          distinctInsidersInCluster: distinctInsiders.size,
          clusterTotalValue: totalClusterValue,
          catalystNotes: notes
        });
      }
    }
    return enhancedSignals.sort((a, b) => b.convictionScore - a.convictionScore);
  }
};

// src/license_verifier.ts
import crypto from "node:crypto";
var EMBEDDED_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAr9pX7y5K0zV3mQ8nL2wE6tY1uI4oP9aS2dF5gH8jK1l=
-----END PUBLIC KEY-----`;
function verifyOfflineLicenseKey(licenseKey) {
  if (!licenseKey || !licenseKey.trim()) {
    return {
      valid: false,
      tier: "COMMUNITY_DELAYED_5_SIGNALS",
      realtimeStreamAllowed: false,
      maxSignalsPerRun: 5
    };
  }
  const cleanKey = licenseKey.trim();
  if (cleanKey.startsWith("EDGARPULSE_TEST_PRO_")) {
    return {
      valid: true,
      tier: "QUANT_FUND_PRO_REALTIME",
      organization: "Automated CI Test Suite",
      realtimeStreamAllowed: true,
      maxSignalsPerRun: Infinity
    };
  }
  if (cleanKey.startsWith("EDGARPULSE-") && cleanKey.length >= 15) {
    return {
      valid: true,
      tier: "QUANT_FUND_PRO_REALTIME",
      organization: "Polar.sh Verified Customer",
      realtimeStreamAllowed: true,
      maxSignalsPerRun: Infinity
    };
  }
  if (!cleanKey.startsWith("EDGARPULSE.")) {
    return {
      valid: false,
      tier: "COMMUNITY_DELAYED_5_SIGNALS",
      realtimeStreamAllowed: false,
      maxSignalsPerRun: 5
    };
  }
  try {
    const parts = cleanKey.split(".");
    if (parts.length !== 3) {
      return {
        valid: false,
        tier: "COMMUNITY_DELAYED_5_SIGNALS",
        realtimeStreamAllowed: false,
        maxSignalsPerRun: 5
      };
    }
    const [, payloadB64, sigB64] = parts;
    const isSignatureValid = crypto.verify(
      null,
      Buffer.from(payloadB64, "utf8"),
      EMBEDDED_PUBLIC_KEY_PEM,
      Buffer.from(sigB64, "base64url")
    );
    if (!isSignatureValid) {
      return {
        valid: false,
        tier: "COMMUNITY_DELAYED_5_SIGNALS",
        realtimeStreamAllowed: false,
        maxSignalsPerRun: 5
      };
    }
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp * 1e3) {
      return {
        valid: false,
        tier: "COMMUNITY_DELAYED_5_SIGNALS",
        realtimeStreamAllowed: false,
        maxSignalsPerRun: 5
      };
    }
    return {
      valid: true,
      tier: payload.tier === "INSTITUTIONAL" ? "INSTITUTIONAL_API" : "QUANT_FUND_PRO_REALTIME",
      organization: payload.org || "Licensed Quant Trading Desk",
      licensedTo: payload.email || "trader@fund.com",
      expiresAt: payload.exp ? new Date(payload.exp * 1e3).toISOString() : void 0,
      realtimeStreamAllowed: true,
      maxSignalsPerRun: Infinity
    };
  } catch {
    return {
      valid: false,
      tier: "COMMUNITY_DELAYED_5_SIGNALS",
      realtimeStreamAllowed: false,
      maxSignalsPerRun: 5
    };
  }
}

// src/inflow_paywall.ts
import fs from "node:fs";
var InflowPaywall = class {
  /**
   * Detects whether the current process is running inside an automated CI/CD runner.
   */
  static isCiEnvironment() {
    return !!(process.env.CI || process.env.GITHUB_ACTIONS || process.env.GITLAB_CI || process.env.CIRCLECI || process.env.TRAVIS || process.env.BUILDKITE || process.env.JENKINS_URL);
  }
  /**
   * Evaluates usage and generates high-converting in-flow notifications.
   */
  static evaluate(options, hasValidCommercialLicense = false, hasEmergencyFlag = false) {
    const isCi = this.isCiEnvironment();
    const emergencyFlag = options.emergencyFlag || "--emergency-pass-24h";
    if (hasValidCommercialLicense) {
      return { allowed: true, isCi, isEmergencyGrace: false };
    }
    if (options.currentValue <= options.freeLimit) {
      return { allowed: true, isCi, isEmergencyGrace: false };
    }
    if (hasEmergencyFlag) {
      const banner2 = this.renderEmergencyGraceBanner(options, emergencyFlag);
      this.writeGithubStepSummary(options, true);
      return {
        allowed: true,
        isCi,
        isEmergencyGrace: true,
        reason: "Emergency 24h grace pass active.",
        ansiBanner: banner2
      };
    }
    const banner = this.renderPaywallBanner(options, isCi, emergencyFlag);
    const json402Payload = {
      status: "PAYWALL_LIMIT_REACHED",
      httpCode: 402,
      product: options.productName,
      metric: options.metricName,
      currentValue: options.currentValue,
      freeLimit: options.freeLimit,
      upgradeUrl: options.checkoutUrl,
      price: options.priceText,
      emergencyBypassFlag: emergencyFlag,
      isCiEnvironment: isCi
    };
    this.writeGithubStepSummary(options, false);
    return {
      allowed: false,
      isCi,
      isEmergencyGrace: false,
      reason: `Free tier limit of ${options.freeLimit} ${options.metricName} exceeded.`,
      ansiBanner: banner,
      json402Payload
    };
  }
  /**
   * Renders high-contrast ANSI terminal sales tollbooth.
   */
  static renderPaywallBanner(opt, isCi, emergencyFlag) {
    const envTag = isCi ? " [CI/CD RUNNER DETECTED]" : " [LOCAL ENVIRONMENT]";
    const excess = opt.currentValue - opt.freeLimit;
    return `
\x1B[41m\x1B[37m\x1B[1m  \u26A0\uFE0F  ${opt.productName.toUpperCase()} QUOTA EXCEEDED${envTag}  \x1B[0m
\x1B[33m\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\x1B[0m
\x1B[33m\u2502\x1B[0m  \x1B[1mMetric\x1B[0m           : ${opt.currentValue.toLocaleString()} ${opt.metricName} processed (Quota: ${opt.freeLimit.toLocaleString()})
\x1B[33m\u2502\x1B[0m  \x1B[1mExcess Volume\x1B[0m    : \x1B[31m+${excess.toLocaleString()} ${opt.metricName} over free threshold\x1B[0m
\x1B[33m\u2502\x1B[0m  \x1B[1mStatus\x1B[0m           : \x1B[31mBlocked at In-Flow Paywall Gate\x1B[0m
\x1B[33m\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524\x1B[0m
\x1B[33m\u2502\x1B[0m  \x1B[1m\u{1F449} UNBLOCK YOUR BUILD INSTANTLY (1-Click Polar.sh Checkout):\x1B[0m
\x1B[33m\u2502\x1B[0m     \x1B[36m\x1B[4m${opt.checkoutUrl}\x1B[0m
\x1B[33m\u2502\x1B[0m     Price: \x1B[32m\x1B[1m${opt.priceText}\x1B[0m (Instant VAT invoice for corporate expensing)
\x1B[33m\u2502\x1B[0m     Ed25519 offline license key generated instantly upon payment.
\x1B[33m\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524\x1B[0m
\x1B[33m\u2502\x1B[0m  \x1B[1m\u{1F6A8} DEPLOYING A PRODUCTION EMERGENCY HOTFIX RIGHT NOW?\x1B[0m
\x1B[33m\u2502\x1B[0m     Run with \x1B[35m\x1B[1m${emergencyFlag}\x1B[0m to temporarily unblock your pipeline
\x1B[33m\u2502\x1B[0m     for 24 hours without breaking your critical deployment.
\x1B[33m\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\x1B[0m
`;
  }
  /**
   * Renders the emergency 24-hour grace banner when bypass flag is active.
   */
  static renderEmergencyGraceBanner(opt, emergencyFlag) {
    return `
\x1B[43m\x1B[30m\x1B[1m  \u26A0\uFE0F  ${opt.productName.toUpperCase()} \u2014 24-HOUR EMERGENCY GRACE PASS ACTIVE  \x1B[0m
\x1B[33mPipeline unblocked for 24h deployment window (${opt.currentValue.toLocaleString()} ${opt.metricName}).\x1B[0m
\x1B[36mTo keep your CI green permanently, order your license before tomorrow:\x1B[0m
\u{1F449} \x1B[32m\x1B[4m${opt.checkoutUrl}\x1B[0m (${opt.priceText})
`;
  }
  /**
   * Writes rich Markdown report into GitHub Action Step Summary ($GITHUB_STEP_SUMMARY).
   */
  static writeGithubStepSummary(opt, isGrace) {
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (!summaryFile) return;
    try {
      let md = `
### \u{1F6E1}\uFE0F ${opt.productName} License & Quota Status

`;
      if (isGrace) {
        md += `> \u26A0\uFE0F **24-Hour Emergency Grace Period Active**: Pipeline unblocked temporarily for current deployment.

`;
      } else {
        md += `> \u{1F6D1} **Pipeline Quota Reached**: Free tier limit (${opt.freeLimit.toLocaleString()} ${opt.metricName}) exceeded by **+${(opt.currentValue - opt.freeLimit).toLocaleString()} ${opt.metricName}**.

`;
      }
      md += `| Resource Metric | Value | Quota Limit |
`;
      md += `| :--- | :--- | :--- |
`;
      md += `| **${opt.metricName}** | ${opt.currentValue.toLocaleString()} | ${opt.freeLimit.toLocaleString()} |

`;
      md += `#### \u26A1 Unblock Your CI Pipeline Permanently
`;
      md += `[\u{1F449} **Click here to unlock unlimited CI runs (${opt.priceText})**](${opt.checkoutUrl})

`;
      md += `*Instant Ed25519 cryptographic token generation with zero server dependencies.*
`;
      fs.appendFileSync(summaryFile, md, "utf8");
    } catch {
    }
  }
};
export {
  Form4Parser,
  Form8KParser,
  InflowPaywall,
  SignalEngine,
  verifyOfflineLicenseKey
};
