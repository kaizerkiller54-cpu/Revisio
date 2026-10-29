import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { AppError } from "../utils/errors";

/**
 * Incorpore le filigrane Revisio-ISJ au contenu de chaque page PDF.
 * Échoue volontairement si le fichier n'est pas un PDF lisible.
 */
export async function stampPdf(pdfBytes: Uint8Array): Promise<Uint8Array> {
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(pdfBytes);
  } catch {
    throw new AppError(500, "Document illisible : tatouage de traçabilité impossible.");
  }

  const stamp = "Revisio-ISJ";
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const size = Math.min(24, Math.max(16, width * 0.04));
    const textWidth = font.widthOfTextAtSize(stamp, size);
    page.drawText(stamp, {
      x: width / 2 - textWidth / 2,
      y: height / 2 - size / 2,
      size,
      font,
      color: rgb(0.18, 0.22, 0.3),
      opacity: 0.18,
      rotate: degrees(-30),
    });
  }

  pdf.setProducer("Revisio-ISJ");

  return pdf.save();
}
