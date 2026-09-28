Buatkan aplikasi Policy Management System end-to-end menggunakan tech stack yang tertera pada file .cursorrules. 

Mohon implementasikan hal-hal berikut secara berurutan:
1. **Prisma Schema (`prisma/schema.prisma`)**:
   - Model `User` (id, name, email, role: STAFF/REVIEWER/APPROVER/ADMIN, password/auth fields).
   - Model `Policy` (id, title, documentNumber, category, description, fileUrl, version, status: DRAFT/IN_REVIEW/APPROVED/REJECTED/ARCHIVED, authorId, createdAt, updatedAt).
   - Model `WorkflowApproval` (id, policyId, approverId, status, notes, stepOrder, createdAt).
   - Model `AuditLog` (id, userId, action, details, timestamp).

2. **Database Connection & Seed**:
   - Konfigurasi Prisma client instance di folder `lib/`.
   - Buat script seed sederhana untuk data awal pengguna dengan berbagai role.

3. **Backend & Server Actions**:
   - Server actions untuk CRUD policy, proses *submit* review, tombol *approve/reject* oleh approver, dan pencatatan audit log otomatis.
   - Modul helper untuk *file upload* (simpan ke folder lokal /uploads atau S3/MinIO compatible).

4. **Frontend UI (Shadcn UI & Tailwind)**:
   - Dashboard utama: Tabel daftar kebijakan dengan filter status dan tombol pencarian.
   - Halaman Detail Kebijakan: Menampilkan informasi dokumen, tombol *preview/download file*, riwayat *workflow approval*, serta tombol aksi sesuai role pengguna (misal: tombol "Ajukan Review" untuk Staff, tombol "Approve/Reject" untuk Approver).
   - Form Upload/Edit Kebijakan baru dengan validasi Zod.