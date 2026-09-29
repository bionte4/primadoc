import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import {
  defaultModel,
  GROQ_BASE_URL,
  ollamaBase,
  providerLabel,
  resolveProvider,
  type AiProvider,
} from "@/lib/ai-providers";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/secret-box";

export type ConfigSource = "database" | "server" | "none";

export type IntegrationView = {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    from: string;
    passwordSet: boolean;
    source: ConfigSource;
  };
  ai: {
    provider: AiProvider;
    model: string;
    baseUrl: string;
    keySet: boolean;
    source: ConfigSource;
  };
};

export type AiRuntimeConfig = {
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
};

export async function getIntegrationView(): Promise<IntegrationView> {
  const row = await prisma.integrationConfig.findUnique({ where: { id: "default" } });
  const envHost = process.env.SMTP_HOST?.trim() ?? "";
  const envPassword = process.env.SMTP_PASSWORD?.trim() ?? "";
  const envKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const host = row?.smtpHost?.trim() || envHost;
  const keySet = Boolean(row?.openaiKeyEnc) || Boolean(envKey);
  const ai = readAiRow(row);
  return {
    smtp: {
      host,
      port: row?.smtpPort ?? numberEnv("SMTP_PORT", 587),
      secure: row?.smtpSecure ?? process.env.SMTP_SECURE === "true",
      user: row?.smtpUser?.trim() || process.env.SMTP_USER?.trim() || "",
      from: row?.smtpFrom?.trim() || process.env.SMTP_FROM?.trim() || "",
      passwordSet: Boolean(row?.smtpPasswordEnc) || Boolean(envPassword),
      source: row?.smtpHost?.trim() ? "database" : host ? "server" : "none",
    },
    ai: {
      ...ai,
      keySet,
      source: row?.openaiKeyEnc || (ai.provider === "ollama" && row?.aiProvider) ? "database" : envKey ? "server" : "none",
    },
  };
}

export async function getAiConfig(): Promise<AiRuntimeConfig> {
  const row = await prisma.integrationConfig.findUnique({ where: { id: "default" } });
  const stored = row?.openaiKeyEnc ? decryptSecret(row.openaiKeyEnc) : "";
  const config = readAiRow(row);
  return {
    ...config,
    apiKey: stored || process.env.OPENAI_API_KEY?.trim() || "",
  };
}

export async function resolveSmtp(overrides?: {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  from?: string;
  password?: string;
}) {
  const row = await prisma.integrationConfig.findUnique({ where: { id: "default" } });
  const storedPassword = row?.smtpPasswordEnc ? decryptSecret(row.smtpPasswordEnc) : "";
  return {
    host: overrides?.host?.trim() || row?.smtpHost?.trim() || process.env.SMTP_HOST?.trim() || "",
    port: overrides?.port || row?.smtpPort || numberEnv("SMTP_PORT", 587),
    secure: overrides?.secure ?? row?.smtpSecure ?? process.env.SMTP_SECURE === "true",
    user: overrides?.user?.trim() || row?.smtpUser?.trim() || process.env.SMTP_USER?.trim() || "",
    from: overrides?.from?.trim() || row?.smtpFrom?.trim() || process.env.SMTP_FROM?.trim() || "",
    password: overrides?.password?.trim() || storedPassword || process.env.SMTP_PASSWORD?.trim() || "",
  };
}

function numberEnv(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readAiRow(row: { aiProvider: string | null; aiBaseUrl: string | null; openaiModel: string | null } | null) {
  const modelHint = row?.openaiModel?.trim() || process.env.OPENAI_MODEL?.trim() || "";
  const provider = resolveProvider(row?.aiProvider, modelHint);
  return {
    provider,
    model: row?.openaiModel?.trim() || (provider === "openai" ? process.env.OPENAI_MODEL?.trim() : "") || defaultModel(provider),
    baseUrl: row?.aiBaseUrl?.trim() || "",
  };
}

export function aiProviderName(provider: AiProvider) {
  return providerLabel(provider);
}

export function languageModel(ai: AiRuntimeConfig) {
  if (ai.provider === "gemini") return createGoogleGenerativeAI({ apiKey: ai.apiKey })(ai.model);
  if (ai.provider === "groq") return createOpenAI({ apiKey: ai.apiKey, baseURL: GROQ_BASE_URL })(ai.model);
  if (ai.provider === "ollama") return createOpenAI({ apiKey: ai.apiKey || "ollama", baseURL: ollamaBase(ai.baseUrl) })(ai.model);
  return createOpenAI({ apiKey: ai.apiKey })(ai.model);
}

export function geminiRequestOptions(provider: AiProvider) {
  if (provider !== "gemini") return {};
  return {
    providerOptions: {
      google: { thinkingConfig: { thinkingLevel: "low" as const } },
    },
  };
}
