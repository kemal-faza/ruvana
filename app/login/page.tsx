import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";
import { safeNextPath } from "@/lib/auth-routing";

export const metadata: Metadata = {
  title: "Masuk | ruvana",
  description: "Masuk ke sistem reservasi dan pelaporan fasilitas kampus.",
};

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Tujuan kembali divalidasi di server; nilai yang tidak sah diperlakukan
  // seolah tidak ada sehingga form memakai dasbor bawaan peran.
  const params = await searchParams;
  const raw = params.next;
  const next = safeNextPath(Array.isArray(raw) ? raw[0] : raw);

  return <LoginForm next={next} />;
}
