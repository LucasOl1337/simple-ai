export function extractUrls(text) {
  const matches = String(text || "").match(/https?:\/\/[^\s<>'")]+/gi) || [];
  return [...new Set(matches.map((url) => url.replace(/[.,;!?]+$/, "")))];
}

export async function inspectLinkContent(payload) {
  const response = await fetch("/api/v1/link-content/inspect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.code !== 0) {
    throw new Error(result.detail || result.msg || "ConverteLinkEmConteudo falhou.");
  }
  return result.data;
}
