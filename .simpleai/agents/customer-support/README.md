---
agent_id: customer-support
status: skeleton
threshold_field: ready_to_respond
default_fallback: false
---

# Customer Support — atendimento ao cliente

Agente que ajuda o usuario leigo a responder duvidas, reclamacoes e mensagens de clientes — **especialmente no WhatsApp**, que e o canal mais comum do publico do SIMPLE-AI.

> Status: **skeleton**. Spec inicial. Falta detalhar fases, perguntas e flow completo.

## Identidade

- **Nome:** Atendimento ao Cliente
- **Tagline:** "Manda a mensagem do cliente. Eu te ajudo a responder."
- **Tom:** acolhedor, paciente, primeira pessoa, brasileiro coloquial.

## Casos de uso (publico-alvo do SIMPLE-AI)

1. **Dona de pequeno negocio** que recebe mensagem de cliente reclamando do produto.
2. **Profissional autonomo** que precisa responder duvida tecnica de cliente novo.
3. **Comerciante** que quer cadastrar respostas pra perguntas frequentes que recebe varias vezes por dia.
4. **Prestador de servico** que recebeu uma mensagem dificil e nao sabe como responder.

## Notepad — campos especificos

Alem dos compartilhados em [../../core/notepad.md](../../core/notepad.md):

| Campo | Prioridade | Descricao |
|-------|-----------|-----------|
| `business_type` | critical | (compartilhado) |
| `common_questions` | critical | lista de perguntas que clientes fazem com frequencia |
| `response_tone` | critical | tom desejado nas respostas (formal, amigavel, casual) |
| `channels_used` | important | onde o cliente fala (whatsapp, instagram, telefone) |
| `escalation_rules` | important | quando o usuario quer ser chamado pessoalmente |
| `forbidden_phrases` | desired | frases que o usuario nao quer que aparecam |
| `typical_complaints` | desired | tipos de reclamacao que o usuario recebe |

## Threshold

```
ready_to_respond = (
    business_type, common_questions, response_tone preenchidos com confidence >= 0.5
    AND >= 2 mensagens trocadas
)
```

Mais leve que o do `website-builder` porque o usuario pode mostrar uma mensagem real do cliente e ja querer ajuda na resposta — nao precisa de descoberta longa.

## Modos de operacao

1. **Modo "responder agora"** — usuario cola/manda uma mensagem real de cliente, agente sugere resposta.
2. **Modo "preparar respostas"** — usuario lista perguntas frequentes, agente prepara um conjunto reutilizavel.
3. **Modo "treinar tom"** — usuario corrige uma resposta, agente aprende e ajusta o `response_tone`.

A escolha do modo e silenciosa — depende do que o usuario disse na primeira mensagem.

## Hand-off

Pode receber sessao de:
- `website-builder` (cliente terminou o site e agora precisa lidar com mensagens que vao chegar).

Pode enviar sessao para:
- `content-creator` (cliente percebeu que quer prevenir duvidas com posts educativos).

## Spec a desenvolver

- [ ] `first-interaction.md` — como abrir a conversa quando o usuario cola uma mensagem real vs. quando descreve em geral.
- [ ] `agent-flow.md` — fases (entender contexto → entender tom → propor resposta).
- [ ] `flow-order.md` — Discovery → Resposta → Refino.

## Implementacao

- Planner: [../../../src/features/agents/customer-support/planner.js](../../../src/features/agents/customer-support/planner.js) (skeleton)
