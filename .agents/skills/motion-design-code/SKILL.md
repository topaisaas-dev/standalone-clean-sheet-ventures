---
name: motion-design-code
description: >-
  World-Class Motion Design as Code, Deterministic 60fps Video Synthesis,
  Zero-After Effects Autonomous Pipelines, and Charlie Hills Skill Architecture.
  Activates when designing, scripting, rendering, or automating product launch videos,
  kinetic typography, animated data charts, UI motion mockups, and programmatic video batches.
---

# Motion Design as Code & Autonomous Video Production Engine

## 1. The Core Paradigm: Deterministic Code vs. Hallucinated Pixels

Generative video diffusion models (Sora, Runway Gen-3, Kling, Luma) generate pixel approximations that hallucinate UI, distort brand logos, blur typography, and produce unreadable text. They are fundamentally unsuitable for B2B tech, SaaS products, and fintech infrastructure.

**Motion Design as Code** replaces video generators and proprietary GUI software (Adobe After Effects) with **mathematically deterministic code**:
- **Zero-After Effects Dependency**: Canvas 2D, SVG, Web Animations API, Three.js, and Remotion replace proprietary Adobe plugins and timeline keyframes.
- **Sub-Frame Determinism**: Animation state is an explicit mathematical function of time or frame index: $S(f) = f(\text{frame}, \text{fps})$. Every frame is rendered identically across machines.
- **Retina 4K Razor Sharpness**: Pure vector and HTML rasterization ensures 100% crisp typography, legible cURL syntax, and exact `#FFD600` brand hex codes.
- **Infinite Programmatic Scalability**: Adjusting text, prices, or themes takes 0 milliseconds through JSON configuration injection, enabling autonomous batch rendering (1 to 500+ videos).

---

## 2. Trigger Conditions & Decision Sequence

Activate this skill whenever the task involves:
1. Product launch films, SaaS explainer videos, or feature announcement teasers.
2. Kinetic typography, Apple Keynote-style reveals, or data chart animations.
3. Automated video rendering via headless Chromium (Puppeteer/Playwright) and FFmpeg.
4. Programmatic video batching (generating $N$ variations for marketing campaigns).
5. Transitioning motion graphics from After Effects to reproducible code.

---

## 3. The Brand Intake Protocol (`brand.json`)

Every motion production requires a deterministic Brand Intake configuration. If absent, synthesize it immediately based on the project's visual identity:

```json
{
  "brand": {
    "name": "TopAI Gateway",
    "domain": "topaigateway.com",
    "theme": "dark",
    "colors": {
      "primary": "#FFD600",
      "primary_hover": "#FFE033",
      "bg_void": "#05070B",
      "bg_card": "rgba(14, 19, 30, 0.72)",
      "accent_emerald": "#10B981",
      "accent_cyan": "#06B6D4",
      "accent_rose": "#EF4444",
      "text_main": "#F9FAFB",
      "text_muted": "#9CA3AF"
    },
    "typography": {
      "headline_font": "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
      "mono_font": "'JetBrains Mono', 'SFMono-Regular', Menlo, monospace",
      "headline_tracking": "-0.035em",
      "tabular_figures": true
    },
    "video_specs": {
      "width": 1920,
      "height": 1080,
      "aspect_ratio": "16:9",
      "fps": 60,
      "duration_sec": 30,
      "total_frames": 1800
    }
  }
}
```

---

## 4. The 6 Master Kinetic Archetypes

### Archetype 1: The Apple Keynote Film (Spatial UI & Macro Reveal)
- **Visual Vocabulary**: Heavy deep-space void (`#05070B`), subtle radial ambient glow, tight tracking headlines (`-0.035em`), spatial 3D card tilts, camera push-ins.
- **Pacing**: Deliberate slow build (1.5s), explosive transition (sub-180ms), settles with slight physical spring inertia.
- **Best For**: High-end infrastructure, developer tools, enterprise platforms.

