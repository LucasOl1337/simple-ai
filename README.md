# SIMPLE-AI

Qualquer pessoa cria seu site conversando em português.  
Sem saber nada de tecnologia. O sistema decide tudo nos bastidores.

---

## O que é

SIMPLE-AI é uma plataforma que transforma uma conversa em texto em um site funcional e publicado.

O usuário descreve o negócio em linguagem natural. O sistema extrai as informações necessárias, toma todas as decisões técnicas de forma invisível (stack, layout, módulos), e entrega um site pronto — sem que o usuário veja uma única palavra técnica durante o processo.

**Para quem:** donos de pequenos negócios brasileiros sem nenhuma experiência digital.  
**Diferencial:** o usuário nunca vê, entende ou é exposto a nenhum termo técnico. A conversa é o produto.

---

## Os 3 Módulos

| Módulo | Pasta | Responsabilidade |
|--------|-------|-----------------|
| **Intake** | `intake/` | Coleta inteligente via conversa — transforma linguagem natural em especificação técnica |
| **Builder** | `builder/` | Agente LLM que recebe o briefing e gera um site HTML funcional |
| **API** | `api/` | Servidor FastAPI, orquestração, fila de build, serving dos sites gerados |

---

## Fluxo Principal

```
Usuário escreve em texto
        │
        ▼
  [intake/engine]          Motor de discovery: fases conversacionais,
  Agente 01                notepad interno, threshold ready_to_build
        │
        │  briefing consolidado (JSON)
        ▼
   [api/server]            Fila de build, polling de status
        │
        │  spec do negócio
        ▼
  [builder/agent]          Agente 02: prepara assets e monta o site final
  Agente 02
        │
        │  assets + index.html
        ▼
  [api/sites/{id}/]        Site servido publicamente
        │
        ▼
  Usuário recebe o link
```

---

## Setup Completo

### Pré-requisitos
- Node.js 18+
- Python 3.11+
- (Opcional) Chave de API de um LLM para o Agente 02

### Frontend (Módulo Intake)

```bash
npm install
npm run dev          # http://localhost:5175
```

### Backend (Módulos API + Builder)

```bash
cd api
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Configure o LLM (opcional — sem ele, usa fallback local)
cp .env.example .env.local
# Edite .env.local com suas credenciais

python server.py     # http://localhost:8000
```

### Rodar tudo junto

```bash
npm run dev:full     # roda frontend + backend em paralelo
```

---

## Configuração do LLM (Agente 02)

O Agente 02 aceita qualquer provedor OpenAI-compatible. Configure em `api/.env.local`:

```env
# Escolha um provedor:
AGENT_LLM_PROVIDER=anthropic        # anthropic | openai-compatible | nvidia | zai | openrouter
AGENT_LLM_API_KEY=sk-...
AGENT_LLM_MODEL=claude-opus-4-7     # opcional — tem defaults por provedor
```

Sem configuração, o sistema usa um fallback determinístico local (site HTML limpo baseado no briefing).

## Contrato Operacional do Builder

Quando o Agente 01 decide que o briefing está pronto, ele entrega uma primeira V1 de website para o Agente 02.

O Agente 02 deve respeitar esta ordem operacional:

1. Receber o briefing consolidado e o `design_plan`.
2. Decidir a estratégia visual e os slots de assets.
3. Processar e gerar os assets necessários.
4. Só depois de os assets estarem prontos, montar o `index.html` final já embutindo esses assets.
5. Publicar o site apenas quando a versão final estiver consistente.

Se algum asset secundário falhar ou exceder o orçamento de tempo, o builder pode usar fallback para esse slot sem bloquear a V1 inteira. Mas a ordem correta continua sendo: assets primeiro, HTML final depois.

---

## Regras Absolutas do Produto

Estes princípios são invioláveis em todo o código, UX e documentação:

1. **Zero jargão técnico** — o usuário nunca vê: frontend, backend, API, deploy, React, banco de dados, servidor, endpoint
2. **Uma pergunta por vez** — nunca bombardear o usuário com múltiplas perguntas
3. **O agente decide em silêncio** — stack, layout e módulos são escolhas invisíveis baseadas no notepad
4. **Notepad é a única fonte de verdade** — todas as decisões técnicas derivam do que foi anotado
5. **Acessível para um idoso de 68 anos sem experiência digital** — linguagem, ritmo e clareza não são negociáveis
6. **Tela inicial completamente vazia** — sem menus, dashboards, botões técnicos
7. **Só a conversa é visível** — sem tabs, toggles, modos ou atalhos técnicos

---

## Estado Atual

**Fase 1 — Texto:** toda a interação é por texto. A UI é uma conversa simples.

**Fase 2 — Voz (roadmap):** interação por voz está prevista para uma fase futura. Nenhum código de voz existe na base atual.

---

## Ordem de Leitura para Colaboradores

```
1. README.md (este arquivo)            — visão geral e regras
2. docs/spec/README.md                 — especificação comportamental do agente
3. docs/spec/first-interaction.md      — como a primeira mensagem é tratada
4. docs/spec/agent-flow.md             — as 7 fases da conversa
5. docs/spec/flow-order.md             — threshold de ready_to_build
6. docs/spec/NOTEPAD-SCHEMA.md         — schema completo do notepad
7. docs/architecture.md                — arquitetura técnica atual
8. intake/README.md                    — módulo de coleta
9. builder/README.md                   — módulo de geração
10. api/README.md                       — módulo de servidor
```
