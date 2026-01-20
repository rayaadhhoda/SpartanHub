const API_BASE = import.meta.env.VITE_API_BASE_URL;

// src/services/geminiService.ts
type ChatHistoryItem = {
  role: "user" | "model";
  parts: { text: string }[];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function sendMessageToGemini(
  message: string,
  history: ChatHistoryItem[] = []
): Promise<string> {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not set");
  }

  const resp = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Chat failed (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  return data.text ?? "";
}
