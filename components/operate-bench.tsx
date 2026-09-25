/* eslint-disable react/jsx-no-target-blank */
"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  enqueueImage,
  getRuntime,
  maxUploadBytes,
  pollInvoice,
  toUserError,
  type Invoice,
  type RuntimeConfig,
} from "@/lib/api";
import { compressInvoiceImage } from "@/lib/compress";
import {
  IconAlignLeft,
  IconCheck,
  IconClock,
  IconCpu,
  IconCurrencyDollar,
  IconFile,
  IconImage,
  IconLightning,
  IconList,
  IconPlay,
  IconRefreshCw,
  IconScale,
  IconShield,
  IconSpinner,
  IconUpload,
  IconWarning,
} from "@/components/icons/geist";

type StepKey = "upload_received" | "queued" | "processing" | "done";
type StepStatus = "pending" | "running" | "success" | "error";

type Step = {
  key: StepKey;
  title: string;
  status: StepStatus;
  startedAt?: number;
  endedAt?: number;
  message?: string;
};

type OllamaTelemetry = {
  model: string;
  durationMs?: number;
  loadDurationMs?: number;
  promptEvalCount?: number;
  promptEvalDurationMs?: number;
  evalCount?: number;
  evalDurationMs?: number;
  parameterSize?: string;
  quantization?: string;
  contextLength?: number;
  sizeBytes?: number;
  vramBytes?: number;
  loaded?: boolean;
  status?: "idle" | "running" | "down";
};

type OpenRouterCost = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  latencyMs?: number;
  model?: string;
  ocrModel?: string;
};

type CostSummary = {
  openrouter: OpenRouterCost;
  ollama: {
    durationMs?: number;
  };
  jev: {
    totalTokens?: number;
    estimatedCostUsd?: number;
  };
  wallClockMs?: number;
};

type JevTelemetry = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  latencyMs?: number;
  model?: string;
};

const ACCEPTED_MIME = ["image/png", "image/jpeg", "image/webp"];

function formatBytes(bytes?: number): string {
  if (bytes == null) return "—";
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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(n);
}

function formatCount(n?: number): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

function formatMaybeUSD(cost?: number, tokens?: number): string {
  if (cost != null) return formatUSD(cost);
  if (tokens != null && tokens > 0) return formatUSD(0);
  return "—";
}

