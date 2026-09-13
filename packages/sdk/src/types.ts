/** Kind of output the generated prompt is meant for. */
export type Modality = "text" | "code" | "image" | "video" | "audio" | "music";

/** An answer to one of the clarifying questions returned by a previous generation. */
export interface Answer {
  question: string;
  answer: string;
}

export interface GenerateParams {
  /** What you want, in plain language. 3–4000 characters. */
  intent: string;
  modality: Modality;
  /** Destination AI the prompt should be tuned for. Omit to let PromtExpress decide. */
  targetEngineId?: string | null;
  /** Up to 10 answers to clarifying questions (see `GenerateResult.chipQuestions`). */
  answers?: Answer[];
  /** Regenerate a previous prompt using feedback instead of starting from scratch. */
  iteration?: { ofPromptId: string; feedback: string } | null;
}

export interface ChipQuestion {
  label: string;
  options: string[];
}

export interface Assumption {
  key: string;
  value: string;
  label_tr: string;
}

export interface GenerateResult {
  promptId: string;
  /** The compiled, ready-to-use prompt. */
  output: string;
  creditsUsed: number;
  creditsRemaining: number;
  latencyMs: number;
  validationScore: number | null;
  validationIssues: string[];
  /** Defaults the pipeline filled in on your behalf; adjust them and iterate if they are wrong. */
  assumptions: Assumption[];
  traceId: string;
  /** A = intent was clear, B = clarifying questions available, C = intent was ambiguous. */
  scenario: "A" | "B" | "C";
  chipQuestions?: ChipQuestion[];
  ambiguityClarifications?: string[];
  recentEntry: {
    id: string;
    mod: string;
    title: string;
    userInput: string;
    date: string;
  };
}

export interface TemplateListParams {
  modality?: Modality;
}

export interface Template {
  id: string;
  title: string;
  description: string | null;
  category: string;
  modality: string;
  engine: string | null;
  variables: unknown;
  version: string;
}

export interface HistoryParams {
  /** Zero-based page index. */
  page?: number;
  /** Rows per page, 1–100. Defaults to 20. */
  limit?: number;
  modality?: Modality;
}

export interface HistoryRow {
  id: string;
  title: string;
  /** Capitalized modality, e.g. "Image". */
  modality: string;
  engine: string;
  credits: number;
  /** Server-formatted timestamp. */
  date: string;
  status: "Done" | "Failed";
  userInput: string;
  result: string | null;
}

export interface HistoryPage {
  rows: HistoryRow[];
  total: number;
  page: number;
  pageSize: number;
}
