<!-- Copy of the provided PRD for frontend F0 -->

# PRD — invoice-ocr-poc (Frontend)

| Campo | Valor |
| --- | --- |
| Produto | invoice-ocr-poc |
| Escopo deste documento | Frontend (UI de upload, visualização do pipeline e custos) |
| Status | Draft |
| Versão | 0.2 |
| Data | 2026-09-25 |

---

## 1. Resumo

Construir uma interface web para o POC de OCR de notas fiscais / invoices que permita:

1. Enviar uma imagem (upload).
2. Acompanhar o processamento em tempo real (ou quase).
3. Visualizar o uso do **Ollama** rodando **glm-ocr** (incluindo memória).
4. Visualizar o uso do **OpenRouter** no restante do pipeline.
5. Exibir a **solução extraída** (dados da invoice).
6. Exibir **custos computacionais** e **tokens gastos**.

O frontend é a “vitrine” do POC: deve tornar o pipeline legível e os trade-offs (latência, memória, tokens, custo) óbvios.

---

## 2. Problema

Hoje o OCR + pós-processamento de invoices costuma ser uma caixa-preta: o usuário sobe um arquivo e recebe um JSON, sem ver:

- em qual etapa o job está;
- se o modelo local (Ollama / glm-ocr) está consumindo muita memória;
- quanto o trecho via OpenRouter custa em tokens / dinheiro;
- se o resultado justifica o custo.

Sem essa visibilidade, é difícil validar o POC, comparar abordagens e decidir se vale seguir para produção.

---

## 3. Objetivos

### 3.1 Objetivos do produto (POC)

- Demonstrar ponta a ponta: imagem → OCR (Ollama/glm-ocr) → enriquecimento/estruturação (OpenRouter) → dados extraídos.
- Tornar o pipeline **observável** na UI.
- Expor **métricas de custo** (tokens e estimativa monetária) e **recursos** (memória do Ollama).

### 3.2 Objetivos do frontend

- Stack fixa: **Next.js** + **Tailwind CSS** + **shadcn/ui**.
- Página única (ou fluxo curto) para upload e acompanhamento.
- Timeline / steps do processamento com status por etapa.
- Painéis de telemetria: Ollama (memória + status) e OpenRouter (requests, tokens, custo).
- Resultado final legível (campos da invoice + raw JSON expansível).
- **Loading profissional** em todo o fluxo (upload, job, telemetria, resultado).
- UX rápida o suficiente para demos internas.

### 3.3 Não-objetivos (neste POC)

- Autenticação multi-tenant / SSO.
- Histórico longo de jobs com billing real (além da estimativa do POC).
- Edição manual de campos extraídos com correção supervisionada (pode ser fase 2).
- Deploy multi-região, CDN avançado, PWA offline.
- Treinar ou fine-tunar modelos.

---

## 4. Personas e cenários

| Persona | Necessidade |
| --- | --- |
| Engenheiro / PM validando o POC | Ver se o pipeline funciona e quanto custa por nota |
| Demo para stakeholders | Entender visualmente OCR local vs. LLM via OpenRouter |
| Dev backend do POC | Conferir se a UI consome bem os eventos/APIs de status |

**Cenário principal:** usuário sobe foto/PDF-render de uma invoice → acompanha steps → vê memória do Ollama durante glm-ocr → vê tokens/custo do OpenRouter → lê os dados extraídos e o resumo de custos.

---

## 5. Escopo funcional (Frontend)

### 5.1 Upload de imagem

- Drag-and-drop + seletor de arquivo.
- Formatos iniciais: `PNG`, `JPEG`, `WEBP` (PDF como imagem renderizada fica fora ou fase 2 — documentar decisão).
- Validação client-side: tipo MIME, tamanho máximo (sugerido: 10 MB).
- Preview da imagem antes de enviar.
- Botão **Processar** desabilitado até arquivo válido.
- Feedback de erro claro (arquivo inválido, falha de rede, backend indisponível).

### 5.2 Visualização do processamento

- Criar um **job** após o upload (ID retornado pela API).
- UI de progresso com etapas explícitas, por exemplo:

  1. Upload recebido  
  2. Pré-processamento da imagem  
  3. OCR via Ollama (`glm-ocr`)  
  4. Estruturação / extração via OpenRouter  
  5. Consolidação do resultado  
  6. Concluído / Falhou  

- Cada etapa: status (`pending` | `running` | `success` | `error`), timestamps, duração, mensagem opcional.
- Atualização via **SSE** ou **WebSocket** (preferência: SSE se o backend já emitir eventos); fallback: polling a cada N segundos.
- Em erro: etapa marcada, mensagem legível, opção **Tentar de novo** (mesmo arquivo ou novo upload).

### 5.3 Painel Ollama / glm-ocr

- Exibir que o OCR está rodando no Ollama com modelo `glm-ocr`.
- Métricas (quando a API fornecer):

  - status do serviço Ollama (up/down);
  - modelo ativo;
  - **uso de memória** (RSS / VRAM se disponível — rotular a unidade);
  - duração da etapa OCR;
  - throughput aproximado (opcional).

