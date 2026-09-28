import type { Department, PolicyType } from "@prisma/client";

const DEPARTMENT_CODE: Record<Department, string> = {
  CORP: "CORP",
  HR: "HR",
  IT: "IT",
  FIN: "FIN",
  OPS: "OPS",
};

const TYPE_CODE: Record<PolicyType, string> = {
  POLICY: "POL",
  PROCEDURE: "PRO",
  TECHNICAL_GUIDE: "JUK",
};

export function documentYear(now = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).format(now);
}

export function nextDocumentNumber(
  department: Department,
  type: PolicyType,
  taken: Iterable<string>,
  year = documentYear(),
) {
  const prefix = `${DEPARTMENT_CODE[department]}/${TYPE_CODE[type]}`;
  const pattern = new RegExp(`^${prefix}/(\\d+)/${year}$`);
  let highest = 0;
  for (const number of taken) {
    const match = number.match(pattern);
    if (!match) continue;
    highest = Math.max(highest, Number(match[1]));
  }
  return `${prefix}/${String(highest + 1).padStart(3, "0")}/${year}`;
}
