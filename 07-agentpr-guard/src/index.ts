import { DiffParser, type DiffScanResult } from './diff_parser.ts';
import { SupplyChainAudit, type SupplyChainViolation } from './supply_chain_audit.ts';
import { BoundaryEnforcer, type ArchitectureViolation } from './boundary_enforcer.ts';

export * from './diff_parser.ts';
export * from './supply_chain_audit.ts';
export * from './boundary_enforcer.ts';
export * from './license_verifier.ts';
export * from './inflow_paywall.ts';

export interface PrAuditReport {
  filesAnalyzed: number;
  totalAdditions: number;
  integrityScore: number; // 0 to 100
  isApproved: boolean;
  supplyChainViolations: SupplyChainViolation[];
  architectureViolations: ArchitectureViolation[];
}

export class AgentPrGuard {
  /**
   * Evaluates a git diff or pull request payload.
   */
  public static auditDiff(diffText: string): PrAuditReport {
    const scan = DiffParser.parseUnifiedDiff(diffText);
    const supplyChainViolations: SupplyChainViolation[] = [];
    const architectureViolations: ArchitectureViolation[] = [];

    // Audit added package imports
    const checkedPackages = new Set<string>();
    for (const f of scan.files) {
      for (const imp of f.addedImports) {
        if (!checkedPackages.has(imp)) {
          checkedPackages.add(imp);
          const v = SupplyChainAudit.auditPackage(imp);
          if (v) supplyChainViolations.push(v);
        }
      }

      // Check architecture boundaries
      const archV = BoundaryEnforcer.evaluateFile(f);
      architectureViolations.push(...archV);
    }

    // Check package.json manifest dependencies
    for (const dep of scan.manifestDependencies) {
      if (!checkedPackages.has(dep.name)) {
        checkedPackages.add(dep.name);
        const v = SupplyChainAudit.auditPackage(dep.name);
        if (v) supplyChainViolations.push(v);
      }
    }

    // Score computation
    let score = 100;
    score -= supplyChainViolations.length * 35;
    score -= architectureViolations.filter(v => v.severity === 'CRITICAL').length * 30;
    score -= architectureViolations.filter(v => v.severity === 'HIGH').length * 15;
    score -= architectureViolations.filter(v => v.severity === 'WARNING').length * 5;
    score = Math.max(0, Math.min(100, score));

    const isApproved = score >= 75 && !supplyChainViolations.some(v => v.severity === 'CRITICAL');

    return {
      filesAnalyzed: scan.totalFiles,
      totalAdditions: scan.totalAdditions,
      integrityScore: score,
      isApproved,
      supplyChainViolations,
      architectureViolations
    };
  }

  /**
   * Generates a GitHub PR comment in Markdown.
   */
  public static generateMarkdownReport(report: PrAuditReport): string {
    const statusIcon = report.isApproved ? '✅' : '🛑';
    const statusText = report.isApproved ? 'APPROVED — Code Integrity Verified' : 'REJECTED — Security / Architecture Violations Found';

    let md = `## Agent-PR Guard: ${statusIcon} ${statusText}\n\n`;
    md += `| Metric | Value |\n`;
    md += `| :--- | :--- |\n`;
    md += `| **Integrity Score** | **${report.integrityScore}/100** |\n`;
    md += `| **Files Audited** | ${report.filesAnalyzed} |\n`;
    md += `| **Total Additions** | +${report.totalAdditions} lines |\n\n`;

    if (report.supplyChainViolations.length > 0) {
      md += `### 🚨 Supply Chain & Hallucination Risks\n`;
      md += `| Package | Risk Type | Reason | Action |\n`;
      md += `| :--- | :--- | :--- | :--- |\n`;
      for (const v of report.supplyChainViolations) {
        md += `| \`${v.packageName}\` | **${v.type}** | ${v.reason} | ${v.suggestion} |\n`;
      }
      md += `\n`;
    }

    if (report.architectureViolations.length > 0) {
      md += `### ⚠️ Architecture & Security Violations\n`;
      md += `| File | Severity | Message |\n`;
      md += `| :--- | :--- | :--- |\n`;
      for (const a of report.architectureViolations) {
        md += `| \`${a.file}\` | \`${a.severity}\` | ${a.message} |\n`;
      }
      md += `\n`;
    }

    if (report.isApproved && report.supplyChainViolations.length === 0 && report.architectureViolations.length === 0) {
      md += `> ✨ Zero hallucinated packages or boundary breaches detected. Safe for automated merge.\n`;
    }

    return md;
  }
}
