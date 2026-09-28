-- Department is the first part of an automatic document number, for example IT/POL/001/2026.
CREATE TYPE "Department" AS ENUM ('CORP', 'HR', 'IT', 'FIN', 'OPS');

ALTER TABLE "Policy" ADD COLUMN "department" "Department" NOT NULL DEFAULT 'CORP';

UPDATE "Policy" SET "department" = 'HR' WHERE "category" = 'SDM';
UPDATE "Policy" SET "department" = 'FIN' WHERE "category" = 'Keuangan';
UPDATE "Policy" SET "department" = 'OPS' WHERE "category" = 'Operasional';
UPDATE "Policy" SET "department" = 'IT' WHERE "category" = 'TI';

CREATE INDEX "Policy_department_idx" ON "Policy"("department");
