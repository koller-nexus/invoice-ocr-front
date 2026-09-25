This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Install dependencies and run the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Invoice OCR Front — F0 Demo

This repository implements the Frontend F0 for the OCR invoice demo:

- Drag-and-drop image upload (PNG/JPEG/WEBP, up to ~10MB) with preview
- Mocked processing timeline: upload → preprocess → OCR (Ollama `glm-ocr`) → structure (OpenRouter) → consolidate → done/fail
- Telemetry panels:
  - Ollama panel (model label, running status, memory current/peak placeholder)
  - OpenRouter panel (model label, tokens in/out/total, estimated USD cost, latency placeholder)
- Result card: structured invoice fields + Raw JSON tab
- Cost summary: separates local Ollama resources vs OpenRouter tokens/cost
- Professional loading: skeletons, contextual progress, `aria-busy`, no orphan spinners

Notes:
- This F0 uses mocked delays and values. Backends/SSE wiring can be added later.
- Components are built with Tailwind CSS v4 and shadcn/ui; icons use lucide-react.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
