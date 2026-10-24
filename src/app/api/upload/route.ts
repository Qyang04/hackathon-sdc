// POST /api/upload (multipart, field "file") -> { text, pages, hasText }.
// Reads the text of a quotation / PO PDF so the person can check it in the text box before AI extraction.
// Nothing is saved here: the text is saved as sourceText when /api/extract runs.
import { NextResponse } from "next/server";
import { pdfToText, PdfError } from "@/lib/documents/pdf";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach a PDF file." }, { status: 400 });
  }

  try {
    const { text, pages } = await pdfToText(new Uint8Array(await file.arrayBuffer()));
    return NextResponse.json({ text, pages, hasText: text.length > 0 });
  } catch (err) {
    if (err instanceof PdfError) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: "The PDF could not be read." }, { status: 500 });
  }
}
