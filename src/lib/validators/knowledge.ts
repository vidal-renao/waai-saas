import { z } from "zod";

export const KNOWLEDGE_SOURCE_TYPES = ["manual", "txt", "markdown", "faq"] as const;

export const createKnowledgeDocumentSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(500).trim().optional(),
  source_type: z.enum(KNOWLEDGE_SOURCE_TYPES),
  text_content: z.string().min(10).max(200_000).trim(),
});

export const updateKnowledgeDocumentSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(500).trim().optional(),
  text_content: z.string().min(10).max(200_000).trim().optional(),
});

export const linkDocumentSchema = z.object({
  documentId: z.string().uuid(),
});

export const unlinkDocumentSchema = z.object({
  documentId: z.string().uuid(),
});

export type CreateKnowledgeDocument = z.infer<typeof createKnowledgeDocumentSchema>;
export type UpdateKnowledgeDocument = z.infer<typeof updateKnowledgeDocumentSchema>;
export type LinkDocument = z.infer<typeof linkDocumentSchema>;
