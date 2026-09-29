"use server";

import { generateText, Output } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { geminiRequestOptions, getAiConfig, languageModel } from "@/lib/integrations";
import { canViewPolicy } from "@/lib/rbac";
import { requireUser } from "@/lib/session";
import { getDictionary, typeLabel } from "@/lib/i18n";

const summarySchema = z.object({
  points: z.array(z.string().trim().min(1).max(400)).length(3),
});

export type SummaryState = {
  error?: string;
  points?: string[];
};

const SOURCE_LIMIT = 12_000;

function cleanPoint(point: string) {
  const cleaned = point.replace(/^[1-3](?!\d)(?:\s*[\.\)\-–—]|\s+)/, "").trim();
  return cleaned || point.trim();
}

export async function generatePolicySummary(
  policyId: string,
  _previous: SummaryState,
  _formData: FormData,
): Promise<SummaryState> {
  const user = await requireUser();
  const { locale, t } = await getDictionary();
  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    select: {
      title: true,
      description: true,
      contentText: true,
      status: true,
      authorId: true,
      documentNumber: true,
      type: true,
    },
  });
  if (!policy || !canViewPolicy(user.role, policy.status, policy.authorId === user.id)) {
    return { error: t.errors.docNotFound };
  }

  const description = policy.description.trim();
  const fileText = policy.contentText?.trim() ?? "";
  if (description.length < 10 && fileText.length < 10) {
    return { error: t.errors.summaryEmpty };
  }
  const ai = await getAiConfig();
  if (ai.provider !== "ollama" && !ai.apiKey) {
    return { error: t.errors.summaryOff };
  }

  const source = [
    `${locale === "en" ? "Number" : "Nomor"}: ${policy.documentNumber}`,
    `${locale === "en" ? "Title" : "Judul"}: ${policy.title}`,
    `${locale === "en" ? "Type" : "Jenis"}: ${typeLabel(policy.type, t)}`,
    `${locale === "en" ? "Description" : "Deskripsi"}: ${description}`,
    fileText ? `${locale === "en" ? "File text" : "Isi berkas"}:\n${fileText}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, SOURCE_LIMIT);

  try {
    const { output } = await generateText({
      model: languageModel(ai),
      output: Output.object({ schema: summarySchema }),
      maxOutputTokens: 2048,
      temperature: 0.2,
      ...geminiRequestOptions(ai.provider),
      prompt: [
        t.ai.summaryLanguage,
        locale === "en"
          ? "Each point is one standalone sentence."
          : "Setiap poin satu kalimat yang berdiri sendiri.",
        locale === "en"
          ? "Use only facts from the source. Do not add numbers inside the sentence."
          : "Gunakan hanya fakta yang ada di sumber. Jangan menambah nomor di dalam kalimat.",
        "",
        source,
      ].join("\n"),
    });
    if (!output) {
      return { error: t.errors.summaryEmptyModel };
    }
    return { points: output.points.map(cleanPoint) };
  } catch (error) {
    console.error(
      "generatePolicySummary failed",
      error instanceof Error ? error.message : "unknown",
    );
    return { error: t.errors.summaryFailed };
  }
}
