import type { AnalysisResult } from "../../shared/types.js";
import { BadRequestError, ServerError } from "./errors.js";

export function parseAnalysis(text: string): AnalysisResult {
  const cleaned = stripCodeFence(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ServerError("Antwort des Modells war kein gültiges JSON.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new ServerError("Antwort des Modells war kein JSON-Objekt.");
  }
  const obj = parsed as Record<string, unknown>;

  const score = toScore(obj.score);
  if (score === null) {
    throw new BadRequestError("Bewertung fehlt oder liegt außerhalb von 1-10.");
  }

  const reasoning = typeof obj.reasoning === "string" ? obj.reasoning.trim() : "";
  const language = typeof obj.language === "string" ? obj.language.trim().toLowerCase() : "de";
  const matchedSkills = toStringArray(obj.matchedSkills);
  const missingSkills = toStringArray(obj.missingSkills);
  const coverLetterRaw = obj.coverLetter;
  const coverLetter =
    typeof coverLetterRaw === "string" && coverLetterRaw.trim().length > 0
      ? coverLetterRaw.trim()
      : undefined;

  return {
    score,
    reasoning,
    coverLetter,
    language: language || "de",
    matchedSkills,
    missingSkills,
  };
}

function stripCodeFence(s: string): string {
  const trimmed = s.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence && fence[1]) return fence[1].trim();
  return trimmed;
}

function toScore(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  if (n < 1 || n > 10) return null;
  return n;
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