### Archetype 2: The SaaS Launch Video (The 4-Act Problem/Solution)
- **Structure**:
  - *Act I (0–25%)*: **The Friction** (The current pain, slow latencies, token burn).
  - *Act II (25–55%)*: **The Pivot** (Introduction of the deterministic solution, edge architecture).
  - *Act III (55–80%)*: **The Mathematical Proof** (Live code, real-time benchmark comparison).
  - *Act IV (80–100%)*: **The Conversion** (Value proposition, zero-friction onboarding, CTA).

### Archetype 3: The Vox Explainer (Tactile Infographic & Technical Breakdown)
- **Visual Vocabulary**: Technical callout boxes, dynamic hairline connector lines (`stroke-dashoffset` animation), highlight tags, annotated architecture diagrams.
- **Pacing**: Steady educational rhythm, synchronized data labels.
- **Best For**: RFC protocol explainers, DORA compliance demos, API flow visualization.

### Archetype 4: The Kinetic Data Chart (Tabular & Curve Progression)
- **Visual Vocabulary**: Smooth SVG cubic bezier curves (`M ... C ...`), glowing gradient fills, real-time numeric counter incrementing with `font-variant-numeric: tabular-nums`.
- **Pacing**: Anticipation pause (0.5s) -> explosive upward surge -> smooth deceleration at peak.

### Archetype 5: The 3D Monolith & Logo Sting (WebGL / Three.js)
- **Visual Vocabulary**: Monolithic geometric 3D vector emblem, metallic roughness / PBR lighting, 360° orbital rotation, cinematic chromatic aberration on impact.
- **Duration**: 4 to 8 seconds.

### Archetype 6: The Metric Milestone Reveal (High-Impact Celebration)
- **Visual Vocabulary**: Giant tabular figure (e.g., `400 APIs`, `3.8 ms`, `-85%`), background geometric pulse, directional particle velocity burst.

---

## 5. Mathematical Kinetic Tokens (Easing Engine)

Never use generic linear or standard CSS `ease`. Use mathematically formulated parametric functions for sub-frame stepping:

```typescript
// Easing functions f(t) where t in [0, 1]
export const EASINGS = {
  // Explosive start, natural settling (Vercel / Linear Master Curve)
  easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),

  // Sharp snap-in for exits
  easeInExpo: (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),

  // Smooth symmetrical transition
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,

  // Micro-tactile spring simulation (mass=0.1, stiffness=400, damping=25)
  springSnap: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
};
```

---

## 6. The Deterministic Frame Clock Invariant

> **Hard Invariant**: In offline rendering mode, **NEVER** use `requestAnimationFrame`, `setTimeout`, `setInterval`, or `Date.now()`.
> The animation must expose a synchronous or deterministic asynchronous seeking hook:
> `window.seekFrame(frameIndex: number, totalFrames: number): Promise<void> | void`
>
> This guarantees that whether a frame takes 5ms or 5000ms to compute on GPU/CPU, the captured image represents the **exact microsecond** $t = \frac{\text{frame}}{\text{fps}}$.

---

## 7. Headless Capture & FFmpeg Assembly Pipeline

The headless rendering script drives headless Chromium through frame increments and pipes frames to FFmpeg:

```bash
# High-Fidelity 60fps H.264 MP4 with AAC Audio
ffmpeg -y -r 60 -f image2 -s 1920x1080 -i frames/frame_%05d.png \
  -i audio/soundtrack.wav -c:v libx264 -preset slow -crf 17 \
  -pix_fmt yuv420p -c:a aac -b:a 320k -shortest output.mp4
```

---

## 8. Anti-Patterns to Ban Completely

1. **Pixel Blurring & Model Hallucinations**: Never feed prompt requests to diffusion video models when text, code, or branding is present.
2. **24fps/30fps Stutter**: All digital UI and typography animations must target **60fps** minimum.
3. **Typography Layout Jitter**: Always enforce `tabular-nums` on dynamic metrics to eliminate character width shifts.
4. **Linear Deceleration**: Never allow an element to abruptly stop without exponential deceleration (`easeOutExpo` or damped spring).
5. **Asynchronous Audio Slip**: Always calculate audio timestamps directly from frame numbers: $\text{time} = \frac{\text{frame}}{60.0}$.
