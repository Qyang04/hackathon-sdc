// Reads the text layer of an uploaded quotation / PO PDF. Owner: Workstream B.
// No OCR: a scanned PDF or photo has no text layer, so it returns empty text and the person types or pastes the
// terms instead. The text then goes through the normal AI extraction, where every date starts unconfirmed.
import { extractText, getDocumentProxy } from "unpdf";

export const MAX_PDF_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_PAGES = 20;

export class PdfError extends Error {}

export async function pdfToText(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  if (bytes.length > MAX_PDF_BYTES) throw new PdfError("The file is larger than 5 MB.");
  // Every PDF starts with "%PDF-"
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new PdfError("This is not a PDF file.");

  let pdf;
  try {
    pdf = await getDocumentProxy(bytes);
  } catch {
    throw new PdfError("The PDF could not be opened. It may be damaged or password-protected.");
  }
  if (pdf.numPages > MAX_PDF_PAGES) throw new PdfError(`The PDF has more than ${MAX_PDF_PAGES} pages; upload the pages with the payment terms.`);

  const { text } = await extractText(pdf, { mergePages: false });
  const joined = text
    .map((page) => page.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
  return { text: joined, pages: pdf.numPages };
}
