export interface JobText {
  text: string;
  source: string;
  title?: string;
  company?: string;
}

export interface AnalysisResponse {
  text: string;
  model: string;
  usedFallback: boolean;
}

export interface AnalysisProvider {
  readonly name: string;
  analyze(job: JobText, threshold: number): Promise<AnalysisResponse>;
}
