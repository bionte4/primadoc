import { z } from "zod";
import { POLICY_CATEGORIES } from "@/lib/constants";
import { POLICY_TYPES } from "@/lib/document-kind";
import { DEPARTMENTS } from "@/lib/document-kind";

export const policyFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Judul minimal 3 karakter")
    .max(200, "Judul maksimal 200 karakter"),
  documentNumber: z
    .string()
    .trim()
    .max(50, "Nomor dokumen maksimal 50 karakter")
    .refine(
      (value) => value === "" || /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value),
      "Gunakan huruf, angka, titik, garis miring, atau tanda hubung",
    ),
  category: z.enum(POLICY_CATEGORIES, "Pilih kategori"),
  department: z.enum(DEPARTMENTS, "Pilih departemen"),
  type: z.enum(POLICY_TYPES, "Pilih jenis dokumen"),
  parentId: z.string().trim().optional(),
  description: z
    .string()
    .trim()
    .min(10, "Deskripsi minimal 10 karakter")
    .max(5000, "Deskripsi maksimal 5000 karakter"),
});

export type PolicyFormValues = z.infer<typeof policyFormSchema>;

export const notesSchema = z.object({
  notes: z.string().trim().max(2000, "Catatan maksimal 2000 karakter").optional(),
});

export const requiredNotesSchema = z.object({
  notes: z
    .string()
    .trim()
    .min(3, "Catatan wajib diisi")
    .max(2000, "Catatan maksimal 2000 karakter"),
});
