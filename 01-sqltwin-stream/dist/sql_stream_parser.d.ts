import { type LicenseVerificationResult } from './license_verifier.ts';
export interface StreamParserOptions {
    salt?: string;
    licenseKey?: string;
    onLimitExceeded?: (rows: number) => void;
}
export declare class SqlStreamParser {
    private readonly fpe;
    private readonly license;
    private readonly onLimitExceeded?;
    private limitNotified;
    private totalRows;
    private inCopyBlock;
    private currentTable;
    private currentColumns;
    constructor(options?: StreamParserOptions);
    getRowsProcessed(): number;
    getLicenseStatus(): LicenseVerificationResult;
    /**
     * Transforms a single line of SQL stream in O(1) memory
     */
    processLine(line: string): string;
    private anonymizeTsvRow;
    /**
     * Preserves 100% PostgreSQL COPY TSV syntax (never breaks psql import) while replacing PII
     * with an In-App Paywall Watermark visible directly in the developer's staging UI.
     */
    private watermarkLockedTsvRow;
    private maskValueByColumn;
    private anonymizeInsertLine;
}
