---
name: elite-frontend-craft
description: >-
  World-Class Frontend Craftsmanship, Spring Physics Motion, Impeccable Anti-Slop Layouts,
  Vercel Animation Choreography, and Apple HIG Spatial Ergonomics.
  Activates when designing, implementing, auditing, or refactoring UI components, web animations,
  micro-interactions, typographic hierarchies, dashboards, modals, drawers, and tactile feedback.
---

# Elite Frontend Craftsmanship & Interaction Engine

## 1. The Core Philosophy: Eradicate "AI Slop", Enforce Real Physics

Generic AI code generates flat "AI slop": low-contrast generic card containers, nested boxes inside boxes ("cards-in-cards"), status-chip soup, linear 300ms transitions, and static forms without physical feedback.

This skill synthesizes the **4 Pillars of World-Class Interface Engineering**:
1. **Emil Kowalski's Motion Physics**: Purposeful spring mechanics, mass/stiffness tuning, the interaction frequency gate, and gesture-driven continuity.
2. **Impeccable.style's Anti-Slop Discipline**: Radical elimination of decorative noise, strong typography rhythm, distilled single-focus workflows (`/distill`, `/polish`, `/clarify`).
3. **Vercel's Web Animation Choreography**: Hardware-accelerated GPU transforms (`opacity`, `transform` exclusively), `cubic-bezier(0.16, 1, 0.3, 1)` easing, 20-40ms staggered cascades, strict `prefers-reduced-motion` fallbacks.
4. **Apple Human Interface Guidelines (HIG)**: Clarity, Deference, and Depth. Progressive blur materials, spatial coherence (origin-aware animations), and instant synchronous tactile feedback.

---

## 2. The Decision Sequence: "Should This Animate?" (The Emil Kowalski Gate)

Before writing a single line of CSS transition or JavaScript animation, evaluate the **Interaction Frequency Gate**:

| User Frequency | Gate Rule | Architectural Decision |
| :--- | :--- | :--- |
| **100+ times / day** | Keyboard shortcuts, command palettes (`Cmd+K`), tab switching | **ZERO ANIMATION. Teleport immediately (0ms).** Speed is respect. |
| **Tens of times / day** | Button clicks, dropdown toggles, list hover, table filters | **Near-imperceptible only**: sub-120ms spring response or instant state swap. |
| **Occasional** | Modal dialogs, slide-over sheets, drawers, toast notifications | **Standard physical animation**: 160ms–240ms with spatial exit/enter inertia. |
| **Rare / First-Time** | Onboarding milestones, major checkout successes, celebrations | **The Delight Budget**: Layered particle or multi-element choreographed reveal. |

> **Hard Invariant**: If you cannot name the purpose in one of these 5 words — **Feedback**, **Spatial Consistency**, **State Indication**, **Preventing Jarring Teleportation**, **Explanation** — **DO NOT ANIMATE**. "It looks cool" is a disqualifier on any working tool.

---

## 3. Motion Tokens & Physics Engine

Never invent arbitrary bezier curves like `ease` or `cubic-bezier(0.4, 0, 0.2, 1)`. Use these mathematically calibrated tokens:

### A. Easing Curves (CSS Tokens)

```css
:root {
  /* The Vercel / Linear Master Curve: Explosive start, natural settling */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  
  /* Swift Exit Curve: Snappy departure, never lingers */
  --ease-in-expo: cubic-bezier(0.7, 0, 0.84, 0);
  
  /* Smooth Symmetrical Morph: For shared layouts and container expansions */
  --ease-in-out-smooth: cubic-bezier(0.65, 0, 0.35, 1);
  
  /* Tactile Micro-Press: Instant response curve */
  --ease-press: cubic-bezier(0.2, 0, 0, 1);

  /* Duration Scale (Sub-250ms rule) */
  --duration-instant: 80ms;   /* Button press down, checkbox toggle */
  --duration-fast: 140ms;      /* Tooltip, popover, hover feedback */
  --duration-normal: 200ms;    /* Modal enter, dropdown open, toast */
  --duration-deliberate: 280ms;/* Large sheet/drawer slide, page transition */
}
```

### B. Spring Physics Matrix (Framer Motion / Motion.dev)

