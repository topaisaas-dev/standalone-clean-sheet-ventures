/**
 * REA UI Inspector - Automated Design Token Extractor
 * Usage: node extract_design_tokens.mjs <path-to-html-or-css>
 */

import fs from 'node:fs';
import path from 'node:path';

const targetFile = process.argv[2];

if (!targetFile) {
  console.error('Usage: node extract_design_tokens.mjs <file-path>');
  process.exit(1);
}

const content = fs.readFileSync(path.resolve(targetFile), 'utf-8');

// 1. Extract CSS Custom Properties (:root variables)
const varRegex = /--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
const tokens = {
  colors: new Set(),
  cssVariables: {},
  fonts: new Set(),
  transitions: new Set(),
  curves: new Set()
};

let match;
while ((match = varRegex.exec(content)) !== null) {
  const [, name, value] = match;
  tokens.cssVariables[`--${name}`] = value.trim();
  if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
    tokens.colors.add(value.trim());
  }
}

// 2. Extract Raw Hex Colors
const hexRegex = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
while ((match = hexRegex.exec(content)) !== null) {
  tokens.colors.add(match[0].toUpperCase());
}

// 3. Extract Font Families
const fontRegex = /font-family\s*:\s*([^;]+);/g;
while ((match = fontRegex.exec(content)) !== null) {
  tokens.fonts.add(match[1].trim());
}

// 4. Extract Transitions & Cubic-Beziers
const bezierRegex = /cubic-bezier\([^)]+\)/g;
while ((match = bezierRegex.exec(content)) !== null) {
  tokens.curves.add(match[0]);
}

const durationRegex = /\b\d+(?:\.\d+)?m?s\b/g;
while ((match = durationRegex.exec(content)) !== null) {
  tokens.transitions.add(match[0]);
}

const report = {
  target: targetFile,
  extractedAt: new Date().toISOString(),
  metrics: {
    totalCssVariables: Object.keys(tokens.cssVariables).length,
    uniqueColors: tokens.colors.size,
    uniqueFonts: tokens.fonts.size,
    uniqueBezierCurves: tokens.curves.size
  },
  cssVariables: tokens.cssVariables,
  colors: Array.from(tokens.colors).sort(),
  fonts: Array.from(tokens.fonts),
  bezierCurves: Array.from(tokens.curves),
  durations: Array.from(tokens.transitions).filter(d => d.endsWith('ms')).sort((a, b) => parseInt(a) - parseInt(b))
};

console.log(JSON.stringify(report, null, 2));
