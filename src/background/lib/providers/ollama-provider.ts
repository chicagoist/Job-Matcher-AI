import type { AnalysisProvider, AnalysisResponse, JobText } from "../analysis-provider.js";
import { callOllama } from "../ollama-client.js";
import { callGemini, type GeminiPart } from "../gemini-client.js";
import { extractPdfText } from "../pdf-utils.js";
import { SYSTEM_PROMPT, buildJobAnalysisPrompt } from "../prompts.js";
import { MissingCvError } from "../errors.js";
import { dataUrlToBase64, detectMime } from "../../../shared/utils.js";
import { getCv, getApiKey, getOllamaHost, getAllowCloudFallback } from "../../../shared/storage.js";

export class OllamaProvider implements AnalysisProvider {
  readonly name = "ollama";

  constructor(private model: string) {}

  async analyze(job: JobText, threshold: number): Promise<AnalysisResponse> {
    const cv = await getCv();
    if (!cv) throw new MissingCvError();

    const host = await getOllamaHost();
    const cvText = await extractPdfText(cv.dataUrl);

    const userContent = [
      buildJobAnalysisPrompt(threshold),
      `STELLENANZEIGE (Quelle: ${job.source || "Unbekannt"}):\n${job.text}`,
      `LEBENSLAUF (Text aus PDF extrahiert):\n${cvText}`,
    ].join("\n\n");

    try {
      const response = await callOllama({
        host,
        model: this.model,
        systemPrompt: SYSTEM_PROMPT,
        userContent,
      });
      return { text: response.text, model: response.model, usedFallback: false };
    } catch (ollamaErr) {
      const allowFallback = await getAllowCloudFallback();
      if (!allowFallback) throw ollamaErr;

      const apiKey = await getApiKey();
      if (!apiKey) throw ollamaErr;

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

      const geminiResponse = await callGemini({
        apiKey,
        model: this.model,
        systemInstruction: SYSTEM_PROMPT,
        userParts,
      });

      return { text: geminiResponse.text, model: geminiResponse.model, usedFallback: true };
    }
  }
}
