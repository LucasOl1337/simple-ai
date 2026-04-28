# SIMPLE-AI — Ordem de Fluxos
> **SPEC CORE** — Este arquivo define a ordem de fases e threshold de producao.
> Leia `docs/spec/README.md` para contexto completo.

## Visão Geral

O agente opera em 3 macro-fases. Em cada uma, ele faz anotações no caderno interno (notepad) e julga autonomamente quando avançar.

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  1. DISCOVERY    │ ──▶ │  2. PRODUÇÃO     │ ──▶ │  3. ITERAÇÃO     │
│  (coleta)        │     │  (geração)       │     │  (refinamento)   │
└─────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## FASE 1: DISCOVERY (Coleta de Contexto)

### Objetivo
Coletar informação suficiente para tomar decisões técnicas confiáveis.

### Sub-fluxos (ordem adaptável)

```
1.0 Abertura
 │  └─ Texto livre do usuário
 │
1.1 Entendimento do Negócio
 │  └─ Tipo, nome, ofertas, público, região
 │
1.2 Objetivo e Ação
 │  └─ O que o visitante deve fazer, canais atuais
 │
1.3 Conteúdo e Volume
 │  └─ Quantidade de itens, fotos, preços, FAQ
 │
1.4 Funcionalidades (condicional)
 │  └─ Só aparece se detectar sinais de booking/ecommerce/auth
 │
1.5 Visual (opcional)
 │  └─ Tom, cores, referências — pode usar defaults
```

### Regra de Ordem Adaptável
O agente NÃO é obrigado a seguir 1.1 → 1.2 → 1.3 em ordem fixa.

Se o usuário já deu muita informação na abertura, o agente pula sub-fluxos:
- Se já sabe o business_type + offerings → pula 1.1
- Se já sabe o primary_cta → pula 1.2
- Se o usuário tá com pressa → pula 1.5 (usa defaults visuais)

### Como o agente decide a próxima pergunta

```python
def next_question(notepad):
    # Prioridade 1: Campos críticos vazios
    if not notepad.business_type:
        return "O que é o seu negócio?"
    if not notepad.brand_name:
        return "Qual o nome do seu negócio?"
    if not notepad.primary_cta:
        return "O que você quer que a pessoa faça quando entrar no site?"
    
    # Prioridade 2: Campos importantes vazios
    if not notepad.offerings:
        return "Quais serviços/produtos quer mostrar?"
    if not notepad.current_channels:
        return "Como as pessoas te contactam hoje?"
    if not notepad.scope:
        return "Atende onde? Região específica ou online?"
    
    # Prioridade 3: Confirmar funcionalidades detectadas
    if notepad.complexity_signals and not confirmed:
        return confirm_feature_question()
    
    # Prioridade 4: Campos desejáveis
    if not notepad.content_volume:
        return "Quantos serviços/produtos quer mostrar?"
    if not notepad.brand_tone:
        return "Seu negócio é mais sério, jovem ou acolhedor?"
    
    # Se chegou aqui, tem contexto suficiente
    return None  # → avança para produção
```

### Caderno de Anotações — Exemplo em evolução

**Após mensagem 1 (abertura):**
```
notepad:
  business_type: "oficina mecânica"    [extraído]
  brand_name: ???
  offerings: "serviços"                [vago]
  primary_cta: "orçamento WhatsApp"    [extraído]
  confidence: 35%
  ready_to_build: false
  missing_critical: [brand_name]
```

**Após mensagem 2 (nome):**
```
notepad:
  business_type: "oficina mecânica"    [extraído]
  brand_name: "Auto Center Silva"      [confirmado]
  offerings: "serviços"                [vago]
  primary_cta: "orçamento WhatsApp"    [extraído]
  confidence: 52%
  ready_to_build: false
  missing_critical: []  ← todos críticos preenchidos!
  missing_important: [offerings_detail, scope]
```

**Após mensagem 3 (serviços):**
```
notepad:
  business_type: "oficina mecânica"    [confirmado]
  brand_name: "Auto Center Silva"      [confirmado]
  offerings: ["troca de óleo", "freio", "injeção", "revisão"]  [detalhado]
  primary_cta: "orçamento WhatsApp"    [confirmado]
  scope: ???
  confidence: 65%
  ready_to_build: true  ← PODE COMEÇAR!
  strategy: "perguntar mais 1-2 coisas OU propor geração"
```

### Gatilho de Transição: Discovery → Produção

```
ready_to_build = (
    campos_criticos_completos           # business_type + brand_name + primary_cta
    AND confidence >= 55%               # extração tem qualidade mínima
    AND messages >= 3                   # mínimo de interação
)
```

Quando `ready_to_build = true`, o agente tem 2 caminhos:

