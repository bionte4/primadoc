import type { PolicyStatus, PolicyType, Role, WorkflowStepStatus } from "@prisma/client";
import { DEPARTMENT_LABEL, DEPARTMENTS } from "@/lib/document-kind";
import type { DepartmentLabels } from "@/lib/department-labels";
import type { Dictionary } from "@/lib/i18n/dictionary";

export type Locale = "id" | "en";

export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export function localizeDepartments(stored: DepartmentLabels, t: Dictionary): DepartmentLabels {
  const next = { ...stored };
  for (const code of DEPARTMENTS) {
    next[code] = stored[code] === DEPARTMENT_LABEL[code] ? t.department[code] : stored[code];
  }
  return next;
}

export function categoryLabel(category: string, t: Dictionary) {
  if (category in t.category) return t.category[category as keyof Dictionary["category"]];
  return category;
}

export function roleLabel(role: Role, t: Dictionary) {
  return t.role[role];
}

export function statusLabel(status: PolicyStatus, t: Dictionary) {
  return t.status[status];
}

export function typeLabel(type: PolicyType, t: Dictionary) {
  return t.type[type];
}

export function tierLabel(type: PolicyType, t: Dictionary) {
  return t.tier[type];
}

export function workflowLabel(status: WorkflowStepStatus, t: Dictionary) {
  return t.workflow[status];
}

export function auditLabel(action: string, t: Dictionary) {
  if (action in t.audit) return t.audit[action as keyof Dictionary["audit"]];
  return action;
}

const UPLOAD_ERRORS: Record<string, keyof Dictionary["errors"]> = {
  "File harus berupa PDF, DOC, DOCX, PNG, atau JPG": "fileType",
  "File kosong": "emptyFile",
  "Ukuran file maksimal 10 MB": "fileTooLarge",
  "Berkas PDF tidak dapat dibuka. Unggah PDF yang berisi halaman.": "badPdf",
  "Berkas tidak valid": "invalidFile",
};

export function thrownFileError(message: string, t: Dictionary) {
  const key = UPLOAD_ERRORS[message];
  return key ? t.errors[key] : message;
}

export function childAction(type: PolicyType, t: Dictionary) {
  if (type === "POLICY") return t.childAction.PROCEDURE;
  if (type === "PROCEDURE") return t.childAction.TECHNICAL_GUIDE;
  return null;
}
