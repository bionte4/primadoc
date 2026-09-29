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



   Buatkan aplikasi Policy Management System end-to-end dengan nama "Regulix" (atau sesuaikan dengan nama pilihan Anda) menggunakan tech stack: Next.js (App Router, Server Actions), Tailwind CSS, Shadcn UI, Prisma ORM dengan PostgreSQL, NextAuth.js untuk autentikasi, dan MinIO/S3-compatible storage untuk file dokumen.


### PROMPT 1

1. Konfigurasi File & Skema Database (Prisma):
   - Buat skema database yang mencakup model User (role: STAFF, REVIEWER, APPROVER, ADMIN), Policy (judul, nomor dokumen, kategori, deskripsi, fileUrl, version, status: DRAFT, IN_REVIEW, APPROVED, REJECTED, ARCHIVED), WorkflowApproval (mencatat riwayat persetujuan, catatan, dan urutan step), serta AuditLog (mencatat aktivitas sistem).

2. Sistem Autentikasi & Keamanan:
   - Setup NextAuth.js untuk autentikasi pengguna lokal/kredensial beserta proteksi rute berdasarkan Role-Based Access Control (RBAC).

3. Backend & Modul Lifecycle Dokumen:
   - Server Actions untuk manajemen CRUD kebijakan, mekanisme pengajuan dokumen (*submit for review*), proses persetujuan atau penolakan (*approve/reject*), serta pencatatan log audit otomatis di setiap perubahan status.
   - Modul helper untuk *file upload* dokumen PDF/Word ke penyimpanan (lokal / MinIO).

4. Antarmuka Pengguna (Frontend dengan Shadcn UI):
   - Dashboard utama: Tabel daftar kebijakan dengan fitur filter status, pencarian, dan tombol aksi cepat.
   - Halaman Detail Kebijakan: Menampilkan informasi dokumen, pratinjau file, riwayat *workflow approval*, serta tombol aksi yang menyesuaikan dengan role login (misal: tombol "Ajukan Review" untuk Staff, tombol "Approve/Reject" untuk Approver).
   - Form Upload/Edit Kebijakan baru yang dilengkapi validasi form menggunakan Zod.


### PROMPT 2
Buat struktur awal project Next.js (App Router) untuk aplikasi Policy Management "PRISMADOC". 
1. Buat file .cursorrules yang berisi standar tech stack: Next.js, Tailwind CSS, Shadcn UI, Prisma ORM, PostgreSQL, dan NextAuth.
2. Buat file `prisma/schema.prisma` yang lengkap dengan model berikut:
   - User (id, name, email, role [STAFF, REVIEWER, APPROVER, ADMIN], password, createdAt, updatedAt)
   - Policy (id, title, documentNumber, category, description, fileUrl, version, status [DRAFT, IN_REVIEW, APPROVED, REJECTED, ARCHIVED], authorId, createdAt, updatedAt)
   - WorkflowApproval (id, policyId, approverId, status [PENDING, APPROVED, REJECTED], notes, stepOrder, createdAt)
   - AuditLog (id, userId, action, details, timestamp)
3. Setup koneksi Prisma client di folder `lib/db.ts` dan buat skrip seed awal (`prisma/seed.ts`) untuk membuat akun default (Admin, Staff, Approver).

### PROMPT 3
Implementasikan sistem autentikasi dan kontrol akses (RBAC) untuk aplikasi "Regulix":
1. Konfigurasi NextAuth.js di `app/api/auth/[...nextauth]/route.ts` menggunakan credentials provider yang terhubung ke database Prisma (verifikasi email & password user).
2. Perbarui tipe session NextAuth agar mengenali properti `role` dan `id` pengguna.
3. Buat middleware (`middleware.ts`) untuk memproteksi halaman-halaman utama (seperti `/dashboard`, `/policies/new`, `/approval`) berdasarkan status login dan role pengguna.

### PROMPT 4
Buat fungsionalitas Backend dan Server Actions untuk pengelolaan dokumen kebijakan:
1. Buat folder `actions/` berisi Server Actions untuk:
   - CRUD Policy (Create, Read, Update, Delete) dengan status awal `DRAFT`.
   - Aksi pengajuan dokumen (`submitFor review`) yang mengubah status menjadi `IN_REVIEW` dan mencatat data ke `WorkflowApproval`.
   - Aksi Approval / Rejection oleh Approver (mengubah status policy menjadi `APPROVED` atau `REJECTED`, menyimpan catatan, dan memperbarui riwayat).
   - Pencatatan otomatis ke `AuditLog` setiap kali ada aksi perubahan data atau status dokumen.
2. Buat helper fungsi untuk manajemen *file upload* dokumen (PDF/Word) yang menyimpan file ke folder lokal `/public/uploads` atau penyimpanan sementara yang aman.

### PROMPT 5
Buat antarmuka (UI) frontend menggunakan Tailwind CSS dan komponen Shadcn UI yang bersih dan profesional:
1. **Halaman Dashboard (`app/dashboard/page.php` atau `page.tsx`)**:
   - Tabel daftar kebijakan dengan informasi judul, nomor dokumen, kategori, versi, dan badge status berwarna (Draft, In Review, Approved, dll).
   - Fitur pencarian sederhana dan filter berdasarkan status.
   - Tombol "Buat Kebijakan Baru" (hanya muncul untuk Staff/Admin).
2. **Halaman Form Kebijakan (`app/policies/new/page.tsx`)**:
   - Form input judul, nomor dokumen, kategori, deskripsi, upload file dokumen, dan validasi menggunakan Zod.
3. **Halaman Detail & Approval (`app/policies/[id]/page.tsx`)**:
   - Menampilkan detail lengkap kebijakan, tombol unduh/pratinjau file.
   - Kotak riwayat *Workflow Approval* (menampilkan siapa saja yang sudah mereview/approve).
   - Tombol aksi kontekstual sesuai role (Contoh: Tombol "Ajukan untuk Review" bagi pembuat, serta tombol "Approve" dan "Reject" dengan input catatan bagi Approver).

### PROMPT 6
Tolong implementasikan logika Workflow Approval dan State Transitions untuk aplikasi Regulix:
1. Pastikan tombol aksi pada halaman detail policy berubah secara dinamis berdasarkan status dokumen dan role user yang sedang login:
   - Jika status DRAFT dan user adalah author: tampilkan tombol "Ajukan Review" (mengubah status jadi IN_REVIEW).
   - Jika status IN_REVIEW dan user adalah APPROVER: tampilkan tombol "Approve" (status jadi APPROVED) dan "Reject" (status kembali ke DRAFT dengan modal input catatan/notes).
2. Setiap kali tombol aksi ditekan, pastikan sistem otomatis mencatat entri baru ke tabel `WorkflowApproval` (menyimpan approverId, status, notes) dan mencatat aktivitas ke `AuditLog`.
3. Tambahkan validasi agar hanya role tertentu yang bisa melakukan transisi status tertentu.