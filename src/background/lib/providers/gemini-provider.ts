import type { AnalysisProvider, AnalysisResponse, JobText } from "../analysis-provider.js";
import { callGemini, type GeminiPart } from "../gemini-client.js";
import { SYSTEM_PROMPT, buildJobAnalysisPrompt } from "../prompts.js";
import { MissingApiKeyError, MissingCvError } from "../errors.js";
import { dataUrlToBase64, detectMime } from "../../../shared/utils.js";
import { getCv, getApiKey } from "../../../shared/storage.js";

export class GeminiProvider implements AnalysisProvider {
  readonly name = "gemini";

  constructor(private model: string) {}

  async analyze(job: JobText, threshold: number): Promise<AnalysisResponse> {
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
      model: this.model,
      systemInstruction: SYSTEM_PROMPT,
      userParts,
    });

    return { text: response.text, model: response.model, usedFallback: false };
  }
}
