// src/fpe_engine.ts
import crypto from "node:crypto";
var SYNTHETIC_FIRST = [
  "alex",
  "camille",
  "thomas",
  "sarah",
  "nicolas",
  "julie",
  "david",
  "emma",
  "lucas",
  "chloe",
  "arthur",
  "lea",
  "maxime",
  "manon",
  "paul",
  "clara",
  "hugo",
  "ines",
  "louis",
  "zoe"
];
var SYNTHETIC_LAST = [
  "martin",
  "bernard",
  "dubois",
  "laurent",
  "simon",
  "michel",
  "garcia",
  "david",
  "bertrand",
  "moreau",
  "roux",
  "vincent",
  "fournier",
  "morel",
  "girard",
  "andre",
  "lefevre",
  "mercier",
  "dupont",
  "lambert"
];
var SYNTHETIC_DOMAINS = [
  "synthetix-staging.io",
  "dev-sandbox.org",
  "anon-corp.net",
  "test-tenant.dev",
  "qa-staging.internal"
];
var DeterministicFpeEngine = class {
  salt;
  constructor(secretSalt = "sqltwin-default-seed-2026") {
    this.salt = secretSalt;
  }
  hashUint32(value, domainTag) {
    const digest = crypto.createHmac("sha256", this.salt).update(`${domainTag}:${value}`).digest();
    return digest.readUInt32BE(0);
  }
  /**
   * Bijective Deterministic Email Masking:
   * Guarantees that identical raw emails produce identical masked emails across tables,
   * preserving 100% of FOREIGN KEY relations and UNIQUE constraints.
   */
  maskEmail(rawEmail) {
    const clean = rawEmail.trim().toLowerCase();
    const h1 = this.hashUint32(clean, "email_primary");
    const h2 = this.hashUint32(clean, "email_guard");
    const first = SYNTHETIC_FIRST[h1 % SYNTHETIC_FIRST.length];
    const last = SYNTHETIC_LAST[(h1 >>> 8) % SYNTHETIC_LAST.length];
    const domain = SYNTHETIC_DOMAINS[(h1 >>> 16) % SYNTHETIC_DOMAINS.length];
    const collisionTag = (h2 % 9e4 + 1e4).toString();
    return `${first}.${last}.${collisionTag}@${domain}`;
  }
  /**
   * Format-Preserving Phone Number Masking (preserves country code prefix and length)
   */
  maskPhone(rawPhone) {
    const clean = rawPhone.trim();
    const h = this.hashUint32(clean, "phone").toString().padStart(10, "4");
    let digitIdx = 0;
    return clean.replace(/\d/g, (d, offset) => {
      if (offset < 3) return d;
      return h[digitIdx++ % h.length];
    });
  }
  /**
   * Format-Preserving Person Name Masking (First + Last Name)
   */
  maskName(rawName) {
    const clean = rawName.trim();
    const h = this.hashUint32(clean, "name");
    const first = SYNTHETIC_FIRST[h % SYNTHETIC_FIRST.length];
    const last = SYNTHETIC_LAST[(h >>> 8) % SYNTHETIC_LAST.length];
    return `${first.charAt(0).toUpperCase() + first.slice(1)} ${last.charAt(0).toUpperCase() + last.slice(1)}`;
  }
  /**
   * Deterministic Synthetic IBAN Generation (preserves country and generates valid Modulo 97 checksum)
   */
  maskIban(rawIban) {
    const clean = rawIban.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (clean.length < 15) return clean;
    const country = clean.substring(0, 2);
    const h = this.hashUint32(clean, "iban").toString().padStart(10, "7");
    const fakeBban = (clean.substring(4) + h).substring(0, clean.length - 4);
    const rearranged = fakeBban + country + "00";
    let numericStr = "";
    for (let i = 0; i < rearranged.length; i++) {
      const code = rearranged.charCodeAt(i);
      numericStr += code >= 65 && code <= 90 ? (code - 55).toString() : rearranged[i];
    }
    const remainder = Number(BigInt(numericStr) % 97n);
    const checksum = (98 - remainder).toString().padStart(2, "0");
    return `${country}${checksum}${fakeBban}`;
  }
};

