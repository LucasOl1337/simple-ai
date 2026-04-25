# Levantamento de Requisitos — Integracao Convo/Voice
> **SPEC CORE** — Este arquivo define os requisitos de integracao de voz.
> Leia `.simpleai/README.md` para contexto completo.

Data do levantamento: 2026-04-25

## 1. Estado atual observado

### Como o sistema web atual esta sendo aberto

- O web app local esta sendo servido por `vite` na porta `5173`.
- O processo ativo identificado foi:
  - `node ... vite\bin\vite.js`
- A entrada real do app atual e [src/main.jsx](/C:/Users/user/Desktop/SIMPLE-AI/src/main.jsx), que monta [src/app/App.jsx](/C:/Users/user/Desktop/SIMPLE-AI/src/app/App.jsx).

### Como a UI atual funciona

- O produto atual e uma interface de `whiteboard + chat dock`.
- A conversa principal hoje alimenta o planner local em [src/features/discovery/planner.js](/C:/Users/user/Desktop/SIMPLE-AI/src/features/discovery/planner.js).
- O estado da sessao e persistido em `localStorage` pela chave `simple-ai-whiteboard-v4`.
- O app atual aceita:
  - texto digitado
  - upload de imagem como referencia
  - voz via `window.SpeechRecognition / window.webkitSpeechRecognition`

### Como a voz funciona hoje

- A voz ativa atual e nativa do navegador, nao a da Agora.
- O fluxo atual:
  1. captura fala via Web Speech API
  2. converte para texto no cliente
  3. injeta o texto em `handleConversationSubmit`
  4. atualiza o planner local

### O que ja existe da integracao Agora/Convo

- Ja existe um modulo de integracao frontend em:
  - [src/integrations/agora/AgoraSessionPanel.jsx](/C:/Users/user/Desktop/SIMPLE-AI/src/integrations/agora/AgoraSessionPanel.jsx)
  - [src/integrations/agora/useAgoraSession.js](/C:/Users/user/Desktop/SIMPLE-AI/src/integrations/agora/useAgoraSession.js)
  - [src/integrations/agora/api.js](/C:/Users/user/Desktop/SIMPLE-AI/src/integrations/agora/api.js)
- Ja existe backend local em:
  - [server-python/src/server.py](/C:/Users/user/Desktop/SIMPLE-AI/server-python/src/server.py)
  - [server-python/src/agent.py](/C:/Users/user/Desktop/SIMPLE-AI/server-python/src/agent.py)
- O backend exposto hoje foi desenhado para:
  - `GET /get_config`
  - `POST /v2/startAgent`
  - `POST /v2/stopAgent`

### Gaps reais encontrados

- O app atual aberto em `5173` nao monta o modulo `AgoraSessionPanel`.
- O backend Agora nao estava rodando no momento do levantamento.
- `server-python/.env.local` nao existe no workspace no momento do levantamento.
- Sem `APP_ID` e `APP_CERTIFICATE`, a integracao realtime nao sobe sessao real.

## 2. Conclusao do levantamento

O Convo/Agora esta **preparado tecnicamente, mas ainda nao esta integrado ao fluxo principal do produto**.

Hoje existem dois sistemas separados:

1. O sistema atual de discovery em producao local:
   - whiteboard
   - planner
   - chat
   - voz local do navegador

2. O sistema Convo/Agora preparado para uso:
   - RTC
   - RTM
   - transcript em tempo real
   - backend para token/start/stop de agente

O trabalho de integracao precisa unificar esses dois lados.

## 3. Objetivo da integracao

Substituir ou complementar a voz local do navegador com o fluxo Convo/Agora, sem quebrar a experiencia atual do sistema de discovery.

Em termos de produto:

- o usuario continua falando em linguagem leiga
- o transcript final continua alimentando o planner atual
- a UI atual continua mostrando o estado do projeto
- a camada de voz passa a usar sessao realtime da Agora

## 4. Requisitos funcionais

### RF-01 — O app principal deve conseguir iniciar uma sessao Convo

- A UI principal precisa expor a acao de iniciar a sessao de voz da Agora.
- Essa acao deve chamar o backend local para obter config e iniciar o agente.

### RF-02 — O transcript da Agora deve alimentar o planner atual

- Toda fala final do usuario capturada pela Agora deve entrar no mesmo fluxo que hoje chama `submitAnswer(...)`.
- O planner atual nao deve ser duplicado nem reimplementado.
- A integracao deve tratar somente eventos finais do usuario, nao parciais.

### RF-03 — O agente deve receber contexto do discovery atual

- Antes de iniciar a sessao, o frontend deve enviar ao backend:
  - estado resumido do briefing atual
  - pergunta critica corrente
- O agente da Agora deve usar isso para continuar a conversa do ponto certo, e nao reiniciar a entrevista do zero.

### RF-04 — A UI deve mostrar estado da sessao de voz

- O usuario ou operador deve conseguir ver:
  - sessao conectando
  - conectado
  - desconectado
  - estado do agente
  - logs basicos de erro

