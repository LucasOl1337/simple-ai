# SIMPLE-AI Agora Core

Backend FastAPI para iniciar sessoes do Agora Conversational AI dentro da repo principal.

## Setup

```bash
cd server-python
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env.local
```

Preencha `.env.local` com:

- `APP_ID`
- `APP_CERTIFICATE`
- `AGENT_LLM_PROVIDER` (`anthropic`, `openai-compatible`, `nvidia`, `zai`, `openrouter`)
- `AGENT_LLM_API_KEY` ou a chave especifica do provider (`ANTHROPIC_API_KEY`, `NVIDIA_API_KEY`, `ZAI_API_KEY`, `OPENROUTER_API_KEY`)
- `AGENT_LLM_BASE_URL` se voce quiser sobrescrever o endpoint padrao
- `AGENT_LLM_MODEL`

Defaults oficiais usados pelo backend:

- `nvidia` -> `https://integrate.api.nvidia.com/v1`
- `zai` -> `https://api.z.ai/api/paas/v4`
- `openrouter` -> `https://openrouter.ai/api/v1`

## Run

```bash
python src/server.py
```

API local:

- `GET /get_config`
- `POST /v2/startAgent`
- `POST /v2/stopAgent`

## Notas

- O fluxo usa `RTC + RTM + Conversational AI` da Agora.
- O prompt do agente foi adaptado para coleta de briefing em portugues.
- O `AGENT_TTS_VOICE_ID` fica configuravel porque a disponibilidade de vozes depende do projeto/provider habilitado na Agora.
- Se `AGENT_LLM_PROVIDER=openai-compatible`, o backend usa o vendor OpenAI do SDK da Agora com `base_url` customizada.
- `zai` e `openrouter` usam o mesmo vendor OpenAI do SDK da Agora, mas com defaults de base URL e modelo voltados para seus endpoints.
