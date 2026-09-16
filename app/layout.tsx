import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { MotionProvider } from "@/components/motion/motion-provider";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "ruvana",
  description: "Sistem reservasi & pelaporan fasilitas kampus (ruang kelas, aula, laboratorium, alat, lapangan).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      data-scroll-behavior="smooth"
      className={`${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <noscript>
          <style>{`[data-motion-reveal="true"],[data-motion-ambient="true"]{opacity:1 !important;transform:none !important;}`}</style>
        </noscript>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <MotionProvider>{children}</MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
