export async function createFirstInteractionReply(payload) {
  const response = await fetch("/api/v1/intake/first-interaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.code !== 0) {
    throw new Error(result.detail || result.msg || `HTTP ${response.status}`);
  }
  return result.data || {};
}

export async function createIntakeTurnReply(payload) {
  const response = await fetch("/api/v1/intake/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.code !== 0) {
    throw new Error(result.detail || result.msg || `HTTP ${response.status}`);
  }
  return result.data || {};
}
