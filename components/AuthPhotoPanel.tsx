import Image from "next/image"

export function AuthPhotoPanel() {
  return (
    <section
      aria-labelledby="auth-intro-title"
      className="hidden min-h-dvh bg-muted md:sticky md:top-0 md:block md:h-dvh md:min-h-0 md:self-start"
    >
      <div className="relative size-full overflow-hidden">
        <Image
          src="/fsm-login.jpg"
          alt="Gedung Fakultas Sains dan Matematika Universitas Diponegoro"
          fill
          priority
          sizes="(min-width: 768px) 100vh, 100vw"
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-b from-primary-950/10 via-primary-950/35 to-primary-950/80"
        />
        <div className="absolute inset-x-0 bottom-0 max-w-lg p-8 text-white lg:p-11">
          <h2 id="auth-intro-title" className="text-2xl/tight font-semibold tracking-tight">
            Reservasi dan laporan fasilitas kampus.
          </h2>
        </div>
      </div>
    </section>
  )
}
