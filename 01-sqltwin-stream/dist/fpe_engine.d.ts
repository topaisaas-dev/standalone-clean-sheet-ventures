export declare class DeterministicFpeEngine {
    private readonly salt;
    constructor(secretSalt?: string);
    private hashUint32;
    /**
     * Bijective Deterministic Email Masking:
     * Guarantees that identical raw emails produce identical masked emails across tables,
     * preserving 100% of FOREIGN KEY relations and UNIQUE constraints.
     */
    maskEmail(rawEmail: string): string;
    /**
     * Format-Preserving Phone Number Masking (preserves country code prefix and length)
     */
    maskPhone(rawPhone: string): string;
    /**
     * Format-Preserving Person Name Masking (First + Last Name)
     */
    maskName(rawName: string): string;
    /**
     * Deterministic Synthetic IBAN Generation (preserves country and generates valid Modulo 97 checksum)
     */
    maskIban(rawIban: string): string;
}
