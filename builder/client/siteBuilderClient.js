export async function queueSiteBuild(payload) {
  const response = await fetch("/api/v2/build", {
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

export async function getSiteBuildStatus(jobId) {
  const response = await fetch(`/api/v2/build/${jobId}`);
  const result = await response.json().catch(() => ({}));
  return {
    statusCode: response.status,
    ok: response.ok && result.code === 0,
    data: result.data || {},
  };
}
