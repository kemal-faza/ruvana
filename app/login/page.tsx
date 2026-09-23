import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Masuk — Ruvana",
  description: "Masuk ke sistem reservasi dan pelaporan fasilitas kampus.",
};

export default function LoginPage() {
  return <LoginForm />;
}
