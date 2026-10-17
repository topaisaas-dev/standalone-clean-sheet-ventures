export interface ChangedFile {
  path: string;
  additions: number;
  deletions: number;
  addedLines: string[];
  addedImports: string[];
}

export interface DiffScanResult {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  files: ChangedFile[];
  manifestDependencies: { name: string; version: string; file: string }[];
}

export class DiffParser {
  /**
   * Parses unified git diff text and isolates added lines and package imports.
   */
  public static parseUnifiedDiff(diffText: string): DiffScanResult {
    const files: ChangedFile[] = [];
    const manifestDependencies: { name: string; version: string; file: string }[] = [];

    const fileBlocks = diffText.split(/^diff --git /m).filter(Boolean);

    for (const block of fileBlocks) {
      const headerMatch = block.match(/^[a-z]\/(.*?)\s+[b-z]\/(.*?)$/m);
      if (!headerMatch) continue;

      const filePath = headerMatch[2].trim();
      const lines = block.split('\n');

      let additions = 0;
      let deletions = 0;
      const addedLines: string[] = [];
      const addedImports: string[] = [];

      for (const line of lines) {
        if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) {
          continue;
        }

        if (line.startsWith('+')) {
          additions++;
          const cleanLine = line.slice(1).trim();
          addedLines.push(cleanLine);

          // Extract JS/TS imports: import ... from 'package' or require('package')
          const esmMatch = cleanLine.match(/from\s+['"]([^'"]+)['"]/);
          if (esmMatch) {
            addedImports.push(esmMatch[1]);
          } else {
            const reqMatch = cleanLine.match(/require\(['"]([^'"]+)['"]\)/);
            if (reqMatch) {
              addedImports.push(reqMatch[1]);
            }
          }

          // Check if modifying package.json dependencies
          if (filePath.endsWith('package.json')) {
            const depMatch = cleanLine.match(/"([^"]+)":\s*"([^"]+)"/);
            if (depMatch && !['name', 'version', 'description', 'main', 'scripts', 'author', 'license'].includes(depMatch[1])) {
              manifestDependencies.push({ name: depMatch[1], version: depMatch[2], file: filePath });
            }
          }
        } else if (line.startsWith('-')) {
          deletions++;
        }
      }

      files.push({
        path: filePath,
        additions,
        deletions,
        addedLines,
        addedImports
      });
    }

    const totalAdditions = files.reduce((acc, f) => acc + f.additions, 0);
    const totalDeletions = files.reduce((acc, f) => acc + f.deletions, 0);

    return {
      totalFiles: files.length,
      totalAdditions,
      totalDeletions,
      files,
      manifestDependencies
    };
  }
}
