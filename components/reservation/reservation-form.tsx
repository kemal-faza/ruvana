"use client";

import { useEffect, useState } from "react";
import { BATAS_TUJUAN_MAX } from "@/config/business";
import { SlotGrid } from "@/components/reservations/slot-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FacilityOption = { id: number; nama: string; lokasi: string };

type Slot = { startTime: string; endTime: string };

function generateSlots(): Slot[] {
  const slots: Slot[] = [];
  let h = 7;
  let m = 0;
  while (h < 20 || (h === 20 && m === 0)) {
    const start = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    m += 30;
    if (m === 60) {
      m = 0;
      h += 1;
    }
    const end = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    if (start >= "20:00") break;
    slots.push({ startTime: start, endTime: end });
    if (end === "20:00") break;
  }
  return slots;
}

const ALL_SLOTS = generateSlots();

export function ReservationForm({ facilities }: { facilities: FacilityOption[] }) {
  const [facilityId, setFacilityId] = useState(() => (facilities.length > 0 ? String(facilities[0].id) : ""));

  // Sinkronkan state jika prop facilities berubah — cegah stale id
  useEffect(() => {
    if (!facilities.some((f) => String(f.id) === facilityId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFacilityId(facilities.length > 0 ? String(facilities[0].id) : "");
    }
  }, [facilities, facilityId]);
  const [date, setDate] = useState(() => {
    const d = new Date();
    // tampilkan besok sebagai default agar tidak langsung lampau
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [tujuan, setTujuan] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string; detail?: string } | null>(null);

  function toggleSlot(time: string) {
    // Pilih berurutan: klik slot menambah/menghapus, lalu sort
    setSelected((prev) => {
      if (prev.includes(time)) return prev.filter((t) => t !== time);
      const next = [...prev, time].sort();
      // validasi berurutan: cek selisih 30 menit berturut
      return next;
    });
  }

  function getRange() {
    if (selected.length === 0) return null;
    const sorted = [...selected].sort();
    const startTime = sorted[0] as string;
    const last = sorted[sorted.length - 1] as string;
    // endTime adalah slot end dari last
    const idx = ALL_SLOTS.findIndex((s) => s.startTime === last);
    const endTime = idx >= 0 ? ALL_SLOTS[idx].endTime : null;
    // cek apakah berurutan tanpa gap
    for (let i = 0; i < sorted.length - 1; i++) {
      const aIdx = ALL_SLOTS.findIndex((s) => s.startTime === sorted[i]);
      const bIdx = ALL_SLOTS.findIndex((s) => s.startTime === sorted[i + 1]);
      if (bIdx !== aIdx + 1) return { startTime, endTime, valid: false };
    }
    return { startTime, endTime, valid: true };
  }

  const range = getRange();

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
    if (!facilityId || Number(facilityId) < 1) {
      setResult({ ok: false, msg: "facilityId harus bilangan positif" });
      return;
    }
    if (!date) {
      setResult({ ok: false, msg: "Tanggal wajib diisi" });
      return;
    }
    if (!range || !range.valid || !range.startTime || !range.endTime) {
      setResult({ ok: false, msg: "Pilih slot berurutan (klik 1 atau lebih slot 30 menit)" });
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
    // cek jam operasional sudah dijamin oleh slot generation

    setLoading(true);
    try {
      const body = {
        facilityId: Number(facilityId),
        date,
        startTime: range.startTime,
        endTime: range.endTime,
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
        setSelected([]);
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
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <Field>
            <FieldLabel>Fasilitas</FieldLabel>
            <Select value={facilityId} onValueChange={(v) => { if (v) setFacilityId(v); }}>
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
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>

          <Field>
            <FieldLabel>Slot waktu</FieldLabel>
            <SlotGrid slots={ALL_SLOTS} selected={selected} onToggle={toggleSlot} />
            {!range && <FieldDescription>Pilih slot waktu.</FieldDescription>}
          </Field>

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

          <div className="flex gap-3">
            <Button type="submit" loading={loading} disabled={loading}>
              Ajukan reservasi
            </Button>
            <Button type="button" variant="outline" onClick={() => { setSelected([]); setResult(null); }}>
              Reset slot
            </Button>
          </div>

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