"use server";

import { generateText, Output } from "ai";
import { z } from "zod";
import { findApprovedExcerpts, type ApprovedExcerpt } from "@/lib/document-qa";
import { geminiRequestOptions, getAiConfig, languageModel } from "@/lib/integrations";
import { requireUser } from "@/lib/session";
import { getDictionary } from "@/lib/i18n";

const answerSchema = z.object({
  answer: z.string().trim().min(1).max(1500),
  documentNumbers: z.array(z.string().trim()).max(5),
});

export type AiSearchReference = {
  id: string;
  title: string;
  documentNumber: string;
};

export type AiSearchState = {
  error?: string;
  answer?: string;
  references?: AiSearchReference[];
};

export async function askApprovedDocuments(
  _previous: AiSearchState,
  formData: FormData,
): Promise<AiSearchState> {
  await requireUser();
  const { locale, t } = await getDictionary();
  const parsed = z.string().trim().min(3, t.validation.questionMin).max(500, t.validation.questionMax).safeParse(formData.get("question"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.errors.questionInvalid };
  }

  const excerpts = await findApprovedExcerpts(parsed.data);
  if (excerpts.length === 0) {
    return { error: t.errors.noMatch };
  }

  const references = excerpts.map(toReference);
  const ai = await getAiConfig();
  if (ai.provider !== "ollama" && !ai.apiKey) {
    return {
      error: t.errors.searchOff,
      references,
    };
  }

  try {
    const { output } = await generateText({
      model: languageModel(ai),
      output: Output.object({ schema: answerSchema }),
      maxOutputTokens: 2048,
      temperature: 0.2,
      ...geminiRequestOptions(ai.provider),
      prompt: [
        locale === "en"
          ? "Answer the question only from the approved document excerpts."
          : "Jawab pertanyaan hanya dari kutipan dokumen yang sudah disetujui.",
        t.ai.answerLanguage,
        locale === "en"
          ? "Name the document numbers that support the answer."
          : "Sebut nomor dokumen yang menjadi dasar jawaban.",
        locale === "en"
          ? "If the excerpts do not contain the answer, say that these documents do not answer the question."
          : "Jika kutipan tidak memuat jawabannya, katakan bahwa dokumen tersebut tidak menjawab pertanyaan.",
        locale === "en"
          ? "documentNumbers may only contain numbers that appear in the sources."
          : "documentNumbers hanya boleh berisi nomor yang ada di sumber.",
        "",
        `${locale === "en" ? "Question" : "Pertanyaan"}: ${parsed.data}`,
        "",
        `${locale === "en" ? "Sources" : "Sumber"}:`,
        excerpts.map((excerpt) => formatSource(excerpt, locale)).join("\n\n"),
      ].join("\n"),
    });
    if (!output) return { error: t.errors.answerEmpty, references };
    const cited = new Set(output.documentNumbers);
    const used = references.filter((item) => cited.has(item.documentNumber));
    return { answer: output.answer, references: used.length > 0 ? used : references };
  } catch (error) {
    console.error("askApprovedDocuments failed", error instanceof Error ? error.message : "unknown");
    return { error: t.errors.answerFailed, references };
  }
}

function toReference(excerpt: ApprovedExcerpt): AiSearchReference {
  return { id: excerpt.id, title: excerpt.title, documentNumber: excerpt.documentNumber };
}

function formatSource(excerpt: ApprovedExcerpt, locale: "id" | "en") {
  return [`${locale === "en" ? "Number" : "Nomor"}: ${excerpt.documentNumber}`, `${locale === "en" ? "Title" : "Judul"}: ${excerpt.title}`, excerpt.excerpt].join("\n");
}
