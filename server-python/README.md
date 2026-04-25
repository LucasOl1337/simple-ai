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
