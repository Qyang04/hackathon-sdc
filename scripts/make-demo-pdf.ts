// Writes docs/demo/QT-2026-118-synthetic.pdf: the Bangsar quotation from docs/DEMO.md as a text PDF,
// so the video can show the PDF upload. Run: npx tsx scripts/make-demo-pdf.ts
import { mkdirSync, writeFileSync } from "node:fs";

const LINES = [
  "CONTOH RENOVATION SDN BHD (synthetic)",
  "",
  "QUOTATION QT-2026-118 (synthetic)",
  "Restoran Contoh Bangsar - kitchen and dining fit-out, approx. 8 weeks from site possession on 16 Nov 2026.",
  "Contract sum: RM 85,000.00",
  "Payment terms:",
  "  1. 10% deposit (RM 8,500.00) on signing, payable on site possession.",
  "  2. 40% progress claim (RM 34,000.00) on completion of kitchen works, est. 4 weeks after start.",
  "  3. 50% balance (RM 42,500.00) on handover, est. 60 days after start.",
  "Our costs (internal): kitchen equipment RM 28,000 due on order (week 1); joinery subcontractor RM 22,000 in week 3;",
  "M&E and finishing RM 12,000 in week 6.",
  "",
  "All names and figures are synthetic, for the SDC Hackathon 2026 demo.",
];

// PDF strings escape \ ( and )
const escape = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
const stream = `BT /F1 10 Tf 50 780 Td 15 TL ${LINES.map((l) => `(${escape(l)}) Tj T*`).join(" ")} ET`;
const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
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

mkdirSync("docs/demo", { recursive: true });
writeFileSync("docs/demo/QT-2026-118-synthetic.pdf", out, "latin1");
console.log("Wrote docs/demo/QT-2026-118-synthetic.pdf");