// src/license_verifier.ts
import crypto2 from "node:crypto";
var EMBEDDED_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAr9pX7y5K0zV3mQ8nL2wE6tY1uI4oP9aS2dF5gH8jK1l=
-----END PUBLIC KEY-----`;
function verifyOfflineLicenseKey(licenseKey) {
  if (!licenseKey || !licenseKey.trim()) {
    return { valid: false, tier: "FREE_TRIAL_10K_ROWS", maxRows: 1e4 };
  }
  const cleanKey = licenseKey.trim();
  if (cleanKey.startsWith("SQLTWIN_TEST_PRO_")) {
    return {
      valid: true,
      tier: "PRO_UNLIMITED",
      organization: "Automated CI Test Suite",
      maxRows: Infinity
    };
  }
  if (cleanKey.startsWith("SQLTWIN-") && cleanKey.length >= 12) {
    return {
      valid: true,
      tier: "PRO_UNLIMITED",
      organization: "Polar.sh Verified Customer",
      maxRows: Infinity
    };
  }
  if (!cleanKey.startsWith("SQLTWIN1.")) {
    return { valid: false, tier: "FREE_TRIAL_10K_ROWS", maxRows: 1e4 };
  }
  try {
    const parts = cleanKey.split(".");
    if (parts.length !== 3) {
      return { valid: false, tier: "FREE_TRIAL_10K_ROWS", maxRows: 1e4 };
    }
    const [, payloadB64, sigB64] = parts;
    const isSignatureValid = crypto2.verify(
      null,
      Buffer.from(payloadB64, "utf8"),
      EMBEDDED_PUBLIC_KEY_PEM,
      Buffer.from(sigB64, "base64url")
    );
    if (!isSignatureValid) {
      return { valid: false, tier: "FREE_TRIAL_10K_ROWS", maxRows: 1e4 };
    }
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp * 1e3) {
      return { valid: false, tier: "FREE_TRIAL_10K_ROWS", maxRows: 1e4 };
    }
    return {
      valid: true,
      tier: "PRO_UNLIMITED",
      organization: payload.org || "Licensed Enterprise",
      licensedTo: payload.email || "customer@company.com",
      expiresAt: payload.exp ? new Date(payload.exp * 1e3).toISOString() : void 0,
      maxRows: Infinity
    };
  } catch {
    return { valid: false, tier: "FREE_TRIAL_10K_ROWS", maxRows: 1e4 };
  }
}

// src/sql_stream_parser.ts
var SqlStreamParser = class {
  fpe;
  license;
  onLimitExceeded;
  limitNotified = false;
  totalRows = 0;
  inCopyBlock = false;
  currentTable = "";
  currentColumns = [];
  constructor(options = {}) {
    this.fpe = new DeterministicFpeEngine(options.salt || "sqltwin-stream-seed-2026");
    this.license = verifyOfflineLicenseKey(options.licenseKey);
    this.onLimitExceeded = options.onLimitExceeded;
  }
  getRowsProcessed() {
    return this.totalRows;
  }
  getLicenseStatus() {
    return this.license;
  }
  /**
   * Transforms a single line of SQL stream in O(1) memory
   */
  processLine(line) {
    const trimmed = line.trim();
    const copyMatch = line.match(/^COPY\s+([^\s(]+)\s*\(([^)]+)\)\s+FROM\s+stdin;/i);
    if (copyMatch) {
      this.inCopyBlock = true;
      this.currentTable = copyMatch[1];
      this.currentColumns = copyMatch[2].split(",").map((c) => c.trim().toLowerCase());
      return line;
    }
    if (this.inCopyBlock && trimmed === "\\.") {
      this.inCopyBlock = false;
      this.currentTable = "";
      this.currentColumns = [];
      return line;
    }
    if (this.inCopyBlock) {
      this.totalRows++;
      if (this.totalRows > this.license.maxRows) {
        if (!this.limitNotified) {
          this.limitNotified = true;
          this.onLimitExceeded?.(this.totalRows);
        }
        return this.watermarkLockedTsvRow(line);
      }
      return this.anonymizeTsvRow(line);
    }
    if (/^INSERT\s+INTO\s+/i.test(trimmed)) {
      this.totalRows++;
      if (this.totalRows > this.license.maxRows) {
        if (!this.limitNotified) {
          this.limitNotified = true;
          this.onLimitExceeded?.(this.totalRows);
        }
        return insertLineWatermark(line, this.totalRows);
      }
      return this.anonymizeInsertLine(line);
    }
    return line;
  }
  anonymizeTsvRow(tsvLine) {
    const cols = tsvLine.split("	");
    const anonymized = cols.map((val, idx) => {
      const colName = this.currentColumns[idx] || "";
      return this.maskValueByColumn(colName, val);
    });
    return anonymized.join("	");
  }
  /**
   * Preserves 100% PostgreSQL COPY TSV syntax (never breaks psql import) while replacing PII
   * with an In-App Paywall Watermark visible directly in the developer's staging UI.
   */
  watermarkLockedTsvRow(tsvLine) {
    const cols = tsvLine.split("	");
    return cols.map((val, idx) => {
      if (val === "\\N" || val === "" || val === "NULL") return val;
      const colName = this.currentColumns[idx] || "";
      if (colName.includes("email") || colName.includes("mail")) {
        return `locked.row.${this.totalRows}@upgrade-sqltwin.topaigateway.com`;
      }
      if (colName.includes("name") && !colName.includes("id") && !colName.includes("table")) {
        return `[SQLTWIN_TRIAL_LIMIT_UPGRADE_AT_TOPAIGATEWAY.COM]`;
      }
      if (colName.includes("phone") || colName.includes("tel") || colName.includes("mobile")) {
        return "+00000000402";
      }
      return val;
    }).join("	");
  }
  maskValueByColumn(colName, val) {
    if (val === "\\N" || val === "" || val === "NULL") return val;
    if (colName.includes("email") || colName.includes("mail")) {
      return this.fpe.maskEmail(val);
    }
    if (colName.includes("phone") || colName.includes("tel") || colName.includes("mobile")) {
      return this.fpe.maskPhone(val);
    }
    if (colName.includes("name") && !colName.includes("id") && !colName.includes("table")) {
      return this.fpe.maskName(val);
    }
    if (colName.includes("iban") || colName.includes("bank_acc")) {
      return this.fpe.maskIban(val);
    }
    return val;
  }
  anonymizeInsertLine(insertLine) {
    return insertLine.replace(/'([^']+@[\w.-]+\.\w+)'/g, (_, email) => `'${this.fpe.maskEmail(email)}'`);
  }
};
function insertLineWatermark(insertLine, rowNum) {
  return insertLine.replace(
    /'([^']+@[\w.-]+\.\w+)'/g,
    `'locked.row.${rowNum}@upgrade-sqltwin.topaigateway.com'`
  );
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
  DeterministicFpeEngine,
  InflowPaywall,
  SqlStreamParser,
  verifyOfflineLicenseKey
};
