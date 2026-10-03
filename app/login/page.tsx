import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Masuk | ruvana",
  description: "Masuk ke sistem reservasi dan pelaporan fasilitas kampus.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const query = searchParams ? await searchParams : {};
  const next = typeof query.next === "string" ? query.next : undefined;

  return <LoginForm next={next} />;
}
