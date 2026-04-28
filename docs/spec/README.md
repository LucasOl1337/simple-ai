# docs/spec — Especificação Core do Sistema

**Este diretório contém a especificação de comportamento do agente SIMPLE-AI.**

Estes arquivos NÃO são documentação auxiliar. São o **cérebro do produto**.
Qualquer agente ou colaborador que atuar neste projeto DEVE ler estes arquivos ANTES de escrever código, gerar resposta ou tomar decisão.

---

## Ordem obrigatória de leitura

| # | Arquivo | O que define |
|---|---------|-------------|
| 1 | [first-interaction.md](first-interaction.md) | Como o agente abre a conversa, extrai sinais da primeira resposta, e usa o caderno de anotações (notepad) |
| 2 | [agent-flow.md](agent-flow.md) | As 7 fases da conversa, perguntas por fase, e as decisões silenciosas (stack, layout, módulos) |
| 3 | [flow-order.md](flow-order.md) | As 3 macro-fases (Discovery → Produção → Iteração), threshold de ready_to_build, e como o agente julga quando avançar |
| 4 | [NOTEPAD-SCHEMA.md](NOTEPAD-SCHEMA.md) | Schema canônico do notepad: todos os campos, tipos, prioridades e threshold |

---

## Conceitos fundamentais

### Caderno de Anotações (Notepad)
O agente mantém um caderno interno atualizado a cada resposta do usuário.
Cada campo tem: `value`, `confidence` (0-1), `source`, e `priority` (critical/important/desired).

### Campos Críticos
Sem estes 3 campos, o agente NÃO pode começar a produzir:
1. `business_type` — tipo de negócio
2. `brand_name` — nome da marca
3. `primary_cta` — ação principal que o visitante deve fazer

### Threshold de Produção (ready_to_build)
```
ready_to_build = (
    todos os campos críticos preenchidos (confidence >= 0.5)
    AND confiança geral >= 55%
    AND pelo menos 3 mensagens trocadas
)
```

### Regras Invioláveis
1. O usuário NÃO sabe tecnologia — nunca usar jargão técnico
2. Uma pergunta por vez — nunca bombardear
3. O agente decide stack/layout/módulos sozinho e em silêncio
4. O notepad é a única fonte de verdade para decisões
5. O agente pode propor construir quando ready_to_build = true

### Interação por Texto
A conversa é exclusivamente por texto. O usuário digita suas mensagens.  
Interação por voz está prevista para **Fase 2 (roadmap)** — não existe na base atual.

---

## Relação com o código

| Spec | Implementação |
|------|--------------|
| Fases + perguntas + notepad | `intake/engine/planner.js` |
| UI principal | `intake/ui/App.jsx` |
| Backend | `api/server.py` |
| Agente construtor | `builder/agent/builder_agent.py` |

O código deve seguir o que está especificado aqui. Se houver divergência, o spec em `docs/spec/` é a referência correta.

---

## Quando atualizar estes arquivos

- Quando uma nova fase for adicionada ao fluxo
- Quando novos campos forem adicionados ao notepad
- Quando o threshold de ready_to_build mudar
- Quando novas regras de comportamento forem definidas
- Quando uma nova integração afetar o fluxo do agente
