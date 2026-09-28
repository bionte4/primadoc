import Link from "next/link";

export default function PolicyNotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Kebijakan tidak ditemukan</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dokumen tidak ada, atau peran Anda tidak dapat membukanya.
      </p>
      <Link href="/policies" className="mt-4 inline-block text-sm font-medium text-primary">
        Kembali ke daftar
      </Link>
    </div>
  );
}
