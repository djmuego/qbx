export interface MarkdownChunk {
  content: string;
  chunkIndex: number;
  heading?: string;
}

const MAX_CHUNK_CHARS = 1200;
const MIN_CHUNK_CHARS = 80;

/**
 * Split markdown into semantic chunks by headings and paragraphs.
 * Keeps section context in each chunk for better RAG recall.
 */
export function chunkMarkdown(markdown: string): MarkdownChunk[] {
  const text = markdown.replace(/\r\n/g, '\n').trim();
  if (!text) return [];

  const sections = text.split(/(?=^#{1,3}\s)/m);
  const rawChunks: string[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    if (trimmed.length <= MAX_CHUNK_CHARS) {
      rawChunks.push(trimmed);
      continue;
    }

    const paragraphs = trimmed.split(/\n{2,}/);
    let buffer = '';
    for (const para of paragraphs) {
      const piece = para.trim();
      if (!piece) continue;
      const candidate = buffer ? `${buffer}\n\n${piece}` : piece;
      if (candidate.length <= MAX_CHUNK_CHARS) {
        buffer = candidate;
      } else {
        if (buffer) rawChunks.push(buffer);
        if (piece.length <= MAX_CHUNK_CHARS) {
          buffer = piece;
        } else {
          for (let i = 0; i < piece.length; i += MAX_CHUNK_CHARS) {
            rawChunks.push(piece.slice(i, i + MAX_CHUNK_CHARS));
          }
          buffer = '';
        }
      }
    }
    if (buffer) rawChunks.push(buffer);
  }

  const merged: string[] = [];
  for (const chunk of rawChunks) {
    const c = chunk.trim();
    if (!c) continue;
    if (merged.length > 0 && c.length < MIN_CHUNK_CHARS) {
      merged[merged.length - 1] = `${merged[merged.length - 1]}\n\n${c}`;
    } else {
      merged.push(c);
    }
  }

  return merged.map((content, chunkIndex) => {
    const headingMatch = content.match(/^#{1,3}\s+(.+)$/m);
    return {
      content,
      chunkIndex,
      heading: headingMatch?.[1]?.trim(),
    };
  });
}
