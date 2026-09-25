/* eslint-disable react/jsx-no-target-blank */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Check,
  Clock,
  FileImage,
  Loader2,
  Play,
  RefreshCw,
  UploadCloud,
  MemoryStick,
  Activity,
  FileText,
  DollarSign,
  Zap,
} from "lucide-react";

type StepKey =
  | "upload_received"
  | "preprocess"
  | "ollama_ocr"
  | "openrouter_struct"
  | "consolidate"
  | "done";

type StepStatus = "pending" | "running" | "success" | "error";

type Step = {
  key: StepKey;
  title: string;
  status: StepStatus;
  startedAt?: number;
  endedAt?: number;
  message?: string;
};

type OpenRouterCost = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs?: number;
  model?: string;
};

type OllamaTelemetry = {
  model: string;
  memoryBytes?: number;
  memoryPeakBytes?: number;
  durationMs?: number;
  status?: "idle" | "running" | "down";
};

type InvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type InvoiceResult = {
  vendorName?: string;
  vendorVatId?: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  currency?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  items?: InvoiceItem[];
  confidence?: Record<string, number>;
  rawOcrText?: string;
};

type CostSummary = {
  openrouter: OpenRouterCost;
  ollama: {
    durationMs: number;
    memoryPeakBytes?: number;
  };
  wallClockMs: number;
};

