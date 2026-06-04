export function extractFromDocument(doc, opts) {
  const SELECTORS_PRIORITY = [
    "main",
    "article",
    "[role='main']",
    "[itemprop='description']",
    ".job-description",
    ".jobDescription",
    ".job-ad",
    ".posting-description",
    "#job-description",
    "#jobDescription",
  ];
  const source = (typeof doc.location?.hostname === "string" ? doc.location.hostname : "").toLowerCase();
  for (const sel of SELECTORS_PRIORITY) {
    const el = doc.querySelector(sel);
    if (el) {
      const t = cleanText(el.innerText ?? el.textContent ?? "");
      if (t.length >= 200) {
        return { text: t.slice(0, opts.maxChars), source };
      }
    }
  }
  return {
    text: cleanText((doc.body?.innerText ?? "")).slice(0, opts.maxChars),
    source,
  };
}

function cleanText(raw) {
  return raw
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
