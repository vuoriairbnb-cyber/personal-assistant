const KIDE_AGENT_STORAGE_KEY = "kidePersonalAssistantAgent";

async function agentRequest(path, options = {}) {
  const value = (await chrome.storage.local.get(KIDE_AGENT_STORAGE_KEY))[KIDE_AGENT_STORAGE_KEY];
  if (!value?.origin || !value?.token) throw new Error("Agent not paired.");
  const response = await fetch(`${value.origin}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${value.token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Agent request failed.");
  return body;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message?.type?.startsWith("KIDE_AGENT_")) return;
  const requests = {
    KIDE_AGENT_GET_WATCH: () => agentRequest("/api/kide/agent/watch", { method: "GET" }),
    KIDE_AGENT_HEARTBEAT: () => agentRequest("/api/kide/agent/heartbeat", { method: "POST", body: "{}" }),
    KIDE_AGENT_STATUS: () => agentRequest("/api/kide/agent/status", { method: "POST", body: JSON.stringify(message.payload ?? {}) }),
  };
  const request = requests[message.type];
  if (!request) return;
  request().then((data) => sendResponse({ ok: true, data })).catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "Agent request failed." }));
  return true;
});
