---
name: elite-frontend-design
description: >-
  World-class Frontend Architecture, UI/UX Craftsmanship, Design Systems, and Micro-Interactions.
  Activates when designing, building, or refining web interfaces, landing pages, developer dashboards,
  and interactive components to achieve the visual quality of Linear, Vercel, Stripe, and Raycast.
---

# Elite Frontend Architecture & UI/UX Craftsmanship Skill

## 1. The Core Manifesto: Eradicate "AI Slop" & Generic Templates
Generic AI code outputs flat, boring containers, harsh primary colors, default Bootstrap/Tailwind paddings, and static placeholder tables.
This skill mandates the **Linear / Vercel / Stripe Craft Standard**:
- **Atmospheric Depth**: Rich multi-layer midnight canvases, ambient radial spotlights, frosted glass surfaces (`backdrop-filter: blur(16px)`), and layered elevation tokens.
- **Hairline Precision**: 1px borders with inner highlights (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.08)`), subtle gradient borders, and optical alignment.
- **Micro-Typography**: Tight tracking on headings (`letter-spacing: -0.035em`), tabular numbers (`font-variant-numeric: tabular-nums`), and wide uppercase metadata badges (`letter-spacing: 0.08em`).
- **Tactile Feedback**: Spring-like easing curves (`cubic-bezier(0.16, 1, 0.3, 1)`), interactive state changes on hover/focus/active, and real visual responsiveness.
- **Functional Authenticity**: Components must look and feel like genuine production software: live code consoles with syntax token spans, realistic sparkline telemetry, interactive state toggles, and instant copy buttons.

---

## 2. Design Tokens & Palette System (TopAI Electric Dark)

```css
:root {
  /* Canvas & Elevation */
  --bg-void: #05070B;
  --bg-base: #090C12;
  --bg-surface: #0E131E;
  --bg-elevated: #141A28;
  --bg-glass: rgba(14, 19, 30, 0.75);

  /* Hairlines & Borders */
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-card: rgba(255, 255, 255, 0.10);
  --border-highlight: rgba(255, 214, 0, 0.35);

  /* TopAI Electric Brand Tokens */
  --primary: #FFD600;
  --primary-hover: #FFE033;
  --primary-glow: rgba(255, 214, 0, 0.18);
  --primary-tint: rgba(255, 214, 0, 0.08);

  /* Functional Telemetry */
  --accent-emerald: #10B981;
  --accent-cyan: #06B6D4;
  --accent-rose: #F43F5E;
  --accent-indigo: #6366F1;

  /* Typography */
  --text-main: #F9FAFB;
  --text-body: #D1D5DB;
  --text-muted: #9CA3AF;
  --text-dim: #6B7280;

  /* Optical Shadows */
  --shadow-card: 0 0 0 1px var(--border-card), 0 4px 20px -2px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  --shadow-elevated: 0 0 0 1px var(--border-card), 0 12px 36px -4px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  --shadow-glow: 0 0 0 1px var(--primary), 0 0 32px var(--primary-glow);
}
```

---

## 3. Typographic Hierarchy & Letter-Spacing
1. **Hero Title (`H1`)**:
   - `font-size: clamp(38px, 5.5vw, 68px);`
   - `font-weight: 900;`
   - `letter-spacing: -0.04em;`
   - `line-height: 1.05;`
   - Contrast text gradient: `linear-gradient(180deg, #FFFFFF 0%, #A1A1AA 100%)`.
2. **Section Headings (`H2`)**:
   - `font-size: clamp(28px, 3.5vw, 42px);`
   - `letter-spacing: -0.03em;`
   - `line-height: 1.15;`
3. **Card Headings (`H3`)**:
   - `font-size: 18px;`
   - `letter-spacing: -0.02em;`
   - `font-weight: 700;`
4. **Telemetry & Code (`Mono`)**:
   - `font-family: 'JetBrains Mono', 'SF Mono', monospace;`
   - `font-variant-numeric: tabular-nums;`
5. **Overline Badges & Category Tags**:
   - `text-transform: uppercase; font-size: 11px; font-weight: 800; letter-spacing: 0.08em;`

---

## 4. Component Craftsmanship Rules

### A. Bento Grid Cards
- Must feature a multi-layer border with an inset highlight (`inset 0 1px 0 rgba(255,255,255,0.08)`).
- On hover: subtle translation (`transform: translateY(-2px);`), border brightening (`border-color: rgba(255, 214, 0, 0.3);`), and subtle ambient glow expansion.
- Corner radiuses: 16px to 20px with matching inner radius on nested containers (`calc(radius - padding)`).

### B. Live Code Dispatch Console
- Always include realistic macOS/Linux window controls (three subtle colored dots: close `#EF4444`, minimize `#F59E0B`, maximize `#10B981`).
- Active tab pill with smooth highlight.
- Real syntax token spans (`.kw`, `.str`, `.fn`, `.num`, `.punct`) instead of monochrome text.
- One-click copy button with instant SVG visual checkmark change (`Copied!`).

### C. Live Telemetry & Sparkline Curves
- SVG paths with dual gradient:
  - Line stroke: solid vibrant color (e.g. `#FFD600`, stroke-width: 2.5px).
  - Area fill: linear gradient from 20% opacity to 0% transparent at bottom.
- Animated pulsating indicator dot at the curve terminus (`@keyframes pulse`).

### D. Pricing Matrix (Matryoshka Model)
- Visually highlight the "Featured" tier (e.g. Pack 2 Squad Velocity) with an electric glowing border and top floating badge.
- Feature lists should have custom SVG checkmarks (electric yellow on subtle dark circle), not generic browser bullet points.
- Secondary options (e.g., Subscribe Direct vs RapidAPI) clearly accessible.

### E. Developer Customer Portal
- Professional sidebar navigation with active indicator bar.
- Top navigation bar showing current cluster, tenant status, edge latency ping (e.g. `2.4ms Anycast CDG`), and maskable API Key.
- Metric cards showing progress bars with gradient fills, percentage deltas, and usage thresholds.
- Live Request Stream: table with monospace HTTP methods (`POST`, `GET`), route, response code badge (`200 OK` in emerald, `429` in rose), execution time in ms, and expandable payload inspector.
