import { DEFAULTS } from "../../shared/constants.js";
import { dataUrlToBase64, detectMime, cryptoRandomId } from "../../shared/utils.js";
import { callGemini } from "./gemini-client.js";
import { SYSTEM_PROMPT, buildJobAnalysisPrompt } from "./prompts.js";
import { parseAnalysis } from "./result-parser.js";
import { MissingApiKeyError, MissingCvError, GeminiBadRequestError } from "./errors.js";
import { getApiKey, getCv, getModel, getThreshold, appendHistory } from "../../shared/storage.js";
import { extractFromDocument } from "./job-extractor.js";

export async function analyzeJob(args) {
  const apiKey = await getApiKey();
  if (!apiKey) throw new MissingApiKeyError();

  const cv = await getCv();
  if (!cv) throw new MissingCvError();

  const [model, threshold] = await Promise.all([getModel(), getThreshold()]);
  const job = await resolveJobText(args);

  const userParts = [
    { text: buildJobAnalysisPrompt(threshold) },
    { text: `STELLENANZEIGE (Quelle: ${job.source || "Unbekannt"}):\n${job.text}` },
    {
      inline_data: {
        mime_type: detectMime(cv.dataUrl),
        data: dataUrlToBase64(cv.dataUrl),
      },
    },
    { text: "Hinweis: Der Lebenslauf wurde als PDF-Datei oben anh\u00e4ngt." },
  ];

  const response = await callGemini({
    apiKey,
    model,
    systemInstruction: SYSTEM_PROMPT,
    userParts,
  });

  const result = parseAnalysis(response.text);

  const entry = {
    id: cryptoRandomId(),
    createdAt: Date.now(),
    score: result.score,
    language: result.language,
    jobTitle: job.title,
    company: job.company,
    coverLetter: result.coverLetter,
  };
  await appendHistory(entry);

  return { result, model: response.model, threshold };
}

export async function solveAudio(audioDataUrl, mimeType) {
  const apiKey = await getApiKey();
  if (!apiKey) throw new MissingApiKeyError();

  const model = await getModel();

  const userParts = [
    {
      text: "Du bist ein hilfreicher Assistent. Beantworte die nachfolgende Sprachfrage des Nutzers kurz, pr\u00e4zise und auf Deutsch.",
    },
    {
      inline_data: {
        mime_type: mimeType || "audio/webm",
        data: dataUrlToBase64(audioDataUrl),
      },
    },
  ];

  const response = await callGemini({
    apiKey,
    model,
    systemInstruction: "Antworte immer auf Deutsch, sachlich und freundlich.",
    userParts,
    maxOutputTokens: 1024,
    temperature: 0.6,
  });

  return { text: response.text, model: response.model };
}

async function resolveJobText(args) {
  if (args.jobText && args.jobText.trim().length > 0) {
    return { text: args.jobText.slice(0, DEFAULTS.maxJobTextChars), source: args.jobSource ?? "" };
  }
  const results = await chrome.scripting.executeScript({
    target: { tabId: args.tabId },
    func: (maxChars) => {
      // --- helpers (run inside the target page) ---

      // Remove noisy elements that pollute text extraction.
      function removeNoise(root) {
        const kill = root.querySelectorAll(
          "script, style, noscript, svg, iframe, nav, footer, header, " +
          "[aria-hidden='true'], .cookie-banner, .cookie-consent, #cookie-banner"
        );
        kill.forEach((el) => el.remove());
      }

      // Extract clean text using textContent (ignores CSS hiding / user-select).
      function extractText(el) {
        if (!el) return "";
        const clone = el.cloneNode(true);
        removeNoise(clone);
        // textContent reads ALL text regardless of CSS visibility / user-select.
        return (clone.textContent || "")
          .replace(/\r/g, "")
          .replace(/[ \t]+\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .replace(/[ \t]{2,}/g, " ")
          .trim();
      }

      const d = document;
      const source = window.location.hostname.toLowerCase();
      const title = (d.querySelector("h1")?.textContent ?? d.title ?? "").trim() || undefined;
      const og = d.querySelector('meta[property="og:site_name"]');
      const company = og?.getAttribute("content")?.trim() || undefined;

      // Priority selectors – look for the most likely job content container.
      const SELECTORS = [
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
        ".job-details",
        ".job-content",
        ".stellenanzeige",
        ".news-text-wrap",       // firstwaters.de pattern
        ".news-detail",          // common news/job detail pages
        ".content-area",
        ".entry-content",
        ".post-content",
        "#content",
        ".main-content",
      ];

      let text = "";
      for (const sel of SELECTORS) {
        const el = d.querySelector(sel);
        if (el) {
          const t = extractText(el);
          if (t.length >= 150) {
            text = t.slice(0, maxChars);
            break;
          }
        }
      }

      // Fallback: extract from the entire body.
      if (!text || text.length < 150) {
        text = extractText(d.body).slice(0, maxChars);
      }

      return { text, source, title, company };
    },
    args: [DEFAULTS.maxJobTextChars],
  });
  const r = results[0]?.result;
  if (!r) {
    throw new GeminiBadRequestError("Konnte den Text der Seite nicht lesen.");
  }
  return r;
}

export { extractFromDocument };
