export interface LicenseVerificationResult {
    valid: boolean;
    tier: 'FREE_TRIAL_10K_ROWS' | 'PRO_UNLIMITED' | 'ENTERPRISE_AIRGAP';
    organization?: string;
    licensedTo?: string;
    expiresAt?: string;
    maxRows: number;
}
export declare function verifyOfflineLicenseKey(licenseKey?: string): LicenseVerificationResult;
