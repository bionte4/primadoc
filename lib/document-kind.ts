import type { PolicyType } from "@prisma/client";

export const POLICY_TYPES = ["POLICY", "PROCEDURE", "TECHNICAL_GUIDE"] as const;

export const TYPE_LABEL: Record<PolicyType, string> = {
  POLICY: "Kebijakan",
  PROCEDURE: "Prosedur",
  TECHNICAL_GUIDE: "Petunjuk teknis",
};

export const TIER_LABEL: Record<PolicyType, string> = {
  POLICY: "Tier 1 · Kebijakan",
  PROCEDURE: "Tier 2 · Prosedur",
  TECHNICAL_GUIDE: "Tier 3 · Petunjuk teknis",
};

export const DEPARTMENTS = ["CORP", "HR", "IT", "FIN", "OPS"] as const;

export const DEPARTMENT_LABEL: Record<(typeof DEPARTMENTS)[number], string> = {
  CORP: "Korporat",
  HR: "SDM",
  IT: "TI",
  FIN: "Keuangan",
  OPS: "Operasional",
};

export function isDepartment(value: string): value is (typeof DEPARTMENTS)[number] {
  return DEPARTMENTS.includes(value as (typeof DEPARTMENTS)[number]);
}

export function isPolicyType(value: string): value is PolicyType {
  return value === "POLICY" || value === "PROCEDURE" || value === "TECHNICAL_GUIDE";
}

export function childType(type: PolicyType): "PROCEDURE" | "TECHNICAL_GUIDE" | null {
  if (type === "POLICY") return "PROCEDURE";
  if (type === "PROCEDURE") return "TECHNICAL_GUIDE";
  return null;
}

export function parentTypeFor(type: PolicyType): "POLICY" | "PROCEDURE" | null {
  if (type === "PROCEDURE") return "POLICY";
  if (type === "TECHNICAL_GUIDE") return "PROCEDURE";
  return null;
}

export function childActionLabel(type: PolicyType) {
  const next = childType(type);
  if (next === "PROCEDURE") return "Buat prosedur";
  if (next === "TECHNICAL_GUIDE") return "Buat petunjuk teknis";
  return null;
}

export function nextChildNumber(
  parentNumber: string,
  type: "PROCEDURE" | "TECHNICAL_GUIDE",
  taken: Set<string>,
) {
  const prefix = type === "PROCEDURE" ? "PRO" : "JUK";
  const body = parentNumber.replace(/^(POL|PRO|JUK)-/i, "");
  const base = `${prefix}-${body}`.toUpperCase();
  for (let sequence = 1; sequence < 100; sequence += 1) {
    const candidate = `${base}-${String(sequence).padStart(2, "0")}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-99`;
}
