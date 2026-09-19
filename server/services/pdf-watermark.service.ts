import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { AppError } from "../utils/errors";

/**
 * Tatoue chaque page d'un PDF avec l'identité du téléchargeur
 * (filigrane diagonal semi-transparent + métadonnée Producer).
 * Toute fuite du fichier est ainsi traçable jusqu'au compte.
 * Échoue volontairement (fail-closed) si le PDF est illisible.
 */
export async function stampPdfWithOwner(
  pdfBytes: Uint8Array,
  ownerName: string,
  ownerEmail: string
): Promise<Uint8Array> {
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(pdfBytes);
  } catch {
    throw new AppError(500, "Document illisible : tatouage de traçabilité impossible.");
  }

  const stamp = `${ownerName} — ${ownerEmail} — ISJ Revisio`.slice(0, 140);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const size = 14;
  const textWidth = font.widthOfTextAtSize(stamp, size);

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    page.drawText(stamp, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size,
      font,
      color: rgb(0.12, 0.23, 0.54),
      opacity: 0.22,
      rotate: degrees(-30),
    });
  }

  pdf.setProducer(`ISJ Revisio — copie tracee de ${ownerEmail}`.slice(0, 200));

  return pdf.save();
}
