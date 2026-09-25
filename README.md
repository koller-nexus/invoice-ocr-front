Invoice OCR — Frontend (invoice-ocr-front)
==========================================

Next.js frontend that orchestrates invoice OCR submissions and shows runtime/telemetry for the companion backend service `invoice-ocr-poc`. This app does not run OCR itself. It:

- Accepts drag-and-drop uploads
- Compresses images in the browser (max edge 1024px, JPEG quality 0.5) before sending
- Talks to the backend via `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:8080`)
- Calls real APIs: `POST /api/v1/image/processor`, polls `GET /api/v1/invoices/:id`, and reads `GET /api/v1/runtime`
- Renders Operate Bench panels with telemetry for Ollama / OpenRouter / Jev derived from `runtime` and `invoice.usage`

Architecture
------------

How the frontend fits the current architecture:

- The browser compresses images client-side (1024px max edge, JPEG 0.5) to reduce upload and processing cost.
- The frontend forwards the already-compressed image to the backend using `POST /api/v1/image/processor` and receives an `invoice id`.
- The UI then polls the invoice using `GET /api/v1/invoices/:id` until completion and displays parsed results and usage.
- The Operate Bench uses `GET /api/v1/runtime` to show live service/runtime stats and per-engine usage panels (Ollama, OpenRouter, Jev).
- OCR is performed entirely by the backend cascade (Tesseract → Ollama → OpenRouter → Assist → Jev) with two worker pools (local CPU vs. API/network). The frontend only orchestrates and visualizes.

Companion backend (implementation of the cascade and pools):  
https://github.com/koller-nexus/invoice-ocr-poc

Embedded whiteboard (current system view):

![Invoice OCR Architecture](docs/architecture.png)

Configuration
-------------

Set the base URL for the backend API via environment variable:

Create `.env.local`:

```bash
# Defaults to http://localhost:8080 if not set
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

APIs used by the frontend (no schema assumptions here):

- `GET /api/v1/runtime` — runtime metrics and engine telemetry used by Operate Bench
- `POST /api/v1/image/processor` — submit a compressed image for OCR
- `GET /api/v1/invoices/:id` — poll invoice status/results

Getting Started
---------------

Using pnpm:

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 to access the UI.

Notes
-----

- Operate Bench panels read from `runtime` plus `invoice.usage` returned by the backend; when the backend is connected, these panels reflect real activity.
- Earlier mock references from an F0 timeline were replaced by the real API flow above.

<!-- The default Next.js README sections were removed to avoid duplication. Refer to the links below for framework docs. -->

Learn More
----------

- Next.js Documentation: https://nextjs.org/docs
- Learn Next.js (tutorial): https://nextjs.org/learn
