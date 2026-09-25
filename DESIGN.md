---
name: invoice-ocr-front
description: Night proof console for invoice OCR — Cursor/Vercel black, white ink, one red.
colors:
  void-black: oklch(0 0 0)
  panel-graphite: oklch(0.12 0 0)
  signal-white: oklch(0.985 0 0)
  ink-white: oklch(0.93 0 0)
  wash: oklch(0.18 0 0)
  pencil-gray: oklch(0.63 0 0)
  hairline: oklch(1 0 0 / 10%)
  focus-ring: oklch(0.55 0 0)
  audit-red: oklch(0.704 0.191 22.216)
  primary-foreground: oklch(0 0 0)
typography:
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.375
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.333
  mono:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  pill: "1.625rem"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.signal-white}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  button-primary-hover:
    backgroundColor: "color-mix(in oklch, oklch(0.985 0 0) 80%, transparent)"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  button-outline:
    backgroundColor: "{colors.void-black}"
    textColor: "{colors.ink-white}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  button-outline-hover:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink-white}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  card:
    backgroundColor: "{colors.panel-graphite}"
    textColor: "{colors.ink-white}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "1rem"
  badge-secondary:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.ink-white}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    height: "1.25rem"
  badge-default:
    backgroundColor: "{colors.signal-white}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    height: "1.25rem"
  metric-tile:
    backgroundColor: "{colors.panel-graphite}"
    textColor: "{colors.ink-white}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.75rem"
  dropzone:
    backgroundColor: "{colors.void-black}"
    textColor: "{colors.pencil-gray}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "1.5rem"
---

# Design System: invoice-ocr-front

## Overview

**Creative North Star: "The Night Proof Room"**

This is an operate surface for reading invoices, not a marketing page. The Proof Room now runs at night: a Cursor/Vercel-grade black console where a scan is checked, fields are confirmed, and missing evidence stays missing. Personality is austere and operational. Brand lives in white ink on void, hairline rings, and a single chromatic exception.

Density is high and even. Geist carries every voice (the same face Vercel ships); Geist Mono appears only when the content is raw. Surfaces recede as graphite panels on true black. The visitor's success is finishing the job: upload, watch the pipeline, read the structured result, trust the telemetry or see that it is unavailable.

The system rejects the SaaS card kit and the cream-paper Proof Room: no grey drop shadows, no decorative gradients, no neon accent, no tracked-out ALL-CAPS eyebrows.

**Key Characteristics:**
- Dark-default black-and-white; chroma reserved for errors
- Geist + Geist Mono; compact operate type scale (no display hero)
- Geist icons (16px / 1.5 stroke); Lucide is not used on the bench
- Flat surfaces at rest; hairline + frost instead of structural shadow
- White primary action on black canvas
- Unavailable metrics render as “—”, never as invented precision
- Light is a secondary token map (`.light`), not the default

## Colors

A one-bit night palette at the Cursor/Vercel craft bar: void, graphite, white, and one audit stamp.

### Primary
- **Signal White**: Action fill and running-state badges. Process and the live chip invert the night so the next committed action is the brightest object on the bench.

### Secondary
Omitted as a second accent. `wash` is a graphite lift (muted / secondary / accent share one value), not a brand color.

### Neutral
- **Ink White**: Body and heading text on black. Slightly off-white so it does not bloom on OLED.
- **Void Black**: Page canvas. True black, the Vercel ground.
- **Panel Graphite**: Cards and popovers, one step above the void.
- **Wash**: Secondary buttons, muted wells, skeleton pulse, tab track, card footers.
- **Pencil Gray**: Descriptions, helper copy, metric labels, dropzone instruction.
- **Hairline**: Borders and separators at 10% white.
- **Focus Ring**: `:focus-visible` ring. Keyboard focus must remain visible on black.
- **Primary Foreground**: Black ink sitting on Signal White.

### Tertiary
- **Audit Red**: The only chromatic token. Errors, invalid fields, destructive badges, and failed timeline steps. Its rarity is the signal.

