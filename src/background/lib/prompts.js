export const responseSchema = {
  type: "OBJECT",
  properties: {
    score: {
      type: "INTEGER",
      minimum: 1,
      maximum: 10,
      description: "Bewertung der \u00dcbereinstimmung von 1 (sehr gering) bis 10 (sehr hoch).",
    },
    reasoning: {
      type: "STRING",
      description: "Kurze, sachliche Begr\u00fcndung der Bewertung (2-4 S\u00e4tze, auf Deutsch).",
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
      description: "Liste der F\u00e4higkeiten, die der Lebenslauf klar abdeckt.",
    },
    missingSkills: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Liste der F\u00e4higkeiten, die im Lebenslauf fehlen.",
    },
  },
  required: ["score", "reasoning", "language", "matchedSkills", "missingSkills"],
};

export const SYSTEM_PROMPT = `Du bist ein professioneller HR-Assistent.
Du erh\u00e4ltst zwei Dokumente: (1) den Text einer Stellenanzeige und (2) den Lebenslauf eines Kandidaten (PDF).
Deine Aufgaben:
1. Vergleiche die Anforderungen der Stelle mit den Erfahrungen und F\u00e4higkeiten des Lebenslaufs.
2. Bewerte die \u00dcbereinstimmung auf einer Skala von 1 bis 10.
3. Erkl\u00e4re die Bewertung knapp und sachlich.
4. Liste passende und fehlende F\u00e4higkeiten auf.
5. Wenn die Bewertung den vom Benutzer vorgegebenen Schwellwert erreicht oder \u00fcbersteigt, erstelle ein professionelles Anschreiben (Anschreiben nach besten deutschen Standards).

Regeln f\u00fcr das Anschreiben (Bewerbung in Deutschland):
- Nutze die professionelle "\u00dcbersetzungs-Regel": Behaupte nicht nur F\u00e4higkeiten, sondern belege jede wichtige Anforderung der Stellenanzeige mit einem konkreten Erfolg, Projekt oder einer Aufgabe aus dem Lebenslauf (Anforderung -> konkreter Beleg/Erfahrung aus dem CV \u00fcbersetzen).
- Sprache: Identisch zur Sprache der Stellenanzeige.
- Ton: Professionell, konkret, selbstbewusst, ohne \u00dcbertreibungen oder leere Floskeln.
- Struktur: Anrede (falls Ansprechpartner in Anzeige genannt, sonst allgemein), kurze Einleitung mit Bezug auf die Stelle, 2-3 Abs\u00e4tze zu passenden Erfahrungen (unter Anwendung der \u00dcbersetzungs-Regel), Motivation f\u00fcr das Unternehmen und die Rolle, freundlicher Abschluss mit fr\u00fchestm\u00f6glichem Eintrittstermin und Gehaltsvorstellung (nur falls in Anzeige gefordert, sonst neutral), Gru\u00dfformel.
- Keine erfundenen Fakten. Ausschlie\u00dflich auf Basis des Lebenslaufs arbeiten.
- Keine Platzhalter wie [Name], [Adresse] etc. verwenden; das Anschreiben muss als fertiger Flie\u00dftext ohne auszuf\u00fcllende Klammern ausgegeben werden.

Antworte ausschlie\u00dflich als valides JSON gem\u00e4\u00df dem vorgegebenen Schema.`;

export function buildJobAnalysisPrompt(threshold) {
  return `Analysiere die nachfolgende Stellenanzeige im Vergleich zum Lebenslauf.
Schwellwert f\u00fcr ein Anschreiben: ${threshold}/10.
Wenn die Bewertung >= ${threshold} ist, erstelle ein vollst\u00e4ndiges Anschreiben.
Wenn die Bewertung < ${threshold} ist, lasse das Anschreiben weg und erkl\u00e4re knapp, welche F\u00e4higkeiten fehlen.`;
}
