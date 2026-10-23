// Unit tests for the AI client's request body. No network: fetch is mocked.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { completeJson } from "./client";

const fetchMock = vi.fn();

function sentBody(): Record<string, unknown> {
  return JSON.parse(fetchMock.mock.calls[0][1].body as string);
}

describe("completeJson", () => {
  beforeEach(() => {
    vi.stubEnv("LLM_API_KEY", "test-key");
    vi.stubEnv("LLM_MODEL", "test-model");
    vi.stubEnv("LLM_DISABLE_THINKING", "");
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] })));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends a plain OpenAI-compatible body by default", async () => {
    await completeJson(z.object({ ok: z.boolean() }), "system", "user");
    expect(sentBody()).not.toHaveProperty("chat_template_kwargs");
  });

  it("turns off hidden reasoning when LLM_DISABLE_THINKING is true", async () => {
    vi.stubEnv("LLM_DISABLE_THINKING", "true");
    await completeJson(z.object({ ok: z.boolean() }), "system", "user");
    expect(sentBody().chat_template_kwargs).toEqual({ enable_thinking: false });
  });
});
