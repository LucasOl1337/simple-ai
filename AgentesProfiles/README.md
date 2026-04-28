# AgentesProfiles

Esta pasta define perfis de agentes para a geração de site (Agente 02).

Cada perfil é um arquivo `.md` separado, com regras de comportamento e foco visual/editorial.

## Como funciona

- O Builder sempre usa o prompt base de `builder/prompts/builder.py`.
- Em seguida, injeta o perfil escolhido de `AgentesProfiles/<perfil>.md`.
- O perfil pode vir de:
  1. `agent_profile` no payload de `/v2/build`
  2. `BUILDER_AGENT_PROFILE` (env)

Se o perfil solicitado não existir, o build falha com erro explícito.

## Perfis incluídos

- `site-builder-core.md` - perfil geral (default)
- `landing-direta.md` - foco conversão e CTA
- `catalogo-moderno.md` - foco catálogo e escaneabilidade
- `servico-local-confianca.md` - foco confiança local e contato

## Exemplo de uso no payload

```json
{
  "business_name": "Padaria Aurora",
  "segment": "Padaria",
  "summary": {},
  "agent_profile": "servico-local-confianca"
}
```
