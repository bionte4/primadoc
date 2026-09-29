"use server";

import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { GROQ_BASE_URL, isAiProvider, ollamaBase, type AiProvider } from "@/lib/ai-providers";
import { aiProviderName, getAiConfig, resolveSmtp } from "@/lib/integrations";
import { canManageUsers } from "@/lib/rbac";
import { encryptSecret } from "@/lib/secret-box";
import { requireUser } from "@/lib/session";
import { fill, getDictionary } from "@/lib/i18n";

export type IntegrationState = { error?: string; ok?: string };

const smtpSchema = z.object({
  host: z.string().trim().max(200),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().trim().max(200),
  from: z.string().trim().max(200),
  password: z.string().max(200),
});

const aiSchema = z.object({
  provider: z.string().trim(),
  model: z.string().trim().min(1).max(120),
  apiKey: z.string().max(4000),
  baseUrl: z.string().trim().max(300),
});

export async function saveSmtp(_prev: IntegrationState, formData: FormData): Promise<IntegrationState> {
  const denied = await adminOnly();
  if (denied) return denied;
  const parsed = readSmtp(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? (await getDictionary()).t.errors.smtpInvalid };
  if (!parsed.data.host) return { error: (await getDictionary()).t.errors.smtpHost };

  try {
    await prisma.integrationConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        ...smtpData(parsed.data),
        smtpPasswordEnc: parsed.data.password ? encryptSecret(parsed.data.password) : null,
      },
      update: {
        ...smtpData(parsed.data),
        ...(parsed.data.password ? { smtpPasswordEnc: encryptSecret(parsed.data.password) } : {}),
      },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : (await getDictionary()).t.errors.smtpSaveFailed };
  }
  revalidatePath("/settings/integrations");
  return { ok: (await getDictionary()).t.errors.smtpSaved };
}

export async function testSmtp(_prev: IntegrationState, formData: FormData): Promise<IntegrationState> {
  const denied = await adminOnly();
  if (denied) return denied;
  const parsed = readSmtp(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? (await getDictionary()).t.errors.smtpInvalid };

  const smtp = await resolveSmtp({
    host: parsed.data.host,
    port: parsed.data.port,
    secure: parsed.data.secure,
    user: parsed.data.user,
    from: parsed.data.from,
    password: parsed.data.password,
  });
  if (!smtp.host) return { error: (await getDictionary()).t.errors.smtpHostFirst };

  try {
    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    });
    await transport.verify();
    const { t } = await getDictionary();
    return { ok: t.errors.smtpOk };
  } catch (error) {
    const { t } = await getDictionary();
    const message = error instanceof Error ? error.message : t.errors.connectFailed;
    return { error: fill(t.errors.smtpTestFailed, { message }) };
  }
}

export async function saveAi(_prev: IntegrationState, formData: FormData): Promise<IntegrationState> {
  const denied = await adminOnly();
  if (denied) return denied;
  const parsed = readAi(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? (await getDictionary()).t.errors.aiInvalid };
  if (!isAiProvider(parsed.data.provider)) return { error: (await getDictionary()).t.errors.aiInvalid };

  try {
    await prisma.integrationConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        ...aiData(parsed.data.provider, parsed.data),
        openaiKeyEnc: parsed.data.apiKey ? encryptSecret(parsed.data.apiKey) : null,
      },
      update: {
        ...aiData(parsed.data.provider, parsed.data),
        ...(parsed.data.apiKey ? { openaiKeyEnc: encryptSecret(parsed.data.apiKey) } : {}),
      },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : (await getDictionary()).t.errors.aiSaveFailed };
  }
  revalidatePath("/settings/integrations");
  return { ok: (await getDictionary()).t.errors.aiSaved };
}

export async function testAi(_prev: IntegrationState, formData: FormData): Promise<IntegrationState> {
  const denied = await adminOnly();
  if (denied) return denied;
  const parsed = readAi(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? (await getDictionary()).t.errors.aiInvalid };
  if (!isAiProvider(parsed.data.provider)) return { error: (await getDictionary()).t.errors.aiInvalid };

  const stored = await getAiConfig();
  const provider = parsed.data.provider;
  const apiKey = parsed.data.apiKey.trim() || stored.apiKey;
  const model = parsed.data.model.trim() || stored.model;
  const baseUrl = ollamaBase(parsed.data.baseUrl || stored.baseUrl);
  const { t } = await getDictionary();
  const name = aiProviderName(provider);
  if (provider !== "ollama" && !apiKey) return { error: t.errors.aiKeyMissing };

  try {
    if (provider === "gemini") {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`, {
        headers: { "x-goog-api-key": apiKey },
        signal: AbortSignal.timeout(15000),
      });
      if (response.status === 401 || response.status === 403) return { error: fill(t.errors.aiKeyRejected, { provider: name }) };
      if (response.status === 404) return { ok: fill(t.errors.aiConnectedMissing, { provider: name, model }) };
      if (!response.ok) return { error: fill(t.errors.aiStatus, { provider: name, status: response.status }) };
      return { ok: fill(t.errors.aiConnected, { provider: name, model }) };
    }

    const response = await fetch(provider === "groq" ? `${GROQ_BASE_URL}/models` : provider === "ollama" ? `${baseUrl}/models` : "https://api.openai.com/v1/models", {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 401 || response.status === 403) return { error: fill(t.errors.aiKeyRejected, { provider: name }) };
    if (!response.ok) return { error: fill(t.errors.aiStatus, { provider: name, status: response.status }) };
    const body = (await response.json()) as { data?: { id?: string }[] };
    const known = body.data?.some((item) => item.id === model) ?? false;
    if (model && !known) return { ok: fill(t.errors.aiConnectedMissing, { provider: name, model }) };
    return { ok: fill(t.errors.aiConnected, { provider: name, model }) };
  } catch {
    return { error: fill(t.errors.aiUnreachable, { provider: name }) };
  }
}

async function adminOnly() {
  const user = await requireUser();
  if (!canManageUsers(user.role)) return { error: (await getDictionary()).t.errors.adminIntegration };
  return null;
}

function readSmtp(formData: FormData) {
  return smtpSchema.safeParse({
    host: formData.get("host"),
    port: formData.get("port") || "587",
    secure: formData.get("secure") === "on",
    user: formData.get("user"),
    from: formData.get("from"),
    password: formData.get("password") ?? "",
  });
}

function readAi(formData: FormData) {
  return aiSchema.safeParse({
    provider: formData.get("provider") ?? "",
    model: formData.get("model") ?? "",
    apiKey: formData.get("apiKey") ?? "",
    baseUrl: formData.get("baseUrl") ?? "",
  });
}

function aiData(provider: AiProvider, data: { model: string; baseUrl: string }) {
  return {
    aiProvider: provider,
    openaiModel: data.model,
    aiBaseUrl: provider === "ollama" ? ollamaBase(data.baseUrl) : null,
  };
}

function smtpData(data: z.infer<typeof smtpSchema>) {
  return {
    smtpHost: data.host,
    smtpPort: data.port,
    smtpSecure: data.secure,
    smtpUser: data.user || null,
    smtpFrom: data.from || null,
  };
}