**Caminho A — Usuário engajado (respostas longas, faz perguntas):**
```
Agente: "Tô entendendo bem! Mais uma coisa: você atende 
só na sua região ou em outros lugares também?"
```
→ Continua coletando para melhorar o resultado.

**Caminho B — Usuário com pressa (respostas curtas, "tanto faz"):**
```
Agente: "Beleza, já tenho uma boa base! Vou montar a primeira 
versão e você me diz o que quer mudar. Pode ser?"
```
→ Pula para produção com defaults inteligentes.

---

## FASE 2: PRODUÇÃO (Geração do Site)

### Objetivo
Transformar o notepad em decisões técnicas e gerar a primeira versão.

### Sub-fluxos (sequenciais)

```
2.1 Decisão de Stack
 │  └─ Usa a Stack Decision Matrix (ver agent-flow.md)
 │
2.2 Decisão de Layout
 │  └─ Usa a Layout Decision Matrix
 │
2.3 Seleção de Módulos
 │  └─ Filtra MODULE_RULES baseado no notepad
 │
2.4 Geração de Conteúdo
 │  └─ Textos, headlines, CTAs baseados no brand_tone + offerings
 │
2.5 Montagem do Site
 │  └─ Combina stack + layout + módulos + conteúdo
 │
2.6 Apresentação ao Usuário
 │  └─ Mostra preview e pede feedback
```

### 2.1 Decisão de Stack (automática)

O agente consulta o notepad e resolve:

```
Entrada:
  complexity_signals: [booking]
  content_volume: "medium"
  primary_cta: "agendar"

Saída:
  complexity: MEDIUM
  stack:
    frontend: React + Tailwind
    backend: API Routes / Serverless
    database: Oracle (básico)
    deploy: Vercel + Oracle Cloud
```

### 2.2 Decisão de Layout (automática)

```
Entrada:
  content_volume: "few" (4 serviços)
  pricing_strategy: "hidden"

Saída:
  layout: "single_page"
  pages: 1
  label: "Landing page única com scroll"
```

### 2.3 Seleção de Módulos (automática)

```
Entrada (notepad):
  offerings: ["troca de óleo", "freio", "injeção"]
  scope: "local"
  primary_cta: "orçamento WhatsApp"
  has_media: "no"
  faq_content: null

Saída (módulos selecionados):
  ✅ Hero section (sempre)
  ✅ Serviços (tem offerings)
  ✅ Sobre o negócio (escopo local)
  ❌ Galeria (sem fotos)
  ❌ Preços (pricing hidden)
  ❌ FAQ (sem conteúdo)
  ✅ Contato (sempre)
  ✅ Mapa (escopo local)
  ✅ WhatsApp Float (canal principal)
```

### 2.4 Geração de Conteúdo

O agente gera textos usando o notepad:

```
Hero:
  título: "Auto Center Silva"
  subtítulo: "Manutenção automotiva com qualidade e confiança"
  cta_text: "Pedir Orçamento"
  cta_action: whatsapp_redirect

Serviços:
  - título: "Troca de Óleo"
    descrição: (gerado via AI)
  - título: "Sistema de Freios"
    descrição: (gerado via AI)
  ...

Sobre:
  texto: (gerado via AI, tom profissional e acessível)

Contato:
  whatsapp: (pedir ao usuário)
  endereço: (pedir ao usuário se scope = local)
```

### 2.5 Montagem

Combina tudo em código funcional:
- HTML/React components
- CSS/Tailwind styling baseado no brand_tone
- Dados injetados do notepad
- Imagens placeholder (se has_media = no)

### 2.6 Apresentação

```
Agente: "Pronto! Montei a primeira versão do site do Auto Center Silva.

Tem:
- Página principal com seus 4 serviços
- Botão de WhatsApp para pedir orçamento
- Seção sobre o negócio
- Mapa da localização

Dá uma olhada e me diz o que quer mudar!"

[PREVIEW DO SITE]
```

---

## FASE 3: ITERAÇÃO (Refinamento)

### Objetivo
Ajustar o site com base no feedback do usuário até ele aprovar.

### Sub-fluxos (loop)

```
3.1 Feedback do Usuário
 │  └─ "Quero mudar X", "Adiciona Y", "Remove Z"
 │
3.2 Interpretação
 │  └─ O agente mapeia o pedido para mudanças técnicas
 │
3.3 Aplicação
 │  └─ Modifica componentes/conteúdo/estilo
 │
3.4 Re-apresentação
 │  └─ Mostra nova versão e pede feedback
 │
 └──▶ Loop até aprovação
```

### Tipos de Feedback e Como o Agente Trata

