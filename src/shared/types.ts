export interface PanelPosition {
  left: number;
  top: number;
}

export interface JobPosting {
  source: string;
  title?: string;
  company?: string;
  location?: string;
  text: string;
  url?: string;
}

export interface AnalysisResult {
  score: number;
  reasoning: string;
  coverLetter?: string;
  language: string;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface CvMetadata {
  fileName: string;
  uploadedAt: number;
  sizeBytes: number;
}

export interface HistoryEntry {
  id: string;
  createdAt: number;
  jobTitle?: string;
  company?: string;
  score: number;
  coverLetter?: string;
  language: string;
}

export type MessageAction =
  | "TOGGLE_PANEL"
  | "ANALYZE_JOB"
  | "AUDIO_SOLVE"
  | "OPEN_OPTIONS"
  | "COPY_TO_CLIPBOARD";

export interface BaseMessage<A extends MessageAction, P = unknown> {
  action: A;
  payload?: P;
}

export type TogglePanelMessage = BaseMessage<"TOGGLE_PANEL">;
export type OpenOptionsMessage = BaseMessage<"OPEN_OPTIONS">;

export interface AnalyzeJobRequest {
  jobText: string;
  jobSource: string;
}
export type AnalyzeJobMessage = BaseMessage<"ANALYZE_JOB", AnalyzeJobRequest>;

export interface AudioSolveRequest {
  audioDataUrl: string;
  mimeType: string;
}
export type AudioSolveMessage = BaseMessage<"AUDIO_SOLVE", AudioSolveRequest>;

export interface CopyToClipboardRequest {
  text: string;
}
export type CopyToClipboardMessage = BaseMessage<"COPY_TO_CLIPBOARD", CopyToClipboardRequest>;

export type AppMessage =
  | TogglePanelMessage
  | OpenOptionsMessage
  | AnalyzeJobMessage
  | AudioSolveMessage
  | CopyToClipboardMessage;

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

export interface AnalyzeJobResponse {
  answer: string;
  model: string;
}
