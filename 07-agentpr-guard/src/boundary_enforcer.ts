import type { ChangedFile } from './diff_parser.ts';

export interface ArchitectureViolation {
  file: string;
  rule: 'CLIENT_BACKEND_LEAK' | 'HARDCODED_SECRET' | 'AI_SLOP_BOILERPLATE';
  severity: 'CRITICAL' | 'HIGH' | 'WARNING';
  message: string;
  snippet?: string;
}

export class BoundaryEnforcer {
  private static FORBIDDEN_CLIENT_IMPORTS = [
    'pg', 'mysql', 'mysql2', 'sqlite3', 'knex', 'typeorm', 'prisma',
    '@prisma/client', 'mongodb', 'mongoose', 'node:fs', 'node:child_process', 'fs', 'child_process'
  ];

  /**
   * Evaluates changed files against architectural boundary rules.
   */
  public static evaluateFile(file: ChangedFile): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];
    const isClientFile = /(\.(tsx|jsx)$)|(\/(components|ui|views|pages|frontend|client)\/)/i.test(file.path);

    // 1. Client-Backend Boundary Check
    if (isClientFile) {
      for (const imp of file.addedImports) {
        if (this.FORBIDDEN_CLIENT_IMPORTS.includes(imp)) {
          violations.push({
            file: file.path,
            rule: 'CLIENT_BACKEND_LEAK',
            severity: 'CRITICAL',
            message: `Client UI file directly imports server-only database/system package: '${imp}'.`,
            snippet: `import ... from '${imp}'`
          });
        }
      }
    }

    // 2. Hardcoded Secret Detection
    const secretPatterns = [
      { regex: /['"][0-9a-zA-Z]{32,45}['"]/, label: 'Potential API token' },
      { regex: /ghp_[a-zA-Z0-9]{36}/, label: 'GitHub Personal Access Token' },
      { regex: /sk-[a-zA-Z0-9]{48}/, label: 'OpenAI Secret Key' },
      { regex: /-----BEGIN PRIVATE KEY-----/, label: 'RSA/EC Private Key' }
    ];

    for (const line of file.addedLines) {
      // Ignore test files or mocks
      if (file.path.includes('test') || file.path.includes('spec') || file.path.includes('mock')) continue;

      for (const sp of secretPatterns) {
        if (sp.regex.test(line)) {
          violations.push({
            file: file.path,
            rule: 'HARDCODED_SECRET',
            severity: 'CRITICAL',
            message: `Exposed secret detected in line: ${sp.label}`,
            snippet: line.slice(0, 40) + '...'
          });
          break;
        }
      }
    }

    // 3. AI Slop Code Detection (Excessive repeating empty try-catch blocks or placeholder comments)
    let placeholderCount = 0;
    for (const line of file.addedLines) {
      if (/(TODO: implement later|placeholder for agent|will be filled in future)/i.test(line)) {
        placeholderCount++;
      }
    }

    if (placeholderCount >= 3) {
      violations.push({
        file: file.path,
        rule: 'AI_SLOP_BOILERPLATE',
        severity: 'WARNING',
        message: `High concentration of unfulfilled AI placeholders (${placeholderCount} detected).`
      });
    }

    return violations;
  }
}
