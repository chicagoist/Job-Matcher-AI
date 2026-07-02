import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("pdf.worker.mjs");

export async function extractPdfText(dataUrl: string): Promise<string> {
  const res = await fetch(dataUrl);
  const buffer = await res.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ("str" in item ? (item as { str: string }).str : "")).join(" ");
    pages.push(text);
    page.cleanup();
  }
  await loadingTask.destroy();
  return pages.join("\n\n").replace(/\s+/g, " ").trim();
}
