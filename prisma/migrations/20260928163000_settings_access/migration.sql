-- Admin can deactivate an account. Existing users stay active.
ALTER TABLE "User" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- Display names for the five department codes used by document numbers.
CREATE TABLE "DepartmentLabel" (
    "code" "Department" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DepartmentLabel_pkey" PRIMARY KEY ("code")
);

INSERT INTO "DepartmentLabel" ("code", "name") VALUES
    ('CORP', 'Korporat'),
    ('HR', 'SDM'),
    ('IT', 'TI'),
    ('FIN', 'Keuangan'),
    ('OPS', 'Operasional');
