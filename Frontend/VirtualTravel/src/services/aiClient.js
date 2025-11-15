// Dùng JSON endpoint để lấy text + data (render ảnh/cards từ data)
const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5059/api").replace(/\/+$/, "");

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {})
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${t || "Request failed"}`);
  }
  return res.json();
}

// Chat lấy text + data (tours/hotels)
export async function chatTravel(message) {
  return postJson(`${BASE}/ai/chat`, { prompt: message }); // { text, function, data }
}

// (Giữ lại nếu bạn muốn hiệu ứng stream text ở nơi khác)
export async function streamGemini(prompt, onText, signal) {
  const res = await fetch(`${BASE}/ai/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    cache: "no-cache",
    signal,
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() || "";
    for (const evt of parts) {
      for (const line of evt.split(/\r?\n/)) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const text = JSON.parse(payload);
          onText(typeof text === "string" ? text : String(text));
        } catch {
          onText(payload);
        }
      }
    }
  }
}
