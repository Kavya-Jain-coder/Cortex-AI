import { z } from "zod";

export const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title too long"),
  type: z.enum(["typed", "canvas"]),
  subject_id: z.string().nullable().optional(),
  tags: z.array(z.string()).max(10, "Max 10 tags").default([]),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const createSubjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color"),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
