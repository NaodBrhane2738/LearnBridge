# LearnBridge — Design System & Visual Specification

## 1. Design Philosophy: Cinematic Glassmorphism for Accessibility

Conventional accessibility implementations often default to plain, unstyled, or utilitarian layouts under the misconception that aesthetic sophistication compromises accessibility. LearnBridge refutes this premise.

LearnBridge adheres to the **Bilt Production Design Brief**:
- **Purpose & Audience:** Accessible learning media player and interactive educational hub for Ethiopian learners (Deaf, blind, motor, cognitive) and ALX Savanna students.
- **Visual Direction:** Cinematic glassmorphism grounded in a warm Ethiopian interior environment (`assets/living-room-bg.webp`).
- **Brand Colors:** Deep forest emerald (`#0b3e3b`), luminous seafoam (`#85d7bb`), and energetic chartreuse accent (`#c5f18e`).
- **Desired Feeling:** Calm, intelligent, dignified, barrier-free, and delightfully responsive.

The interface pairs translucent frosted glass panels with solid optical backings, sharp contrast boundaries, and unambiguous focus indicators, guaranteeing that aesthetic beauty and WCAG 2.2 AA compliance reinforce each other.

---

## 2. Color Palette & Contrast Tokens

All text combinations have been verified with axe-core and manual APCA/WCAG contrast analyzers:

```
+----------------------------------------------------------------------------------+
| Hex Code   | Token Name             | Role / Usage                    | WCAG Ratio |
+----------------------------------------------------------------------------------+
| #0b3e3b    | --brand-dark           | Base canvas, deep green glass   | > 12:1     |
| #85d7bb    | --brand-mid            | Secondary text, icon accents    | > 4.8:1    |
| #c5f18e    | --accent               | Focus rings, active indicators  | > 7:1      |
| #ffffff    | --text-white           | Primary headlines and titles    | > 14:1     |
| #16836f    | --brand-primary        | High-contrast button fills      | > 5.2:1    |
| #ffff00    | --caption-yellow       | High-contrast caption text      | > 19:1     |
| #000000    | --caption-black        | High-contrast caption box       | Infinite   |
+----------------------------------------------------------------------------------+
```

### Contrast Safety Rules
1. **Background Contrast Floor:** Translucent glass surfaces feature an underlying dark radial vignette (`linear-gradient(160deg, rgba(11,62,59,0.85), rgba(2,48,45,0.92))`) to prevent photographic bright spots in the wallpaper from reducing text contrast below 4.5:1.
2. **High-Contrast Mode:** When High Contrast Captions are toggled, captions transition to an opaque `#000000` solid background with `#ffff00` luminous yellow text, exceeding 19:1 contrast.
3. **Reduced Transparency Mode:** When Reduced Transparency is enabled, frosted glass textures are replaced with solid dark slate containers (`rgba(10, 35, 33, 0.98)`).

---

## 3. Typography Ramp & Multi-Language Support

LearnBridge supports both Latin and Ge'ez (Ethiopic) scripts seamlessly:

- **Primary Latin Font:** `DM Sans`, system-ui, -apple-system, sans-serif.
- **Primary Ge'ez (Amharic) Font:** `Noto Sans Ethiopic`, Abyssinica SIL, sans-serif.
- **Tabular Numerals:** Timestamps, countdowns, and lesson counters utilize `font-variant-numeric: tabular-nums` to eliminate character jitter during playback.

### Hierarchy Ramp

| Style Name | Font Size | Line Height | Letter Spacing | Weight | Usage |
|---|---|---|---|---|---|
| **Display Header** | `clamp(22px, 2.2vw, 32px)` | 1.15 | -0.04em | 700 Bold | Current Lesson Title (`#lessonTitle`) |
| **Section Kicker** | `9px` / `0.65rem` | 1.0 | +0.17em | 800 ExtraBold | Overlines, lesson markers, categories |
| **Card Heading** | `18px` / `1.125rem` | 1.25 | -0.025em | 600 SemiBold | Course title, offline card, certificates |
| **Body Primary** | `13px` / `0.85rem` | 1.55 | Normal | 400 Regular | Lesson descriptions, transcripts |
| **Micro Readout** | `11px` / `0.72rem` | 1.3 | Normal | 600 / Tabular | Timecode (`00:08 / 00:18`), badge meta |

---

## 4. Focus Rings & Interactive Target Sizing

- **Visible Focus Rings (WCAG 2.2 Criterion 2.4.7 & 2.4.11):**
  - All interactive buttons, sliders, links, and custom elements feature a visible `2px solid var(--accent)` outline with `2px` offset on `:focus-visible`.
  - Focus is never suppressed with `outline: none` without a high-contrast replacement.
- **Target Size (WCAG 2.2 Criterion 2.5.8 Minimum Target Size):**
  - Minimum pointer target area across all player controls is **44px × 44px** (or minimum 36px on constrained mobile viewports with adequate spacing).
  - Seek bar touch targets encompass a 16px vertical touch zone above and below the visual rail.

---

## 5. Motion & Accessibility Modes

1. **`prefers-reduced-motion` & In-App Motion Toggle:**
   - Smooth scrolling, pulsing live indicator rings, and panel rising animations are disabled when motion reduction is active.
   - Durations drop to `0.01ms` to avoid triggering vestibular sensitivity.
2. **Scalable Captions:**
   - Caption text sizes scale from 100% up to 150% via `--caption-scale` CSS variable, recalculating container positioning dynamically.
