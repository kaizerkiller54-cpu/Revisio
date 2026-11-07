import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { AppError } from "../utils/errors";

const MAX_STAMPED_PDF_PAGES = 500;

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

  if (pdf.getPageCount() > MAX_STAMPED_PDF_PAGES) {
    throw new AppError(413, `Le document dépasse la limite de ${MAX_STAMPED_PDF_PAGES} pages.`);
  }

  const stamp = "Revisio-ISJ";
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const unitWidth = font.widthOfTextAtSize(stamp, 1);
  const angleDeg = -30;
  const angleRad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const minDim = Math.min(width, height);
    const targetTextWidth = minDim * 0.72;
    const size = Math.max(48, targetTextWidth / unitWidth);
    const textWidth = font.widthOfTextAtSize(stamp, size);
    const textHeight = font.heightAtSize(size, { descender: false });

    const offsetX = (textWidth / 2) * cos - (textHeight / 2) * sin;
    const offsetY = (textWidth / 2) * sin + (textHeight / 2) * cos;

    page.drawText(stamp, {
      x: width / 2 - offsetX,
      y: height / 2 - offsetY,
      size,
      font,
      color: rgb(0.18, 0.22, 0.3),
      opacity: 0.2,
      rotate: degrees(angleDeg),
    });
  }

  pdf.setProducer("Revisio-ISJ");

  return pdf.save();
}