- Visual: gauge ou sparkline de memória durante a etapa OCR; valor atual + pico da run.
- Se a telemetria não estiver disponível, estado explícito “métricas indisponíveis” (não inventar números).

### 5.4 Painel OpenRouter

- Exibir a(s) chamada(s) feitas via OpenRouter nesta run.
- Por chamada (ou agregado da run):

  - modelo usado;
  - status (success/error);
  - latência;
  - **tokens de input / output / total**;
  - **custo estimado** (moeda configurável, default USD).

- Link ou label do modelo (sem expor API keys).
- Se houver mais de uma chamada, lista expansível.

### 5.5 Resultado (solução)

- Card com campos estruturados da invoice (ex.: fornecedor, CNPJ/VAT, data, número, itens, totais, moeda) — schema alinhado ao contrato da API.
- Confiança / avisos por campo se o backend enviar.
- Toggle **JSON bruto** (OCR text + payload estruturado).
- Ações: copiar JSON, download JSON (opcional no POC).

### 5.6 Custos computacionais e tokens

- Resumo sticky ou seção final **Custo desta run**:

  | Métrica | Origem |
  | --- | --- |
  | Tokens OpenRouter (in/out/total) | OpenRouter / backend |
  | Custo estimado OpenRouter | backend (preço × tokens) |
  | Tempo total wall-clock | frontend ou backend |
  | Pico de memória Ollama | telemetria Ollama |
  | Duração OCR vs. LLM | por etapa |

- Deixar claro o que é **estimado** vs. **medido**.
- Não misturar custo de infra local (Ollama) com custo OpenRouter sem rótulos distintos: Ollama = recurso local (memória/tempo); OpenRouter = tokens/$ .

---

## 6. Requisitos não-funcionais

| ID | Requisito |
| --- | --- |
| NFR-1 | Primeira interação útil (upload) em < 2 s após load da página em rede normal |
| NFR-2 | UI responsiva desktop-first; tablet ok; mobile básico |
| NFR-3 | Acessibilidade: labels, contraste, foco no teclado no fluxo principal |
| NFR-4 | Nenhum segredo (OpenRouter key, etc.) no frontend |
| NFR-5 | Estados de loading / empty / error consistentes e **profissionais** (ver §7.2) |
| NFR-6 | Logs de UI sem PII da invoice em analytics (se houver) |
| NFR-7 | Stack UI obrigatória: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui |

---

## 7. Arquitetura da UI

```
┌─────────────────────────────────────────────────────────┐
│  Header: invoice-ocr-poc                                │
├───────────────────────┬─────────────────────────────────┤
│  Upload + Preview     │  Timeline do job                │
│                       │  (steps 1–6)                    │
├───────────────────────┴─────────────────────────────────┤
│  Telemetria                                             │
│  ┌─────────────────────┐  ┌───────────────────────────┐ │
│  │ Ollama / glm-ocr    │  │ OpenRouter                │ │
│  │ mem · status · tempo│  │ tokens · $ · latência     │ │
│  └─────────────────────┘  └───────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│  Resultado estruturado + JSON                           │
│  Resumo de custos da run                                │
└─────────────────────────────────────────────────────────┘
```

### 7.1 Stack (decidida)

| Camada | Escolha | Notas |
| --- | --- | --- |
| Framework | **Next.js** (App Router) | TypeScript obrigatório |
| Estilo | **Tailwind CSS** | Tokens/tema alinhados ao shadcn |
| Componentes | **shadcn/ui** | Button, Card, Progress, Skeleton, Badge, Separator, Tabs, Alert, Dialog, etc. |
| Ícones | lucide-react (padrão shadcn) | Consistência visual |
| Dados em tempo real | EventSource (SSE) + `fetch` | Sem API keys no client |

Não usar outra lib de UI (MUI, Chakra, Ant) neste POC. Componentes custom só quando shadcn não cobrir.

### 7.2 Loading profissional

O loading não pode ser um spinner genérico solto. Deve parecer produto pronto para demo:

| Momento | Comportamento esperado |
| --- | --- |
| Carga inicial da página | Skeleton dos painéis (upload, timeline, telemetria) com `Skeleton` do shadcn — sem flash de layout |
| Upload do arquivo | Progresso no dropzone + estado disabled no CTA; feedback de % se o browser permitir |
| Job em andamento | Timeline com step `running` animado; steps futuros em skeleton/muted; duração elapsed no step ativo |
| Painel Ollama | Skeleton → valores; gauge/barra de memória com transição suave; pulse sutil enquanto `running` |
| Painel OpenRouter | Skeleton → tokens/custo; contadores que atualizam sem “pular” o layout |
| Resultado | Skeleton de cards de campos até o payload final; depois reveal do conteúdo |
| Transições | Evitar layout shift; preferir `animate-pulse` / Progress do shadcn; aria-busy e textos para leitores de tela |
| Erro / retry | Loading de retry no botão (`Loader2` + disabled) até a nova tentativa resolver |

