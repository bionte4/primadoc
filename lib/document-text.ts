import mammoth from "mammoth";
import sanitizeHtml from "sanitize-html";
import WordExtractor from "word-extractor";
import { extractText } from "unpdf";

const MAX_TEXT = 120_000;

export async function extractDocumentText(buffer: Buffer, extension: string) {
  try {
    const raw = await readByExtension(buffer, extension);
    return normalizeText(raw);
  } catch {
    return "";
  }
}

export async function docxToHtml(buffer: Buffer) {
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const data = await image.read("base64");
        return { src: `data:${image.contentType};base64,${data}` };
      }),
    },
  );
  const html = sanitizeHtml(result.value, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "name", "target"],
      img: ["src", "alt"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["data"] },
  }).trim();
  return html;
}

async function readByExtension(buffer: Buffer, extension: string) {
  if (extension === ".pdf") {
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
    return text;
  }
  if (extension === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (extension === ".doc") {
    const extractor = new WordExtractor();
    const document = await extractor.extract(buffer);
    return document.getBody();
  }
  return "";
}

function normalizeText(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT);
}
