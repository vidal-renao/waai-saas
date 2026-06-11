export type SourceType = "manual" | "txt" | "markdown" | "faq" | "pdf";

export interface ExtractionResult {
  text: string;
  sourceType: SourceType;
}

export function extractText(
  textContent: string | null | undefined,
  sourceType: SourceType
): ExtractionResult {
  if (sourceType === "pdf") {
    throw new Error("PDF extraction not yet supported in this version. Use manual, txt, or markdown.");
  }

  const raw = textContent?.trim() ?? "";
  if (!raw) {
    throw new Error("Document has no text content to process.");
  }

  if (sourceType === "faq") {
    return { text: normalizeFaqText(raw), sourceType };
  }

  // manual, txt, markdown — return as-is (markdown stripped lightly)
  return { text: normalizeText(raw), sourceType };
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, "  ")
    .trim();
}

function normalizeFaqText(text: string): string {
  // FAQ format: "Q: ...\nA: ..." pairs — normalize into readable paragraphs
  const normalized = normalizeText(text);
  return normalized
    .replace(/^Q:\s*/gim, "Pregunta: ")
    .replace(/^A:\s*/gim, "Respuesta: ");
}