Critério qualitativo: em demo, o stakeholder nunca vê tela “morta” nem spinner sem contexto — sempre há indicação de **qual etapa** está carregando.

---

## 8. Contratos que o frontend precisa da API

> O frontend **não inventa** métricas. Se o campo não vier, mostra “—”.

### 8.1 Endpoints (proposta)

| Método | Path | Uso |
| --- | --- | --- |
| `POST` | `/api/jobs` | multipart upload → `{ jobId }` |
| `GET` | `/api/jobs/:id` | estado atual + resultado parcial/final |
| `GET` | `/api/jobs/:id/events` | SSE de progresso |
| `GET` | `/api/telemetry/ollama` | snapshot memória/status (ou embutido nos events) |

### 8.2 Eventos SSE (exemplo)

```json
{
  "jobId": "…",
  "step": "ollama_ocr",
  "status": "running",
  "ts": "2026-09-25T04:00:00Z",
  "ollama": { "model": "glm-ocr", "memoryBytes": 0, "memoryPeakBytes": 0 },
  "openrouter": null,
  "message": "Running OCR"
}
```

Evento final inclui `result` + `costSummary`.

### 8.3 `costSummary` (exemplo)

```json
{
  "openrouter": {
    "promptTokens": 0,
    "completionTokens": 0,
    "totalTokens": 0,
    "estimatedCostUsd": 0
  },
  "ollama": {
    "durationMs": 0,
    "memoryPeakBytes": 0
  },
  "wallClockMs": 0
}
```

---

## 9. UX — estados principais

1. **Empty:** CTA de upload + texto curto do que o POC faz.  
2. **Ready:** preview + Processar.  
3. **Processing:** loading profissional — timeline animada, skeletons nos painéis, progresso contextual por etapa.  
4. **Success:** resultado + custos destacados.  
5. **Error:** etapa falha + retry.  
6. **Degraded:** job ok mas telemetria parcial (avisos amarelos).

---

## 10. Critérios de aceite (frontend)

- [ ] App em **Next.js** (App Router) + **Tailwind CSS** + **shadcn/ui**.
- [ ] Usuário consegue fazer upload de PNG/JPEG/WEBP dentro do limite e ver preview.
- [ ] Ao processar, um job é criado e a timeline reflete as etapas até success/error.
- [ ] Durante OCR, a UI mostra status do Ollama/`glm-ocr` e memória quando disponível.
- [ ] Quando houver chamada OpenRouter, a UI mostra tokens e custo estimado.
- [ ] Ao concluir, a UI mostra a solução estruturada e o resumo de custos/tokens.
- [ ] Loading profissional: skeletons na carga inicial, progresso contextual no upload/job, sem spinner órfão, `aria-busy` nos blocos em wait.
- [ ] Nenhuma API key é embutida no bundle.
- [ ] Erros de rede/validação têm mensagem acionável.

---

## 11. Métricas de sucesso do POC (produto)

- Demo completa (upload → resultado + custos) sem intervenção no terminal.
- Stakeholder consegue responder: “quanto custou esta nota?” e “o Ollama aguentou a memória?” olhando só a UI.
- Pelo menos N runs internas bem-sucedidas com invoices reais/anonimizadas (N a definir pelo time; sugestão: 10).

---

## 12. Fases

| Fase | Entrega |
| --- | --- |
| **F0** | Scaffold Next.js + Tailwind + shadcn/ui; shell + upload + mock de timeline + skeletons |
| **F1** | Integração real de job + SSE + resultado |
| **F2** | Painéis Ollama (memória) + OpenRouter (tokens/$) |
| **F3** | Polish de demo (empty states, degraded, export JSON) |

---

## 13. Riscos e dependências

| Risco / dependência | Mitigação |
| --- | --- |
| Backend ainda não expõe memória do Ollama | UI com estado “indisponível”; alinhar contrato cedo |
| Preços OpenRouter mudam | Custo sempre rotulado como estimado; preço vem do backend |
| OCR lento / OOM no host | Mostrar pico de memória e falha clara na etapa OCR |
| Imagens grandes | Limite de tamanho + compressão client-side opcional |

---

## 14. Open questions

1. PDF nativo no F0 ou só imagem?
2. Telemetria Ollama: endpoint dedicado ou só nos events do job?
3. Moeda e tabela de preços: fixas no backend ou configuráveis?
4. Precisamos de histórico de jobs na UI neste POC ou só a run atual?

**Decidido:** stack = Next.js + Tailwind CSS + shadcn/ui; loading profissional obrigatório (§7.1–7.2).

---

## 15. Apêndice — glossário

| Termo | Significado |
| --- | --- |
| **Ollama** | Runtime local de modelos; aqui hospeda `glm-ocr` |
| **glm-ocr** | Modelo de OCR usado na etapa de leitura da imagem |
| **OpenRouter** | Gateway de LLMs na nuvem; usado para estruturar/enriquecer o texto OCR |
| **Job** | Uma execução completa upload → resultado |
| **costSummary** | Agregado de tokens, $ estimado e recursos locais da run |

