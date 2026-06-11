import { estimateTokens, tokensToChars } from "./token-estimator";
import type { TextChunk } from "./rag-types";

const CHUNK_SIZE_TOKENS = 500;
const CHUNK_OVERLAP_TOKENS = 50;
const MIN_CHUNK_CHARS = 50;

export function chunkText(
  text: string,
  documentTitle: string,
  sourceType: string
): TextChunk[] {
  const chunkSizeChars = tokensToChars(CHUNK_SIZE_TOKENS);
  const overlapChars = tokensToChars(CHUNK_OVERLAP_TOKENS);

  // Normalize line endings and split by paragraph boundaries
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (normalized.length < MIN_CHUNK_CHARS) return [];

  // Split by double newline to get paragraphs
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length >= MIN_CHUNK_CHARS);

  if (paragraphs.length === 0) {
    // No paragraphs — treat whole text as one or more chunks
    return splitLongText(normalized, chunkSizeChars, overlapChars, documentTitle, sourceType);
  }

  const chunks: TextChunk[] = [];
  let currentChunk = "";
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const wouldBe = currentChunk ? currentChunk + "\n\n" + paragraph : paragraph;

    if (wouldBe.length <= chunkSizeChars) {
      currentChunk = wouldBe;
    } else {
      // Flush current chunk if it has content
      if (currentChunk.length >= MIN_CHUNK_CHARS) {
        chunks.push(makeChunk(currentChunk, chunkIndex++, documentTitle, sourceType));
      }
      // If the paragraph itself is too long, split it
      if (paragraph.length > chunkSizeChars) {
        const subChunks = splitLongText(paragraph, chunkSizeChars, overlapChars, documentTitle, sourceType);
        for (const sc of subChunks) {
          chunks.push({ ...sc, chunkIndex: chunkIndex++ });
        }
        currentChunk = "";
      } else {
        // Start new chunk with overlap from previous
        const overlap = currentChunk.slice(-overlapChars);
        currentChunk = overlap ? overlap + "\n\n" + paragraph : paragraph;
      }
    }
  }

  // Flush remaining
  if (currentChunk.length >= MIN_CHUNK_CHARS) {
    chunks.push(makeChunk(currentChunk, chunkIndex, documentTitle, sourceType));
  }

  return chunks;
}

function splitLongText(
  text: string,
  chunkSize: number,
  overlap: number,
  title: string,
  sourceType: string
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let start = 0;
  let idx = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const slice = text.slice(start, end).trim();
    if (slice.length >= MIN_CHUNK_CHARS) {
      chunks.push(makeChunk(slice, idx++, title, sourceType));
    }
    if (end >= text.length) break;
    start = end - overlap;
  }

  return chunks;
}

function makeChunk(
  content: string,
  index: number,
  documentTitle: string,
  sourceType: string
): TextChunk {
  return {
    content: content.trim(),
    chunkIndex: index,
    tokenCount: estimateTokens(content),
    metadata: {
      source_type: sourceType,
      document_title: documentTitle,
      chunk_index: index,
    },
  };
}