### RF-05 — O usuario deve conseguir encerrar a sessao

- A UI precisa desligar RTC/RTM e parar o agente remoto.
- O estado visual deve voltar para o modo ocioso sem corromper o planner local.

### RF-06 — O sistema deve manter o fluxo "uma pergunta por vez"

- Mesmo com o agente realtime, a experiencia precisa seguir as regras do planner e docs do produto.
- A integracao nao pode fazer o agente atropelar o fluxo da fase atual.

### RF-07 — O sistema deve conviver com entrada multimodal

- O app atual aceita texto, imagem e voz.
- A integracao precisa definir claramente:
  - se texto continua ativo enquanto a sessao Agora estiver aberta
  - se imagem continua compondo contexto manual
  - como evitar conflito entre fala e texto ao mesmo tempo

### RF-08 — O progresso do briefing nao pode se perder

- O transcript da Agora deve atualizar o mesmo `session` persistido em `localStorage`.
- Reiniciar a pagina nao deve apagar o briefing local ja coletado.

## 5. Requisitos tecnicos

### RT-01 — Integracao na arvore principal do app

- [src/app/App.jsx](/C:/Users/user/Desktop/SIMPLE-AI/src/app/App.jsx) deve passar a montar o modulo de voz da Agora.
- A montagem deve acontecer sem desmontar ou duplicar o chat atual.

### RT-02 — Adapter entre transcript realtime e planner

- E necessario um adapter no frontend que:
  - escute transcripts da Agora
  - filtre apenas falas finais do usuario
  - previna reprocessamento do mesmo turno
  - chame `handleConversationSubmit(...)` ou equivalente

### RT-03 — Contrato claro frontend/backend

- O frontend depende de:
  - `get_config`
  - `startAgent`
  - `stopAgent`
- O contrato deve permanecer estavel para:
  - `app_id`
  - `token`
  - `uid`
  - `channel_name`
  - `agent_uid`
  - `briefingContext`
  - `priorityQuestion`
  - `language`

### RT-04 — Backend local disponivel durante dev

- O fluxo local so funciona se o backend Python estiver ativo.
- O time precisa padronizar se o modo oficial de desenvolvimento sera:
  - `npm run dev:full`
  - ou dois terminais separados

### RT-05 — Configuracao de credenciais

- `server-python/.env.local` precisa ser requisito de onboarding.
- Campos minimos:
  - `APP_ID`
  - `APP_CERTIFICATE`

### RT-06 — Tratamento de erros operacionais

- O frontend precisa tratar com clareza:
  - backend offline
  - token/config indisponivel
  - erro ao iniciar agente
  - falha de RTC/RTM
  - sessao interrompida

### RT-07 — Performance de bundle

- O modulo Agora e pesado.
- A integracao ideal deve carregar essa parte de forma lazy/dinamica para nao degradar a carga inicial do whiteboard.

## 6. Requisitos de experiencia

### RX-01 — O usuario nao deve perceber troca de stack

- A integracao da Agora nao pode expor jargao tecnico.
- A interface deve continuar parecendo uma unica experiencia SIMPLE-AI.

### RX-02 — A voz deve continuar opcional ou claramente dominante

- O produto precisa decidir uma das duas abordagens:
  - voz como canal principal
  - voz como modo opcional ao lado do texto

Hoje isso ainda nao esta definido no app.

### RX-03 — A pergunta visivel e a pergunta falada precisam bater

- Se o planner mostra uma pergunta no dock/lousa, o agente da Agora precisa conduzir essa mesma intencao.
- Nao pode haver divergencia entre o que a UI mostra e o que o agente pergunta por voz.

## 7. Decisoes em aberto

Estas decisoes precisam ser fechadas antes da implementacao final:

1. A voz da Agora substitui o `SpeechRecognition` nativo ou convive como fallback?
2. O transcript da Agora entra automaticamente no planner ou precisa de confirmacao do usuario?
3. O agente remoto pode fazer inferencias proprias ou deve seguir estritamente a pergunta atual do planner?
4. A UI deve embutir o `AgoraSessionPanel` no dock atual ou abrir uma area separada de sessao?
5. O upload de imagem continua ativo durante sessao de voz ou fica bloqueado?

## 8. Bloqueios atuais

- Falta `server-python/.env.local`
- Falta backend rodando em `:8000`
- Falta ligar `src/app/App.jsx` ao modulo `src/integrations/agora`

## 9. Criterios de aceite da proxima fase

A fase de implementacao pode ser considerada pronta quando:

1. O app em `5173` iniciar uma sessao Agora a partir da UI principal.
2. Uma fala final do usuario pela Agora atualizar o `session` do planner.
3. A pergunta atual da UI virar contexto do agente remoto.
4. Encerrar a sessao parar agente, RTC e RTM sem perder o briefing local.
5. O sistema continuar aceitando texto digitado sem quebrar o fluxo.
