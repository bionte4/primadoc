import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PASSWORD = "Password123!";

async function main() {
  const password = await bcrypt.hash(PASSWORD, 10);

  const staff = await prisma.user.upsert({
    where: { email: "staff@prismadoc.local" },
    update: { name: "Anita Putri", role: "STAFF", password },
    create: {
      name: "Anita Putri",
      email: "staff@prismadoc.local",
      role: "STAFF",
      password,
    },
  });

  const reviewer = await prisma.user.upsert({
    where: { email: "reviewer@prismadoc.local" },
    update: { name: "Budi Santoso", role: "REVIEWER", password },
    create: {
      name: "Budi Santoso",
      email: "reviewer@prismadoc.local",
      role: "REVIEWER",
      password,
    },
  });

  const approver = await prisma.user.upsert({
    where: { email: "approver@prismadoc.local" },
    update: { name: "Citra Wijaya", role: "APPROVER", password },
    create: {
      name: "Citra Wijaya",
      email: "approver@prismadoc.local",
      role: "APPROVER",
      password,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@prismadoc.local" },
    update: { name: "Dimas Hartono", role: "ADMIN", password },
    create: {
      name: "Dimas Hartono",
      email: "admin@prismadoc.local",
      role: "ADMIN",
      password,
    },
  });

  const draft = await prisma.policy.upsert({
    where: { documentNumber_version: { documentNumber: "POL-SDM-001", version: "1.0" } },
    update: {},
    create: {
      title: "Kebijakan Kerja Hibrida",
      documentNumber: "POL-SDM-001",
      category: "SDM",
      department: "HR",
      description:
        "Mengatur hari kerja di kantor dan jarak jauh, termasuk jam inti dan persetujuan atasan.",
      version: "1.0",
      versionGroupId: "seed-POL-SDM-001",
      status: "DRAFT",
      authorId: staff.id,
    },
  });

  const inReview = await prisma.policy.upsert({
    where: { documentNumber_version: { documentNumber: "POL-KEU-014", version: "1.0" } },
    update: {},
    create: {
      title: "Batas Pengeluaran Operasional",
      documentNumber: "POL-KEU-014",
      category: "Keuangan",
      department: "FIN",
      description:
        "Menetapkan plafon pengeluaran tanpa persetujuan tambahan dan dokumen pendukung yang wajib dilampirkan.",
      version: "1.0",
      versionGroupId: "seed-POL-KEU-014",
      status: "IN_REVIEW",
      authorId: staff.id,
    },
  });

  const approved = await prisma.policy.upsert({
    where: { documentNumber_version: { documentNumber: "POL-TI-003", version: "1.2" } },
    update: {},
    create: {
      title: "Pengelolaan Akses Sistem Internal",
      documentNumber: "POL-TI-003",
      category: "TI",
      department: "IT",
      description:
        "Mengatur pemberian, peninjauan, dan pencabutan akses ke sistem internal perusahaan.",
      version: "1.2",
      versionGroupId: "seed-POL-TI-003",
      status: "APPROVED",
      authorId: staff.id,
    },
  });

  for (const policy of [draft, inReview, approved]) {
    if (policy.versionGroupId.startsWith("seed-")) {
      await prisma.policy.update({
        where: { id: policy.id },
        data: { versionGroupId: policy.id },
      });
    }
  }

  await prisma.workflowApproval.deleteMany({
    where: { policyId: { in: [inReview.id, approved.id] } },
  });
  await prisma.auditLog.deleteMany({
    where: { policyId: { in: [draft.id, inReview.id, approved.id] } },
  });

  await prisma.workflowApproval.createMany({
    data: [
      {
        policyId: inReview.id,
        approverId: staff.id,
        status: "PENDING",
        notes: "Mohon ditinjau sebelum kuartal berikutnya.",
        stepOrder: 1,
      },
      {
        policyId: approved.id,
        approverId: staff.id,
        status: "PENDING",
        notes: "Pengajuan versi awal.",
        stepOrder: 1,
      },
      {
        policyId: approved.id,
        approverId: approver.id,
        status: "APPROVED",
        notes: "Sudah sesuai dengan kontrol akses yang berlaku.",
        stepOrder: 2,
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: staff.id,
        policyId: draft.id,
        action: "CREATE",
        details: "Membuat draf POL-SDM-001 v1.0.",
      },
      {
        userId: staff.id,
        policyId: inReview.id,
        action: "SUBMIT_REVIEW",
        details: "Mengajukan POL-KEU-014 untuk review.",
      },
      {
        userId: staff.id,
        policyId: approved.id,
        action: "SUBMIT_REVIEW",
        details: "Mengajukan POL-TI-003 untuk review.",
      },
      {
        userId: reviewer.id,
        policyId: approved.id,
        action: "REVIEW_NOTE",
        details: "Kontrol akses sudah selaras dengan standar internal.",
      },
      {
        userId: approver.id,
        policyId: approved.id,
        action: "APPROVE",
        details: "Menyetujui POL-TI-003.",
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
