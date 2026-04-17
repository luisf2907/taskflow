# Voice — Transcrição de reuniões

## Visão geral

O módulo de voz permite gravar reuniões no app e obter transcrição
automática com identificação de falantes (diarização). Usa:

- **Whisper** (faster-whisper) — transcrição de áudio pra texto
- **pyannote** — diarização (quem falou quando)
- **Speaker embeddings** — reconhecer participantes por voz

O processamento roda num **worker externo** (FastAPI) que precisa de
**GPU NVIDIA** (CUDA). O app se comunica com o worker via HTTP.

## Drivers

| Driver | Env | Comportamento |
|--------|-----|---------------|
| `fastapi` | `VOICE_DRIVER=fastapi` | Worker externo ativo — tab "Gravar" aparece |
| `disabled` | `VOICE_DRIVER=disabled` | Tab "Gravar" some da UI. Upload de áudio funciona mas sem transcrição |

## Configuração

### Envs do app

```env
VOICE_DRIVER=fastapi
VOICE_WORKER_URL=http://voice-worker:8080    # URL do worker
VOICE_WORKER_API_KEY=changeme-shared-secret  # Bearer token pra autenticar
VOICE_WEBHOOK_SECRET=changeme-min-32-chars   # HMAC secret pra callbacks
```

### Envs do worker

```env
WORKER_API_KEY=changeme-shared-secret    # Deve bater com VOICE_WORKER_API_KEY do app
WORKER_HOST=0.0.0.0
WORKER_PORT=8080
HF_TOKEN=hf_xxx                          # Hugging Face token (pyannote exige)
WHISPER_MODEL=large-v3                   # Modelo Whisper (large-v3, medium, small)
DEVICE=cuda                              # cuda ou cpu (cpu é ~10x mais lento)
LANGUAGE=pt                              # Idioma default (ou "auto" pra detectar)
```

## Arquitetura

```
Browser                    App (Next.js)              Voice Worker (FastAPI)
  │                            │                            │
  ├─ Gravar áudio ────────────►│                            │
  │                            ├─ Upload pra storage ──────►│ (storage)
  │                            │                            │
  ├─ "Processar reunião" ────►│                            │
  │                            ├─ POST /process-meeting-async
  │                            │   (audio_url, callback_url)│
  │                            │                            ├─ Baixa áudio
  │                            │                            ├─ Whisper (transcrição)
  │                            │                            ├─ pyannote (diarização)
  │                            │                            ├─ Speaker matching
  │                            │                            │
  │                            │◄── POST /webhook (HMAC) ──┤
  │                            ├─ Salva transcrição no DB   │
  │◄── Realtime update ───────┤                            │
```

### Endpoints do worker

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/health` | GET | Liveness + modelos carregados |
| `/enroll` | POST | Cadastra embedding de voz (multipart) |
| `/process-meeting` | POST | Processamento síncrono (timeout 15min) |
| `/process-meeting-async` | POST | Enfileira + callback via webhook |

### Segurança

- **App → Worker:** `Authorization: Bearer <VOICE_WORKER_API_KEY>`
- **Worker → App:** Webhook com HMAC-SHA256 usando `VOICE_WEBHOOK_SECRET`
  no header `X-Webhook-Signature`. App valida antes de aceitar resultado.

## Setup — Docker (perfil full)

O `docker-compose.full.yml` tem o voice worker comentado. Pra ativar:

1. Descomente o service `voice-worker` no compose
2. Edite `.env.local`:
   ```env
   VOICE_DRIVER=fastapi
   VOICE_WORKER_URL=http://voice-worker:8080
   VOICE_WORKER_API_KEY=seu-secret-aqui
   VOICE_WEBHOOK_SECRET=outro-secret-min-32-chars
   HF_TOKEN=hf_xxx
   ```
3. Build e suba:
   ```bash
   docker compose -f docker/docker-compose.full.yml --env-file .env.local build voice-worker
   docker compose -f docker/docker-compose.full.yml --env-file .env.local up -d voice-worker
   ```

Primeiro start demora ~5 minutos (baixa modelos Whisper + pyannote).

### Requisitos de GPU

- NVIDIA GPU com pelo menos 6GB VRAM (Whisper large-v3 + pyannote)
- `nvidia-container-toolkit` instalado no host
- Driver NVIDIA 525+ (CUDA 12.x)

### Sem GPU (CPU fallback)

Funciona mas é **~10x mais lento**. Troque no `.env`:
```env
DEVICE=cpu
WHISPER_MODEL=medium  # modelo menor pra CPU
```

## Setup — Worker externo (sem Docker)

Se o worker roda numa máquina separada (ex: desktop com GPU):

```bash
# Na máquina com GPU
cd taskflow-voice
pip install torch==2.5.1 torchaudio==2.5.1 --index-url https://download.pytorch.org/whl/cu124
pip install -r requirements.txt
python run_worker.py
```

E exponha via ngrok ou IP direto:
```env
# No .env.local do app
VOICE_WORKER_URL=https://xxx.ngrok-free.app
```

## Enrollment (cadastro de voz)

Cada participante pode cadastrar sua voz pra ser reconhecido
automaticamente nas transcrições:

1. User vai em **Reuniões → Settings → Voz**
2. Grava ~10 segundos de fala
3. Embedding é extraído pelo worker e salvo em `perfis.voice_embedding`
4. Nas próximas transcrições, segmentos de áudio são comparados com os
   embeddings cadastrados pra atribuir falas aos participantes

## Limitações

- **Idioma:** default `pt` (português). Pra reuniões multi-idioma, setar
  `LANGUAGE=auto` no worker (detecção automática, mas menos preciso).
- **Duração:** áudios >2h podem estourar timeout. Use `process-meeting-async`.
- **Qualidade:** transcrição depende de qualidade do áudio. Microfones
  ruins ou muito ruído degradam significativamente.
- **LGPD:** embeddings de voz são dados biométricos. O app tem endpoint
  `DELETE /api/voice/enroll` pra o user apagar seus dados.
