# Módulo Intake

**Responsabilidade:** Transformar o usuário leigo em dados técnicos estruturados.

Este módulo é a camada de interação completa do SIMPLE-AI. Recebe texto livre do usuário, conduz uma conversa inteligente em português, e entrega um briefing técnico consolidado para o Agente 02 construir o site.

---

## Estrutura Interna

```
intake/
├── ui/                    Interface React (conversa + lousa)
│   ├── App.jsx            Orquestrador de estado e sessões
│   ├── components/        Componentes visuais (lousa, dock, cards)
│   │   ├── WhiteboardCanvas.jsx   Lousa de notas dinâmica
│   │   ├── BuildingCard.jsx       Card de progresso de build
│   │   ├── DraggableCard.jsx      Primitive: card arrastável
│   │   ├── WhiteboardNote.jsx     Nota Post-it na lousa
│   │   ├── BrowserPreviewPanel.jsx Preview do site gerado
│   │   ├── ReadyToBuildCard.jsx   Card de confirmação de build
│   │   ├── ShareJourneyModal.jsx  Modal de compartilhamento
│   │   ├── ConversationStatus.jsx Status da conversa
│   │   ├── SessionRail.jsx        Painel de sessões laterais
│   │   ├── TranscriptMessage.jsx  Mensagem do transcript
│   │   ├── ThemeToggle.jsx        Toggle dark/light
│   │   ├── ParticleField.jsx      Fundo animado
│   │   └── AppShellErrorBoundary.jsx  Error boundary global
│   ├── constants.js       Storage keys e constantes de UI
│   ├── utils.js           Funções puras de UI e storage
│   ├── styles.css         Estilos globais
│   ├── main.jsx           Bootstrap Vite
│   └── remotion/          Players de animação (lazy-loaded)
│       ├── LaunchSequence.jsx    Animação de site publicado
│       ├── OnboardingLoop.jsx    Animação da lousa vazia
│       └── JourneyShareClip.jsx  Clip social para compartilhar
├── engine/                Motor de discovery (lógica pura, sem UI)
│   ├── planner.js         Engine principal: fases, notepad, threshold
│   └── index.js           Barrel export do módulo
└── prompts/               Prompts de intake para o LLM (não usado em runtime padrão)
    └── intake.py
```

---

## O que recebe / O que entrega

**Recebe:** texto livre do usuário (uma mensagem por vez)

**Entrega:** objeto `session` com `notepad` consolidado, incluindo:
- `business_type`, `brand_name`, `primary_cta` (campos críticos)
- `target_audience`, `scope`, `current_channels`, `existing_presence`
- `content_volume`, `has_media`, `pricing_strategy`
- `modules` (lista de funcionalidades detectadas)
- `readyToBuild` boolean

---

## Como rodar

```bash
npm install
npm run dev    # http://localhost:5175
```

O frontend se conecta automaticamente ao backend via proxy `/api → localhost:8000`.

---

## Dependências e contratos

- **Depende de:** nada externo (motor é puro JS, sem chamadas de rede)
- **Entrega para:** `api/` via chamada POST `/api/v2/build` com o briefing consolidado
- **Engine importável por:** `import { buildSummary, createSession, submitAnswer, getCurrentQuestion, getNotepadState } from "intake/engine"`
