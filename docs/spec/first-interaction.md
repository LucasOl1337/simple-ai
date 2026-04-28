# SIMPLE-AI — Primeira Interação
> **SPEC CORE** — Este arquivo define o comportamento obrigatorio da primeira interacao.
> Leia `docs/spec/README.md` para contexto completo.

## O que acontece quando o usuário chega

O usuário não sabe o que é frontend, backend, deploy, API. Ele sabe que precisa de "um site".
A primeira interação é a mais importante — é onde o agente conquista confiança e começa a montar o mapa mental do projeto.

---

## Mensagem de Abertura do Agente

```
Oi! Eu sou o SIMPLE-AI.

Eu vou te ajudar a criar um site pro seu negócio.
Não precisa saber nada de tecnologia — é só me contar
o que você faz e o que você precisa.

Me fala: o que é o seu negócio e por que você quer um site?
Pode falar do jeito que vier na cabeça, sem frescura.
```

### Por que essa abertura funciona:
- **Não pede dados estruturados** — pede uma história
- **Valida que não precisa saber tech** — remove ansiedade
- **Uma única pergunta aberta** — baixa fricção
- **Tom informal** — não é um formulário, é uma conversa

---

## O que o agente faz com a primeira resposta

A primeira resposta do usuário é um texto livre. Pode ser:
- `"tenho uma oficina e quero mostrar meus servicos"`
- `"sou dentista, preciso de agendamento online"`
- `"quero vender minhas roupas pela internet"`
- `"não sei bem o que preciso, só sei que preciso de um site"`

### Extração Automática (NLP / pattern matching)

O agente analisa o texto e tenta preencher o **Caderno de Anotações** (notepad interno):

| Campo | Como extrai | Exemplo |
|---|---|---|
| `business_type` | Keywords de negócio (oficina, dentista, loja, padaria...) | "Oficina mecânica" |
| `offerings` | O que vem depois de "mostrar", "vender", "fazer" | "serviços de manutenção" |
| `primary_cta_hint` | Sinais de ação (agendar, vender, mostrar, contato) | "receber orçamentos" |
| `channels_hint` | Menção a WhatsApp, Instagram, telefone | "WhatsApp" |
| `complexity_signals` | Palavras que indicam features complexas | "agendamento" → booking |
| `emotional_tone` | Urgência, exploração, detalhismo | "preciso urgente" → urgente |
| `confidence_level` | Quanto o agente conseguiu extrair (0-100%) | 45% |

### Cenário: Resposta rica
```
Usuário: "Tenho uma clínica de estética em Moema, SP. Faço limpeza de pele, 
botox e harmonização. As clientes me acham pelo Instagram mas eu quero um site 
profissional onde elas possam ver os tratamentos e agendar pelo WhatsApp."
```

**Caderno do agente após essa resposta:**
```
business_type: "Clínica de estética"          ✅ alta confiança
brand_name: ???                                ❌ não mencionou
offerings: "limpeza de pele, botox, harmonização" ✅
target_audience: "mulheres" (inferido)         ⚠️  inferido
scope: "Moema, São Paulo"                     ✅
primary_cta: "agendar pelo WhatsApp"          ✅
channels: "Instagram, WhatsApp"               ✅
complexity: MEDIUM (agendamento)              ✅
confidence_level: 72%
```

**Próxima ação:** Pular direto para nome do negócio (o campo faltante mais importante).

### Cenário: Resposta mínima
```
Usuário: "preciso de um site"
```

**Caderno do agente após essa resposta:**
```
business_type: ???                             ❌
brand_name: ???                                ❌
offerings: ???                                 ❌
target_audience: ???                           ❌
scope: ???                                     ❌
primary_cta: ???                               ❌
channels: ???                                  ❌
complexity: LOW (default)                      ⚠️ default
confidence_level: 5%
```

**Próxima ação:** Fazer a pergunta mais básica: "Qual é o seu negócio? O que você faz?"

### Cenário: Resposta confusa
```
Usuário: "quero tipo um app mas pode ser site tambem, algo pra gerenciar 
meus clientes e eles verem os agendamentos"
```

**Caderno do agente após essa resposta:**
```
business_type: ???                             ❌ ambíguo
brand_name: ???                                ❌
offerings: "gerenciamento de clientes"         ⚠️ vago
primary_cta: "ver agendamentos"               ⚠️ indica plataforma
complexity: HIGH (auth + dashboard + booking)  ⚠️
confidence_level: 25%
```

**Próxima ação:** Simplificar e redirecionar:
```
"Entendi que você precisa de algo onde seus clientes possam ver 
agendamentos. Antes de eu pensar em como fazer isso, me conta: 
qual é o seu negócio? O que você vende ou faz?"
```

---

## Regras da Primeira Interação

### 1. NUNCA pedir mais de uma informação por vez
❌ "Qual seu nome, negócio, e o que você precisa?"
✅ "Me conta o que você faz e por que quer um site?"

### 2. SEMPRE validar antes de avançar
Depois da primeira resposta, o agente confirma:
```
"Deixa eu ver se entendi: você tem uma [business_type] 
e quer um site para [primary_cta]. É isso?"
```

