import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Akses ditolak | ruvana",
};

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Akses ditolak</h1>
      <p>Anda tidak memiliki izin untuk membuka halaman ini.</p>
      <Link href="/" className="text-primary underline">Kembali ke beranda</Link>
    </main>
  );
}
