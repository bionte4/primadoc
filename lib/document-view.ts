import path from "path";
import { docxToHtml, extractDocumentText } from "@/lib/document-text";
import { isSafeStoredName, readStoredFile } from "@/lib/upload";

export type DocumentView =
  | { kind: "pdf" }
  | { kind: "image" }
  | { kind: "html"; html: string }
  | { kind: "text"; text: string }
  | { kind: "unavailable" };

export async function loadDocumentView(storedName: string): Promise<DocumentView> {
  const extension = path.extname(storedName).toLowerCase();
  if (extension === ".pdf") return { kind: "pdf" };
  if (extension === ".png" || extension === ".jpg") return { kind: "image" };
  if (!isSafeStoredName(storedName)) return { kind: "unavailable" };

  try {
    const file = await readStoredFile(storedName);
    if (extension === ".docx") {
      const html = await docxToHtml(file.data);
      return html ? { kind: "html", html } : { kind: "unavailable" };
    }
    if (extension === ".doc") {
      const text = await extractDocumentText(file.data, extension);
      return text ? { kind: "text", text } : { kind: "unavailable" };
    }
  } catch {
    return { kind: "unavailable" };
  }

  return { kind: "unavailable" };
}
