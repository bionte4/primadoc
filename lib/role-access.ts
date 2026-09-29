import type { Role } from "@prisma/client";

export const ROLE_ACCESS: Record<Role, { summary: string; points: string[] }> = {
  ADMIN: {
    summary: "Mengelola akun, organisasi, dan catatan audit.",
    points: [
      "Mengundang pengguna, mengubah peran, dan menonaktifkan akun.",
      "Mengubah nama tampilan departemen.",
      "Menunjuk approver cadangan dan mengekspor audit log.",
      "Membantu arsip atau revisi. Tidak menyetujui atau menolak dokumen.",
    ],
  },
  APPROVER: {
    summary: "Memutuskan dokumen yang ditugaskan kepadanya.",
    points: [
      "Melihat seluruh daftar dokumen.",
      "Menyetujui atau menolak dokumen dalam review yang menjadi tugasnya.",
      "Menerima antrean approver lain setelah batas waktu, jika ditunjuk sebagai cadangan.",
    ],
  },
  REVIEWER: {
    summary: "Memberi rekomendasi selama dokumen dalam review.",
    points: [
      "Melihat seluruh daftar dokumen.",
      "Menulis catatan review. Tidak menyetujui atau menolak.",
    ],
  },
  STAFF: {
    summary: "Menyusun dan membaca dokumen sesuai kepemilikan.",
    points: [
      "Membuat draf, mengajukan review, merevisi, dan mengarsipkan dokumennya sendiri.",
      "Melihat dokumen buatannya dan dokumen yang sudah disetujui.",
      "Menandai dokumen yang sudah disetujui sebagai sudah dibaca.",
    ],
  },
};
