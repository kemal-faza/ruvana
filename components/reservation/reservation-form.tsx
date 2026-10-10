"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BATAS_TUJUAN_MAX,
  PESAN_BATAS_PENGAJUAN as PESAN_BATAS_PENGAJUAN_DASAR,
  VALID_START_TIMES,
} from "@/config/business";
import { generateDailySlots } from "@/lib/availability/slots";
import {
  blockedByLabel,
  getValidEndTimes,
  type AvailabilitySlot,
  type FacilityAvailability,
} from "@/lib/reservations/slot-range";
import {
  pesanSuksesPengajuan,
  petakanGalatField,
  ringkasGalatPengajuan,
} from "@/lib/reservations/reservation-display";
import { parseTimeToMinutes, asiaJakartaToUtc, isKurangDariBatasPengajuan } from "@/lib/time/reservation-time";
import { AvailabilityGrid } from "@/components/facilities/availability-grid";
import { BUTTON_ACTION_CLASS, Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SELECT_TRIGGER_ACTION_CLASS } from "@/components/ui/select-classes";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type FacilityOption = { id: number; nama: string; lokasi: string };

interface ReservationFormProps {
  facilities: FacilityOption[];
  facilityId: number;
  date: string;
  /** Jam mulai awal dari tautan slot ketersediaan (opsional). */
  initialStartTime?: string;
  availability: FacilityAvailability | null;
  /** Instant waktu server (ISO UTC) saat halaman dirender — dasar hitung jendela 14 hari, bukan jam klien. */
  serverNow: string;
  /** Target form GET "Tampilkan ketersediaan". Default halaman /reservasi. */
  actionPath?: string;
  /**
   * Kunci fasilitas ke `facilityId` (mis. saat form ditempel di halaman detail
   * fasilitas): dropdown Fasilitas diganti teks statis.
   */
  lockFacility?: boolean;
  /** Bentuk pemilih jam: dropdown (`select`) atau grid kotak (`grid`). */
  timePicker?: "select" | "grid";
}

const PESAN_BATAS_PENGAJUAN_FORM = `${PESAN_BATAS_PENGAJUAN_DASAR}.`;

