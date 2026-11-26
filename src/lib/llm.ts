import type { Env } from "../discord";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AskLLMOptions {
  model?: string;
  systemPrompt?: string;
}

/**
 * Sends a chat completion request to an OpenAI-compatible LLM API.
 * Supports OpenAI, Groq, DeepSeek, OpenRouter, Google Gemini (OpenAI endpoint),
 * Cloudflare Workers AI, Ollama, etc.
 */
export async function askLLM(
  env: Env,
  question: string,
  options: AskLLMOptions = {},
): Promise<string> {
  const apiKey = env.LLM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "API key LLM belum dikonfigurasi. Silakan tambahkan 'LLM_API_KEY' di file secret (.dev.vars atau Cloudflare Secrets).",
    );
  }

  const rawBaseUrl = env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1";
  const endpoint = rawBaseUrl.endsWith("/chat/completions")
    ? rawBaseUrl
    : `${rawBaseUrl.replace(/\/+$/, "")}/chat/completions`;

  const model = options.model || env.LLM_MODEL?.trim() || "gpt-4o-mini";
  const defaultSystemPrompt =
    "Kamu adalah Verkomp, temen ngobrol asik buat anak-anak Ilmu Komputer IPB angkatan 63 (ILKOMERrZZ'63).\n" +
    "- Persona: Anggap dirimu temen seangkatan/kawan kuliah di Ilkom IPB Dramaga yang ramah, santai, asik, dan nyambung diajak ngobrol apa aja.\n" +
    "- Gaya Bicara: Santai, gaul khas anak kampus (pakai bahasa santai/lu-gua atau kasual yang wajar, bersahabat, gak kaku kayak robot korporat atau Wikipedia).\n" +
    "- Kultur & Konteks: Paham seluk-beluk kehidupan kampus IPB (Dramaga, Bara, nugas di LSI/CCR, ngeluh praktikum, mabar game kayak Valo/Roblox/Minecraft, cari makan, dsb).\n" +
    "- Fleksibel & Ga Melulu Ngoding: Bisa diajak curhat, bercanda, diskusi random, gosip kampus, tips kuliah, hingga main game. Kalau ditanya materi kuliah atau kodingan, bantu jelasin dengan cara yang gampang dicerna dan santai layaknya temen sebangku ngajarin temennya.\n" +
    "- Format Respon: Rapi khas Discord (bold poin penting, bullet point kalau perlu, kode pakai ``` kalau ada). Jangan kepanjangan atau bertele-tele.";

  const systemPrompt =
    options.systemPrompt || env.LLM_SYSTEM_PROMPT?.trim() || defaultSystemPrompt;

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: question },
  ];

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    let errorDetails = "";
    try {
      const errJson = (await res.json()) as any;
      errorDetails = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetails = await res.text();
    }
    throw new Error(`LLM API returned status ${res.status}: ${errorDetails}`);
  }

  const data = (await res.json()) as any;
  const reply = data?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error("Tidak ada balasan yang diterima dari AI.");
  }

  return reply;
}