**The Rare Ink Rule.** Audit Red is the only chromatic voice. It appears only for errors, invalid state, and destructive actions. Neutrals do the rest.

## Typography

**Display Font:** Geist (with ui-sans-serif, system-ui)
**Body Font:** Geist (same family; this system does not split display and body)
**Label/Mono Font:** Geist Mono (with ui-monospace) for raw JSON and machine dumps only

**Character:** A single contemporary grotesque, tightly set for operate density. No display size exists on the incumbent surface; hierarchy is weight and mute, not scale theatrics.

### Hierarchy
- **Headline** (500, 1rem, leading-snug): Card titles. The named station on the bench (Upload, Timeline, Result).
- **Title** (600, 1rem): Product lockup in the sticky header (`invoice-ocr-poc`).
- **Body** (400, 0.875rem, 1.5): Default interface copy, buttons, field values, timeline step names. Keep line length short inside the two-column bench.
- **Label** (400, 0.75rem): Metric captions, field `dt`s, helper text, header meta. Sentence case. Never tracked-out caps.
- **Mono** (400, 0.75rem): Raw JSON panel only. Do not use mono for UI labels.

**The Tabular Truth Rule.** Quantities, costs, durations, and token counts use `tabular-nums`. Missing telemetry is an em dash (“—”), never a fabricated figure.

## Icons

