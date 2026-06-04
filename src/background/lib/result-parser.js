import { GeminiBadRequestError, GeminiServerError } from "./errors.js";

export function parseAnalysis(text) {
  const parsed = extractJson(text);
  if (!parsed || typeof parsed !== "object") {
    console.error("Failed to parse Gemini response as JSON. Raw text was:", text);
    throw new GeminiServerError("Antwort des Modells war kein g\u00fcltiges JSON.");
  }

  const score = toScore(parsed.score) ?? 1;

  const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning.trim() : "Keine Begr\u00fcndung verf\u00fcgbar (Antwort abgeschnitten).";
  const language = typeof parsed.language === "string" ? parsed.language.trim().toLowerCase() : "de";
  const matchedSkills = toStringArray(parsed.matchedSkills);
  const missingSkills = toStringArray(parsed.missingSkills);
  const coverLetterRaw = parsed.coverLetter;
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

// Try multiple strategies to extract JSON from the model response.
function extractJson(raw) {
  const trimmed = raw.trim();

  // 1. Direct parse – model returned clean JSON.
  try { return JSON.parse(trimmed); } catch { /* continue */ }

  // 2. Strip markdown code fence (```json ... ``` or ``` ... ```).
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch { /* continue */ }
  }

  // 3. Find the first { and last } – extract the JSON object from surrounding text.
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(trimmed.slice(start, end + 1)); } catch { /* continue */ }
  }

  // 4. Find the first [ and last ] – maybe it's a JSON array.
  const aStart = trimmed.indexOf("[");
  const aEnd = trimmed.lastIndexOf("]");
  if (aStart !== -1 && aEnd > aStart) {
    try { return JSON.parse(trimmed.slice(aStart, aEnd + 1)); } catch { /* continue */ }
  }

  // 5. Try to repair truncated JSON (e.g. if the model output got cut off)
  try {
    const repaired = repairTruncatedJson(trimmed);
    if (repaired) return repaired;
  } catch { /* continue */ }

  return null;
}

// Attempts to repair JSON that has been cut off/truncated mid-output.
function repairTruncatedJson(str) {
  let s = str.trim();

  // Remove markdown wrapper if present at start
  const codeBlockMatch = s.match(/^```(?:json)?\s*([\s\S]*)/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    s = codeBlockMatch[1].trim();
  }

  // If it doesn't start with { (or [), we can't easily repair it
  const startChar = s.startsWith("[") ? "[" : s.startsWith("{") ? "{" : null;
  if (!startChar) {
    // Try to find the first { or [
    const idx = s.search(/[\{\[]/);
    if (idx !== -1) {
      s = s.slice(idx);
    } else {
      return null;
    }
  }

  let inString = false;
  let escape = false;
  let stack = [];
  let cleanStr = "";

  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    cleanStr += char;

    if (escape) {
      escape = false;
      continue;
    }

    if (char === "\\") {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === "{") {
        stack.push("}");
      } else if (char === "[") {
        stack.push("]");
      } else if (char === "}") {
        if (stack[stack.length - 1] === "}") {
          stack.pop();
        }
      } else if (char === "]") {
        if (stack[stack.length - 1] === "]") {
          stack.pop();
        }
      }
    }
  }

  if (inString) {
    cleanStr += '"';
  }

  while (stack.length > 0) {
    cleanStr += stack.pop();
  }

  try {
    return JSON.parse(cleanStr);
  } catch {
    return null;
  }
}

function toScore(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  if (n < 1 || n > 10) return null;
  return n;
}

function toStringArray(v) {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
