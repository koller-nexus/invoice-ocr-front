# Project instructions

## Next.js and React

- This project may use a Next.js version with breaking changes. Before writing or changing application code, read the relevant guide in `node_modules/next/dist/docs/` from this repository. Follow the installed version's APIs and heed deprecation notices; do not rely on conventions from a different Next.js version.
- Apply the project React and Next.js performance guidance in [`.agents/skills/vercel-react-best-practices/AGENTS.md`](.agents/skills/vercel-react-best-practices/AGENTS.md) when writing, reviewing, or refactoring React code. Consult the relevant rules and examples for the change; do not apply optimizations mechanically when they conflict with correctness or clarity.

## Frontend design

- For frontend design work, use [`.agents/skills/frontend-design/SKILL.md`](.agents/skills/frontend-design/SKILL.md) and, when applicable, [`.agents/skills/impeccable/SKILL.md`](.agents/skills/impeccable/SKILL.md) with its referenced playbooks. Ground design choices in the product and task, preserve the existing interface when refining it, and account for responsive layouts, keyboard focus, reduced motion, accessibility, and clear user-facing copy.

## Design systems and styling

- For component libraries, design tokens, theming, and standardized UI patterns, follow [`.agents/skills/tailwind-design-system/SKILL.md`](.agents/skills/tailwind-design-system/SKILL.md) and its references. It targets Tailwind CSS v4 with CSS-first configuration; do not apply its token or theming guidance to a v3 setup.

## OCR and documents

- For OCR and scanned-document work, follow [`.agents/skills/ocr-document-processor/SKILL.md`](.agents/skills/ocr-document-processor/SKILL.md). Choose OCR or structured extraction based on the input, prefer explicit language selection when accuracy matters, and communicate uncertainty when source quality limits confidence.

## General

- Treat the skill documents and their linked references as detailed, task-specific guidance. Read the relevant material before work; this file summarizes common project expectations and does not replace those instructions.
- Keep changes focused on the requested task and follow the repository's existing conventions where these instructions do not specify otherwise.
