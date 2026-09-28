import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

export async function watermarkPdf(data: Buffer, label: string) {
  const pdf = await PDFDocument.load(data);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const text = toWinAnsi(label) || "PrismaDoc";

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    let size = 10;
    let textWidth = font.widthOfTextAtSize(text, size);
    while (textWidth > width - 72 && size > 7) {
      size -= 1;
      textWidth = font.widthOfTextAtSize(text, size);
    }
    const stepX = Math.max(textWidth + 28, 180);
    for (let y = 72; y < height - 24; y += 150) {
      for (let x = 28; x + textWidth < width - 12; x += stepX) {
        page.drawText(text, {
          x,
          y,
          size,
          font,
          color: rgb(0.35, 0.38, 0.45),
          opacity: 0.22,
          rotate: degrees(24),
        });
      }
    }
  }

  return Buffer.from(await pdf.save());
}

function toWinAnsi(value: string) {
  return [...value]
    .map((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code >= 32 && code <= 126 ? char : " ";
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
