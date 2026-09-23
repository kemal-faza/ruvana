import type { Metadata } from "next";
import RegisterForm from "@/components/RegisterForm";

export const metadata: Metadata = {
  title: "Daftar — Ruvana",
  description: "Daftarkan akun untuk menggunakan fasilitas kampus.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
