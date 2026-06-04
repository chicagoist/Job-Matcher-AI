export const responseSchema = {
  type: "OBJECT",
  properties: {
    score: {
      type: "INTEGER",
      minimum: 1,
      maximum: 10,
      description: "Bewertung der Übereinstimmung von 1 (sehr gering) bis 10 (sehr hoch).",
    },
    reasoning: {
      type: "STRING",
      description: "Kurze, sachliche Begründung der Bewertung (2-4 Sätze, auf Deutsch).",
    },
    coverLetter: {
      type: "STRING",
      description:
        "Professionelles Anschreiben. Pflicht, wenn score >= Schwellwert, sonst null oder leer.",
    },
    language: {
      type: "STRING",
      description: "ISO 639-1 Code der erkannten Sprache der Stellenanzeige (z.B. 'de', 'en').",
    },
    matchedSkills: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Liste der Fähigkeiten, die der Lebenslauf klar abdeckt.",
    },
    missingSkills: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Liste der Fähigkeiten, die im Lebenslauf fehlen.",
    },
  },
  required: ["score", "reasoning", "language", "matchedSkills", "missingSkills"],
} as const;

export const SYSTEM_PROMPT = `Du bist ein professioneller HR-Assistent.
Du erhältst zwei Dokumente: (1) den Text einer Stellenanzeige und (2) den Lebenslauf eines Kandidaten (PDF).
Deine Aufgaben:
1. Vergleiche die Anforderungen der Stelle mit den Erfahrungen und Fähigkeiten des Lebenslaufs.
2. Bewerte die Übereinstimmung auf einer Skala von 1 bis 10.
3. Erkläre die Bewertung knapp und sachlich.
4. Liste passende und fehlende Fähigkeiten auf.
5. Wenn die Bewertung den vom Benutzer vorgegebenen Schwellwert erreicht oder übersteigt, erstelle ein professionelles Anschreiben.
Regeln für das Anschreiben:
- Sprache: identisch zur Sprache der Stellenanzeige.
- Ton: professionell, konkret, selbstbewusst, ohne Übertreibungen.
- Struktur: Anrede, kurze Einleitung mit Bezug auf die Stelle, 2-3 Absätze zu passenden Erfahrungen, Motivation für das Unternehmen, freundlicher Abschluss, Grußformel.
- Keine erfundenen Fakten. Ausschließlich auf Basis des Lebenslaufs.
- Keine Platzhalter wie [Name], [Adresse] etc.
Antworte ausschließlich als valides JSON gemäß dem vorgegebenen Schema.`;

export function buildJobAnalysisPrompt(threshold: number): string {
  return `Analysiere die nachfolgende Stellenanzeige im Vergleich zum Lebenslauf.
Schwellwert für ein Anschreiben: ${threshold}/10.
Wenn die Bewertung >= ${threshold} ist, erstelle ein vollständiges Anschreiben.
Wenn die Bewertung < ${threshold} ist, lasse das Anschreiben weg und erkläre knapp, welche Fähigkeiten fehlen.`;
}
