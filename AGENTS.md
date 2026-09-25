# Project instructions

## Next.js and React

- This project may use a Next.js version with breaking changes. Before writing or changing application code, read the relevant guide in `node_modules/next/dist/docs/` from this repository. Follow the installed version's APIs and heed deprecation notices; do not rely on conventions from a different Next.js version.
- Performance and correctness are guided by Vercel’s best practices. Apply the rules in [`.agents/skills/vercel-react-best-practices/AGENTS.md`](.agents/skills/vercel-react-best-practices/AGENTS.md) with priority to:
  - Eliminate waterfalls (parallelize independent async, defer awaits to branches, use Suspense strategically).
  - Reduce bundle size (avoid barrel imports, dynamic-load heavy components).
  - Optimize server-side (hoist static I/O, dedupe requests, minimize RSC serialization).
  - Prevent re-render churn (derive instead of syncing state, narrow deps, functional setState).
  - Prefer resource hints and non-blocking scripts.

## Frontend design

- Use [`.agents/skills/frontend-design/SKILL.md`](.agents/skills/frontend-design/SKILL.md) for distinctive, intentional visual direction (palette, type, layout, principles). Avoid templated defaults; spend boldness once, keep the rest disciplined.
- When polishing or reshaping UI, follow [`.agents/skills/impeccable/SKILL.md`](.agents/skills/impeccable/SKILL.md):
  - Run once per session: `.agents/skills/impeccable/scripts/impeccable context --target <surface>` to load context.
  - For narrow refinements, preserve incumbent behavior and tokens; add DESIGN.md later via `document` if useful.
  - Use `audit`, `polish`, `layout`, `typeset`, `clarify`, and `animate` as needed; keep motion purposeful and minimal.
- System-level design decisions should reflect the subject matter (OCR of invoices) and emphasize clarity: scanability, hierarchy, stable layouts, accessible focus, and strong microcopy.

## Design systems and styling

- Tailwind CSS v4 only. Tokens, theming, and components follow [`.agents/skills/tailwind-design-system/SKILL.md`](.agents/skills/tailwind-design-system/SKILL.md):
  - Configure tokens with `@theme` and `@custom-variant dark`.
  - Prefer semantic tokens (primary, secondary, muted, border, ring) over hard-coded colors.
  - Use CSS-first animations defined in `@theme` and reference via variables.
  - Ensure focus styles (`ring`/`outline`) are present and visible.
- shadcn/ui is the default component baseline. Prefer composable primitives; keep variants minimal and semantically named.

## OCR and documents

- Follow [`.agents/skills/ocr-document-processor/SKILL.md`](.agents/skills/ocr-document-processor/SKILL.md):
  - Choose OCR vs. structured extraction by input type/quality; prefer explicit language hints when accuracy matters.
  - Communicate uncertainty: if telemetry/metrics aren’t provided, show “—” or an explicit “unavailable” state.
  - Treat PII with care; do not log sensitive invoice content in analytics.

## General

- Treat skills under `.agents/skills/**` as the authoritative playbooks. Read the relevant material before work; this file aggregates the most critical points only.
- Preserve existing interfaces when refining; do not introduce layout shift during loading. Use skeletons, aria-busy, and contextual progress over orphan spinners.
- Accessibility: provide labels, keyboard focus, `prefers-reduced-motion` respect, descriptive errors, and aria-live for dynamic status.
- Security: never embed secrets in the client. Treat Server Actions like public endpoints (authZ inside each action).
- DX: keep functions short and focused, avoid global state, inject dependencies explicitly, and keep public APIs typed and documented.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