| Feedback do usuário | O agente entende | Ação |
|---|---|---|
| "muda a cor" | Alteração de paleta | Atualiza CSS vars |
| "tira essa parte" | Remover módulo | Remove component |
| "adiciona preços" | Novo módulo | Adiciona pricing section |
| "o texto tá ruim" | Reescrever copy | Regenera com AI |
| "quero mais fotos" | Galeria | Adiciona gallery module |
| "tá bom, gostei" | Aprovação | Pergunta sobre deploy |
| "quero do zero" | Reset parcial | Volta pra fase 2 |

### Regras de Iteração

1. **Máximo 1 mudança por turno** — aplica, mostra, confirma
2. **Sempre mostrar antes/depois** — "Mudei X. Ficou assim. Melhor?"
3. **Contar iterações** — se > 5, perguntar: "Quer que eu sugira uma versão diferente?"
4. **Detectar satisfação** — se o usuário aprova 2x seguidas sem mudanças, sugerir deploy

---

## Transições Entre Fases

### Discovery → Produção
```
Gatilho: ready_to_build = true
Mensagem: "Já entendi o suficiente! Vou montar a primeira versão."
```

### Produção → Iteração
```
Gatilho: site gerado com sucesso
Mensagem: "Pronto! Olha o que eu montei. O que acha?"
```

### Iteração → Deploy
```
Gatilho: usuário aprova ("tá ótimo", "gostei", "pode publicar")
Mensagem: "Perfeito! Quer que eu coloque o site no ar agora?"
```

### Em qualquer momento → Discovery
```
Gatilho: usuário quer mudar algo fundamental 
         ("na verdade não é uma oficina, é uma loja")
Mensagem: "Entendi, vamos refazer. Me conta mais sobre..."
```

---

## Diagrama Completo

```
[Usuário chega]
      │
      ▼
┌─ DISCOVERY ─────────────────────────────────────────┐
│                                                      │
│  [Abertura] ──▶ [Texto livre]                       │
│       │                                              │
│       ▼                                              │
│  [Extrai sinais] ──▶ [Atualiza notepad]             │
│       │                                              │
│       ▼                                              │
│  ┌─ Loop ──────────────────────────┐                │
│  │ [Avalia: prox pergunta?]        │                │
│  │      │                          │                │
│  │      ├── Sim ──▶ [Pergunta]     │                │
│  │      │              │           │                │
│  │      │              ▼           │                │
│  │      │         [Resposta]       │                │
│  │      │              │           │                │
│  │      │              ▼           │                │
│  │      │    [Atualiza notepad]    │                │
│  │      │              │           │                │
│  │      │              └───────────┘                │
│  │      │                                           │
│  │      └── Não (ready_to_build) ──▶ SAIR DO LOOP  │
│  └──────────────────────────────────┘               │
│                                                      │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
┌─ PRODUÇÃO ──────────────────────────────────────────┐
│                                                      │
│  [Stack] ──▶ [Layout] ──▶ [Módulos]                │
│                               │                      │
│                               ▼                      │
│                        [Conteúdo via AI]             │
│                               │                      │
│                               ▼                      │
│                        [Monta site]                  │
│                               │                      │
│                               ▼                      │
│                        [Mostra preview]              │
│                                                      │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
┌─ ITERAÇÃO ──────────────────────────────────────────┐
│                                                      │
│  ┌─ Loop ──────────────────────────┐                │
│  │ [Feedback do usuário]           │                │
│  │      │                          │                │
│  │      ├── Mudança ──▶ [Aplica]   │                │
│  │      │                 │        │                │
│  │      │                 ▼        │                │
│  │      │          [Re-preview]    │                │
│  │      │                 │        │                │
│  │      │                 └────────┘                │
│  │      │                                           │
│  │      ├── Aprovação ──▶ SAIR DO LOOP             │
│  │      │                                           │
│  │      └── Reset ──▶ Volta pra DISCOVERY          │
│  └──────────────────────────────────┘               │
│                                                      │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
                     [DEPLOY / ENTREGA]
```

---

## Resumo: O Agente como Tomador de Decisão

O agente NÃO é passivo. Ele:

1. **Anota tudo** — cada resposta alimenta o notepad
2. **Infere o que não foi dito** — usa padrões de negócio para preencher gaps
3. **Julga quando é suficiente** — não espera perfeição, espera confiança mínima
4. **Decide a tecnologia sozinho** — o usuário nunca vê "React", "Oracle", "API"
5. **Propõe ação** — não fica esperando, sugere o próximo passo
6. **Aceita voltar atrás** — se o usuário muda de ideia, o notepad se adapta

O objetivo final: **transformar uma conversa leiga em um site funcional com o mínimo de fricção.**