**Source:** Geist icon language from [vercel.com/geist/icons](https://vercel.com/geist/icons): 16px default, 24-unit grid, 1.5 stroke, `currentColor`, round caps. Local wrappers live in `components/icons/geist.tsx`. `@vercel/geistcn-assets` is not a public npm package; the operate bench does not add geistcn as a second UI kit.

**Set in use:** `IconFile`, `IconUpload`, `IconImage`, `IconWarning`, `IconRefreshCw`, `IconSpinner`, `IconPlay`, `IconClock`, `IconCheck`, `IconCpu`, `IconLightning`, `IconCurrencyDollar`, `IconScale`, `IconList`, `IconAlignLeft`, `IconShield`.

## Layout

A clerk's bench, not a dashboard mosaic. One sticky header (full bleed, hairline bottom, frosted void) then a centered column (`max-w-[96rem]`, horizontal padding `{spacing.lg}`, vertical padding `{spacing.lg}`).

The work surface is a 1-column stack, two columns at `md`, and a 4×4 of equal-height cells at `xl` (`grid-rows-4`, `auto-rows` min 18rem, cards `h-full`, overflow inside the body). The page may scroll; 16 cells are not forced into one viewport. Source order: upload → preview → timeline → job → fields → items → OCR → judgment → Ollama → OpenRouter → cost → assist → Jev tokens → Jev cost → Jev latency → Jev model.

Rhythm is `{spacing.sm}` / `{spacing.md}` / `{spacing.lg}` (8 / 16 / 24). Card internals use 16px (`--card-spacing`). Footer actions hug the trailing edge; status copy stays leading. No hero, no marketing grid, no numbered marketing markers — the timeline numbers exist because the pipeline is a real sequence.

## Elevation & Depth

The system is flat at rest. Depth is tonal: Void Black canvas vs Panel Graphite cards, plus a hairline ring at 10% white. The header frosts the void. Cards do not cast shadows. The one observed shadow is a state response: the active tab thumb.

### Shadow Vocabulary
- **State thumb** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.4)`): Active tab inside the default tabs list only.
- **Header frost** (no shadow; `backdrop-filter: blur(8px)` over Void Black at 60–80% opacity): Sticky header so the bench can scroll underneath.

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (active tab, focus). Cards never wear a resting drop shadow.

## Shapes

Gentle, consistent rounding from a 10px base (`--radius: 0.625rem`). Buttons and alerts sit on the large step (gently curved, 10px). Cards and the dropzone sit one step larger (14px). Compact metric tiles sit on the medium step (8px). Badges are pills (the 4xl step, 26px) so status reads as a chip, not a block.

Borders are 1px Hairline, or a 2px dashed Hairline on the dropzone that turns Ink Carbon while dragging. Focus is a 3px ring at 50% Focus Ring. Do not mix a second radius language (sharp editorial corners, squircles, heavy 24px blobs) on this surface.

## Components

Refined and restrained — compact primitives that recede so extracted fields and telemetry can be read.

### Buttons
- **Shape:** Gently curved large radius (10px). Default height 32px; the page uses the small size (28px) on the bench.
- **Primary:** Signal White fill, black label, medium weight. Hover mixes the fill to 80%. Active presses 1px down. Disabled at 50% opacity.
- **Outline:** Void fill, Hairline border. Hover washes with Wash. Used for Reset and Copy JSON.
- **Hover / Focus:** Color shift plus a visible 3px Focus Ring. Do not add lift shadows on buttons.

### Chips
- **Style:** Pill badges, 20px tall, label size, medium weight. Secondary (Wash) marks demo/meta. Default (Signal White) marks a running step. Outline marks pending. Destructive wash marks failure.
- **State:** Status words stay sentence/lowercase as provided (`pending`, `running`, `success`). Do not restyle them into ALL CAPS.

### Cards / Containers
- **Corner Style:** Extra-large radius (14px)
- **Background:** Panel Graphite
- **Shadow Strategy:** None at rest; Hairline white ring at 10%
- **Border:** Footer gets a Hairline top rule and a Wash well
- **Internal Padding:** 16px (`--card-spacing`); 12px when `size="sm"`

### Inputs / Fields
No standalone text-field primitive is shipped. The signature field is the **dropzone**: extra-large radius, 2px dashed Hairline, 24px padding, centered mute instruction. Dragging paints the dash Signal White and washes Wash. Preview thumbnails clip to the large radius inside a muted well.

- **Focus:** Native file input is visually hidden and covers the dropzone; keyboard users get the control's accessible name (“Choose image file”).
- **Error:** Destructive Alert (Audit Red text on Panel Graphite, Hairline border) below the well — not a toast, not a modal.

### Navigation
Sticky header, not a sidebar. Product lockup (icon + Title weight + optional Secondary badge) only — no stack meta. No tabs-as-IA. In-card Tabs (Wash track, Void/Graphite active thumb) switch Result views only (Fields / OCR / Raw JSON).

### Progress
Hairline-thin track (4px, full pill, Wash) with Signal White indicator. Used for in-step pipeline progress and Ollama memory — a meter, not a decoration.

### Metric tile
Small bordered Graphite cell, medium radius, label on top (Pencil Gray, 12px), value below (medium, tabular). The telemetry grammar of the Night Proof Room.

### Timeline step
A real sequence, so numbers are allowed. Leading status glyph (check / spinner / mute dot), step title + status badge, one line of mute helper + duration. Active steps may show Progress. Do not turn this into a marketing stepper.

## Do's and Don'ts

### Do:
- **Do** speak through semantic tokens (`primary`, `muted`, `destructive`, `border`) so light and dark stay one system.
- **Do** render missing telemetry as “—” or an explicit unavailable alert (The Tabular Truth Rule).
- **Do** keep cards flat with a 10% ink ring; put frost only on the sticky header.
- **Do** keep type compact: body at 14px, labels at 12px, no display hero on operate surfaces.
- **Do** reserve Audit Red for error, invalid, and destructive — nowhere else (The Rare Ink Rule).

### Don't:
- **Don't** add resting grey drop shadows, decorative gradients, or a neon/brand accent (SaaS card kit / AI-default night UI).
- **Don't** introduce tracked-out ALL-CAPS eyebrows, middle-dot meta strings as ornament, or a second display face.
- **Don't** invent confidence, cost, or memory numbers when the backend did not provide them.
- **Don't** use Geist Mono for chrome or labels; it is for raw dumps only.
- **Don't** promote a page-specific layout (the two-column bench) into a global marketing grid.