function formatTokPerSec(count?: number, durationMs?: number): string {
  if (count == null || durationMs == null || durationMs <= 0) return "—";
  return `${(count / (durationMs / 1000)).toFixed(1)} tok/s`;
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

function formatAmount(n?: number): string {
  if (n == null) return "—";
  return n.toFixed(2);
}

function formatRatio(n?: number): string {
  if (n == null) return "—";
  return n.toFixed(2);
}

function formatFlag(value?: boolean): string {
  if (value == null) return "—";
  return value ? "yes" : "no";
}

function isOllamaEngine(engine?: string): boolean {
  const name = engine?.toLowerCase() ?? "";
  return name === "ollama" || name === "glm-ocr";
}

function processingTitle(runtime: RuntimeConfig | null): string {
  if (isOllamaEngine(runtime?.ocr_engine)) {
    const model = runtime?.ollama.model?.trim();
    return model ? `OCR via Ollama (${model})` : "OCR via Ollama";
  }
  return "OCR via OpenRouter";
}

function sendingSteps(runtime: RuntimeConfig | null): Step[] {
  return [
    { key: "upload_received", title: "Upload received", status: "running", message: "Sending image" },
    { key: "queued", title: "Queued", status: "pending" },
    { key: "processing", title: processingTitle(runtime), status: "pending" },
    { key: "done", title: "Done", status: "pending" },
  ];
}

function failedSteps(runtime: RuntimeConfig | null, message: string): Step[] {
  return [
    { key: "upload_received", title: "Upload received", status: "success" },
    { key: "queued", title: "Queued", status: "success" },
    { key: "processing", title: processingTitle(runtime), status: "error", message },
    { key: "done", title: "Failed", status: "error", message },
  ];
}

function initialSteps(runtime: RuntimeConfig | null): Step[] {
  return [
    { key: "upload_received", title: "Upload received", status: "pending" },
    { key: "queued", title: "Queued", status: "pending" },
    { key: "processing", title: processingTitle(runtime), status: "pending" },
    { key: "done", title: "Done", status: "pending" },
  ];
}

function stepsFromInvoice(invoice: Invoice, runtime: RuntimeConfig | null): Step[] {
  const proc = processingTitle(runtime);
  if (invoice.status === "queued") {
    return [
      { key: "upload_received", title: "Upload received", status: "success" },
      { key: "queued", title: "Queued", status: "running", message: "Waiting for a worker" },
      { key: "processing", title: proc, status: "pending" },
      { key: "done", title: "Done", status: "pending" },
    ];
  }
  if (invoice.status === "processing") {
    return [
      { key: "upload_received", title: "Upload received", status: "success" },
      { key: "queued", title: "Queued", status: "success" },
      { key: "processing", title: proc, status: "running", message: "Extracting and structuring" },
      { key: "done", title: "Done", status: "pending" },
    ];
  }
  if (invoice.status === "done") {
    return [
      { key: "upload_received", title: "Upload received", status: "success" },
      { key: "queued", title: "Queued", status: "success" },
      { key: "processing", title: proc, status: "success" },
      { key: "done", title: "Done", status: "success" },
    ];
  }
  return [
    { key: "upload_received", title: "Upload received", status: "success" },
    { key: "queued", title: "Queued", status: "success" },
    { key: "processing", title: proc, status: "error", message: invoice.error_message },
    { key: "done", title: "Failed", status: "error", message: invoice.error_message },
  ];
}

function ollamaFromRuntime(runtime: RuntimeConfig | null): OllamaTelemetry {
  const live = runtime?.ollama;
  let status: OllamaTelemetry["status"] = "idle";
  if (runtime != null && (!live?.configured || !live.reachable)) {
    status = "down";
  }

  return {
    model: live?.model || "—",
    status,
    parameterSize: live?.parameter_size,
    quantization: live?.quantization,
    contextLength: live?.context_length,
    sizeBytes: live?.size_bytes,
    vramBytes: live?.vram_bytes,
    loaded: live?.loaded,
  };
}

function openrouterFromRuntime(runtime: RuntimeConfig | null): OpenRouterCost {
  return {
    model: runtime?.openrouter.model || "—",
    ocrModel: runtime?.openrouter.ocr_model || "—",
    promptTokens: undefined,
    completionTokens: undefined,
    totalTokens: undefined,
    estimatedCostUsd: undefined,
    latencyMs: undefined,
  };
}

function ollamaFromInvoice(invoice: Invoice, runtime: RuntimeConfig | null): OllamaTelemetry {
  const base = ollamaFromRuntime(runtime);
  const running = invoice.status === "processing" && isOllamaEngine(runtime?.ocr_engine);
  return {
    ...base,
    status: running ? "running" : base.status,
    durationMs: invoice.usage?.ollama?.duration_ms,
    loadDurationMs: invoice.usage?.ollama?.load_duration_ms,
    promptEvalCount: invoice.usage?.ollama?.prompt_eval_count,
    promptEvalDurationMs: invoice.usage?.ollama?.prompt_eval_duration_ms,
    evalCount: invoice.usage?.ollama?.eval_count,
    evalDurationMs: invoice.usage?.ollama?.eval_duration_ms,
  };
}

function openrouterFromInvoice(invoice: Invoice, runtime: RuntimeConfig | null): OpenRouterCost {
  const base = openrouterFromRuntime(runtime);
  const usage = invoice.usage?.openrouter;
  return {
    ...base,
    model: invoice.assist_model || base.model,
    promptTokens: usage?.prompt_tokens,
    completionTokens: usage?.completion_tokens,
    totalTokens: usage?.total_tokens,
    estimatedCostUsd: usage?.cost_usd,
    latencyMs: usage?.latency_ms,
  };
}

function costFromInvoice(invoice: Invoice, runtime: RuntimeConfig | null): CostSummary {
  const jev = invoice.usage?.jev;
  return {
    openrouter: openrouterFromInvoice(invoice, runtime),
    ollama: { durationMs: invoice.usage?.ollama?.duration_ms },
    jev: {
      totalTokens: jev?.total_tokens,
      estimatedCostUsd: jev?.cost_usd,
    },
    wallClockMs: invoice.processing_ms,
  };
}

function jevFromInvoice(invoice: Invoice | null): JevTelemetry {
  const usage = invoice?.usage?.jev;
  return {
    inputTokens: usage?.input_tokens,
    outputTokens: usage?.output_tokens,
    totalTokens: usage?.total_tokens,
    estimatedCostUsd: usage?.cost_usd,
    latencyMs: usage?.latency_ms,
    model: usage?.model,
  };
}

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

type OperateBenchProps = {
  initialRuntime?: RuntimeConfig | null;
  initialRuntimeError?: string | null;
};

export function OperateBench({
  initialRuntime = null,
  initialRuntimeError = null,
}: OperateBenchProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(initialRuntimeError);
  const [isDragging, setIsDragging] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const fileUrl = useObjectUrl(file);
  const compressGen = useRef(0);

  const [runtime, setRuntime] = useState<RuntimeConfig | null>(initialRuntime);
  const [sending, setSending] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const uploadLimit = maxUploadBytes(runtime);

  useEffect(() => {
    if (initialRuntime) return;
    const ac = new AbortController();
    void getRuntime(ac.signal)
      .then((cfg) => {
        setRuntime(cfg);
        setError(null);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setRuntime(null);
        setError(toUserError(err));
      });
    return () => ac.abort();
  }, [initialRuntime]);

  const steps = sending && !invoice
    ? sendingSteps(runtime)
    : invoice
      ? stepsFromInvoice(invoice, runtime)
      : jobError
        ? failedSteps(runtime, jobError)
        : initialSteps(runtime);
  const ollama = invoice ? ollamaFromInvoice(invoice, runtime) : ollamaFromRuntime(runtime);
  const openrouter = invoice ? openrouterFromInvoice(invoice, runtime) : openrouterFromRuntime(runtime);
  const jev = jevFromInvoice(invoice);
  const cost = invoice ? costFromInvoice(invoice, runtime) : null;
  const result = invoice && (invoice.status === "done" || invoice.status === "failed")
    ? invoice
    : null;

  const hasValidFile = useMemo(() => {
    if (!file || compressing) return false;
    if (!ACCEPTED_MIME.includes(file.type)) return false;
    if (file.size > uploadLimit) return false;
    return true;
  }, [file, compressing, uploadLimit]);

  const onFile = useCallback((f: File) => {
    setError(null);
    if (!ACCEPTED_MIME.includes(f.type)) {
      setError("Invalid file type. Use PNG, JPEG, or WEBP.");
      setFile(null);
      return;
    }
    if (f.size > uploadLimit) {
      setError(`File too large. Max ${formatBytes(uploadLimit)}.`);
      setFile(null);
      return;
    }

    const gen = ++compressGen.current;
    setCompressing(true);
    setFile(null);
    void compressInvoiceImage(f)
      .then((compact) => {
        if (gen !== compressGen.current) return;
        if (compact.size > uploadLimit) {
          setError(`File too large. Max ${formatBytes(uploadLimit)}.`);
          setFile(null);
          return;
        }
        setFile(compact);
      })
      .catch(() => {
        if (gen !== compressGen.current) return;
        setFile(f);
      })
      .finally(() => {
        if (gen === compressGen.current) setCompressing(false);
      });
  }, [uploadLimit]);

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
    e.currentTarget.value = "";
  }, [onFile]);

  const abortInFlight = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const resetJob = useCallback(() => {
    abortInFlight();
    setSending(false);
    setInvoice(null);
    setJobError(null);
  }, [abortInFlight]);

  const runJob = useCallback(async (source: File) => {
    abortInFlight();
    const ac = new AbortController();
    abortRef.current = ac;

    setSending(true);
    setError(null);
    setJobError(null);
    setInvoice(null);

    try {
      const enqueued = await enqueueImage(source, ac.signal);
      const queued: Invoice = {
        id: enqueued.id,
        status: enqueued.status,
        original_name: source.name,
        mime_type: source.type,
        items: [],
        estimated_total: 0,
        computed_items_total: 0,
        items_confirmed: false,
      };
      setInvoice(queued);

      const next = await pollInvoice(enqueued.id, (current) => {
        startTransition(() => {
          setInvoice(current);
        });
      }, ac.signal);

      setInvoice(next);

      if (next.status === "failed") {
        setError(next.error_message || "Invoice processing failed");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      const message = toUserError(err);
      setError(message);
      setJobError(message);
      setInvoice(null);
    } finally {
      if (abortRef.current === ac) {
        abortRef.current = null;
      }
      setSending(false);
    }
  }, [abortInFlight]);

  const onProcess = useCallback(() => {
    if (!file) return;
    void runJob(file);
  }, [file, runJob]);

  const onRetry = useCallback(() => {
    if (!file) return;
    void runJob(file);
  }, [file, runJob]);

  const uploadBusy = sending && !invoice;
  const isRunning = sending || invoice?.status === "queued" || invoice?.status === "processing";
  const activeStepIndex = steps.findIndex((s) => s.status === "running");
  const liveMessage = useMemo(() => {
    const running = steps.find((s) => s.status === "running");
    if (running) return `Processing: ${running.title}`;
    const lastError = [...steps].reverse().find((s) => s.status === "error");
    if (lastError) return `Failed: ${lastError.message ?? lastError.title}`;
    const lastDone = [...steps].reverse().find((s) => s.status === "success");
    if (lastDone) return `Last completed: ${lastDone.title}`;
    return "Idle";
  }, [steps]);

  return (
    <div className="min-h-screen bg-background">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>
      <header className="border-b sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-[96rem] px-6 py-4 flex items-center">
          <div className="flex items-center gap-2">
            <IconFile className="size-5" aria-hidden="true" />
            <span className="font-semibold">invoice-ocr-poc</span>
            <Badge variant="secondary" className="ml-2">F1 Live</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[96rem] px-6 py-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 xl:grid-rows-4 gap-6 xl:auto-rows-[minmax(18rem,1fr)] xl:items-stretch">
        <Station busy={uploadBusy}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconUpload className="size-4" />
                Upload image
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-10">PNG, JPEG, WEBP • Max {formatBytes(uploadLimit)}</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto">
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
                  <IconImage className="size-6 text-muted-foreground" />
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

              {error ? (
                <Alert variant="destructive">
                  <IconWarning className="size-4" />
                  <AlertTitle>Request error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
            <CardFooter className="mt-auto flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {compressing
                  ? "Compressing image for faster OCR…"
                  : hasValidFile
                    ? "Ready to process."
                    : "Select a valid image to proceed."}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    compressGen.current += 1;
                    setCompressing(false);
                    setFile(null);
                    setError(null);
                    resetJob();
                  }}
                >
                  <IconRefreshCw className="mr-1.5 size-4" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={onProcess}
                  disabled={!hasValidFile || isRunning || compressing}
                >
                  {isRunning ? (
                    <>
                      <span className="mr-1.5 inline-flex size-4 animate-spin">
                        <IconSpinner className="size-4" />
                      </span>
                      Processing…
                    </>
                  ) : (
                    <>
                      <IconPlay className="mr-1.5 size-4" />
                      Process
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </Station>

        <Station>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconImage className="size-4" />
                Source preview
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-10">Selected invoice image</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              {file && fileUrl ? (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-lg border bg-muted/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileUrl}
                      alt={file.name}
                      className="h-40 w-full object-cover"
                    />
                  </div>
                  <div className="text-sm">
                    <div className="font-medium truncate">{file.name}</div>
                    <div className="text-muted-foreground">
                      {file.type} · {formatBytes(file.size)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No image selected.</div>
              )}
            </CardContent>
          </Card>
        </Station>

        <Station busy={isRunning}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconClock className="size-4" />
                Processing timeline
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-10">Upload, queue, process, done</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              <ol className="space-y-3">
                {steps.map((s, i) => {
                  const isActive = s.status === "running";
                  const isDone = s.status === "success";
                  const isError = s.status === "error";
                  const icon =
                    isDone ? <IconCheck className="size-4 text-foreground" /> :
                    isError ? <IconWarning className="size-4 text-destructive" /> :
                    isActive ? (
                      <span className="inline-flex size-4 animate-spin text-primary">
                        <IconSpinner className="size-4" />
                      </span>
                    ) :
                    <div className="size-2 rounded-full bg-muted-foreground/40" />;
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
                          {s.message ?? (isActive ? "Running…" : s.status === "pending" ? "Pending" : s.status === "error" ? "Failed" : "Completed")}
                        </div>
                        {isActive ? (
                          <div className="mt-2">
                            <Progress value={activeStepIndex >= 0 ? ((activeStepIndex + 0.35) / steps.length) * 100 : 0} />
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </Station>

        <Station busy={isRunning}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconCheck className="size-4" />
                Job
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-10">Run status for this invoice</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Live" value={liveMessage} />
                <Metric label="Status" value={result?.status ?? "—"} />
                <Metric label="Needs review" value={formatFlag(result?.needs_review)} />
                <Metric label="Items confirmed" value={formatFlag(result?.items_confirmed)} />
                <Metric label="Wall-clock" value={formatMs(result?.processing_ms)} />
                <Metric label="OCR confidence" value={formatRatio(result?.ocr_confidence)} />
              </div>
            </CardContent>
          </Card>
        </Station>

        <Station busy={isRunning}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconFile className="size-4" />
                Fields
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-10">Structured invoice totals</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              {!result ? (
                <PendingBody />
              ) : (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <Field label="Status">{result.status}</Field>
                  <Field label="Estimated total">{formatAmount(result.estimated_total)}</Field>
                  <Field label="Computed items total">{formatAmount(result.computed_items_total)}</Field>
                  <Field label="Assist model">{result.assist_model || "—"}</Field>
                </dl>
              )}
            </CardContent>
            {result ? (
              <CardFooter className="mt-auto justify-between">
                <Button variant="outline" size="sm" onClick={onRetry} disabled={!file || isRunning}>
                  Retry same file
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}>
                  Copy JSON
                </Button>
              </CardFooter>
            ) : null}
          </Card>
        </Station>

        <Station busy={isRunning}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconList className="size-4" />
                Line items
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-10">Extracted invoice lines</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              {!result ? (
                <PendingBody />
              ) : !result.items?.length ? (
                <div className="text-sm text-muted-foreground">—</div>
              ) : (
                <div className="space-y-2">
                  {result.items.map((it, idx) => (
                    <div key={`${it.description}-${idx}`} className="flex items-center justify-between text-sm">
                      <div className="truncate pr-3">{it.description || "—"}</div>
                      <div className="text-muted-foreground tabular-nums">
                        {it.quantity} × {formatAmount(it.unit_amount)} = <span className="text-foreground font-medium">{formatAmount(it.line_total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Station>

        <Station busy={isRunning}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconAlignLeft className="size-4" />
                OCR text
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-10">Raw text from the scan</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              {!result ? (
                <PendingBody />
              ) : (
                <pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 font-mono text-xs">
                  {result.ocr_text || "—"}
                </pre>
              )}
            </CardContent>
          </Card>
        </Station>

        <Station busy={isRunning}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconShield className="size-4" />
                Judgment
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-10">Jev document type, routing, and risk</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              {!result ? (
                <PendingBody />
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Metric label="Document type" value={result.document_type || "—"} />
                  <Metric label="Type confidence" value={formatRatio(result.document_type_confidence)} />
                  <Metric label="Suggested routing" value={result.suggested_routing || "—"} />
                  <Metric label="Effective routing" value={result.effective_routing || "—"} />
                  <Metric label="Risk" value={result.risk_label || "—"} />
                  <Metric label="Risk score" value={formatRatio(result.risk_score)} />
                  <Metric label="Amounts supported" value={formatRatio(result.amounts_supported)} />
                  <Metric label="Items qty supported" value={formatRatio(result.items_qty_supported)} />
                </div>
              )}
            </CardContent>
          </Card>
        </Station>

        <Station busy={steps.some((s) => s.key === "processing" && s.status === "running" && isOllamaEngine(runtime?.ocr_engine))}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconCpu className="size-4" />
                Ollama • {ollama.model}
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-10">Local OCR runtime</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={ollama.status === "running" ? "default" : ollama.status === "down" ? "destructive" : "secondary"}>
                  {ollama.status ?? "—"}
                </Badge>
                <Separator orientation="vertical" className="mx-2 h-4" />
                <span className="text-muted-foreground">Model:</span>
                <span className="font-medium">{ollama.model}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Parameters" value={ollama.parameterSize || "—"} />
                <Metric label="Quantization" value={ollama.quantization || "—"} />
                <Metric label="Context" value={formatCount(ollama.contextLength)} />
                <Metric label="Loaded" value={formatFlag(ollama.loaded)} />
                <Metric label="VRAM" value={ollama.loaded ? formatBytes(ollama.vramBytes) : "—"} />
                <Metric label="Engine" value={isOllamaEngine(runtime?.ocr_engine) ? "active" : "standby"} />
                <Metric label="OCR duration" value={formatMs(ollama.durationMs)} />
                <Metric label="Load" value={formatMs(ollama.loadDurationMs)} />
                <Metric label="Prompt tokens" value={formatCount(ollama.promptEvalCount)} />
                <Metric label="Prompt eval" value={formatMs(ollama.promptEvalDurationMs)} />
                <Metric label="Generated tokens" value={formatCount(ollama.evalCount)} />
                <Metric label="Generate" value={formatMs(ollama.evalDurationMs)} />
                <Metric label="Decode speed" value={formatTokPerSec(ollama.evalCount, ollama.evalDurationMs)} />
              </div>
            </CardContent>
          </Card>
        </Station>

        <Station busy={isRunning && !isOllamaEngine(runtime?.ocr_engine)}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconLightning className="size-4" />
                OpenRouter
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-10">Tokens • Cost • Latency</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Model" value={openrouter.model ?? "—"} />
                <Metric label="OCR model" value={openrouter.ocrModel ?? "—"} />
                <Metric label="Latency" value={formatMs(openrouter.latencyMs)} />
                <Metric label="Configured" value={runtime?.openrouter.configured ? "yes" : "no"} />
                <Metric label="Prompt tokens" value={formatCount(openrouter.promptTokens)} />
                <Metric label="Completion tokens" value={formatCount(openrouter.completionTokens)} />
                <Metric label="Total tokens" value={formatCount(openrouter.totalTokens)} />
                <Metric label="Estimated cost" value={formatMaybeUSD(openrouter.estimatedCostUsd, openrouter.totalTokens)} />
              </div>
            </CardContent>
          </Card>
        </Station>

        <Station busy={isRunning}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconCurrencyDollar className="size-4" />
                Cost summary
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-10">Ollama, OpenRouter, and Jev</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto">
              {!cost ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-56" />
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-6 w-48" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Metric label="OpenRouter tokens" value={formatCount(cost.openrouter.totalTokens)} />
                    <Metric label="OpenRouter cost" value={formatMaybeUSD(cost.openrouter.estimatedCostUsd, cost.openrouter.totalTokens)} />
                    <Metric label="Jev tokens" value={formatCount(cost.jev?.totalTokens)} />
                    <Metric label="Jev cost" value={formatMaybeUSD(cost.jev?.estimatedCostUsd, cost.jev?.totalTokens)} />
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
          </Card>
        </Station>

        <Station busy={isRunning}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconFile className="size-4" />
                Assist
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-10">Optional DeepSeek notes. They do not override Jev.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              {!result ? (
                <PendingBody />
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <Metric label="Used" value={formatFlag(result.assist_used)} />
                    <Metric label="Model" value={result.assist_model || "—"} />
                  </div>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {result.assist_notes || "—"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </Station>

        <Station busy={isRunning}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconScale className="size-4" />
                Jev · Tokens
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-10">TypeSafe usage from the judge call</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Input tokens" value={formatCount(jev.inputTokens)} />
                <Metric label="Output tokens" value={formatCount(jev.outputTokens)} />
                <Metric label="Total tokens" value={formatCount(jev.totalTokens)} />
              </div>
            </CardContent>
          </Card>
        </Station>

        <Station busy={isRunning}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconCurrencyDollar className="size-4" />
                Jev · Cost
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-10">List-price estimate. Cost is not a field in their response.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              <Metric label="Estimated cost" value={formatMaybeUSD(jev.estimatedCostUsd, jev.totalTokens)} />
            </CardContent>
          </Card>
        </Station>

        <Station busy={isRunning}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconClock className="size-4" />
                Jev · Latency
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-10">Our HTTP round-trip to TypeSafe. Not a field in their response.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              <Metric label="Round-trip" value={formatMs(jev.latencyMs)} />
            </CardContent>
          </Card>
        </Station>

        <Station busy={isRunning}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconScale className="size-4" />
                Jev · Model
              </CardTitle>
              <CardDescription className="line-clamp-2 min-h-10">Model id returned by TypeSafe</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              <Metric label="Model" value={jev.model || "—"} />
            </CardContent>
          </Card>
        </Station>
      </main>
    </div>
  );
}

function PendingBody() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

function Station({ busy, children }: { busy?: boolean; children: ReactNode }) {
  return (
    <section className="h-full min-h-[18rem] [content-visibility:auto] [contain-intrinsic-size:auto_18rem]" aria-busy={busy}>
      {children}
    </section>
  );
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
