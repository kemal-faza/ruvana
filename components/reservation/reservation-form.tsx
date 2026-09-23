"use client";

import { useMemo, useState } from "react";
import { BATAS_TUJUAN_MAX, VALID_START_TIMES } from "@/config/business";
import {
  blockedByLabel,
  getValidEndTimes,
  type FacilityAvailability,
} from "@/lib/reservations/slot-range";
import { parseTimeToMinutes } from "@/lib/time/reservation-time";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type FacilityOption = { id: number; nama: string; lokasi: string };

interface ReservationFormProps {
  facilities: FacilityOption[];
  facilityId: number;
  date: string;
  availability: FacilityAvailability | null;
}

export function ReservationForm({ facilities, facilityId, date, availability }: ReservationFormProps) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string; detail?: string } | null>(null);

  // Peta status per jam mulai dari availability server (null = tidak diketahui)
  const statusByStart = useMemo(() => {
    const map = new Map<string, { available: boolean; blockedBy: "APPROVED" | "MAINTENANCE" | null }>();
    if (availability) {
      for (const slot of availability.slots) {
        map.set(slot.startTime, { available: slot.available, blockedBy: slot.blockedBy });
      }
    }
    return map;
  }, [availability]);

  // Opsi jam selesai: setelah jam mulai & seluruh slot di antaranya tersedia
  const validEndTimes = useMemo(
    () => (startTime ? getValidEndTimes(startTime, availability?.slots ?? null) : []),
    [startTime, availability],
  );

  function handleStartChange(value: string | null) {
    if (!value) return;
    setStartTime(value);
    // Reset jam selesai bila tidak valid lagi untuk jam mulai yang baru
    if (endTime && !getValidEndTimes(value, availability?.slots ?? null).includes(endTime)) {
      setEndTime("");
    }
  }

  // Ringkasan live (read-only, turunan state yang sudah ada) — null bila pilihan belum lengkap
  const selectedFacility = facilities.find((f) => f.id === facilityId);
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
        <CardHeader>
          <CardTitle>Ajukan reservasi</CardTitle>
          <CardDescription>Lengkapi detail di bawah untuk mengajukan reservasi.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Belum ada fasilitas tersedia.</p>
        </CardContent>
      </Card>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    // validasi client (server tetap sumber kebenaran)
    if (!facilityId || facilityId < 1) {
      setResult({ ok: false, msg: "facilityId harus bilangan positif" });
      return;
    }
    if (!date) {
      setResult({ ok: false, msg: "Tanggal wajib diisi" });
      return;
    }
    if (!startTime) {
      setResult({ ok: false, msg: "Pilih jam mulai" });
      return;
    }
    if (!endTime) {
      setResult({ ok: false, msg: "Pilih jam selesai" });
      return;
    }
    // pertahanan terakhir di client: rentang tidak boleh melewati slot yang tidak tersedia
    if (availability && !getValidEndTimes(startTime, availability.slots).includes(endTime)) {
      setResult({ ok: false, msg: "Rentang waktu melewati slot yang tidak tersedia" });
      return;
    }
    if (!tujuan.trim()) {
      setResult({ ok: false, msg: "Tujuan penggunaan wajib diisi" });
      return;
    }
    if (tujuan.trim().length > BATAS_TUJUAN_MAX) {
      setResult({ ok: false, msg: `Tujuan maksimal ${BATAS_TUJUAN_MAX} karakter` });
      return;
    }
    // cek jam operasional sudah dijamin oleh opsi dropdown

    setLoading(true);
    try {
      const body = {
        facilityId,
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
        setResult({ ok: true, msg: `Reservasi PENDING dibuat (id ${data?.id ?? "-"})`, detail: JSON.stringify(data, null, 2) });
        setStartTime("");
        setEndTime("");
      } else {
        // tampilkan problem+json
        const detail = data?.detail || data?.title || `Gagal ${res.status}`;
        const errors = data?.errors ? ` - ${JSON.stringify(data.errors)}` : "";
        const avail = data?.availability ? `\nAvailability: ${JSON.stringify(data.availability).slice(0, 400)}...` : "";
        setResult({ ok: false, msg: `${detail}${errors}`, detail: JSON.stringify(data, null, 2) + avail });
      }
    } catch (err) {
      setResult({ ok: false, msg: `Error jaringan: ${String(err)}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajukan reservasi</CardTitle>
        <CardDescription>Lengkapi detail di bawah untuk mengajukan reservasi.</CardDescription>
      </CardHeader>
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
          <form method="get" action="/reservasi" className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel>Fasilitas</FieldLabel>
                <Select name="facilityId" defaultValue={String(facilityId)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih fasilitas">
                      {(value: string) => {
                        const match = facilities.find((f) => String(f.id) === value);
                        return match ? `${match.nama} — ${match.lokasi}` : "Pilih fasilitas";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {facilities.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.nama} — {f.lokasi}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="date">Tanggal</FieldLabel>
                <Input id="date" name="date" type="date" defaultValue={date} required />
              </Field>
            </div>
            <div>
              <Button type="submit" variant="outline">
                Tampilkan ketersediaan
              </Button>
            </div>
          </form>
        </section>

        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <section aria-label="Waktu" className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                2
              </span>
              <h2 className="text-sm font-semibold">Waktu</h2>
              <Separator className="flex-1" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="jam-mulai">Jam mulai</FieldLabel>
                <Select value={startTime} onValueChange={handleStartChange}>
                  <SelectTrigger id="jam-mulai" className="w-full">
                    <SelectValue placeholder="Pilih jam mulai" />
                  </SelectTrigger>
                  <SelectContent>
                    {VALID_START_TIMES.map((time) => {
                      const status = statusByStart.get(time);
                      const disabled = status ? !status.available : false;
                      const reason = status ? blockedByLabel(status.blockedBy) : null;
                      return (
                        <SelectItem key={time} value={time} disabled={disabled}>
                          {reason ? `${time} — ${reason}` : time}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {!startTime && <FieldDescription>Pilih jam mulai.</FieldDescription>}
              </Field>

              <Field>
                <FieldLabel htmlFor="jam-selesai">Jam selesai</FieldLabel>
                <Select
                  value={endTime}
                  onValueChange={(v: string | null) => {
                    if (v) setEndTime(v);
                  }}
                >
                  <SelectTrigger id="jam-selesai" className="w-full" disabled={!startTime}>
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
              </Field>
            </div>
            {!availability && (
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
              {tujuan.length > BATAS_TUJUAN_MAX && <FieldError>Tujuan melebihi batas</FieldError>}
            </Field>

            {summary && (
              <p aria-live="polite" className="text-sm text-muted-foreground">
                {summary}
              </p>
            )}

            <div className="flex gap-3">
              <Button type="submit" loading={loading} disabled={loading}>
                Ajukan reservasi
              </Button>
              <Button type="button" variant="outline" onClick={() => { setStartTime(""); setEndTime(""); setResult(null); }}>
                Reset waktu
              </Button>
            </div>
          </section>

          {result && (
            <div className={`rounded-md border p-3 text-sm ${result.ok ? "border-green-200 bg-green-50 text-green-900" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
              <p className="font-medium">{result.msg}</p>
              {result.detail && <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap wrap-break-word text-xs opacity-80">{result.detail}</pre>}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
