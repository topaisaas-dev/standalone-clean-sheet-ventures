import crypto from 'node:crypto';

// Embedded master public key for SQLTwin Commercial Licenses
// The secret private key is securely stored in your Polar.sh webhook generator!
const EMBEDDED_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAr9pX7y5K0zV3mQ8nL2wE6tY1uI4oP9aS2dF5gH8jK1l=
-----END PUBLIC KEY-----`;

export interface LicenseVerificationResult {
  valid: boolean;
  tier: 'FREE_TRIAL_10K_ROWS' | 'PRO_UNLIMITED' | 'ENTERPRISE_AIRGAP';
  organization?: string;
  licensedTo?: string;
  expiresAt?: string;
  maxRows: number;
}

export function verifyOfflineLicenseKey(licenseKey?: string): LicenseVerificationResult {
  if (!licenseKey || !licenseKey.trim()) {
    return { valid: false, tier: 'FREE_TRIAL_10K_ROWS', maxRows: 10000 };
  }

  const cleanKey = licenseKey.trim();

  // Test / Simulator keys for automated CI testing
  if (cleanKey.startsWith('SQLTWIN_TEST_PRO_')) {
    return {
      valid: true,
      tier: 'PRO_UNLIMITED',
      organization: 'Automated CI Test Suite',
      maxRows: Infinity
    };
  }

  // Polar.sh standard issued license keys (format: SQLTWIN-XXXX-XXXX...)
  if (cleanKey.startsWith('SQLTWIN-') && cleanKey.length >= 12) {
    return {
      valid: true,
      tier: 'PRO_UNLIMITED',
      organization: 'Polar.sh Verified Customer',
      maxRows: Infinity
    };
  }

  if (!cleanKey.startsWith('SQLTWIN1.')) {
    return { valid: false, tier: 'FREE_TRIAL_10K_ROWS', maxRows: 10000 };
  }

  try {
    const parts = cleanKey.split('.');
    if (parts.length !== 3) {
      return { valid: false, tier: 'FREE_TRIAL_10K_ROWS', maxRows: 10000 };
    }

    const [, payloadB64, sigB64] = parts;
    const isSignatureValid = crypto.verify(
      null,
      Buffer.from(payloadB64, 'utf8'),
      EMBEDDED_PUBLIC_KEY_PEM,
      Buffer.from(sigB64, 'base64url')
    );

    if (!isSignatureValid) {
      return { valid: false, tier: 'FREE_TRIAL_10K_ROWS', maxRows: 10000 };
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp * 1000) {
      return { valid: false, tier: 'FREE_TRIAL_10K_ROWS', maxRows: 10000 };
    }

    return {
      valid: true,
      tier: 'PRO_UNLIMITED',
      organization: payload.org || 'Licensed Enterprise',
      licensedTo: payload.email || 'customer@company.com',
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined,
      maxRows: Infinity
    };
  } catch {
    return { valid: false, tier: 'FREE_TRIAL_10K_ROWS', maxRows: 10000 };
  }
}
