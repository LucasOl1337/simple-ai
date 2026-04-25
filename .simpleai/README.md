# .simpleai — Especificacao Core do Sistema

**Este diretorio contem a especificacao de comportamento do agente SIMPLE-AI.**

Estes arquivos NAO sao documentacao auxiliar. Sao o **cerebro do produto**.
Qualquer agente (IA, voz, Convo, ou humano) que atuar neste projeto
DEVE ler estes arquivos ANTES de escrever codigo, gerar resposta ou tomar decisao.

---

## Ordem obrigatoria de leitura

| # | Arquivo | O que define |
|---|---------|-------------|
| 1 | [first-interaction.md](first-interaction.md) | Como o agente abre a conversa, extrai sinais da primeira resposta, e usa o caderno de anotacoes (notepad) |
| 2 | [agent-flow.md](agent-flow.md) | As 7 fases da conversa, perguntas por fase, e as decisoes silenciosas (stack, layout, modulos) |
| 3 | [flow-order.md](flow-order.md) | As 3 macro-fases (Discovery → Producao → Iteracao), threshold de ready_to_build, e como o agente julga quando avancar |
| 4 | [voice-convo-requirements.md](voice-convo-requirements.md) | Requisitos da integracao Agora Convo/Voice com o sistema de discovery |

---

## Conceitos fundamentais

### Caderno de Anotacoes (Notepad)
O agente mantem um caderno interno atualizado a cada resposta do usuario.
Cada campo tem: `value`, `confidence` (0-1), `source`, e `priority` (critical/important/desired).

### Campos Criticos
Sem estes 3 campos, o agente NAO pode comecar a produzir:
1. `business_type` — tipo de negocio
2. `brand_name` — nome da marca
3. `primary_cta` — acao principal que o visitante deve fazer

### Threshold de Producao (ready_to_build)
```
ready_to_build = (
    todos os campos criticos preenchidos (confidence >= 0.5)
    AND confianca geral >= 55%
    AND pelo menos 3 mensagens trocadas
)
```

### Regras inviolaveis
1. O usuario NAO sabe tecnologia — nunca usar jargao tecnico
2. Uma pergunta por vez — nunca bombardear
3. O agente decide stack/layout/modulos SOZINHO e em silencio
4. O notepad e a unica fonte de verdade para decisoes
5. O agente pode propor construir quando ready_to_build = true

---

## Relacao com o codigo

| Spec | Implementacao |
|------|--------------|
| Fases + perguntas + notepad | `src/features/discovery/planner.js` |
| UI principal | `src/app/App.jsx` |
| Agente de voz (Convo) | `server-python/src/agent.py` |

O codigo DEVE seguir o que esta especificado aqui. Se houver divergencia,
o spec em `.simpleai/` e a referencia correta.

---

## Quando atualizar estes arquivos

- Quando uma nova fase for adicionada ao fluxo
- Quando novos campos forem adicionados ao notepad
- Quando o threshold de ready_to_build mudar
- Quando novas regras de comportamento forem definidas
- Quando uma nova integracao (ex: Oracle DB) afetar o fluxo do agente
