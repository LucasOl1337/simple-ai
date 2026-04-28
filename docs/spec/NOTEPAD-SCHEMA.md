# NOTEPAD-SCHEMA — Schema Canônico do Caderno de Anotações

> **SPEC CORE** — Este arquivo é a referência definitiva para os campos do notepad.
> Implementado em: `intake/engine/planner.js`

O notepad é a única fonte de verdade para as decisões técnicas do SIMPLE-AI. É atualizado silenciosamente a cada resposta do usuário e jamais exposto diretamente.

---

## Campos Críticos (obrigatórios para build)

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `business_type` | string | `"Não identificado"` | Tipo de negócio detectado (padaria, oficina, clínica, etc.) |
| `brand_name` | string | `"Não definido"` | Nome do negócio/marca |
| `primary_cta` | string | `"Entrar em contato"` | Ação principal que o visitante deve fazer (agendar, pedir orçamento, comprar, etc.) |

**Threshold:** todos os 3 campos devem ter `confidence >= 0.5` para o build ser liberado.

---

## Campos Importantes

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `target_audience` | string | `"Não definido"` | Perfil do cliente típico |
| `scope` | string | `"Local"` | Abrangência geográfica (cidade, estado, online, nacional) |
| `current_channels` | string | — | Como os clientes chegam hoje (WhatsApp, Instagram, indicação, etc.) |
| `existing_presence` | string | — | O que já existe online (Instagram, Google Meu Negócio, site antigo) |
| `offerings` | string[] | `[]` | Lista de serviços ou produtos principais |
| `content_volume` | `"low"\|"medium"\|"high"` | `"low"` | Quantidade de itens: 1-5 / 6-15 / 15+ |
| `has_media` | `boolean\|"needs_production"` | `false` | Tem fotos/vídeos do trabalho? |
| `pricing_strategy` | `"visible"\|"hidden"\|"on_request"` | `"on_request"` | Como mostrar preços |
| `faq_content` | string | — | Perguntas frequentes que clientes fazem |

---

## Campos de Funcionalidades (condicional)

Detectados automaticamente — só perguntados se houver sinais no texto do usuário.

| Campo | Tipo | Default | Sinal de detecção |
|-------|------|---------|-------------------|
| `feature_booking` | boolean | `false` | "agenda", "marcar horário", "reservar" |
| `feature_selling` | boolean | `false` | "vender", "carrinho", "comprar online" |
| `feature_area_cliente` | boolean | `false` | "login", "cliente cadastrado", "área restrita" |

---

## Campos Visuais (desejáveis)

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `brand_tone` | string | — | Tom visual desejado ("moderno", "acolhedor", "premium", etc.) |
| `visual_reference` | string | — | Referências de estilo ou marcas que admira |
| `brand_assets` | string | — | O que já tem (logo, cores, fotos) |
| `external_references` | object[] | `[]` | Links enviados pelo usuário e convertidos em sinais de conteúdo/visual pelo agente ConverteLinkEmConteudo |

---

## Campos Derivados (calculados pelo engine, não coletados)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `modules` | object[] | Lista de módulos detectados para o site (hero, serviços, contato, etc.) |
| `complexity` | `"LOW"\|"MEDIUM"\|"HIGH"` | Estimativa de complexidade baseada em sinais |
| `visual_plan` | object | Plano visual gerado (cores, imagens, prompts) |
| `totalConfidence` | number (0-100) | Confiança geral em % sobre os campos preenchidos |
| `readyToBuild` | boolean | Flag de liberação do build |
| `messagesCount` | number | Total de mensagens trocadas |
| `missingCritical` | string[] | Campos críticos ainda ausentes |
| `missingImportant` | string[] | Campos importantes ainda ausentes |

---

## Threshold de ready_to_build

```
ready_to_build = TRUE quando:
  ✓ business_type.confidence >= 0.5
  ✓ brand_name.confidence >= 0.5
  ✓ primary_cta.confidence >= 0.5
  ✓ totalConfidence >= 55
  ✓ messagesCount >= 3
```

**Piloto antecipado:** O sistema pode iniciar um build piloto quando `totalConfidence >= 40` e os campos críticos estiverem presentes, mesmo sem atingir os 55% — decisão tomada pelo `handleStartAutoTest`.

---

## Exemplo de Notepad em Evolução

**Após mensagem 1** ("Tenho uma padaria de bairro"):
```json
{
  "business_type": { "value": "Padaria", "confidence": 0.7, "source": "opening" },
  "brand_name": { "value": "Não definido", "confidence": 0 },
  "primary_cta": { "value": "Entrar em contato", "confidence": 0 },
  "totalConfidence": 18,
  "readyToBuild": false,
  "missingCritical": ["brand_name", "primary_cta"]
}
```

**Após mensagem 5** (nome e CTA coletados):
```json
{
  "business_type": { "value": "Padaria de bairro", "confidence": 0.9 },
  "brand_name": { "value": "Padaria Aurora", "confidence": 0.95 },
  "primary_cta": { "value": "Fazer encomenda no WhatsApp", "confidence": 0.8 },
  "scope": { "value": "Bairro e região central", "confidence": 0.7 },
  "totalConfidence": 62,
  "readyToBuild": true,
  "messagesCount": 5,
  "missingCritical": []
}
```
