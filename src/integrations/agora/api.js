const API_BASE_URL = "/api";

async function parseJson(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.detail || payload.error || `HTTP ${response.status}`);
  }

  return payload;
}

export async function getConfig() {
  const response = await fetch(`${API_BASE_URL}/get_config`, {
    method: "GET",
  });
  const result = await parseJson(response);

  if (result.code !== 0 || !result.data) {
    throw new Error(result.msg || "Não foi possível obter a configuração da Agora.");
  }

  return result.data;
}

export async function startAgent({
  channelName,
  rtcUid,
  userUid,
  briefingContext,
  priorityQuestion,
  language = "pt-BR",
}) {
  const response = await fetch(`${API_BASE_URL}/v2/startAgent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channelName,
      rtcUid,
      userUid,
      briefingContext,
      priorityQuestion,
      language,
    }),
  });
  const result = await parseJson(response);

  if (result.code !== 0 || !result.data?.agent_id) {
    throw new Error(result.msg || "Nao foi possivel iniciar o agente.");
  }

  return result.data.agent_id;
}

export async function stopAgent(agentId) {
  if (!agentId) return;

  const response = await fetch(`${API_BASE_URL}/v2/stopAgent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId }),
  });

  await parseJson(response);
}

export function stopAgentKeepalive(agentId) {
  if (!agentId) return false;

  try {
    fetch(`${API_BASE_URL}/v2/stopAgent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
      keepalive: true,
    }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export async function stopAllKnownAgents() {
  const response = await fetch(`${API_BASE_URL}/v2/stopAllKnownAgents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope: "known" }),
  });

  const result = await parseJson(response);

  if (result.code !== 0) {
    throw new Error(result.msg || "Nao foi possivel encerrar agentes conhecidos.");
  }

  return result.data;
}
