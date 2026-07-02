import type { AnalysisResult, HistoryEntry } from "../../shared/types.js";
import { DEFAULTS } from "../../shared/constants.js";
import { cryptoRandomId, dataUrlToBase64 } from "../../shared/utils.js";
import { callGemini, type GeminiPart } from "./gemini-client.js";
import { parseAnalysis } from "./result-parser.js";
import { BadRequestError, MissingApiKeyError } from "./errors.js";
import {
  getProvider,
  getModel,
  getThreshold,
  getApiKey,
  appendHistory,
  setLastUsedProvider,
} from "../../shared/storage.js";
import { fetchJobData } from "./job-fetcher.js";
import { detectPlatform, getDisplayName } from "./platform-detector.js";
import type { AnalysisProvider } from "./analysis-provider.js";
import { OllamaProvider } from "./providers/ollama-provider.js";
import { GeminiProvider } from "./providers/gemini-provider.js";

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
  usedFallback: boolean;
  usedProvider: string;
}> {
  const providerName = await getProvider();
  const model = await getModel();
  const threshold = await getThreshold();
  const job = await resolveJobText(args);

  const impl = providerName === "ollama"
    ? (new OllamaProvider(model) as AnalysisProvider)
    : new GeminiProvider(model);

  const response = await impl.analyze(job, threshold);
  const result = parseAnalysis(response.text);

  const usedProvider = response.usedFallback ? "gemini-fallback" : providerName;

  if (usedProvider !== providerName) {
    await setLastUsedProvider(usedProvider);
  }

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

  return { result, model: response.model, threshold, usedFallback: response.usedFallback, usedProvider };
}

export async function solveAudio(audioDataUrl: string, mimeType: string): Promise<{
  text: string;
  model: string;
}> {
  const provider = await getProvider();
  if (provider !== "gemini") {
    throw new BadRequestError("Sprachaufnahme wird nur mit Gemini unterstützt.");
  }

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

  let tabUrl: string | undefined;
  if (args.tabId) {
    try {
      const tab = await chrome.tabs.get(args.tabId);
      tabUrl = tab.url;
    } catch {}
  }
  if (!tabUrl) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    tabUrl = tabs[0]?.url;
  }

  if (!tabUrl) {
    throw new BadRequestError("Keine aktive Job-Seite gefunden.");
  }

  const platform = detectPlatform(tabUrl);
  if (!platform) {
    throw new BadRequestError(
      "Diese Seite wird nicht als Job-Plattform erkannt. Bitte fügen Sie die Stellenanzeige manuell ein.",
    );
  }

  const data = await fetchJobData(tabUrl);
  return {
    text: data.description,
    source: `${getDisplayName(data.platform)} (JSON-LD)`,
    title: data.title,
    company: data.company,
  };
}
