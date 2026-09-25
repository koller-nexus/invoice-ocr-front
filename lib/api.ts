export const DEFAULT_API_BASE = 'http://localhost:8080';
export const DEFAULT_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const POLL_INTERVAL_MS = 750;

export type InvoiceStatus =
  | 'queued'
  | 'processing'
  | 'done'
  | 'failed'
  | string;

export type RuntimeOllama = {
  model: string;
  configured: boolean;
  reachable: boolean;
  loaded: boolean;
  parameter_size?: string;
  quantization?: string;
  context_length?: number;
  size_bytes?: number;
  vram_bytes?: number;
};

export type RuntimeOpenRouter = {
  model: string;
  ocr_model: string;
  configured: boolean;
};

export type RuntimeConfig = {
  ocr_engine: string;
  max_upload_bytes: number;
  ollama: RuntimeOllama;
  openrouter: RuntimeOpenRouter;
};

export type EnqueueResponse = {
  id: string;
  status: InvoiceStatus;
  poll_url: string;
};

export type InvoiceItem = {
  description: string;
  quantity: number;
  unit_amount: number;
  line_total: number;
};

export type InvoiceUsageOpenRouter = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost_usd?: number;
  latency_ms?: number;
};

export type InvoiceUsageOllama = {
  duration_ms?: number;
  load_duration_ms?: number;
  prompt_eval_count?: number;
  prompt_eval_duration_ms?: number;
  eval_count?: number;
  eval_duration_ms?: number;
};

export type InvoiceUsageJev = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  cost_usd?: number;
  latency_ms?: number;
  model?: string;
};

export type InvoiceUsage = {
  openrouter?: InvoiceUsageOpenRouter;
  ollama?: InvoiceUsageOllama;
  jev?: InvoiceUsageJev;
};

export type Invoice = {
  id: string;
  status: InvoiceStatus;
  original_name: string;
  mime_type: string;
  ocr_text?: string;
  ocr_confidence?: number;
  items: InvoiceItem[];
  estimated_total: number;
  computed_items_total: number;
  items_confirmed: boolean;
  document_type?: string;
  document_type_confidence?: number;
  suggested_routing?: string;
  routing_confidence?: number;
  effective_routing?: string;
  amounts_supported?: number;
  items_qty_supported?: number;
  total_consistent?: number;
  risk_score?: number;
  risk_label?: string;
  risk_confidence?: number;
  needs_review?: boolean;
  assist_used?: boolean;
  assist_model?: string;
  assist_notes?: string;
  error_message?: string;
  processing_ms?: number;
  usage?: InvoiceUsage;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function apiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE;
  return raw.replace(/\/$/, '');
}

export function maxUploadBytes(runtime: RuntimeConfig | null): number {
  if (runtime?.max_upload_bytes && runtime.max_upload_bytes > 0) {
    return runtime.max_upload_bytes;
  }
  return DEFAULT_MAX_UPLOAD_BYTES;
}

export function toUserError(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof DOMException && err.name === 'AbortError') {
    return '';
  }
  return 'API unavailable. Is invoice-ocr-poc running on the configured base URL?';
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body.error === 'string' && body.error.trim()) {
      return body.error;
    }
  } catch {
    // fall through to generic English message
  }
  return res.statusText || 'Request failed';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, { cache: 'no-store', ...init });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new ApiError(0, toUserError(err));
  }

  if (!res.ok) {
    throw new ApiError(res.status, await readError(res));
  }

  return (await res.json()) as T;
}

export function getRuntime(signal?: AbortSignal): Promise<RuntimeConfig> {
  return request<RuntimeConfig>('/api/v1/runtime', { signal });
}

export function enqueueImage(
  file: File,
  signal?: AbortSignal,
): Promise<EnqueueResponse> {
  const body = new FormData();
  body.append('image', file);
  return request<EnqueueResponse>('/api/v1/image/processor', {
    method: 'POST',
    body,
    signal,
  });
}

export function getInvoice(id: string, signal?: AbortSignal): Promise<Invoice> {
  return request<Invoice>(`/api/v1/invoices/${encodeURIComponent(id)}`, {
    signal,
  });
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(
        signal.reason instanceof DOMException
          ? signal.reason
          : new DOMException('Aborted', 'AbortError'),
      );
      return;
    }

    const timer = window.setTimeout(resolve, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function invoiceTick(invoice: Invoice): string {
  return [
    invoice.status,
    invoice.processing_ms ?? '',
    invoice.usage?.ollama?.duration_ms ?? '',
    invoice.usage?.ollama?.load_duration_ms ?? '',
    invoice.usage?.ollama?.prompt_eval_count ?? '',
    invoice.usage?.ollama?.eval_count ?? '',
    invoice.usage?.ollama?.eval_duration_ms ?? '',
    invoice.usage?.openrouter?.total_tokens ?? '',
    invoice.usage?.openrouter?.cost_usd ?? '',
    invoice.usage?.jev?.total_tokens ?? '',
    invoice.usage?.jev?.cost_usd ?? '',
    invoice.usage?.jev?.latency_ms ?? '',
    invoice.error_message ?? '',
  ].join('|');
}

export async function pollInvoice(
  id: string,
  onUpdate: (invoice: Invoice) => void,
  signal?: AbortSignal,
  intervalMs = POLL_INTERVAL_MS,
): Promise<Invoice> {
  let lastTick = '';

  while (true) {
    const invoice = await getInvoice(id, signal);
    const tick = invoiceTick(invoice);
    const terminal = invoice.status === 'done' || invoice.status === 'failed';
    if (terminal || tick !== lastTick) {
      lastTick = tick;
      onUpdate(invoice);
    }
    if (terminal) {
      return invoice;
    }
    await sleep(intervalMs, signal);
  }
}
