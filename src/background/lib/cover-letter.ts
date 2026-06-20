import type { AnalysisResult, HistoryEntry } from "../../shared/types.js";
import { DEFAULTS } from "../../shared/constants.js";
import { dataUrlToBase64, detectMime, cryptoRandomId } from "../../shared/utils.js";
import { callGemini, type GeminiPart } from "./gemini-client.js";
import { callOllama } from "./ollama-client.js";
import { extractPdfText } from "./pdf-utils.js";
import { SYSTEM_PROMPT, buildJobAnalysisPrompt } from "./prompts.js";
import { parseAnalysis } from "./result-parser.js";
import { MissingApiKeyError, MissingCvError, GeminiBadRequestError } from "./errors.js";
import {
  getApiKey,
  getOllamaHost,
  getProvider,
  getCv,
  getModel,
  getThreshold,
  appendHistory,
} from "../../shared/storage.js";
import { fetchJobData } from "./job-fetcher.js";
import { detectPlatform, getDisplayName } from "./platform-detector.js";

export interface AnalyzeArgs {
  tabId: number;
  jobText?: string;
  jobSource?: string;
  jobUrl?: string;
}

export async function analyzeJob(args: AnalyzeArgs): Promise<{
  result: AnalysisResult;
  model: string;
  threshold: number;
}> {
  const provider = await getProvider();

  const [model, threshold] = await Promise.all([getModel(), getThreshold()]);

  const job = await resolveJobText(args);

  let responseText: string;
  let usedModel: string;

  if (provider === "ollama") {
    const cv = await getCv();
    if (!cv) throw new MissingCvError();

    const host = await getOllamaHost();
    const cvText = await extractPdfText(cv.dataUrl);

    const userContent = [
      buildJobAnalysisPrompt(threshold),
      `STELLENANZEIGE (Quelle: ${job.source || "Unbekannt"}):\n${job.text}`,
      `LEBENSLAUF (Text aus PDF extrahiert):\n${cvText}`,
    ].join("\n\n");

    const response = await callOllama({
      host,
      model,
      systemPrompt: SYSTEM_PROMPT,
      userContent,
    });

    responseText = response.text;
    usedModel = response.model;
  } else {
    const apiKey = await getApiKey();
    if (!apiKey) throw new MissingApiKeyError();

    const cv = await getCv();
    if (!cv) throw new MissingCvError();

    const userParts: GeminiPart[] = [
      { text: buildJobAnalysisPrompt(threshold) },
      { text: `STELLENANZEIGE (Quelle: ${job.source || "Unbekannt"}):\n${job.text}` },
      {
        inline_data: {
          mime_type: detectMime(cv.dataUrl),
          data: dataUrlToBase64(cv.dataUrl),
        },
      },
      { text: "Hinweis: Der Lebenslauf wurde als PDF-Datei oben angehängt." },
    ];

    const response = await callGemini({
      apiKey,
      model,
      systemInstruction: SYSTEM_PROMPT,
      userParts,
    });

    responseText = response.text;
    usedModel = response.model;
  }

  const result = parseAnalysis(responseText);

  const entry: HistoryEntry = {
    id: cryptoRandomId(),
    createdAt: Date.now(),
    score: result.score,
    language: result.language,
    jobTitle: job.title,
    company: job.company,
    coverLetter: result.coverLetter,
  };
  await appendHistory(entry);

  return { result, model: usedModel, threshold };
}

export async function solveAudio(audioDataUrl: string, mimeType: string): Promise<{
  text: string;
  model: string;
}> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new MissingApiKeyError();

  const model = await getModel();

  const userParts: GeminiPart[] = [
    {
      text: "Du bist ein hilfreicher Assistent. Beantworte die nachfolgende Sprachfrage des Nutzers kurz, präzise und auf Deutsch.",
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

async function resolveJobText(args: AnalyzeArgs): Promise<{
  text: string;
  source: string;
  title?: string;
  company?: string;
}> {
  if (args.jobText && args.jobText.trim().length > 0) {
    return { text: args.jobText.slice(0, DEFAULTS.maxJobTextChars), source: args.jobSource ?? "" };
  }

  if (args.jobUrl) {
    const data = await fetchJobData(args.jobUrl);
    return {
      text: data.description,
      source: `${getDisplayName(data.platform)} (JSON-LD)`,
      title: data.title,
      company: data.company,
    };
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.url || !tab.id) {
    throw new GeminiBadRequestError("Keine aktive Job-Seite gefunden.");
  }

  const platform = detectPlatform(tab.url);
  if (!platform) {
    throw new GeminiBadRequestError(
      "Diese Seite wird nicht als Job-Plattform erkannt. Bitte fügen Sie die Stellenanzeige manuell ein.",
    );
  }

  const data = await fetchJobData(tab.url);
  return {
    text: data.description,
    source: `${getDisplayName(data.platform)} (JSON-LD)`,
    title: data.title,
    company: data.company,
  };
}
