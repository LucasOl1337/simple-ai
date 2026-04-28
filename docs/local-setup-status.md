# Local setup status — branch dev

Snapshot do que esta funcionando e do que falta no ambiente local. Atualizado em 2026-04-27.

## O que esta no ar

- **Frontend Vite:** http://localhost:5173/
- **Backend Python (FastAPI):** http://127.0.0.1:8765/
- **Proxy Vite:** `/api/*` → `http://127.0.0.1:8765/*` (sem prefixo `/api`)
- **Healthcheck:** `curl http://localhost:5173/api/get_config` → HTTP 200 com payload Agora-shaped.

## Mudanca de porta (importante)

O backend padrao do simple-ai era 8000, mas conflita com outro projeto local
(engagelens). Em ambiente compartilhado, mudamos para **8765**. Arquivos que
sabem disso:

- `server-python/.env.local` → `PORT=8765`
- `vite.config.js` → `proxy target` → `http://127.0.0.1:8765`

Se voce rodar em outra maquina e a 8000 estiver livre, pode reverter para 8000.

## O que ainda nao esta conectado de verdade

Para a sessao Agora + agente conversacional funcionarem **de verdade**, o
`server-python/.env.local` precisa ser preenchido com:

| Variavel | Como conseguir | Status |
|----------|----------------|--------|
| `APP_ID` | console.agora.io → Project | nao preenchido |
| `APP_CERTIFICATE` | console.agora.io → Project (App Certificate) | nao preenchido |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | nao preenchido |

Sem APP_ID / APP_CERTIFICATE: o backend gera token mas a Agora rejeita ao tentar
estabelecer canal real. O endpoint `/get_config` ainda responde 200, mas o
canal nao conecta.

Sem `ANTHROPIC_API_KEY` (ou outro provider): o backend funciona com fallback
local, sem geracao real do agente conversacional. O backend imprime no console:

```
[BUILDER] ANTHROPIC_API_KEY missing; using local deterministic builder.
Warning: failed to initialize Agente 03 (OCI): ANTHROPIC_API_KEY required for Agente 03.
```

## Bug corrigido nesta sessao

`src/features/discovery/planner.js` — `isQuestionSolved` exigia que os 3 campos
criticos (`business_type`, `offerings`, `primary_cta`) atingissem confidence
>= 0.65 para o `initial_description` ser considerado resolvido. Como
`primary_cta` raramente e extraivel da primeira frase do usuario ("padaria" +
"website" sem CTA explicito), o opening ficava em loop pedindo a mesma frase.

Fix: tratamento especial para `initial_description` — uma vez que o usuario
respondeu qualquer coisa nao-vazia, o opening avanca. Os 3 campos sao
re-coletados por perguntas dedicadas nas fases posteriores (business → goals).

## Como subir tudo do zero

```bash
# 1. Frontend
cd C:\Users\R2\simple-ai
npm run dev
# (abre em http://localhost:5173)

# 2. Backend (terminal separado)
cd C:\Users\R2\simple-ai
server-python\.venv\Scripts\python server-python/src/server.py
# (sobe em 0.0.0.0:8765)

# 3. Verificar
curl http://localhost:5173/api/get_config
# esperado: {"code":0,"msg":"success","data":{...}}
```

## Como limpar a sessao do navegador

Se voce ja testou na branch antiga e o agente esta com estado preso, limpar o
localStorage:

1. F12 → Application → Local Storage → http://localhost:5173
2. Apagar as chaves `simple-ai-*`

Ou no console do browser:
```js
Object.keys(localStorage).filter(k => k.startsWith("simple-ai")).forEach(k => localStorage.removeItem(k));
location.reload();
```
