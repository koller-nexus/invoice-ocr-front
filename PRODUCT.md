# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: an engineer or PM validating the invoice-OCR proof of concept. They sit with a real or anonymized invoice image, run the pipeline, and need to answer two questions without leaving the UI: did the job work, and what did this invoice cost in tokens, money, time, and local memory.

Secondary audiences documented in `docs/frontend-PRD.md` (not primary): stakeholders watching a demo of local OCR vs cloud structuring, and the POC backend developer checking that the UI consumes job/status events.

## Product Purpose

invoice-ocr-poc is the frontend for a proof of concept that turns an invoice image into structured fields while making the pipeline and its trade-offs visible.

It exists because OCR-plus-structuring is usually a black box: a file goes in, JSON comes out, and nobody can see which step is running, whether local Ollama/`glm-ocr` is consuming memory, or what the OpenRouter stretch costs. Success for this product is a complete demo (upload → result + costs) with no terminal intervention, and a stakeholder or validator who can answer “what did this invoice cost?” and “did Ollama hold memory?” from the UI alone.

## Positioning

The mechanism that a neighboring “upload and get JSON” tool cannot truthfully copy is **observable hybrid extraction**: local OCR on Ollama (`glm-ocr`) plus cloud structuring on OpenRouter, shown as a live step timeline with separated local-resource vs token-dollar costs. The frontend is the POC vitrine, not a black-box extractor.

## Operating Context

- Single web page: upload + preview, six-step job timeline, Ollama telemetry, OpenRouter telemetry, structured result, run cost summary.
- Pipeline steps: upload received → preprocess → OCR via Ollama (`glm-ocr`) → structure via OpenRouter → consolidate → done/fail.
- Current ship is **F0**: mocked delays and values. Real job create, SSE/WebSocket (SSE preferred), and live telemetry are later phases (F1–F3 in the PRD).
- Inputs today: PNG, JPEG, WEBP, max 10MB, client-side MIME and size validation, image preview before Process.
- Internal demo environment; desktop-first, tablet acceptable, mobile basic.
- Dev entry: `pnpm dev` (Next.js App Router). Product record: `docs/frontend-PRD.md`.

## Capabilities and Constraints

Confirmed:

- Upload (drag-and-drop + file picker), process, reset, copy result JSON.
- Timeline statuses: `pending` | `running` | `success` | `error`, with duration and optional message.
- Telemetry panels for Ollama (model, status, memory current/peak, OCR duration) and OpenRouter (model, latency, prompt/completion/total tokens, estimated USD).
- Result fields (vendor, VAT/CNPJ, invoice number, dates, currency, subtotal, tax, total, line items) plus raw JSON.
- Cost summary separates local Ollama resources (memory, time) from OpenRouter tokens/USD. Costs are labeled estimates. The UI must not invent metrics: missing values render as “—” or an explicit unavailable state.
- No API keys or secrets in the client. UI logs must not send invoice PII to analytics.
- Out of POC scope: multi-tenant auth/SSO, long job history with real billing, supervised field editing, multi-region/PWA, model training.
- Native PDF is out of scope; image-only (PNG/JPEG/WEBP).
- Product UI copy and API error messages are English. Stack is already Next.js + TypeScript + Tailwind CSS + shadcn/ui (do not add a second UI kit).
- Professional loading is required: skeletons, contextual progress, `aria-busy`, no orphan spinner.

Explicitly undecided:

- Ollama telemetry: dedicated endpoint vs only job events.
- Currency and price table: fixed in the backend vs configurable.
- Job history in this POC vs current run only.
- Suggested internal success sample (N ≈ 10 real/anonymized invoices) is a PRD suggestion, not a committed quota.

## Brand Commitments

- Product name to preserve: **invoice-ocr-poc** (header lockup). Repository package name `invoice-ocr-front` is not the product name.
- Voice: English, operational, sentence case. Errors are actionable, not apologetic. Status words stay as pipeline states (`pending`, `running`, `success`, `error`).
- No separate marketing brand, logo file, or identity system was committed beyond this lockup and the English operate voice.
- Standing visual preference (user-pinned 2026-09-25): dark-default black-and-white at the craft bar of Cursor and Vercel. Light remains a secondary token map, not the default. No second brand accent.

## Evidence on Hand

- Product spec: `docs/frontend-PRD.md` (draft 0.2, 2026-09-25).
- Implemented F0 surface: `app/page.tsx` (mocked pipeline and mock invoice “Acme Supplies Ltd.”).
- No real customer testimonials, production benchmarks, pricing tables, or press. Future work must not fabricate customers, measured cost benchmarks, or “N successful runs” claims.

## Product Principles

1. **Make the black box readable.** Every run must show which step is active and how local OCR vs cloud structuring is paying for itself.
2. **Do not invent evidence.** If the backend omitted a metric or field, show “—” or unavailable — never a plausible number.
3. **Separate local resource from cloud spend.** Ollama is memory and time; OpenRouter is tokens and estimated USD. Never blend them into one unlabeled cost.
4. **Demo without a terminal.** The validator finishes upload → result + costs in the UI alone.
5. **Keep secrets and invoice PII off the client telemetry path.** Keys stay off the bundle; analytics do not log invoice content.

## Accessibility & Inclusion

Required on the main flow (PRD NFR-3): accessible names/labels, keyboard focus, and contrast sufficient to complete upload, process, and read result/costs. Dynamic status must be announced (`aria-live` / `aria-busy`). No further product-specific disability requirement was established.
