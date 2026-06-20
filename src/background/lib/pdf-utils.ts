import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

pdfjs.GlobalWorkerOptions.workerSrc = "";

export async function extractPdfText(dataUrl: string): Promise<string> {
  const res = await fetch(dataUrl);
  const buffer = await res.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ("str" in item ? (item as { str: string }).str : "")).join(" ");
    pages.push(text);
    page.cleanup();
  }
  pdf.destroy();
  return pages.join("\n\n").replace(/\s+/g, " ").trim();
}
