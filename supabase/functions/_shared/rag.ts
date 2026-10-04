// Shared RAG helpers for the ingest-report and ask-reports edge functions.
//
// IMPORTANT: this file must stay dependency-free (no Deno / npm imports)
// so it can also be imported by the vitest suite in src/lib/rag.test.js.
// Mirror note: keep in sync — there is exactly one implementation, here.

export interface Passage {
  n: number;
  reportName: string;
  reportDate: string;
  text: string;
}

/**
 * Split report text into overlapping chunks for embedding.
 * - Normalises whitespace
 * - Slides a window of maxChars with `overlap` chars of overlap
 * - Prefers to cut on sentence boundaries, falls back to word boundaries
 */
export function chunkText(text: string, maxChars = 600, overlap = 120): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + maxChars, clean.length);
    if (end < clean.length) {
      const slice = clean.slice(start, end);
      const lastSent = Math.max(
        slice.lastIndexOf('. '),
        slice.lastIndexOf('! '),
        slice.lastIndexOf('? ')
      );
      const lastSpace = slice.lastIndexOf(' ');
      const cut =
        lastSent > maxChars * 0.4
          ? lastSent + 1 // keep the period
          : lastSpace > maxChars * 0.4
            ? lastSpace
            : end;
      end = start + cut;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1); // always advance
  }
  return chunks;
}

/**
 * Build the grounded-answer prompt for ask-reports.
 * The model must answer ONLY from the passages and cite them.
 */
export function buildAnswerPrompt(
  question: string,
  passages: Passage[],
  langName: string
): { system: string; user: string } {
  const context = passages
    .map((p) => `[${p.n}] (${p.reportName}, ${p.reportDate}):\n${p.text}`)
    .join('\n\n');

  const system = `You are a careful health information assistant. Answer the patient's question using ONLY the report passages below. Always respond in ${langName}, in simple everyday language.

Rules:
- Every factual claim in your answer must come from the passages. Cite the passage number like [1] or [2] right after each claim.
- If the passages do not contain the answer, say so plainly and do not guess or use outside knowledge.
- Never diagnose, never prescribe, never tell the patient what they should do medically. You are a lookup aid, not a doctor.
- Keep the answer under 200 words.
- End with this exact disclaimer, translated into ${langName}: "This is based only on your uploaded reports. Please verify with a healthcare professional."`;

  const user = `Question: ${question}\n\nReport passages:\n${context}`;

  return { system, user };
}

/** Format a chunk for pgvector text input: '[0.12,-0.03,...]' */
export function toVectorLiteral(values: ArrayLike<number>): string {
  return '[' + Array.from(values).join(',') + ']';
}
