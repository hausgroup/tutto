import { z } from "zod";

export const testFeedbackKindSchema = z.enum(["issue", "feedback", "note"]);

export const createTestFeedbackSchema = z.object({
  restaurantId: z.string().uuid(),
  kind: testFeedbackKindSchema.default("issue"),
  title: z.string().trim().min(1, "Escribe un título.").max(200),
  body: z.string().trim().min(1, "Describe el problema o comentario.").max(8000),
  pagePath: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});