export function ReservationForm({ facilities, facilityId, date, initialStartTime, availability, serverNow, actionPath = "/reservasi", lockFacility = false, timePicker = "select" }: ReservationFormProps) {
  const [startTime, setStartTime] = useState(initialStartTime ?? "");
  const [endTime, setEndTime] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string; konflik?: boolean } | null>(null);
  const [galatField, setGalatField] = useState<{ jamMulai?: string; jamSelesai?: string; tujuan?: string }>({});
  const [ringkasan, setRingkasan] = useState<string | null>(null);
  // Penjaga submit ganda di luar state agar klik kedua yang datang sebelum
  // render ulang tetap ditolak (tombol juga dinonaktifkan saat loading).
  const mengirimRef = useRef(false);
  const router = useRouter();

  // Di mode grid, pemicu jam adalah tombol kotak; fokus galat diarahkan ke
  // pemilih grid, bukan ke field dropdown yang tidak dirender.
  const idJamMulai = timePicker === "grid" ? "pemilih-jam" : "jam-mulai";
  const idJamSelesai = timePicker === "grid" ? "pemilih-jam" : "jam-selesai";

  // Sumber kebenaran tunggal fasilitas yang akan disubmit: pilihan user di
  // dropdown (bukan prop facilityId yang hanya berubah setelah halaman
  // dimuat ulang via "Tampilkan ketersediaan"). Komponen di-remount per
  // facilityId+date (key di page), jadi inisialisasi ini selalu segar.
  const [selectedFacilityId, setSelectedFacilityId] = useState(facilityId);

  // Penanda remount pemilih tanggal: "Reset waktu" mengembalikan field Tanggal
  // ke tanggal yang sedang aktif di halaman, bukan ke perubahan yang belum diterapkan.
  const [tanggalResetKe, setTanggalResetKe] = useState(0);

  // Availability dihitung server untuk prop facilityId. Bila user memilih
  // fasilitas lain tanpa memuat ulang, slotnya tidak berlaku untuk pilihan
  // baru — perlakukan sebagai tidak diketahui (fallback: semua waktu aktif,
  // server tetap memvalidasi dan menolak saat submit).
  const availabilityForSelected = selectedFacilityId === facilityId ? availability : null;

  // Peta status per jam mulai dari availability server (null = tidak diketahui)
  const statusByStart = useMemo(() => {
    const map = new Map<string, { available: boolean; blockedBy: "APPROVED" | "MAINTENANCE" | null }>();
    if (availabilityForSelected) {
      for (const slot of availabilityForSelected.slots) {
        map.set(slot.startTime, { available: slot.available, blockedBy: slot.blockedBy });
      }
    }
    return map;
  }, [availabilityForSelected]);

  // Slot dalam jendela pengajuan H-14 dihitung dari waktu server, bukan jam
  // klien. Aturan yang sama ditegakkan otoritatif oleh service saat submit.
  const mepetByStart = useMemo(() => {
    const acuan = new Date(serverNow);
    const map = new Map<string, boolean>();
    for (const time of VALID_START_TIMES) {
      map.set(time, isKurangDariBatasPengajuan(asiaJakartaToUtc(date, time), acuan));
    }
    return map;
  }, [date, serverNow]);

  const adaSlotMepet = useMemo(() => [...mepetByStart.values()].some(Boolean), [mepetByStart]);

  // Opsi jam selesai: setelah jam mulai & seluruh slot di antaranya tersedia
  const validEndTimes = useMemo(
    () => (startTime ? getValidEndTimes(startTime, availabilityForSelected?.slots ?? null) : []),
    [startTime, availabilityForSelected],
  );

  // Slot untuk pemilih jam berbentuk grid. Bila ketersediaan belum diketahui,
  // pakai slot harian netral (semua aktif); server tetap memvalidasi saat submit.
  const gridSlots = useMemo<AvailabilitySlot[]>(() => {
    if (availabilityForSelected) return availabilityForSelected.slots;
    return generateDailySlots().map((slot) => ({ ...slot, available: true, blockedBy: null }));
  }, [availabilityForSelected]);

  const disabledStarts = useMemo(() => {
    const set = new Set<string>();
    for (const [time, mepet] of mepetByStart) {
      if (mepet) set.add(time);
    }
    return set;
  }, [mepetByStart]);

  function handleStartChange(value: string | null) {
    if (!value) return;
    setStartTime(value);
    // Reset jam selesai bila tidak valid lagi untuk jam mulai yang baru
    if (endTime && !getValidEndTimes(value, availabilityForSelected?.slots ?? null).includes(endTime)) {
      setEndTime("");
    }
  }

  function onSubmitDateForm(e: React.FormEvent<HTMLFormElement>) {
    // Navigasi lunak lewat router (tanpa muat ulang penuh) agar posisi layar
    // tidak melompat; native GET tetap menjadi fallback tanpa JavaScript.
    e.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(e.currentTarget).entries()) {
      if (typeof value === "string" && value.trim() !== "") params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `${actionPath}?${query}` : actionPath, { scroll: false });
  }

  function handleSlotSelect(slot: AvailabilitySlot) {
    // Klik ulang kotak yang sudah terpilih membatalkan pilihan (toggle): klik
    // jam mulai lagi menghapus rentang, klik jam selesai lagi melepas jam selesai.
    if (startTime && slot.startTime === startTime) {
      setStartTime("");
      setEndTime("");
      return;
    }
    if (endTime && slot.startTime === endTime) {
      setEndTime("");
      return;
    }
    // Belum ada jam mulai atau kotak sebelum jam mulai: jadikan jam mulai baru.
    if (!startTime || slot.startTime < startTime) {
      setStartTime(slot.startTime);
      setEndTime("");
      return;
    }
    // Kotak setelah jam mulai: tetapkan jam selesai bila batasnya valid; bila
    // tidak, jadikan jam mulai baru.
    const validEnds = getValidEndTimes(startTime, availabilityForSelected?.slots ?? null);
    if (validEnds.includes(slot.startTime)) {
      setEndTime(slot.startTime);
    } else {
      setStartTime(slot.startTime);
      setEndTime("");
    }
  }

  function handleFacilityChange(value: string | null) {
    const id = Number(value);
    if (!value || !Number.isInteger(id) || id < 1) return;
    if (id === selectedFacilityId) return;
    setSelectedFacilityId(id);
    // Pilihan waktu mengacu pada availability fasilitas lama — reset agar
    // user memilih ulang slot untuk fasilitas yang baru.
    setStartTime("");
    setEndTime("");
  }

  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId);
  let summary: string | null = null;
  if (selectedFacility && date && startTime && endTime) {
    const [year, month, day] = date.split("-").map(Number);
    const tanggal = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(
      new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1),
    );
    const slotCount = (parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime)) / 30;
    summary = `${selectedFacility.nama} · ${tanggal} · ${startTime}–${endTime}, ${slotCount} slot`;
  }

  if (facilities.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">Belum ada fasilitas tersedia.</p>
        </CardContent>
      </Card>
    );
  }

  function fokusKe(id: string | null) {
    if (!id) return;
    document.getElementById(id)?.focus();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mengirimRef.current) return;
    setResult(null);
    setGalatField({});
    setRingkasan(null);

    // validasi client: kumpulkan galat per field, tampilkan di dekat field,
    // ringkas di atas, dan fokus ke field invalid pertama.
    const fieldBaru: typeof galatField = {};
    let fokusPertama: string | null = null;
    const labelRingkasan: string[] = [];
    function catat(kunci: keyof typeof fieldBaru, id: string, label: string, pesan: string) {
      fieldBaru[kunci] = pesan;
      labelRingkasan.push(label);
      fokusPertama ??= id;
    }
    if (!startTime) {
      catat("jamMulai", idJamMulai, "Jam mulai", "Jam mulai wajib dipilih.");
    } else if (mepetByStart.get(startTime)) {
      // pertahanan client memakai waktu server saat render: slot dalam
      // jendela H-14 langsung ditolak tanpa menunggu respons server.
      catat("jamMulai", idJamMulai, "Jam mulai", PESAN_BATAS_PENGAJUAN_FORM);
    }
    if (!endTime) {
      catat("jamSelesai", idJamSelesai, "Jam selesai", "Jam selesai wajib dipilih.");
    }
    // pertahanan terakhir di client: rentang tidak boleh melewati slot yang tidak tersedia.
    // Dilewati bila availability bukan milik fasilitas terpilih (server yang memvalidasi).
    if (
      startTime &&
      endTime &&
      availabilityForSelected &&
      !getValidEndTimes(startTime, availabilityForSelected.slots).includes(endTime)
    ) {
      catat(
        "jamSelesai",
        idJamSelesai,
        "Jam selesai",
        "Rentang waktu melewati slot yang tidak tersedia. Pilih jam selesai lain.",
      );
    }
    if (!tujuan.trim()) {
      catat("tujuan", "tujuan", "Tujuan", "Tujuan wajib diisi.");
    } else if (tujuan.trim().length > BATAS_TUJUAN_MAX) {
      catat("tujuan", "tujuan", "Tujuan", `Tujuan maksimal ${BATAS_TUJUAN_MAX} karakter.`);
    }
    if (labelRingkasan.length > 0) {
      setGalatField(fieldBaru);
      setRingkasan(`Periksa kembali isian berikut: ${labelRingkasan.join(", ")}.`);
      fokusKe(fokusPertama);
      return;
    }
    // cek jam operasional sudah dijamin oleh opsi dropdown

    mengirimRef.current = true;
    setLoading(true);
    try {
      const body = {
        facilityId: selectedFacilityId,
        date,
        startTime,
        endTime,
        tujuanPenggunaan: tujuan.trim(),
      };
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        // Konfirmasi ditampilkan sebagai banner di halaman detail (satu-satunya
        // bukti sukses); tidak ada dump JSON atau enum di layar form.
        const idBaru =
          typeof data === "object" && data !== null && typeof (data as { id?: unknown }).id === "number"
            ? (data as { id: number }).id
            : null;
        if (idBaru === null) {
          setResult({ ok: true, msg: pesanSuksesPengajuan() });
        } else {
          router.push(`/reservasi/riwayat/${idBaru}?baru=1`);
        }
      } else {
        // Input dipertahankan agar pengguna dapat memperbaiki dan mencoba lagi.
        const konflik = res.status === 409;
        const body = data as { errors?: unknown } | null;
        const pemetaan = petakanGalatField(body?.errors);
        // Kode aturan dari server agar pesan H-14 tampil apa adanya di dekat
        // field, bukan pesan generik.
        const galatBatasPengajuan =
          Array.isArray(body?.errors) &&
          body.errors.some(
            (item) =>
              typeof item === "object" &&
              item !== null &&
              (item as { code?: unknown }).code === "INSUFFICIENT_LEAD_TIME",
          );
        if (pemetaan.length > 0) {
          const fieldServer: typeof galatField = {};
          for (const item of pemetaan) {
            if (item.idKontrol === "jam-mulai")
              fieldServer.jamMulai = galatBatasPengajuan
                ? PESAN_BATAS_PENGAJUAN_FORM
                : "Nilai jam mulai tidak valid. Periksa kembali.";
            if (item.idKontrol === "jam-selesai") fieldServer.jamSelesai = "Nilai jam selesai tidak valid. Periksa kembali.";
            if (item.idKontrol === "tujuan") fieldServer.tujuan = "Nilai tujuan tidak valid. Periksa kembali.";
          }
          setGalatField(fieldServer);
          setRingkasan(`Periksa kembali isian berikut: ${pemetaan.map((item) => item.label).join(", ")}.`);
          fokusKe(pemetaan.find((item) => item.idKontrol !== null)?.idKontrol ?? null);
        } else {
          // tampilkan ringkasan aman: tanpa enum, id, dump JSON, atau kunci internal.
          setResult({ ok: false, msg: ringkasGalatPengajuan(data, res.status), konflik });
        }
      }
    } catch {
      setResult({ ok: false, msg: "Kesalahan jaringan. Silakan coba lagi." });
    } finally {
      mengirimRef.current = false;
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-6">
        <section aria-label="Fasilitas dan tanggal" className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              1
            </span>
            <h2 className="text-sm font-semibold">Fasilitas & tanggal</h2>
            <Separator className="flex-1" />
          </div>
          {/* Form GET native: memuat ulang Server Component agar
              availability dihitung ulang untuk facilityId + date baru */}
          <form method="get" action={actionPath} onSubmit={onSubmitDateForm} className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="fasilitas">Fasilitas</FieldLabel>
                {lockFacility ? (
                  <>
                    <p
                      id="fasilitas"
                      className="flex min-h-11 items-center rounded-control border border-input bg-muted px-3 text-sm"
                    >
                      {selectedFacility ? `${selectedFacility.nama} | ${selectedFacility.lokasi}` : "Fasilitas"}
                    </p>
                    <input type="hidden" name="facilityId" value={String(selectedFacilityId)} />
                  </>
                ) : (
                  <>
                    <Select name="facilityId" value={String(selectedFacilityId)} onValueChange={handleFacilityChange}>
                      <SelectTrigger id="fasilitas" className={`${SELECT_TRIGGER_ACTION_CLASS} w-full`}>
                        <SelectValue placeholder="Pilih fasilitas">
                          {(value: string) => {
                            const match = facilities.find((f) => String(f.id) === value);
                            return match ? `${match.nama} | ${match.lokasi}` : "Pilih fasilitas";
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {facilities.map((f) => (
                          <SelectItem key={f.id} value={String(f.id)}>
                            {f.nama} | {f.lokasi}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedFacilityId !== facilityId && (
                      <FieldDescription>
                        Fasilitas berubah — klik Tampilkan ketersediaan untuk memuat slot terbaru sebelum memilih waktu.
                      </FieldDescription>
                    )}
                  </>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="date">Tanggal</FieldLabel>
                <DatePicker
                  key={`${date}:${tanggalResetKe}`}
                  id="date"
                  name="date"
                  aria-label="Tanggal"
                  defaultValue={date}
                  className="min-h-11 rounded-lg border border-input px-3 text-sm hover:bg-muted"
                />
              </Field>
            </div>
            <div>
              <Button type="submit" variant="soft" className={BUTTON_ACTION_CLASS}>
                Tampilkan ketersediaan
              </Button>
            </div>
          </form>
          {adaSlotMepet && !galatField.jamMulai && (
            <FieldDescription id="bantuan-batas-pengajuan">{PESAN_BATAS_PENGAJUAN_FORM}</FieldDescription>
          )}
        </section>

        <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
          {ringkasan && (
            <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">{ringkasan}</p>
            </div>
          )}
          <section aria-label="Waktu" className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                2
              </span>
              <h2 className="text-sm font-semibold">Waktu</h2>
              <Separator className="flex-1" />
            </div>
            {timePicker === "grid" ? (
              <div id="pemilih-jam" tabIndex={-1} className="flex flex-col gap-3">
                <AvailabilityGrid
                  slots={gridSlots}
                  selection={{
                    selectedStart: startTime || null,
                    selectedEnd: endTime || null,
                    disabledStarts,
                    onSelectSlot: handleSlotSelect,
                  }}
                />
                {startTime && endTime && (
                  <p aria-live="polite" className="text-sm text-muted-foreground">
                    Jam terpilih: {startTime}–{endTime}
                  </p>
                )}
                {!startTime && !galatField.jamMulai && !adaSlotMepet && (
                  <FieldDescription>Klik kotak jam untuk memilih waktu.</FieldDescription>
                )}
                {galatField.jamMulai && <FieldError>{galatField.jamMulai}</FieldError>}
                {galatField.jamSelesai && <FieldError>{galatField.jamSelesai}</FieldError>}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="jam-mulai">Jam mulai</FieldLabel>
                  <Select value={startTime} onValueChange={handleStartChange}>
                    <SelectTrigger
                      id="jam-mulai"
                      className={`${SELECT_TRIGGER_ACTION_CLASS} w-full`}
                      // Rujuk deskripsi hanya saat ia dirender; saat galat field
                      // menggantikannya, IDREF akan menggantung.
                      aria-describedby={
                        adaSlotMepet && !galatField.jamMulai ? "bantuan-batas-pengajuan" : undefined
                      }
                    >
                      <SelectValue placeholder="Pilih jam mulai" />
                    </SelectTrigger>
                    <SelectContent>
                      {VALID_START_TIMES.map((time) => {
                        const status = statusByStart.get(time);
                        // Slot mepet H-14 dinonaktifkan dengan label netral
                        // "Tidak tersedia" — jangan menyiratkan slot terisi.
                        const mepet = mepetByStart.get(time) ?? false;
                        const disabled = mepet || (status ? !status.available : false);
                        const reason = mepet ? "Tidak tersedia" : status ? blockedByLabel(status.blockedBy) : null;
                        return (
                          <SelectItem key={time} value={time} disabled={disabled}>
                            {reason ? `${time} — ${reason}` : time}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {!startTime && !galatField.jamMulai && !adaSlotMepet && <FieldDescription>Pilih jam mulai.</FieldDescription>}
                  {galatField.jamMulai && <FieldError>{galatField.jamMulai}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="jam-selesai">Jam selesai</FieldLabel>
                  <Select
                    value={endTime}
                    onValueChange={(v: string | null) => {
                      if (v) setEndTime(v);
                    }}
                  >
                    <SelectTrigger id="jam-selesai" className={`${SELECT_TRIGGER_ACTION_CLASS} w-full`} disabled={!startTime}>
                      <SelectValue placeholder="Pilih jam selesai" />
                    </SelectTrigger>
                    <SelectContent>
                      {validEndTimes.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!startTime ? (
                    <FieldDescription>Pilih jam mulai dulu.</FieldDescription>
                  ) : validEndTimes.length === 0 ? (
                    <FieldDescription>Tidak ada jam selesai yang tersedia setelah jam ini.</FieldDescription>
                  ) : null}
                  {galatField.jamSelesai && <FieldError>{galatField.jamSelesai}</FieldError>}
                </Field>
              </div>
            )}
            {!availabilityForSelected && (
              <p className="text-xs text-muted-foreground">
                Ketersediaan slot tidak dapat dimuat; semua waktu ditampilkan aktif dan server tetap memvalidasi saat submit.
              </p>
            )}
          </section>

          <section aria-label="Tujuan dan kirim" className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                3
              </span>
              <h2 className="text-sm font-semibold">Tujuan & kirim</h2>
              <Separator className="flex-1" />
            </div>
            <Field>
              <FieldLabel htmlFor="tujuan">Tujuan penggunaan</FieldLabel>
              <textarea
                id="tujuan"
                value={tujuan}
                onChange={(e) => setTujuan(e.target.value)}
                maxLength={BATAS_TUJUAN_MAX}
                required
                rows={3}
                placeholder="Contoh: Diskusi kelompok mata kuliah ..."
                className={cn(
                  "w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                )}
              />
              <FieldDescription>
                {tujuan.length}/{BATAS_TUJUAN_MAX} karakter.
              </FieldDescription>
              {galatField.tujuan ? (
                <FieldError>{galatField.tujuan}</FieldError>
              ) : (
                tujuan.length > BATAS_TUJUAN_MAX && <FieldError>Tujuan melebihi batas</FieldError>
              )}
            </Field>

            {summary && (
              <p aria-live="polite" className="text-sm text-muted-foreground">
                {summary}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <Button type="submit" loading={loading} disabled={loading} className={`${BUTTON_ACTION_CLASS} min-w-44`}>
                {loading ? "Mengajukan..." : "Ajukan reservasi"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={BUTTON_ACTION_CLASS}
                onClick={() => {
                  setStartTime("");
                  setEndTime("");
                  // Tanggal ikut kembali ke tanggal yang sedang aktif di halaman.
                  setTanggalResetKe((ke) => ke + 1);
                  setResult(null);
                  setGalatField({});
                  setRingkasan(null);
                }}
              >
                Reset waktu
              </Button>
            </div>
          </section>

          {result && (
            <div aria-live="polite" className={`rounded-md border p-3 text-sm ${result.ok ? "border-success-subdued bg-success-subdued text-success-subdued-foreground" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
              <p className="font-medium">{result.msg}</p>
              {result.konflik && (
                <div className="mt-3 flex flex-col gap-2">
                  <p>Pilih slot lain yang masih tersedia, atau muat ulang slot terbaru tanpa mengulang isian Anda.</p>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      className={BUTTON_ACTION_CLASS}
                      onClick={() => router.refresh()}
                    >
                      Segarkan slot
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
