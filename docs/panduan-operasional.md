# Panduan operasional PrismaDoc

Panduan ini untuk orang yang memakai PrismaDoc setiap hari: staf, reviewer, approver, dan admin. PrismaDoc menyimpan kebijakan perusahaan, prosedur, dan petunjuk teknis, lalu mencatat siapa yang meninjau, menyetujui, dan membaca tiap dokumen.

## Masuk

Buka aplikasi, lalu masuk dengan email yang sudah diundang.

Akun percobaan memakai kata sandi `Password123!`.

| Peran | Nama | Email |
| --- | --- | --- |
| Staf | Anita Putri | staff@prismadoc.local |
| Reviewer | Budi Santoso | reviewer@prismadoc.local |
| Approver | Citra Wijaya | approver@prismadoc.local |
| Admin | Dimas Hartono | admin@prismadoc.local |

Jika kantor sudah mengaktifkan masuk lewat Microsoft, Google Workspace, atau Active Directory, tombolnya muncul di halaman masuk. Email tetap harus sudah diundang. Peran tetap ditentukan di PrismaDoc, bukan di akun kantor.

## Peran

| Peran | Tugas sehari-hari |
| --- | --- |
| Staf | Menyusun draf, mengajukan review, merevisi, membaca kebijakan yang disetujui, dan menandai sudah membaca. |
| Reviewer | Membaca dokumen yang sedang dalam review dan menulis catatan rekomendasi. Reviewer tidak menyetujui atau menolak. |
| Approver | Menyetujui atau menolak dokumen yang ditugaskan kepadanya. |
| Admin | Mengundang pengguna, menunjuk approver cadangan, mengekspor audit log, dan membantu arsip atau revisi. Admin tidak menggantikan keputusan approver. |

Staf hanya melihat dokumen buatannya sendiri dan dokumen yang sudah disetujui. Reviewer, approver, dan admin melihat seluruh daftar.

## Susunan dokumen

Setiap dokumen punya departemen dan tier.

| Departemen | Kode nomor |
| --- | --- |
| Korporat | CORP |
| SDM | HR |
| TI | IT |
| Keuangan | FIN |
| Operasional | OPS |

| Tier | Isi | Induk |
| --- | --- | --- |
| Tier 1 · Kebijakan | Aturan yang berlaku | Tidak punya induk |
| Tier 2 · Prosedur | Cara menjalankan satu kebijakan | Kebijakan yang sudah disetujui |
| Tier 3 · Petunjuk teknis | Langkah rinci untuk satu tugas | Prosedur yang sudah disetujui |

Nomor dokumen baru diisi otomatis, berbentuk `DEPARTEMEN/JENIS/URUTAN/TAHUN`. Contoh: `IT/POL/001/2026` untuk kebijakan TI, `IT/PRO/001/2026` untuk prosedur, dan `IT/JUK/001/2026` untuk petunjuk teknis. Urutan dimulai lagi setiap tahun. Dokumen lama yang memakai nomor seperti `POL-TI-003` tetap memakai nomor itu.

Prosedur dan petunjuk teknis mengikuti departemen induknya. Kategori juga ikut induk dan tidak diubah sendiri.

## Siklus status

1. **Draf.** Penulis masih bisa mengubah isi dan berkas.
2. **Dalam review.** Penulis mengajukan. Approver utama ditunjuk. Batas keputusan bawaan adalah 3 hari.
3. **Disetujui.** Isi terkunci. Staf dapat membaca dan menandai sudah membaca.
4. **Ditolak.** Dokumen kembali menjadi draf. Catatan penolakan wajib diisi. Penulis memperbaiki, lalu mengajukan lagi.
5. **Diarsipkan.** Dokumen tidak lagi menjadi versi yang dipakai. Turunan yang masih aktif ditandai **perlu ditinjau**. Turunan tidak diarsipkan otomatis.

Tiap perpindahan status tercatat di riwayat persetujuan dan audit log.

## Menyusun dokumen baru

Hanya staf dan admin yang membuat dokumen.

1. Buka **Dokumen**, lalu **Buat Kebijakan Baru**.
2. Pilih tier.
   - Kebijakan: pilih departemen.
   - Prosedur atau petunjuk teknis: pilih **Dokumen induk**. Induk harus versi terbaru dan sudah disetujui. Departemen mengikuti induk.
