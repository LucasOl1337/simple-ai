# Routing — como o intent do usuario chega no agente certo

Este documento descreve como o SIMPLE-AI roteia silenciosamente a primeira mensagem do usuario para o agente correto, sem mostrar menus ou opcoes.

## Princípio reitor

**O usuario nao escolhe o agente. O sistema escolhe.**

A regra global do SIMPLE-AI proibe menus, modos, ou seletores. O usuario chega na lousa vazia, fala (ou escreve) o que precisa, e o sistema roteia para o agente correto antes mesmo de mostrar a primeira resposta.

## Fluxo

```
[mensagem do usuario]
        |
        v
[intent classifier] ----> sinal claro (>= 0.7) ----> [agente especifico]
        |
        v
sinal ambiguo (< 0.7)
        |
        v
[clarifier] -- 1 pergunta neutra ----> [intent classifier de novo]
                                              |
                                              v
                                      [agente especifico]
```

## Camadas

### 1. Intent classifier
Recebe a primeira mensagem e produz:
```
{
  agent_id: "website-builder" | "customer-support" | "content-creator" | "business-consultant",
  confidence: 0.0-1.0,
  signals: [list of phrases or keywords detected]
}
```

A v1 usa **heuristica simples (keywords + frases-chave)**. A v2 substitui por um classificador LLM dedicado (1 chamada barata, sem stream).

### 2. Default fallback
Se a confianca for **< 0.7 e impossivel decidir**, o agente padrao e `website-builder` (mantem retrocompatibilidade — era o unico agente original).

Antes de cair no fallback, o sistema tenta a etapa de clarifier abaixo.

### 3. Clarifier
**Uma unica pergunta neutra**, sem expor as opcoes. Exemplo:

> "Entendi. Posso te ajudar de varias formas — me conta mais um pouco do que voce precisa? Por exemplo, voce ta querendo criar algo novo, ou resolver alguma situacao do dia a dia?"

A resposta volta para o classifier. Se ainda ambiguo, fallback no `website-builder` mas com flag `unclear_intent: true` para o agente lidar com cuidado.

### 4. Hand-off entre agentes
Em qualquer ponto da conversa, **um agente pode passar a sessao para outro** sem o usuario perceber. Exemplo: o `business-consultant` esta ajudando o usuario a definir publico-alvo, e a conversa naturalmente leva para "agora preciso de um site". O `business-consultant` finaliza o briefing, o sistema chama hand-off, e o `website-builder` continua a conversa **com o notepad ja preenchido** com o que foi descoberto.

Hand-off NUNCA mostra "trocando de agente". Apenas continua.

## O que o usuario percebe

**Nada.** A resposta do agente correto chega na proxima mensagem. Nao ha:
- Animacao de "pensando qual agente usar"
- Mensagem "voce quer um site?" como pergunta de menu
- Botao "trocar de servico"
- Menu lateral de opcoes

## Sinais usados pela heuristica v1

| agent_id | Sinais positivos | Sinais negativos |
|----------|------------------|-----------------|
| `website-builder` | "site", "pagina", "landing", "online", "internet", "presenca digital" | (nenhum especifico) |
| `customer-support` | "responder cliente", "atendimento", "reclamacao", "duvida", "whatsapp", "ticket", "FAQ" | "criar", "fazer um" |
| `content-creator` | "post", "instagram", "redes sociais", "legenda", "conteudo", "ideia pra postar", "anuncio" | "construir", "site" |
| `business-consultant` | "publico", "preco", "estrategia", "concorrente", "posicionamento", "nao sei o que", "duvida sobre meu negocio" | "fazer", "criar" |

A heuristica v1 vive em [src/features/orchestration/intent-classifier.js](../../src/features/orchestration/intent-classifier.js). Quando um agente novo for adicionado, atualizar esta tabela e o classifier ao mesmo tempo.

## Conversao de notepad entre agentes

Cada agente define seu proprio schema de notepad em `.simpleai/agents/<agent>/notepad.md` (ou no skeleton). O `business_type` e `brand_name` sao **campos compartilhados** — qualquer agente pode preencher e o resultado e visivel para qualquer outro agente em hand-off.

Outros campos sao especificos do agente e nao migram.
