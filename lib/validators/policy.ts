import { z } from "zod";
import { POLICY_CATEGORIES } from "@/lib/constants";
import { POLICY_TYPES } from "@/lib/document-kind";
import { DEPARTMENTS } from "@/lib/document-kind";
import type { Dictionary } from "@/lib/i18n/dictionary";

type Validation = Dictionary["validation"];

export function createPolicyFormSchema(v: Validation) {
  return z.object({
    title: z.string().trim().min(3, v.titleMin).max(200, v.titleMax),
    documentNumber: z
      .string()
      .trim()
      .max(50, v.numberMax)
      .refine((value) => value === "" || /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value), v.numberChars),
    category: z.enum(POLICY_CATEGORIES, v.category),
    department: z.enum(DEPARTMENTS, v.department),
    type: z.enum(POLICY_TYPES, v.type),
    parentId: z.string().trim().optional(),
    description: z.string().trim().min(10, v.descriptionMin).max(5000, v.descriptionMax),
    expiresAt: z
      .string()
      .trim()
      .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), v.expiry),
  });
}

export type PolicyFormValues = z.infer<ReturnType<typeof createPolicyFormSchema>>;

export function createNotesSchema(v: Validation) {
  return z.object({
    notes: z.string().trim().max(2000, v.notesMax).optional(),
  });
}

export function createRequiredNotesSchema(v: Validation) {
  return z.object({
    notes: z.string().trim().min(3, v.notesRequired).max(2000, v.notesMax),
  });
}