3. Isi judul, kategori (untuk kebijakan), dan deskripsi. Nomor tidak diketik.
4. Lampirkan berkas PDF, DOC, DOCX, PNG, atau JPG, maksimal 10 MB. PDF harus bisa dibuka.
5. Simpan. Dokumen tersimpan sebagai draf versi v1.0.

Dari halaman kebijakan yang sudah disetujui juga ada tautan **Buat prosedur**. Dari prosedur yang sudah disetujui ada **Buat petunjuk teknis**.

Prosedur tidak bisa diajukan jika kebijakannya belum disetujui, sedang diarsipkan, atau versinya yang berlaku belum disetujui. Aturan yang sama berlaku untuk petunjuk teknis terhadap prosedurnya.

## Review dan keputusan

1. Penulis membuka draf, lalu **Ajukan Review**. Catatan bersifat opsional.
2. Reviewer membuka **Persetujuan**, menulis **Catatan review**, lalu menyimpan. Catatan ini terlihat oleh approver dan masuk audit log.
3. Approver yang ditunjuk membuka dokumen yang sama.
   - **Approve** mengunci isi.
   - **Reject** wajib berisi catatan, lalu dokumen kembali menjadi draf.

Jika approver utama tidak memutuskan dalam batas waktu, sistem mengirim pengingat di lonceng **Pengingat**. Bila approver itu punya approver cadangan, keputusan dilimpahkan ke cadangan tersebut. Hanya orang yang menerima limpahan yang dapat memutuskan.

Admin menunjuk cadangan di **Pengguna**, hanya untuk akun approver, dan tidak boleh menunjuk diri sendiri.

## Setelah disetujui

- Staf membuka dokumen, membaca berkas di dalam aplikasi, lalu menekan **Saya Telah Membaca Kebijakan Ini**.
- Admin melihat rekap siapa yang sudah dan belum membaca.
- Berkas PDF diberi tanda air nama dan email pembaca. Tautan berkas hanya berlaku sebentar dan tidak bisa dibagikan ke orang lain.
- Pencarian di **Dokumen** mencakup judul dan isi PDF atau Word.

Untuk mengubah dokumen yang sudah disetujui, penulis atau admin membuka **revisi**. Versi lama tetap tersimpan di tab **Riwayat Versi**. Revisi baru mulai lagi sebagai draf. Menyimpan perubahan pada draf juga membuat versi baru: pilih kenaikan minor atau mayor.

Mengarsipkan induk tidak menghapus turunan. Buka turunan yang bertanda perlu ditinjau, lalu putuskan apakah masih berlaku, perlu revisi, atau diarsipkan.

Hapus hanya untuk draf atau dokumen yang ditolak, dan hanya oleh penulis atau admin. Dokumen yang masih punya turunan tidak bisa dihapus sebelum turunannya dipindahkan atau dihapus.

## Mencari dokumen

Di **Dokumen**, saring menurut status, tier, dan departemen. Chip status di atas tabel menghitung dokumen yang sedang terlihat.

Dashboard adalah ringkasan, bukan daftar lengkap. Saring departemen dan tier di sana untuk melihat angka dan dokumen terbaru pada kelompok itu. Daftar penuh tetap di menu **Dokumen**.

## Tugas admin

- **Pengguna:** undang karyawan sebelum mereka bisa masuk. Peran dipilih saat undangan.
- **Cadangan:** isi hanya pada baris approver.
- **Audit log:** saring menurut tanggal dan nama, lalu ekspor CSV bila perlu untuk pemeriksaan.

Audit mencatat pembuatan, perubahan, pengajuan, catatan review, persetujuan, penolakan, arsip, revisi, pengingat, dan limpahan.

## Urutan kerja yang disarankan

1. Setujui kebijakan terlebih dahulu.
2. Buat prosedur di bawah kebijakan itu, lalu ajukan sampai disetujui.
3. Buat petunjuk teknis di bawah prosedur yang sudah disetujui.
4. Beri tahu staf untuk membaca dan menandai dokumen yang disetujui.
5. Jika aturan berubah, revisi dokumen yang berubah saja. Versi kebijakan tidak naik hanya karena prosedurnya diubah.
6. Jika kebijakan diarsipkan, tinjau prosedur dan petunjuk teknis di bawahnya sebelum mengarsipkan mereka.