### 3. Adaptar profundidade ao nível de detalhe do usuário
- **Resposta longa (>30 palavras):** Extrair tudo que puder, pular perguntas já respondidas
- **Resposta média (10-30 palavras):** Seguir fluxo normal
- **Resposta curta (<10 palavras):** Fazer perguntas mais específicas e dar exemplos

### 4. Dar exemplos quando o usuário não souber responder
```
Usuário: "não sei o que colocar no site"
Agente: "Normal! A maioria dos [business_type] começa com:
uma página principal, lista de serviços, e um botão de contato.
Quer começar assim?"
```

### 5. Detectar frustração ou pressa
Se o usuário demonstrar impaciência:
```
"pode ser qualquer coisa", "tanto faz", "decide voce"
```
O agente reduz perguntas e assume defaults inteligentes:
```
"Beleza, vou montar uma versão inicial com base no que já sei.
Você pode mudar tudo depois. Só preciso de mais uma coisa: 
qual o nome do seu negócio?"
```

---

## Caderno de Anotações (Notepad do Agente)

O agente mantém um caderno interno que é atualizado a cada resposta:

```json
{
  "notepad": {
    "business_type": { "value": null, "confidence": 0, "source": null },
    "brand_name": { "value": null, "confidence": 0, "source": null },
    "offerings": { "value": [], "confidence": 0, "source": null },
    "target_audience": { "value": null, "confidence": 0, "source": null },
    "scope": { "value": "local", "confidence": 0.3, "source": "default" },
    "primary_cta": { "value": null, "confidence": 0, "source": null },
    "current_channels": { "value": [], "confidence": 0, "source": null },
    "existing_presence": { "value": [], "confidence": 0, "source": null },
    "content_volume": { "value": "few", "confidence": 0.3, "source": "default" },
    "has_media": { "value": "unknown", "confidence": 0, "source": null },
    "pricing_strategy": { "value": "hidden", "confidence": 0.3, "source": "default" },
    "brand_tone": { "value": null, "confidence": 0, "source": null },
    "brand_colors": { "value": null, "confidence": 0, "source": null },
    "faq_content": { "value": [], "confidence": 0, "source": null },
    "complexity_signals": { "value": [], "confidence": 0, "source": null }
  },
  "meta": {
    "total_confidence": 0,
    "messages_exchanged": 0,
    "phase": "opening",
    "ready_to_build": false,
    "missing_critical": ["business_type", "brand_name", "primary_cta"]
  }
}
```

### Campos Críticos (precisam estar preenchidos para começar a produzir)
1. `business_type` — Sem isso, não dá pra escolher template/layout
2. `brand_name` — Sem isso, não dá pra gerar conteúdo
3. `primary_cta` — Sem isso, não dá pra definir a hierarquia da página

### Campos Importantes (melhoram muito o resultado)
4. `offerings` — Define as seções do site
5. `scope` — Define se precisa de mapa, região
6. `current_channels` — Define como o CTA funciona (WhatsApp, form, etc)

### Campos Desejáveis (podem usar defaults)
7. `brand_tone` — Default: "profissional e acessível"
8. `pricing_strategy` — Default: "sob consulta"
9. `has_media` — Default: usar placeholders
10. `content_volume` — Default: "poucos" (3-5 itens)

---

## Threshold para Começar a Produzir

O agente julga quando tem contexto suficiente para gerar a primeira versão:

```
SE campos_criticos_preenchidos >= 3
E total_confidence >= 55%
E messages_exchanged >= 3
ENTÃO ready_to_build = true
```

### Regra de preview rápido

Para não cansar um usuário leigo logo no começo, o sistema deve tentar liberar o **primeiro preview em até 4 perguntas úteis**.

Se os 3 campos críticos já estiverem claros e o restante puder usar defaults seguros, o agente pode antecipar a primeira versão mesmo sem um discovery profundo.

Atalho aceito para a primeira versão:

```
SE business_type definido
E brand_name definido
E primary_cta definido
E confidence >= 45%
E messages_exchanged >= 2
ENTÃO pode liberar preview inicial
```

Nesse caso, o preview sai mais cedo e o refinamento acontece depois, com o site já visível.

Quando `ready_to_build = true`, o agente pode:
1. Continuar fazendo perguntas opcionais (se o usuário estiver engajado)
2. Ou propor gerar a primeira versão (se o usuário estiver com pressa)

```
"Já tenho uma boa ideia do que você precisa! Posso montar 
uma primeira versão agora e você me diz o que quer mudar.
Ou prefere me contar mais alguma coisa antes?"
```

---

## Fluxo Visual da Primeira Interação

```
[Usuário chega]
     │
     ▼
[Agente: mensagem de abertura]
     │
     ▼
[Usuário: texto livre]
     │
     ▼
[Agente: extrai sinais, atualiza notepad]
     │
     ├── confidence >= 55%? ──▶ [Confirma entendimento + pergunta campo faltante mais importante]
     │
     └── confidence < 55%? ──▶ [Faz pergunta básica: "o que é seu negócio?"]
     │
     ▼
[Loop: pergunta → resposta → atualiza notepad → avalia confidence]
     │
     ├── ready_to_build = true + usuário engajado ──▶ [Continua opcional]
     │
     └── ready_to_build = true + usuário apressado ──▶ [Propõe gerar site]
     │
     ▼
[Transicao para flow-order.md]
```
