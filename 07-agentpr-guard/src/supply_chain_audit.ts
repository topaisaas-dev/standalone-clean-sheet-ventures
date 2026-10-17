export interface SupplyChainViolation {
  packageName: string;
  type: 'HALLUCINATED_PACKAGE' | 'TYPOSQUATTING_RISK' | 'UNSCOPED_SHADOW_DEP';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  reason: string;
  suggestion: string;
}

// Well known reference packages for typosquatting checks
const CANONICAL_PACKAGES = [
  'react', 'react-dom', 'express', 'lodash', 'axios', 'typescript',
  'next', 'vue', 'esbuild', 'vite', 'webpack', 'tailwindcss',
  'dotenv', 'chalk', 'commander', 'zod', 'prisma', 'mongoose',
  'jest', 'vitest', 'playwright', 'eslint', 'prettier', 'winston'
];

export class SupplyChainAudit {
  /**
   * Calculates Levenshtein distance between two strings
   */
  public static levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  /**
   * Audits extracted package names for hallucinations and typosquatting.
   */
  public static auditPackage(pkgName: string): SupplyChainViolation | null {
    // Skip relative or node built-ins
    if (pkgName.startsWith('.') || pkgName.startsWith('/') || pkgName.startsWith('node:')) {
      return null;
    }

    const clean = pkgName.toLowerCase().trim();

    // Known LLM hallucination patterns
    const hallucinationRegexes = [
      /^(react|vue|angular)-(use|hook|modal|state)(-[a-z]+)*-(utils|context|helper|lib)$/,
      /^express-(async|jwt|router)-(middleware|wrapper)-v\d+$/,
      /^(openai|anthropic)-(helper|client|wrapper)-(sdk|v\d+)$/,
      /^fast-(jwt|auth|crypto)-(simple|secure)$/
    ];

    for (const r of hallucinationRegexes) {
      if (r.test(clean)) {
        return {
          packageName: pkgName,
          type: 'HALLUCINATED_PACKAGE',
          severity: 'CRITICAL',
          reason: `Package name '${pkgName}' matches a known synthetic LLM hallucination pattern.`,
          suggestion: `Verify package existence on npm registry (npm info ${pkgName}) before committing.`
        };
      }
    }

    // Check typosquatting against canonical libraries (distance <= 2 on short names)
    for (const canon of CANONICAL_PACKAGES) {
      if (clean === canon) return null; // Exact match is valid
      const dist = this.levenshtein(clean, canon);
      if (dist <= 2 && Math.abs(clean.length - canon.length) <= 1 && clean.length >= 4) {
        return {
          packageName: pkgName,
          type: 'TYPOSQUATTING_RISK',
          severity: 'CRITICAL',
          reason: `Suspicious similarity to canonical package '${canon}' (Levenshtein distance: ${dist}).`,
          suggestion: `Did the AI agent mean '${canon}' instead of '${pkgName}'? Check for malicious squatting.`
        };
      }
    }

    return null;
  }
}
