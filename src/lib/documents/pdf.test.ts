import { describe, expect, it } from "vitest";
import { pdfToText, PdfError } from "./pdf";

/** A minimal one-page PDF with the given lines of text (or none, like a scan with no text layer). */
function makePdf(lines: string[]): Uint8Array {
  const stream = lines.length
    ? `BT /F1 12 Tf 72 720 Td 14 TL ${lines.map((l) => `(${l}) Tj T*`).join(" ")} ET`
    : "";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}

describe("pdfToText", () => {
  it("reads the payment terms from a text PDF", async () => {
    const { text, pages } = await pdfToText(makePdf(["Contract sum: RM 12,000.00", "20% deposit on signing"]));
    expect(pages).toBe(1);
    expect(text).toContain("RM 12,000.00");
    expect(text).toContain("20% deposit on signing");
  });

  it("returns empty text for a PDF with no text layer (a scan)", async () => {
    const { text } = await pdfToText(makePdf([]));
    expect(text).toBe("");
  });

  it("refuses a file that is not a PDF", async () => {
    await expect(pdfToText(new TextEncoder().encode("hello"))).rejects.toThrow(PdfError);
  });

  it("refuses a file over 5 MB", async () => {
    await expect(pdfToText(new Uint8Array(5 * 1024 * 1024 + 1))).rejects.toThrow("larger than 5 MB");
  });
});
