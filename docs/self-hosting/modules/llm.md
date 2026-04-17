# LLM — Inteligência Artificial

## Visão geral

O módulo LLM habilita geração e melhoria de conteúdo via IA:

- **Gerar cards com IA** — cria cartões a partir de descrição textual
- **Melhorar com IA** — reescreve/expande descrição de cartão
- **Resumo de reunião** — gera resumo a partir da transcrição

## Drivers

| Driver | Env | Descrição |
|--------|-----|-----------|
| `gemini` | `LLM_DRIVER=gemini` | Google Gemini API (requer `GEMINI_API_KEY`) |
| `ollama` | `LLM_DRIVER=ollama` | Ollama local via HTTP (requer `LLM_BASE_URL`) |
| `openai-compat` | `LLM_DRIVER=openai-compat` | Qualquer API OpenAI-compatible (OpenAI, Groq, Together, etc) |
| `anthropic` | `LLM_DRIVER=anthropic` | Claude API (requer `LLM_API_KEY`) |
| `disabled` | `LLM_DRIVER=disabled` | Botões de IA somem da UI |

## Status de implementação

> **⚠️ Apenas `gemini` e `disabled` estão implementados de verdade.**
> Os outros drivers (`ollama`, `openai-compat`, `anthropic`) são aceitos
> pelo `features.ts` mas as rotas API em `src/app/api/ai/*` ainda chamam
> apenas o Gemini SDK. Contribuições pra adaptar as rotas aos outros
> backends são bem-vindas.

## Configuração

### Gemini (cloud)

```env
LLM_DRIVER=gemini
GEMINI_API_KEY=AIza...
```

### Ollama (local, quando implementado)

```env
LLM_DRIVER=ollama
LLM_BASE_URL=http://localhost:11434
LLM_MODEL=llama3.1
```

### OpenAI-compatible (quando implementado)

```env
LLM_DRIVER=openai-compat
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-xxx
LLM_MODEL=gpt-4o
```

### Anthropic (quando implementado)

```env
LLM_DRIVER=anthropic
LLM_API_KEY=sk-ant-xxx
LLM_MODEL=claude-sonnet-4-20250514
```

### Desabilitado

```env
LLM_DRIVER=disabled
```

Sem nenhuma env de LLM setada, default é `disabled` (a menos que
`GEMINI_API_KEY` esteja presente, que ativa `gemini` automaticamente).

## Comportamento da UI

Quando `LLM_DRIVER=disabled`:
- Botão "Gerar cards com IA" some
- Botão "Melhorar com IA" some
- Seção "Resumo IA" na reunião some

## Contribuindo

Pra implementar um driver novo:

1. Adaptar as rotas em `src/app/api/ai/*` pra ler `LLM_DRIVER` do
   `features.ts` e chamar o backend correto
2. O driver `openai-compat` deve funcionar com qualquer API que siga
   o formato OpenAI (POST `/chat/completions` com messages array)
3. Ollama expõe API OpenAI-compat em `/v1/chat/completions` — pode
   reusar o mesmo adapter
4. Manter a interface de response compatível com o que a UI espera
