export const AI_PROVIDERS = ["gemini", "openai", "groq", "ollama"] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export const OLLAMA_DEFAULT_BASE = "http://127.0.0.1:11434/v1";

export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

const MODEL_IDS: Record<Exclude<AiProvider, "ollama">, readonly string[]> = {
  gemini: ["gemini-3.8-flash"],
  openai: ["gpt-4o-mini"],
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
};

export function isAiProvider(value: string): value is AiProvider {
  return (AI_PROVIDERS as readonly string[]).includes(value);
}

export function resolveProvider(stored: string | null | undefined, model: string): AiProvider {
  if (stored && isAiProvider(stored)) return stored;
  return model.trim().toLowerCase().startsWith("gemini") ? "gemini" : "openai";
}

export function defaultModel(provider: AiProvider) {
  if (provider === "ollama") return "llama3.2";
  return MODEL_IDS[provider][0];
}

export function modelIds(provider: AiProvider) {
  if (provider === "ollama") return [];
  return MODEL_IDS[provider];
}

export function providerLabel(provider: AiProvider) {
  if (provider === "gemini") return "Gemini";
  if (provider === "groq") return "Groq";
  if (provider === "ollama") return "Ollama";
  return "OpenAI";
}

export function ollamaBase(value: string) {
  const trimmed = value.trim().replace(/\/$/, "") || OLLAMA_DEFAULT_BASE;
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}
