import { describe, expect, it } from 'vitest';
import { chunkMarkdown } from './knowledge-chunker';

describe('chunkMarkdown', () => {
  it('splits by headings', () => {
    const md = '# Title\n\nPara one.\n\n## Section\n\nPara two with details.';
    const chunks = chunkMarkdown(md);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].content).toContain('Title');
  });

  it('returns empty for blank input', () => {
    expect(chunkMarkdown('   ')).toEqual([]);
  });
});
