---
name: rea-ui-inspector
description: >-
  Reverse-Engineering of User Interfaces, Vector Assets, and Design Systems based on the REA
  (Reverse Engineer Anything - morluto/rea) Evidence-Based Methodology.
  Activates when analyzing, extracting, decompiling, or auditing competitor web apps, Electron binaries,
  compiled web bundles, SVG icon libraries, typography scales, color palettes, and motion curves.
---

# REA UI Inspector & Design System Decompiler

## 1. The Core Philosophy: Evidence-Based UI/UX Reverse-Engineering

Inspired by **REA (Reverse Engineer Anything - morluto/rea)**, this skill establishes an uncompromising **investigator methodology** for user interfaces. Instead of guessing or approximating visual systems:
- **No Hallucination**: Every token, color code, curve, and font dimension is extracted directly from compiled assets, stylesheets, DOM trees, or byte traces.
- **Evidence-Citing**: Every extracted value is backed by its source selector, computed CSS rule, or AST declaration.
- **Transmutation to Deterministic Code**: Translates extracted proprietary or compiled interfaces into clean, standalone, framework-agnostic CSS/SVG/TypeScript tokens ready for Antigravity & Gemini agents.

---

## 2. Trigger Conditions & Activation Gate

Activate this skill when:
1. Asked to analyze, reverse-engineer, or clone the design system of an existing web app, SaaS platform, or Electron binary.
2. Extracting the exact color palette, contrast ratios, and typography scale from a compiled web page or URL.
3. Decompiling and purifying inline SVGs or icon sets from production web builds.
4. Measuring real animation timings, cubic-bezier transition curves, and spring physics from live interfaces.
5. Auditing accessibility (WCAG 2.1 AA/AAA) and design drift against reference benchmarks.

---

## 3. The 4-Stage REA Investigation Pipeline

```
┌────────────────────────┐      ┌────────────────────────┐
│  1. TARGET INGESTION   │ ───► │  2. TOKEN EXTRACTION   │
│  HTML / CSS / JS / SVG │      │  Colors, Typography,   │
│  Compiled Bundles      │      │  Motion, Spacing, Elev │
└────────────────────────┘      └────────────────────────┘
                                            │
                                            ▼
┌────────────────────────┐      ┌────────────────────────┐
│  4. SYNTHESIS & OUTPUT │ ◄─── │  3. SVG PURIFICATION   │
│  design-tokens.json    │      │  Strip React/Vue noise │
│  CSS :root variables   │      │  Normalize viewBox/D   │
└────────────────────────┘      └────────────────────────┘
```

### Stage 1: Target Ingestion & Bundle Disassembly
- Ingest compiled HTML/CSS files, `<style>` blocks, or CSS custom property trees.
- Trace `:root` variables, utility classes (Tailwind prefixes, CSS Modules hashes), and CSS-in-JS stylesheets (`styled-components`, `emotion`).
- Map component boundaries by analyzing DOM hierarchy, data attributes, and semantic landmarks.

### Stage 2: Deterministic Design Token Extraction

#### A. Color Spectrum & Contrast Audit
Extract all color instances and synthesize into functional semantic tokens:
```json
{
  "colors": {
    "background": {
      "void": "#030508",
      "surface": "rgba(13, 18, 28, 0.72)",
      "panel": "rgba(19, 26, 40, 0.85)"
    },
    "brand": {
      "primary": "#FFD600",
      "primary_hover": "#FFE033",
      "primary_tint": "rgba(255, 214, 0, 0.08)"
    },
    "text": {
      "primary": "#F9FAFB",
      "muted": "#94A3B8",
      "dim": "#64748B"
    },
    "accent": {
      "emerald": "#10B981",
      "cyan": "#06B6D4",
      "rose": "#EF4444"
    }
  }
}
```
*Contrast Check*: Run relative luminance formula:
$$L = 0.2126 \cdot R + 0.7152 \cdot G + 0.0722 \cdot B$$
Verify contrast ratio:
$$\text{Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05} \ge 4.5:1 \text{ (WCAG AA)}, \quad \ge 7:1 \text{ (WCAG AAA)}$$

#### B. Typographic Scale & Rhythm
Extract computed typography rules:
- **Font Families**: Primary display font, body UI font, monospace font.
- **Font Feature Settings**: Identify if `tabular-nums` / `tnum` is active.
- **Scale Table**:
  - `hero`: Size, weight, tracking (`letter-spacing`), line-height.
  - `h1`–`h4`: Modular scale factor (typically 1.25 or 1.333).
  - `body`: Baseline size (usually 14px or 16px) and line-height.
  - `caption`/`micro`: sub-12px badges with letter-spacing compensation.

#### C. Motion Spectrum & Bezier Extraction
Scan `@keyframes`, `transition`, and `animation` declarations to reconstruct the interaction physics:
- Match `cubic-bezier(x1, y1, x2, y2)` curves and identify their functional category:
  - Rapid entry: `cubic-bezier(0.16, 1, 0.3, 1)` (Vercel/Linear curve).
  - Snappy exit: `cubic-bezier(0.7, 0, 0.84, 0)`.
  - Micro-haptic press: `cubic-bezier(0.2, 0, 0, 1)`.
- Capture duration tiers: Instant (`sub-100ms`), Fast (`140ms`), Normal (`200ms`), Deliberate (`280ms+`).

---

### Stage 3: Vector Asset Decompilation & Sanitization

When extracting SVG icons from production bundles:
1. **Strip Runtime Framework Metadata**:
   - Remove `class`, `className`, `data-v-*`, `ng-*`, `data-test-*`, `id="svg_..."`.
   - Remove unused `<defs>`, `<clipPath>`, `<mask id="...">`, and vendor namespaces (`xmlns:sketch`, `xmlns:inkscape`).
2. **Normalize Coordinate Space**:
   - Set uniform `viewBox="0 0 24 24"` or `viewBox="0 0 32 32"`.
   - Ensure paths use vector winding rule `fill-rule="evenodd"` or standard non-zero.
3. **Format for Immediate Reuse**:
   - Output as clean standalone `.svg` or TypeScript Data-URI / inline template strings.

---

### Stage 4: Output Synthesis Standards

Every completed REA UI inspection MUST deliver:
1. **`tokens.json`**: Machine-readable token matrix.
2. **`tokens.css`**: CSS `:root` custom properties formatted for direct copy-paste.
3. **Evidence Log**: Markdown table mapping each token to its origin selector and CSS property.
4. **Actionable Implementation Diff**: The exact code needed to apply the reverse-engineered design system to the target workspace.

---

## 4. Companion Automation Tools

This skill includes standalone scripts located in `./scripts/`:
- `extract_design_tokens.mjs`: Node.js script that parses CSS/HTML text and dumps structured tokens.
- `clean_svg.mjs`: CLI utility to sanitize raw SVG strings into pure zero-dependency assets.