| Scenario | Mass ($m$) | Stiffness ($k$) | Damping ($c$) | Feel & Visual Sensation |
| :--- | :---: | :---: | :---: | :--- |
| **Micro-Haptic Press** | `0.1` | `400` | `25` | Snappy, crisp tactile click without wobble. |
| **Popover / Dropdown** | `0.5` | `300` | `28` | Natural expansion, settles instantly into place. |
| **Modal / Dialog Enter** | `0.8` | `260` | `26` | Substantial, authoritative presence with slight cushion. |
| **Drawer / Sheet Slide** | `1.0` | `220` | `28` | Heavy physical sliding sheet with friction dampening. |
| **Dynamic Island Morph** | `0.6` | `320` | `24` | Organic fluid reshape with subtle elastic overshoot. |

---

## 4. The Anti-Slop Invariants (Impeccable.style Protocol)

When building or reviewing UI, enforce these non-negotiable craft invariants:

1. **Eradicate "Status-Chip Soup"**:
   - *Bad*: 4 badges per row (`[LIVE]`, `[ACTIVE]`, `[HEALTHY]`, `[SYNCED]`) cluttering the eye.
   - *Good*: A single 6px glowing dot with high-contrast tabular typography, or plain plain-text status.
2. **No "Cards in Cards" Nesting**:
   - Avoid infinite boxes inside boxes. Use hairline dividers (`1px solid rgba(255,255,255,0.08)`), subtle background value shifts (e.g. `2%` luminance delta), or pure whitespace rhythm instead of border enclosures.
3. **Typography Authority**:
   - Hero headlines: Tight negative tracking (`letter-spacing: -0.035em`), bold weight, line-height `1.1`.
   - Tabular data & metrics: Always apply `font-variant-numeric: tabular-nums` to prevent layout jitter on live updates.
   - Micro-labels: Uppercase, `letter-spacing: 0.08em`, font-size `10px` to `11px`, high contrast.
4. **Origin-Aware Spatial Anchors**:
   - Modals and popovers must originate from the trigger point (the button or cursor coordinates), not arbitrarily pop out of the dead center of the screen.
5. **No `scale(0)` Entrances**:
   - Never scale from `0`. Scale from `0.94` or `0.96` to `1.0`. Scaling from 0 looks cartoonish and distorts text rendering during rasterization.

---

## 5. Performance & Hardware Acceleration Checklist

1. **The Compositor Golden Rule**:
   - Animate **ONLY** `transform` and `opacity`.
   - **Banned in animations**: `width`, `height`, `top`, `left`, `margin`, `padding`, `filter: blur()`, `box-shadow`. These trigger CPU layout recalculations and paint storms that drop frames on mobile.
2. **GPU Promotion (`will-change`)**:
   - Apply `will-change: transform, opacity` *only* during active transitions, or remove it upon completion to prevent excessive VRAM consumption.
3. **Accessibility (a11y) & Reduced Motion**:
   - Always wrap motion in `@media (prefers-reduced-motion: reduce)`.
   - Fallback behavior: Immediate opacity crossfade (0ms to 50ms) with zero spatial translation (`transform: none`).

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 6. Implementation Reference Blueprints

### A. The Tactile Interactive Surface (Card / Button)
```tsx
// Using Motion (motion.dev) / React
import { motion } from "framer-motion";

export const TactileButton = ({ children, onClick }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ y: -1.5, transition: { duration: 0.12, ease: [0.16, 1, 0.3, 1] } }}
    whileTap={{ scale: 0.97, y: 0, transition: { duration: 0.08, ease: [0.2, 0, 0, 1] } }}
    className="relative px-4 py-2 text-sm font-semibold text-white bg-slate-900 border border-white/10 rounded-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_8px_rgba(0,0,0,0.4)] hover:border-amber-400/40 transition-colors"
  >
    {children}
  </motion.button>
);
```

### B. The Origin-Aware Dialog / Modal
```css
/* Pure CSS @starting-style with hardware-accelerated transform */
dialog.elite-modal {
  opacity: 1;
  transform: translateY(0) scale(1);
  transition: opacity 180ms cubic-bezier(0.16, 1, 0.3, 1),
              transform 180ms cubic-bezier(0.16, 1, 0.3, 1),
              overlay 180ms allow-discrete,
              display 180ms allow-discrete;
}

@starting-style {
  dialog.elite-modal[open] {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }
}

dialog.elite-modal::backdrop {
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  opacity: 1;
  transition: opacity 180ms ease-out;
}

@starting-style {
  dialog.elite-modal[open]::backdrop {
    opacity: 0;
  }
}
```
