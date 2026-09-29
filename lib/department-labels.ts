import type { Department } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEPARTMENT_LABEL, DEPARTMENTS } from "@/lib/document-kind";

export type DepartmentLabels = Record<(typeof DEPARTMENTS)[number], string>;

export async function getDepartmentLabels(): Promise<DepartmentLabels> {
  const labels: DepartmentLabels = { ...DEPARTMENT_LABEL };
  const rows = await prisma.departmentLabel.findMany();
  for (const row of rows) {
    if (row.name.trim()) labels[row.code] = row.name.trim();
  }
  return labels;
}

export function isDepartmentCode(value: string): value is Department {
  return DEPARTMENTS.includes(value as Department);
}
