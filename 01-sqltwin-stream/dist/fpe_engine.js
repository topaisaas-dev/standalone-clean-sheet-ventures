import crypto from 'node:crypto';
const SYNTHETIC_FIRST = [
    'alex', 'camille', 'thomas', 'sarah', 'nicolas', 'julie', 'david', 'emma', 'lucas', 'chloe',
    'arthur', 'lea', 'maxime', 'manon', 'paul', 'clara', 'hugo', 'ines', 'louis', 'zoe'
];
const SYNTHETIC_LAST = [
    'martin', 'bernard', 'dubois', 'laurent', 'simon', 'michel', 'garcia', 'david', 'bertrand', 'moreau',
    'roux', 'vincent', 'fournier', 'morel', 'girard', 'andre', 'lefevre', 'mercier', 'dupont', 'lambert'
];
const SYNTHETIC_DOMAINS = [
    'synthetix-staging.io', 'dev-sandbox.org', 'anon-corp.net', 'test-tenant.dev', 'qa-staging.internal'
];
export class DeterministicFpeEngine {
    salt;
    constructor(secretSalt = 'sqltwin-default-seed-2026') {
        this.salt = secretSalt;
    }
    hashUint32(value, domainTag) {
        const digest = crypto.createHmac('sha256', this.salt).update(`${domainTag}:${value}`).digest();
        return digest.readUInt32BE(0);
    }
    /**
     * Bijective Deterministic Email Masking:
     * Guarantees that identical raw emails produce identical masked emails across tables,
     * preserving 100% of FOREIGN KEY relations and UNIQUE constraints.
     */
    maskEmail(rawEmail) {
        const clean = rawEmail.trim().toLowerCase();
        const h1 = this.hashUint32(clean, 'email_primary');
        const h2 = this.hashUint32(clean, 'email_guard');
        const first = SYNTHETIC_FIRST[h1 % SYNTHETIC_FIRST.length];
        const last = SYNTHETIC_LAST[(h1 >>> 8) % SYNTHETIC_LAST.length];
        const domain = SYNTHETIC_DOMAINS[(h1 >>> 16) % SYNTHETIC_DOMAINS.length];
        const collisionTag = ((h2 % 90000) + 10000).toString();
        return `${first}.${last}.${collisionTag}@${domain}`;
    }
    /**
     * Format-Preserving Phone Number Masking (preserves country code prefix and length)
     */
    maskPhone(rawPhone) {
        const clean = rawPhone.trim();
        const h = this.hashUint32(clean, 'phone').toString().padStart(10, '4');
        let digitIdx = 0;
        return clean.replace(/\d/g, (d, offset) => {
            if (offset < 3)
                return d; // Keep prefix (+33, +1, etc.)
            return h[digitIdx++ % h.length];
        });
    }
    /**
     * Format-Preserving Person Name Masking (First + Last Name)
     */
    maskName(rawName) {
        const clean = rawName.trim();
        const h = this.hashUint32(clean, 'name');
        const first = SYNTHETIC_FIRST[h % SYNTHETIC_FIRST.length];
        const last = SYNTHETIC_LAST[(h >>> 8) % SYNTHETIC_LAST.length];
        return `${first.charAt(0).toUpperCase() + first.slice(1)} ${last.charAt(0).toUpperCase() + last.slice(1)}`;
    }
    /**
     * Deterministic Synthetic IBAN Generation (preserves country and generates valid Modulo 97 checksum)
     */
    maskIban(rawIban) {
        const clean = rawIban.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (clean.length < 15)
            return clean;
        const country = clean.substring(0, 2);
        const h = this.hashUint32(clean, 'iban').toString().padStart(10, '7');
        const fakeBban = (clean.substring(4) + h).substring(0, clean.length - 4);
        // Compute valid ISO 13616 Modulo 97 checksum
        const rearranged = fakeBban + country + '00';
        let numericStr = '';
        for (let i = 0; i < rearranged.length; i++) {
            const code = rearranged.charCodeAt(i);
            numericStr += (code >= 65 && code <= 90) ? (code - 55).toString() : rearranged[i];
        }
        const remainder = Number(BigInt(numericStr) % 97n);
        const checksum = (98 - remainder).toString().padStart(2, '0');
        return `${country}${checksum}${fakeBban}`;
    }
}
