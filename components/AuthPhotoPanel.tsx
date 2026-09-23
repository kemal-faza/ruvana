import Image from "next/image"

export function AuthPhotoPanel() {
  return (
    <section
      aria-labelledby="auth-intro-title"
      className="relative hidden min-h-dvh overflow-hidden bg-muted md:sticky md:top-0 md:block md:h-dvh md:min-h-0 md:self-start"
    >
      <Image
        src="/fsm-login.jpg"
        alt="Gedung Fakultas Sains dan Matematika Universitas Diponegoro"
        fill
        priority
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-b from-primary-950/10 via-primary-950/35 to-primary-950/80"
      />
      <div className="absolute inset-x-0 bottom-0 max-w-lg p-8 text-white lg:p-11">
        <h2 id="auth-intro-title" className="text-2xl/tight font-semibold tracking-tight">
          Kelola kebutuhan fasilitas lebih terstruktur.
        </h2>
        <p className="mt-3 text-sm/relaxed text-white/90 sm:text-base/relaxed">
          Satu akses untuk reservasi ruang, pemantauan permintaan, dan pengelolaan fasilitas.
        </p>
      </div>
    </section>
  )
}
