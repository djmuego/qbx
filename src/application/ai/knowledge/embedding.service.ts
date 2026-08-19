const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;

export interface EmbeddingResult {
  embedding: number[];
  model: string;
}

function assertDimension(vec: number[]): void {
  if (vec.length !== EMBEDDING_DIM) {
    throw new Error(`Expected embedding dim ${EMBEDDING_DIM}, got ${vec.length}`);
  }
}

/** Call dev proxy /api/ai/embeddings (OpenAI-compatible). */
export async function embedTexts(texts: string[]): Promise<EmbeddingResult[]> {
  if (texts.length === 0) return [];

  const response = await fetch('/api/ai/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, model: EMBEDDING_MODEL }),
  });

  const payload = (await response.json()) as {
    error?: string;
    embeddings?: number[][];
    model?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? `Embedding API error (${response.status})`);
  }

  const vectors = payload.embeddings ?? [];
  if (vectors.length !== texts.length) {
    throw new Error('Embedding count mismatch');
  }

  return vectors.map((embedding) => {
    assertDimension(embedding);
    return { embedding, model: payload.model ?? EMBEDDING_MODEL };
  });
}

export async function embedQuery(text: string): Promise<number[]> {
  const [result] = await embedTexts([text]);
  return result.embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