const ACCEPTED_MIME = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function formatBytes(bytes?: number): string {
  if (!bytes && bytes !== 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let b = bytes;
  let i = 0;
  while (b >= 1024 && i < units.length - 1) {
    b = b / 1024;
    i++;
  }
  return `${b.toFixed(1)} ${units[i]}`;
}

function formatUSD(n?: number): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function formatMs(ms?: number): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const rs = Math.round(s % 60);
  return `${m}m ${rs}s`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

export default function Home() {
  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileUrl = useObjectUrl(file);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [steps, setSteps] = useState<Step[]>(() => [
    { key: "upload_received", title: "Upload received", status: "pending" },
    { key: "preprocess", title: "Preprocess image", status: "pending" },
    { key: "ollama_ocr", title: "OCR via Ollama (glm-ocr)", status: "pending" },
    { key: "openrouter_struct", title: "Structure via OpenRouter", status: "pending" },
    { key: "consolidate", title: "Consolidate result", status: "pending" },
    { key: "done", title: "Done", status: "pending" },
  ]);

  const [ollama, setOllama] = useState<OllamaTelemetry>({
    model: "glm-ocr",
    status: "idle",
    memoryBytes: undefined,
    memoryPeakBytes: undefined,
  });
  const [openrouter, setOpenrouter] = useState<OpenRouterCost>({
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
    model: "openrouter/model",
    latencyMs: undefined,
  });
  const [result, setResult] = useState<InvoiceResult | null>(null);
  const [cost, setCost] = useState<CostSummary | null>(null);
  const startedRef = useRef<number | null>(null);
  const ocrIntervalRef = useRef<number | null>(null);
  const structIntervalRef = useRef<number | null>(null);

  const hasValidFile = useMemo(() => {
    if (!file) return false;
    if (!ACCEPTED_MIME.includes(file.type)) return false;
    if (file.size > MAX_SIZE_BYTES) return false;
    return true;
  }, [file]);

  const onFile = useCallback((f: File) => {
    setError(null);
    if (!ACCEPTED_MIME.includes(f.type)) {
      setError("Invalid file type. Use PNG, JPEG, or WEBP.");
      setFile(null);
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      setError("File too large. Max 10MB.");
      setFile(null);
      return;
    }
    setFile(f);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dt = e.dataTransfer;
    if (!dt?.files?.length) return;
    onFile(dt.files[0]);
  }, [onFile]);

  const onPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
    // reset to allow re-selecting the same file later
    e.currentTarget.value = "";
  }, [onFile]);

  const resetAll = useCallback(() => {
    setIsProcessing(false);
    setResult(null);
    setCost(null);
    setOllama({ model: "glm-ocr", status: "idle", memoryBytes: undefined, memoryPeakBytes: undefined });
    setOpenrouter({ promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0, model: "openrouter/model" });
    setSteps([
      { key: "upload_received", title: "Upload received", status: "pending" },
      { key: "preprocess", title: "Preprocess image", status: "pending" },
      { key: "ollama_ocr", title: "OCR via Ollama (glm-ocr)", status: "pending" },
      { key: "openrouter_struct", title: "Structure via OpenRouter", status: "pending" },
      { key: "consolidate", title: "Consolidate result", status: "pending" },
      { key: "done", title: "Done", status: "pending" },
    ]);
    startedRef.current = null;
    if (ocrIntervalRef.current) window.clearInterval(ocrIntervalRef.current);
    if (structIntervalRef.current) window.clearInterval(structIntervalRef.current);
  }, []);

  // Simulate processing pipeline (F0 mock)
  const simulate = useCallback(async () => {
    if (!hasValidFile) return;
    setIsProcessing(true);
    setError(null);
    startedRef.current = performance.now();

    const mutateStep = (key: StepKey, s: Partial<Step>) => {
      setSteps((prev) =>
        prev.map((st) => (st.key === key ? { ...st, ...s } : st))
      );
    };

    // Step 1: upload received
    mutateStep("upload_received", { status: "running", startedAt: performance.now() });
    await sleep(600 + jitter(300));
    mutateStep("upload_received", { status: "success", endedAt: performance.now() });

    // Step 2: preprocess
    mutateStep("preprocess", { status: "running", startedAt: performance.now() });
    await sleep(800 + jitter(500));
    mutateStep("preprocess", { status: "success", endedAt: performance.now() });

    // Step 3: Ollama OCR
    setOllama((o) => ({ ...o, status: "running" }));
    mutateStep("ollama_ocr", { status: "running", startedAt: performance.now() });
    let curMem = 0;
    let peak = 0;
    ocrIntervalRef.current = window.setInterval(() => {
      curMem = clamp(curMem + 8_000_000 + Math.random() * 5_000_000, 20_000_000, 180_000_000);
      peak = Math.max(peak, curMem);
      setOllama((o) => ({ ...o, memoryBytes: curMem, memoryPeakBytes: peak }));
    }, 200);
    const ocrDuration = 2000 + jitter(1200);
    await sleep(ocrDuration);
    if (ocrIntervalRef.current) window.clearInterval(ocrIntervalRef.current);
    setOllama((o) => ({ ...o, status: "idle", durationMs: ocrDuration, memoryBytes: curMem, memoryPeakBytes: peak }));
    mutateStep("ollama_ocr", { status: "success", endedAt: performance.now() });

    // Step 4: OpenRouter struct
    mutateStep("openrouter_struct", { status: "running", startedAt: performance.now() });
    const startStruct = performance.now();
    let pt = 120;
    let ct = 0;
    structIntervalRef.current = window.setInterval(() => {
      ct = clamp(ct + Math.floor(Math.random() * 15), 0, 180);
      const total = pt + ct;
      const estimatedCostUsd = (total / 1000) * 0.005; // demo unit price
      setOpenrouter({ promptTokens: pt, completionTokens: ct, totalTokens: total, estimatedCostUsd, model: "gpt-4o-mini (via OpenRouter)", latencyMs: performance.now() - startStruct });
    }, 220);
    await sleep(1800 + jitter(1000));
    if (structIntervalRef.current) window.clearInterval(structIntervalRef.current);
    const latency = performance.now() - startStruct;
    const totalTokens = pt + ct;
    setOpenrouter((o) => ({ ...o, latencyMs: latency, totalTokens, estimatedCostUsd: (totalTokens / 1000) * 0.005 }));
    mutateStep("openrouter_struct", { status: "success", endedAt: performance.now() });

    // Step 5: consolidate
    mutateStep("consolidate", { status: "running", startedAt: performance.now() });
    await sleep(500 + jitter(400));
    mutateStep("consolidate", { status: "success", endedAt: performance.now() });

    // Step 6: done
    mutateStep("done", { status: "running", startedAt: performance.now() });

    // Produce mock result
    const mock: InvoiceResult = {
      vendorName: "Acme Supplies Ltd.",
      vendorVatId: "GB123456789",
      invoiceNumber: "INV-2026-0915",
      issueDate: "2026-09-15",
      dueDate: "2026-10-15",
      currency: "USD",
      subtotal: 420.0,
      tax: 84.0,
      total: 504.0,
      items: [
        { description: "Industrial paper rolls", quantity: 10, unitPrice: 15, total: 150 },
        { description: "Packaging tape (box)", quantity: 6, unitPrice: 12, total: 72 },
        { description: "Barcode labels", quantity: 20, unitPrice: 9.9, total: 198 },
      ],
      confidence: { vendorName: 0.98, invoiceNumber: 0.95, total: 0.99 },
      rawOcrText:
        "ACME SUPPLIES LTD\nInvoice INV-2026-0915\nDate 2026-09-15\nDue 2026-10-15\nItems...\nTotal $504.00",
    };
    setResult(mock);

    // Summarize costs
    const wall = startedRef.current ? performance.now() - startedRef.current : 0;
    setCost({
      openrouter: { ...openrouter, totalTokens: totalTokens, estimatedCostUsd: (totalTokens / 1000) * 0.005 },
      ollama: { durationMs: ocrDuration, memoryPeakBytes: ollama.memoryPeakBytes },
      wallClockMs: wall,
    });

    mutateStep("done", { status: "success", endedAt: performance.now() });
    setIsProcessing(false);
  }, [hasValidFile, ollama.memoryPeakBytes, openrouter]);

  const onProcess = useCallback(() => {
    resetAll();
    void simulate();
  }, [simulate, resetAll]);

  const onRetry = useCallback(() => {
    void simulate();
  }, [simulate]);

  const uploadBusy = isProcessing && steps.some((s) => s.key === "upload_received" && s.status === "running");
  const isRunning = isProcessing || steps.some((s) => s.status === "running");
  const activeStepIndex = steps.findIndex((s) => s.status === "running");
  const liveMessage = useMemo(() => {
    const running = steps.find((s) => s.status === "running");
    if (running) return `Processing: ${running.title}`;
    const lastDone = [...steps].reverse().find((s) => s.status === "success");
    if (lastDone) return `Last completed: ${lastDone.title}`;
    return "Idle";
  }, [steps]);

  return (
    <div className="min-h-screen bg-background">
      {/* Announce timeline updates to assistive tech */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>
      <header className="border-b sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="size-5" aria-hidden="true" />
            <span className="font-semibold">invoice-ocr-poc</span>
            <Badge variant="secondary" className="ml-2">F0 Demo</Badge>
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">
            Next.js • Tailwind v4 • shadcn/ui
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload + Preview */}
        <section aria-busy={uploadBusy} className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadCloud className="size-4" />
                Upload image
              </CardTitle>
              <CardDescription>PNG, JPEG, WEBP • Max 10MB</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={[
                  "relative flex items-center justify-center rounded-xl border-2 border-dashed p-6 text-sm transition",
                  isDragging ? "border-primary bg-muted/50" : "border-border hover:bg-muted/40",
                ].join(" ")}
                role="region"
                aria-label="Image dropzone"
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <FileImage className="size-6 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Drag and drop an image here, or click to browse.
                  </p>
                  <input
                    type="file"
                    accept={ACCEPTED_MIME.join(",")}
                    onChange={onPick}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label="Choose image file"
                  />
                </div>
              </div>

              {file && (
                <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 items-start">
                  <div className="rounded-lg overflow-hidden border bg-muted/40">
                    {/* Use <img> for object URLs to avoid Next Image domain config */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileUrl ?? ""}
                      alt={file?.name || "Selected image"}
                      className="w-full h-40 object-cover"
                    />
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">{file.name}</div>
                    <div className="text-muted-foreground">
                      {file.type} · {formatBytes(file.size)}
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Upload error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {hasValidFile ? "Ready to process." : "Select a valid image to proceed."}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setError(null);
                    resetAll();
                  }}
                  disabled={isRunning}
                >
                  <RefreshCw className="mr-1.5 size-4" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={onProcess}
                  disabled={!hasValidFile || isRunning}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <Play className="mr-1.5 size-4" />
                      Process
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </section>

        {/* Timeline */}
        <section aria-busy={isRunning} className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-4" />
                Processing timeline
              </CardTitle>
              <CardDescription>End-to-end pipeline status</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {steps.map((s, i) => {
                  const isActive = s.status === "running";
                  const isDone = s.status === "success";
                  const isError = s.status === "error";
                  const icon =
                    isDone ? <Check className="size-4 text-emerald-600" /> :
                    isError ? <AlertCircle className="size-4 text-destructive" /> :
                    isActive ? <Loader2 className="size-4 animate-spin text-primary" /> :
                    <div className="size-2 rounded-full bg-muted-foreground/40" />;
                  const duration = s.startedAt && s.endedAt ? s.endedAt - s.startedAt : isActive && s.startedAt ? performance.now() - s.startedAt : undefined;
                  return (
                    <li key={s.key} className="flex items-start gap-3">
                      <div className="mt-1">{icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{i + 1}. {s.title}</div>
                          <Badge variant={isDone ? "secondary" : isError ? "destructive" : isActive ? "default" : "outline"}>
                            {s.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {s.message ?? (isActive ? "Running…" : s.status === "pending" ? "Pending" : "Completed")}
                          <span className="ml-2">{duration ? `• ${formatMs(Math.round(duration))}` : null}</span>
                        </div>
                        {isActive && (
                          <div className="mt-2">
                            <Progress value={activeStepIndex >= 0 ? ((activeStepIndex + 0.35) / steps.length) * 100 : 0} />
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </section>

        {/* Telemetry: Ollama + OpenRouter */}
        <section className="col-span-1 lg:col-span-2 grid md:grid-cols-2 gap-6">
          <Card aria-busy={steps.some(s => s.key === "ollama_ocr" && s.status === "running")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MemoryStick className="size-4" />
                Ollama • glm-ocr
              </CardTitle>
              <CardDescription>Local OCR runtime</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isRunning && ollama.memoryPeakBytes == null ? (
                <Skeleton className="h-16 w-full rounded-lg" />
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={ollama.status === "running" ? "default" : "secondary"}>
                      {ollama.status ?? "—"}
                    </Badge>
                    <Separator orientation="vertical" className="mx-2 h-4" />
                    <span className="text-muted-foreground">Model:</span>
                    <span className="font-medium">{ollama.model}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Activity className="size-4" /> Memory
                      </span>
                      <span className="tabular-nums">
                        {formatBytes(ollama.memoryBytes)} <span className="text-muted-foreground">current</span>
                        <span className="mx-1">/</span>
                        {formatBytes(ollama.memoryPeakBytes)} <span className="text-muted-foreground">peak</span>
                      </span>
                    </div>
                    <Progress value={ollama.memoryBytes ? clamp((ollama.memoryBytes / 200_000_000) * 100, 0, 100) : 0} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    OCR duration: {formatMs(ollama.durationMs)}.
                  </div>
                </>
              )}
              {ollama.memoryPeakBytes == null && !isRunning && (
                <Alert>
                  <AlertTitle>Metrics unavailable</AlertTitle>
                  <AlertDescription>Ollama telemetry not provided by backend.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card aria-busy={steps.some(s => s.key === "openrouter_struct" && s.status === "running")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="size-4" />
                OpenRouter
              </CardTitle>
              <CardDescription>Tokens • Cost • Latency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isRunning && openrouter.totalTokens === 0 ? (
                <Skeleton className="h-16 w-full rounded-lg" />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Metric label="Model" value={openrouter.model ?? "—"} />
                    <Metric label="Latency" value={formatMs(openrouter.latencyMs)} />
                    <Metric label="Prompt tokens" value={openrouter.promptTokens.toString()} />
                    <Metric label="Completion tokens" value={openrouter.completionTokens.toString()} />
                    <Metric label="Total tokens" value={openrouter.totalTokens.toString()} />
                    <Metric label="Estimated cost" value={formatUSD(openrouter.estimatedCostUsd)} />
                  </div>
                  <Progress value={openrouter.totalTokens ? clamp((openrouter.totalTokens / 500) * 100, 0, 100) : 0} />
                </>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Result + Costs */}
        <section className="col-span-1 lg:col-span-2 grid md:grid-cols-2 gap-6">
          <Card aria-busy={isRunning}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4" />
                Result
              </CardTitle>
              <CardDescription>Structured invoice fields</CardDescription>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-6 w-56" />
                </div>
              ) : (
                <Tabs defaultValue="fields" className="w-full">
                  <TabsList>
                    <TabsTrigger value="fields">Fields</TabsTrigger>
                    <TabsTrigger value="json">Raw JSON</TabsTrigger>
                  </TabsList>
                  <TabsContent value="fields" className="space-y-4 pt-3">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <Field label="Vendor">{result.vendorName ?? "—"}</Field>
                      <Field label="VAT / CNPJ">{result.vendorVatId ?? "—"}</Field>
                      <Field label="Invoice #">{result.invoiceNumber ?? "—"}</Field>
                      <Field label="Issue date">{result.issueDate ?? "—"}</Field>
                      <Field label="Due date">{result.dueDate ?? "—"}</Field>
                      <Field label="Currency">{result.currency ?? "—"}</Field>
                      <Field label="Subtotal">{result.subtotal != null ? `$${result.subtotal.toFixed(2)}` : "—"}</Field>
                      <Field label="Tax">{result.tax != null ? `$${result.tax.toFixed(2)}` : "—"}</Field>
                      <Field label="Total">
                        <span className="font-semibold">{result.total != null ? `$${result.total.toFixed(2)}` : "—"}</span>
                      </Field>
                    </dl>
                    <Separator />
                    <div>
                      <div className="font-medium mb-1">Items</div>
                      {!result.items?.length ? (
                        <div className="text-sm text-muted-foreground">—</div>
                      ) : (
                        <div className="space-y-2">
                          {result.items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="truncate pr-3">{it.description}</div>
                              <div className="text-muted-foreground tabular-nums">
                                {it.quantity} × ${it.unitPrice.toFixed(2)} = <span className="text-foreground font-medium">${it.total.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="json" className="pt-3">
                    <pre className="text-xs overflow-x-auto rounded-lg border bg-muted/40 p-3">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          <Card aria-busy={isRunning}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="size-4" />
                Cost summary
              </CardTitle>
              <CardDescription>Ollama (local) vs OpenRouter (cloud)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!cost ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-56" />
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-6 w-48" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Metric label="OpenRouter tokens" value={`${cost.openrouter.totalTokens} (in ${cost.openrouter.promptTokens} / out ${cost.openrouter.completionTokens})`} />
                    <Metric label="OpenRouter cost" value={formatUSD(cost.openrouter.estimatedCostUsd)} />
                    <Metric label="Ollama peak memory" value={formatBytes(cost.ollama.memoryPeakBytes)} />
                    <Metric label="OCR duration" value={formatMs(cost.ollama.durationMs)} />
                    <Metric label="Total wall-clock" value={formatMs(cost.wallClockMs)} />
                  </div>
                  <Separator />
                  <div className="text-xs text-muted-foreground">
                    Estimates only. Do not embed API keys in the client. Metrics not provided are shown as “—”.
                  </div>
                </>
              )}
            </CardContent>
            {result && (
              <CardFooter className="justify-end">
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}>
                  Copy JSON
                </Button>
              </CardFooter>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(range: number) {
  return Math.floor(Math.random() * range);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3 bg-card text-card-foreground">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-h-6">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
