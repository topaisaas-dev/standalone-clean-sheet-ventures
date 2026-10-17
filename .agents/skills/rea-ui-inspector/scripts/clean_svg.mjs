/**
 * REA UI Inspector - SVG Cleaner & Sanitizer
 * Usage: node clean_svg.mjs <input-svg-file> [output-svg-file]
 */

import fs from 'node:fs';
import path from 'node:path';

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile) {
  console.error('Usage: node clean_svg.mjs <input-svg-path> [output-path]');
  process.exit(1);
}

let svg = fs.readFileSync(path.resolve(inputFile), 'utf-8');

// 1. Strip XML declaration, doctype, comments
svg = svg.replace(/<\?xml[^>]*\?>/gi, '');
svg = svg.replace(/<!DOCTYPE[^>]*>/gi, '');
svg = svg.replace(/<!--[\s\S]*?-->/g, '');

// 2. Strip Framework & IDE metadata (data-v-*, class, className, id, xmlns:sketch, etc.)
svg = svg.replace(/\s+data-[a-zA-Z0-9_-]+="[^"]*"/g, '');
svg = svg.replace(/\s+class="[^"]*"/g, '');
svg = svg.replace(/\s+className="[^"]*"/g, '');
svg = svg.replace(/\s+xmlns:xlink="[^"]*"/g, '');
svg = svg.replace(/\s+xmlns:sketch="[^"]*"/g, '');
svg = svg.replace(/\s+sketch:type="[^"]*"/g, '');

// 3. Normalize whitespace
svg = svg.trim().replace(/\s{2,}/g, ' ');

// 4. Output
if (outputFile) {
  fs.writeFileSync(path.resolve(outputFile), svg, 'utf-8');
  console.log(`Cleaned SVG written to ${outputFile}`);
} else {
  console.log(svg);
}
