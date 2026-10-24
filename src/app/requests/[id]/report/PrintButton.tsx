"use client";
// Opens the browser's print dialog; "Save as PDF" there exports the report.
export function PrintButton() {
  return <button type="button" className="secondary no-print" onClick={() => window.print()}>Print / save as PDF</button>;
}
