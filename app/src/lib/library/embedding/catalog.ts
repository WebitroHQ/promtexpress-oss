/**
 * Embedding model catalog — all known providers + models with official specs.
 * Used by the admin UI to populate provider → model cascading selects.
 */

export type EmbeddingModel = {
  modelId: string;
  label: string;
  dimensions: number;
  costPer1MTokens: number;
  maxTokens: number;
  notes?: string;
  recommended?: boolean;
};

export type EmbeddingProvider = {
  id: string;
  label: string;
  color: string;          // tailwind bg class for badge
  apiKeyLabel: string;
  apiKeyHint: string;
  apiKeyUrl: string;
  models: EmbeddingModel[];
};

export const EMBEDDING_CATALOG: EmbeddingProvider[] = [
  {
    id: "openai",
    label: "OpenAI",
    color: "bg-[#10a37f]/15 text-[#10a37f]",
    apiKeyLabel: "OpenAI API Key",
    apiKeyHint: "sk-...",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    models: [
      {
        modelId: "text-embedding-3-small",
        label: "text-embedding-3-small",
        dimensions: 1536,
        costPer1MTokens: 0.02,
        maxTokens: 8191,
        recommended: true,
        notes: "Best price/performance. Recommended for most use cases.",
      },
      {
        modelId: "text-embedding-3-large",
        label: "text-embedding-3-large",
        dimensions: 3072,
        costPer1MTokens: 0.13,
        maxTokens: 8191,
        notes: "Highest accuracy OpenAI model. 3072-dim vectors.",
      },
      {
        modelId: "text-embedding-ada-002",
        label: "text-embedding-ada-002",
        dimensions: 1536,
        costPer1MTokens: 0.10,
        maxTokens: 8191,
        notes: "Legacy model. Prefer text-embedding-3-small.",
      },
    ],
  },
  {
    id: "google",
    label: "Google",
    color: "bg-[#4285F4]/15 text-[#4285F4]",
    apiKeyLabel: "Google AI API Key",
    apiKeyHint: "AIza...",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
    models: [
      {
        modelId: "text-embedding-004",
        label: "text-embedding-004",
        dimensions: 768,
        costPer1MTokens: 0.025,
        maxTokens: 2048,
        recommended: true,
        notes: "Latest Google embedding model. 768-dim, multilingual.",
      },
      {
        modelId: "embedding-001",
        label: "embedding-001",
        dimensions: 768,
        costPer1MTokens: 0.025,
        maxTokens: 2048,
        notes: "Previous generation Google embedding.",
      },
    ],
  },
  {
    id: "cohere",
    label: "Cohere",
    color: "bg-[#d18ee2]/20 text-[#9b59b6]",
    apiKeyLabel: "Cohere API Key",
    apiKeyHint: "...",
    apiKeyUrl: "https://dashboard.cohere.com/api-keys",
    models: [
      {
        modelId: "embed-multilingual-v3.0",
        label: "embed-multilingual-v3.0",
        dimensions: 1024,
        costPer1MTokens: 0.10,
        maxTokens: 512,
        recommended: true,
        notes: "Best Cohere multilingual model. 100+ languages.",
      },
      {
        modelId: "embed-english-v3.0",
        label: "embed-english-v3.0",
        dimensions: 1024,
        costPer1MTokens: 0.10,
        maxTokens: 512,
        notes: "English-only, slightly higher accuracy than multilingual.",
      },
      {
        modelId: "embed-multilingual-light-v3.0",
        label: "embed-multilingual-light-v3.0",
        dimensions: 384,
        costPer1MTokens: 0.10,
        maxTokens: 512,
        notes: "Smaller, faster multilingual model.",
      },
      {
        modelId: "embed-english-light-v3.0",
        label: "embed-english-light-v3.0",
        dimensions: 384,
        costPer1MTokens: 0.10,
        maxTokens: 512,
        notes: "Smaller, faster English-only model.",
      },
    ],
  },
  {
    id: "voyageai",
    label: "VoyageAI",
    color: "bg-[#f59e0b]/15 text-[#b45309]",
    apiKeyLabel: "VoyageAI API Key",
    apiKeyHint: "pa-...",
    apiKeyUrl: "https://dash.voyageai.com/api-keys",
    models: [
      {
        modelId: "voyage-3",
        label: "voyage-3",
        dimensions: 1024,
        costPer1MTokens: 0.06,
        maxTokens: 32000,
        recommended: true,
        notes: "Best general-purpose Voyage model. Long context (32K).",
      },
      {
        modelId: "voyage-3-lite",
        label: "voyage-3-lite",
        dimensions: 512,
        costPer1MTokens: 0.02,
        maxTokens: 32000,
        notes: "Fastest, cheapest Voyage model. Great for high volume.",
      },
      {
        modelId: "voyage-3-large",
        label: "voyage-3-large",
        dimensions: 1024,
        costPer1MTokens: 0.18,
        maxTokens: 32000,
        notes: "Highest accuracy Voyage model.",
      },
      {
        modelId: "voyage-code-3",
        label: "voyage-code-3",
        dimensions: 1024,
        costPer1MTokens: 0.06,
        maxTokens: 32000,
        notes: "Optimized for code search and retrieval.",
      },
      {
        modelId: "voyage-multilingual-2",
        label: "voyage-multilingual-2",
        dimensions: 1024,
        costPer1MTokens: 0.12,
        maxTokens: 32000,
        notes: "Multilingual model supporting 30+ languages.",
      },
    ],
  },
  {
    id: "mistral",
    label: "Mistral",
    color: "bg-[#ff7000]/15 text-[#c05600]",
    apiKeyLabel: "Mistral API Key",
    apiKeyHint: "...",
    apiKeyUrl: "https://console.mistral.ai/api-keys",
    models: [
      {
        modelId: "mistral-embed",
        label: "mistral-embed",
        dimensions: 1024,
        costPer1MTokens: 0.10,
        maxTokens: 8192,
        recommended: true,
        notes: "Mistral's embedding model. Good multilingual support.",
      },
    ],
  },
];

export function getProvider(id: string): EmbeddingProvider | undefined {
  return EMBEDDING_CATALOG.find((p) => p.id === id);
}

export function getModel(providerId: string, modelId: string): EmbeddingModel | undefined {
  return getProvider(providerId)?.models.find((m) => m.modelId === modelId);
}
