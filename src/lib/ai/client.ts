// Minimal client for any OpenAI-compatible chat-completions endpoint. Owner: Workstream B.
// The provider is a team decision (D5); configure it with LLM_BASE_URL / LLM_API_KEY / LLM_MODEL.
import type { z } from "zod";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI not configured: set LLM_API_KEY and LLM_MODEL. Enter payment dates manually instead.");
  }
}

export function aiConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY && process.env.LLM_MODEL);
}

/** Ask for a JSON object and validate it against a schema. Invalid output throws; callers fall back to manual entry. */
export async function completeJson<T>(
  schema: z.ZodType<T>,
  system: string,
  user: string,
  timeoutMs = 30_000,
): Promise<T> {
  if (!aiConfigured()) throw new AiNotConfiguredError();
  const base = (process.env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.LLM_API_KEY}` },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`AI provider error ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("AI returned non-JSON output");
  }
  return schema.parse(parsed);
}
