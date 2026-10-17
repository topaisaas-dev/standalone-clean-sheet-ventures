import { DeterministicFpeEngine } from './fpe_engine.ts';
import { verifyOfflineLicenseKey } from './license_verifier.ts';
export class SqlStreamParser {
    fpe;
    license;
    onLimitExceeded;
    limitNotified = false;
    totalRows = 0;
    inCopyBlock = false;
    currentTable = '';
    currentColumns = [];
    constructor(options = {}) {
        this.fpe = new DeterministicFpeEngine(options.salt || 'sqltwin-stream-seed-2026');
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
        // 1. Detect PostgreSQL COPY block entry
        // Example: COPY public.users (id, email, full_name, phone, created_at) FROM stdin;
        const copyMatch = line.match(/^COPY\s+([^\s(]+)\s*\(([^)]+)\)\s+FROM\s+stdin;/i);
        if (copyMatch) {
            this.inCopyBlock = true;
            this.currentTable = copyMatch[1];
            this.currentColumns = copyMatch[2].split(',').map(c => c.trim().toLowerCase());
            return line;
        }
        // 2. Detect COPY block exit
        if (this.inCopyBlock && trimmed === '\\.') {
            this.inCopyBlock = false;
            this.currentTable = '';
            this.currentColumns = [];
            return line;
        }
        // 3. Process Tab-Separated Values inside PostgreSQL COPY block
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
        // 4. Process INSERT INTO lines
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
        const cols = tsvLine.split('\t');
        const anonymized = cols.map((val, idx) => {
            const colName = this.currentColumns[idx] || '';
            return this.maskValueByColumn(colName, val);
        });
        return anonymized.join('\t');
    }
    /**
     * Preserves 100% PostgreSQL COPY TSV syntax (never breaks psql import) while replacing PII
     * with an In-App Paywall Watermark visible directly in the developer's staging UI.
     */
    watermarkLockedTsvRow(tsvLine) {
        const cols = tsvLine.split('\t');
        return cols.map((val, idx) => {
            if (val === '\\N' || val === '' || val === 'NULL')
                return val;
            const colName = this.currentColumns[idx] || '';
            if (colName.includes('email') || colName.includes('mail')) {
                return `locked.row.${this.totalRows}@upgrade-sqltwin.topaigateway.com`;
            }
            if (colName.includes('name') && !colName.includes('id') && !colName.includes('table')) {
                return `[SQLTWIN_TRIAL_LIMIT_UPGRADE_AT_TOPAIGATEWAY.COM]`;
            }
            if (colName.includes('phone') || colName.includes('tel') || colName.includes('mobile')) {
                return '+00000000402';
            }
            return val;
        }).join('\t');
    }
    maskValueByColumn(colName, val) {
        if (val === '\\N' || val === '' || val === 'NULL')
            return val;
        if (colName.includes('email') || colName.includes('mail')) {
            return this.fpe.maskEmail(val);
        }
        if (colName.includes('phone') || colName.includes('tel') || colName.includes('mobile')) {
            return this.fpe.maskPhone(val);
        }
        if (colName.includes('name') && !colName.includes('id') && !colName.includes('table')) {
            return this.fpe.maskName(val);
        }
        if (colName.includes('iban') || colName.includes('bank_acc')) {
            return this.fpe.maskIban(val);
        }
        return val;
    }
    anonymizeInsertLine(insertLine) {
        return insertLine.replace(/'([^']+@[\w.-]+\.\w+)'/g, (_, email) => `'${this.fpe.maskEmail(email)}'`);
    }
}
function insertLineWatermark(insertLine, rowNum) {
    return insertLine.replace(/'([^']+@[\w.-]+\.\w+)'/g, `'locked.row.${rowNum}@upgrade-sqltwin.topaigateway.com'`);
}
