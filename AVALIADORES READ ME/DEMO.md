<p align="center">
  <img src="../assets/logo.svg" alt="SIMPLE-AI" width="200" />
</p>

# Roteiro de Demo — SIMPLE-AI

> Guia rapido para rodar e demonstrar o projeto.

---

## Setup Rapido (5 minutos)

### 1. Clone

```bash
git clone https://github.com/LucasOl1337/simple-ai.git
cd simple-ai
```

### 2. Frontend

```bash
npm install --legacy-peer-deps
```

### 3. Backend

```bash
python -m venv server-python/.venv

# Windows:
server-python\.venv\Scripts\python -m pip install -r server-python/requirements.txt
copy server-python\.env.example server-python\.env.local

# Linux/Mac:
server-python/.venv/bin/pip install -r server-python/requirements.txt
cp server-python/.env.example server-python/.env.local
```

### 4. Configure as credenciais

Edite `server-python/.env.local` e preencha:

```
APP_ID=seu_app_id_do_agora_console
APP_CERTIFICATE=seu_app_certificate
```

### 5. Rode

```bash
npm run dev:full
```

Acesse: **http://localhost:5173**

---

## Roteiro de Demonstracao

### Cenario: "Dona Maria quer um site para seu atelier de costura"

**Passo 1 — Abertura**
- Abra o app no navegador
- A lousa aparece vazia, o chat mostra a mensagem de abertura do agente
- O agente pergunta: *"Me conta o que voce quer criar..."*

**Passo 2 — Conversa**
- Digite (ou fale): *"Tenho um atelier de costura chamado Atelier da Maria, quero um site pra receber encomendas pelo WhatsApp"*
- Observe a lousa: campos comecam a ser preenchidos automaticamente
  - Nome: Atelier Da Maria
  - O que faz: Servico local (ou similar)
  - Acao principal: Chamar no WhatsApp

**Passo 3 — Perguntas complementares**
- O agente pergunta sobre os campos que faltam (publico, canal de contato, etc.)
- Responda naturalmente
- A cada resposta, a lousa atualiza

**Passo 4 — Geracao**
- Quando todos os campos criticos estiverem preenchidos (OK na lousa), aparece o botao "Gerar e publicar meu site"
- Clique no botao
- O card mostra: gerando --> publicando --> pronto
- Clique em "Abrir preview local" para ver o site gerado

### Pontos para destacar na demo

1. **Simplicidade** — so 2 botoes na interface (enviar + microfone)
2. **Sem jargao** — o agente nunca fala "frontend", "API", "deploy"
3. **Extracao automatica** — o planner detecta nome, tipo de negocio, CTA, canal
4. **Adaptativo** — se o usuario da muita info de uma vez, o agente pula perguntas
5. **Resultado real** — site HTML funcional, auto-contido, sem dependencias

---

## Testando a Voz

1. Clique no botao do microfone (circulo no canto superior do chat)
2. Fale em portugues naturalmente
3. O microfone pulsa enquanto escuta
4. Ao parar de falar, o texto e enviado automaticamente

> Nota: A voz usa Web Speech API do navegador. Funciona melhor no Chrome.
> Para a integracao Agora Convo (voz em tempo real com agente), e necessario APP_ID e APP_CERTIFICATE validos.

---

## Exemplos de Conversa

### Usuario detalhista
```
Usuario: "Tenho uma clinica de estetica em Moema, SP. Faco limpeza de pele, botox e
         harmonizacao. As clientes me acham pelo Instagram mas quero um site profissional
         onde elas possam ver os tratamentos e agendar pelo WhatsApp."

--> Planner extrai: tipo=clinica, canal=WhatsApp+Instagram, CTA=agendar, escopo=Moema SP
--> Pula perguntas ja respondidas
```

### Usuario minimalista
```
Usuario: "preciso de um site"

--> Planner: confidence 5%, faz perguntas basicas uma a uma
--> "O que e o seu negocio? O que voce faz?"
```

### Usuario com pressa
```
Usuario: "tanto faz, decide voce"

--> Agente reduz perguntas, assume defaults inteligentes
--> "Beleza, vou montar uma versao inicial. So preciso do nome do negocio."
```

---

## Troubleshooting

| Problema | Solucao |
|---|---|
| Backend nao conecta | Verifique se `server-python/.env.local` existe com APP_ID |
| Microfone nao funciona | Use Chrome + HTTPS (ou localhost) |
| "Agente offline" | Backend Python precisa estar rodando na porta 8000 |
| Site nao gera | Verifique `OPENAI_API_KEY` no .env.local |

---

<p align="center">
  <em>Volte para o <a href="README.md">README principal da apresentacao</a> para mais detalhes.</em>
</p>
