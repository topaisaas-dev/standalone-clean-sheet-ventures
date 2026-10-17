export interface PaywallOptions {
    productName: string;
    metricName: string;
    currentValue: number;
    freeLimit: number;
    checkoutUrl: string;
    priceText: string;
    emergencyFlag?: string;
}
export interface InflowPaywallStatus {
    allowed: boolean;
    isCi: boolean;
    isEmergencyGrace: boolean;
    reason?: string;
    ansiBanner?: string;
    json402Payload?: Record<string, any>;
}
export declare class InflowPaywall {
    /**
     * Detects whether the current process is running inside an automated CI/CD runner.
     */
    static isCiEnvironment(): boolean;
    /**
     * Evaluates usage and generates high-converting in-flow notifications.
     */
    static evaluate(options: PaywallOptions, hasValidCommercialLicense?: boolean, hasEmergencyFlag?: boolean): InflowPaywallStatus;
    /**
     * Renders high-contrast ANSI terminal sales tollbooth.
     */
    static renderPaywallBanner(opt: PaywallOptions, isCi: boolean, emergencyFlag: string): string;
    /**
     * Renders the emergency 24-hour grace banner when bypass flag is active.
     */
    static renderEmergencyGraceBanner(opt: PaywallOptions, emergencyFlag: string): string;
    /**
     * Writes rich Markdown report into GitHub Action Step Summary ($GITHUB_STEP_SUMMARY).
     */
    static writeGithubStepSummary(opt: PaywallOptions, isGrace: boolean): void;
}
