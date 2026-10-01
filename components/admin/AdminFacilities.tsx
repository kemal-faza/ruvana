"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus, Search, Wrench } from "lucide-react";

import { STATUS_FASILITAS, TIPE_FASILITAS } from "@/config/business";
import {
  BADGE_STATUS_FASILITAS,
  LABEL_SATUAN_KAPASITAS,
  LABEL_STATUS_FASILITAS,
  LABEL_TIPE_FASILITAS,
} from "@/config/labels";
import type { StatusFasilitas, TipeFasilitas } from "@/generated/prisma/enums";
import { allowedTransitions } from "@/lib/facilities/status-transition";
import type { AdminFacility, AdminFacilityCollection } from "@/lib/services/admin-facility-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface AdminFacilitiesProps {
  items: AdminFacilityCollection["items"];
  meta: AdminFacilityCollection["meta"];
  locations: string[];
  filters: { search?: string; type?: string; location?: string; status?: string };
}

type FieldErrors = Record<string, string>;

const controlClass =
  "min-h-11 w-full rounded-control border border-border bg-background px-3 text-sm text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-background";

function extractFieldErrors(body: unknown): FieldErrors {
  const errors: FieldErrors = {};
  if (body && typeof body === "object" && Array.isArray((body as { errors?: unknown }).errors)) {
    for (const item of (body as { errors: { field?: string; message?: string }[] }).errors) {
      if (item.field) errors[item.field] = item.message ?? "Nilai tidak valid";
    }
  }
  return errors;
}

function bacaDeskripsi(fd: FormData): string | null {
  const value = String(fd.get("deskripsi") ?? "").trim();
  return value === "" ? null : value;
}

export default function AdminFacilities({ items, meta, locations, filters }: AdminFacilitiesProps) {
  const router = useRouter();
  const [selectedLocation, setSelectedLocation] = useState(filters.location ?? "");
  const [selectedType, setSelectedType] = useState(filters.type ?? "");
  const [selectedStatus, setSelectedStatus] = useState(filters.status ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminFacility | null>(null);
  const [statusTarget, setStatusTarget] = useState<AdminFacility | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function resetFeedback() {
    setErrors({});
    setFeedback(null);
  }

  async function kirimForm(
    event: React.FormEvent<HTMLFormElement>,
    mode: "create" | "edit",
    id?: number,
  ) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const payload = {
      nama: String(fd.get("nama") ?? "").trim(),
      tipe: String(fd.get("tipe") ?? ""),
      lokasi: String(fd.get("lokasi") ?? "").trim(),
      kapasitas: Number(fd.get("kapasitas")),
      deskripsi: bacaDeskripsi(fd),
    };

    setPending(true);
    resetFeedback();
    try {
      const response = await fetch(mode === "create" ? "/api/admin/facilities" : `/api/admin/facilities/${id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setCreateOpen(false);
        setEditing(null);
        router.refresh();
        return;
      }

      const body = await response.json().catch(() => null);
      setErrors(extractFieldErrors(body));
      setFeedback(
        body && typeof body === "object" && "detail" in body
          ? String((body as { detail: string }).detail)
          : "Gagal menyimpan fasilitas.",
      );
    } catch {
      setFeedback("Gagal menyimpan fasilitas.");
    } finally {
      setPending(false);
    }
  }

  async function kirimStatus(event: React.FormEvent<HTMLFormElement>, facility: AdminFacility) {
    event.preventDefault();
    const status = String(new FormData(event.currentTarget).get("status") ?? "");

    setPending(true);
    resetFeedback();
    try {
      const response = await fetch(`/api/admin/facilities/${facility.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setStatusTarget(null);
        router.refresh();
        return;
      }

      const body = await response.json().catch(() => null);
      setFeedback(
        body && typeof body === "object" && "detail" in body
          ? String((body as { detail: string }).detail)
          : "Gagal mengubah status fasilitas.",
      );
    } catch {
      setFeedback("Gagal mengubah status fasilitas.");
    } finally {
      setPending(false);
    }
  }

  const paginationQuery = new URLSearchParams();
  if (filters.search) paginationQuery.set("search", filters.search);
  if (filters.type) paginationQuery.set("type", filters.type);
  if (filters.location) paginationQuery.set("location", filters.location);
  if (filters.status) paginationQuery.set("status", filters.status);

  function pageHref(page: number) {
    const params = new URLSearchParams(paginationQuery);
    params.set("page", String(page));
    return `/admin/fasilitas?${params.toString()}`;
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Administrasi</p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Kelola fasilitas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tambah, ubah, dan atur status fasilitas. Perubahan tercermin pada halaman publik.
          </p>
        </div>
        <Button className="min-h-11" onClick={() => setCreateOpen(true)}>
          <Plus aria-hidden="true" className="size-4" />
          Tambah fasilitas
        </Button>
      </header>

      <form method="get" action="/admin/fasilitas" aria-label="Filter fasilitas admin">
        <Card size="sm">
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
            <Field>
              <FieldLabel htmlFor="search">Kata kunci</FieldLabel>
              <div className="flex min-h-11 items-center gap-2 rounded-control border border-border bg-background px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="search"
                  type="search"
                  name="search"
                  placeholder="Nama fasilitas"
                  defaultValue={filters.search ?? ""}
                  maxLength={200}
                  className="h-auto border-0 bg-transparent p-0 text-sm focus-visible:ring-0 dark:bg-transparent"
                />
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="type">Tipe</FieldLabel>
              <Combobox
                name="type"
                items={TIPE_FASILITAS}
                value={selectedType || null}
                modal={false}
                itemToStringLabel={(value) => LABEL_TIPE_FASILITAS[value as TipeFasilitas]}
                onValueChange={(value) => setSelectedType(value ?? "")}
              >
                <ComboboxInput id="type" placeholder="Semua tipe" triggerLabel="Buka daftar tipe">
                  {selectedType !== "" && <ComboboxClear aria-label="Hapus pilihan tipe" />}
                </ComboboxInput>
                <ComboboxContent>
                  <ComboboxList>
                    {(option: string) => (
                      <ComboboxItem key={option} value={option}>
                        {LABEL_TIPE_FASILITAS[option as TipeFasilitas]}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                  <ComboboxEmpty>Tipe tidak ditemukan.</ComboboxEmpty>
                </ComboboxContent>
              </Combobox>
            </Field>

            <Field>
              <FieldLabel htmlFor="location">Lokasi</FieldLabel>
              <Combobox
                name="location"
                items={locations}
                value={selectedLocation || null}
                modal={false}
                onValueChange={(value) => setSelectedLocation(value ?? "")}
              >
                <ComboboxInput id="location" placeholder="Semua lokasi" triggerLabel="Buka daftar lokasi">
                  {selectedLocation !== "" && <ComboboxClear aria-label="Hapus pilihan lokasi" />}
                </ComboboxInput>
                <ComboboxContent>
                  <ComboboxList>
                    {(option: string) => (
                      <ComboboxItem key={option} value={option}>
                        {option}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                  <ComboboxEmpty>Lokasi tidak ditemukan.</ComboboxEmpty>
                </ComboboxContent>
              </Combobox>
            </Field>

            <Field>
              <FieldLabel htmlFor="status">Status</FieldLabel>
              <Combobox
                name="status"
                items={STATUS_FASILITAS}
                value={selectedStatus || null}
                modal={false}
                itemToStringLabel={(value) => LABEL_STATUS_FASILITAS[value as StatusFasilitas]}
                onValueChange={(value) => setSelectedStatus(value ?? "")}
              >
                <ComboboxInput id="status" placeholder="Semua status" triggerLabel="Buka daftar status">
                  {selectedStatus !== "" && <ComboboxClear aria-label="Hapus pilihan status" />}
                </ComboboxInput>
                <ComboboxContent>
                  <ComboboxList>
                    {(option: string) => (
                      <ComboboxItem key={option} value={option}>
                        {LABEL_STATUS_FASILITAS[option as StatusFasilitas]}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                  <ComboboxEmpty>Status tidak ditemukan.</ComboboxEmpty>
                </ComboboxContent>
              </Combobox>
            </Field>

            <div className="flex items-end gap-2">
              <Button type="submit" className="min-h-11">
                Terapkan
              </Button>
              <Button variant="ghost" className="min-h-11" nativeButton={false} render={<Link href="/admin/fasilitas" />}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {feedback && (
        <p role="alert" className="rounded-control border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {feedback}
        </p>
      )}

      {items.length === 0 ? (
        <p className="rounded-card border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Tidak ada fasilitas yang cocok.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((facility) => (
            <li
              key={facility.id}
              className="flex flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-subtle sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-heading text-base font-semibold">{facility.nama}</span>
                  <Badge variant={BADGE_STATUS_FASILITAS[facility.status]}>
                    {LABEL_STATUS_FASILITAS[facility.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {LABEL_TIPE_FASILITAS[facility.tipe]} · {facility.lokasi} · {facility.kapasitas}{" "}
                  {LABEL_SATUAN_KAPASITAS[facility.tipe]}
                </p>
                {facility.statusChangedAt && (
                  <p className="text-xs text-muted-foreground">
                    Status terakhir {new Date(facility.statusChangedAt).toLocaleString("id-ID")}
                    {facility.statusChangedBy ? ` oleh ${facility.statusChangedBy.nama}` : ""}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="min-h-11"
                  onClick={() => {
                    resetFeedback();
                    setEditing(facility);
                  }}
                >
                  <Pencil aria-hidden="true" className="size-4" />
                  Ubah
                </Button>
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={allowedTransitions(facility.status, "admin").length === 0}
                  onClick={() => {
                    resetFeedback();
                    setStatusTarget(facility);
                  }}
                >
                  <Wrench aria-hidden="true" className="size-4" />
                  Ubah status
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {meta.totalPages > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="Pagination fasilitas">
          <Button
            variant="outline"
            className="min-h-11"
            aria-disabled={meta.page <= 1}
            nativeButton={false}
            render={meta.page <= 1 ? <span /> : <Link href={pageHref(meta.page - 1)} />}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            Halaman {meta.page} dari {meta.totalPages}
          </span>
          <Button
            variant="outline"
            className="min-h-11"
            aria-disabled={meta.page >= meta.totalPages}
            nativeButton={false}
            render={meta.page >= meta.totalPages ? <span /> : <Link href={pageHref(meta.page + 1)} />}
          >
            Berikutnya
          </Button>
        </nav>
      )}

      <FormFasilitas
        key={editing ? `edit-${editing.id}` : createOpen ? "create" : "closed"}
        open={createOpen || editing !== null}
        facility={editing}
        errors={errors}
        pending={pending}
        onClose={() => {
          resetFeedback();
          setCreateOpen(false);
          setEditing(null);
        }}
        onSubmit={(event) => kirimForm(event, editing ? "edit" : "create", editing?.id)}
      />

      <SheetStatus
        key={statusTarget ? `status-${statusTarget.id}` : "status-closed"}
        facility={statusTarget}
        errors={errors}
        pending={pending}
        onClose={() => {
          resetFeedback();
          setStatusTarget(null);
        }}
        onSubmit={(event) => statusTarget && kirimStatus(event, statusTarget)}
      />
    </main>
  );
}

function FormFasilitas({
  open,
  facility,
  errors,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  facility: AdminFacility | null;
  errors: FieldErrors;
  pending: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const title = facility ? "Ubah fasilitas" : "Tambah fasilitas";
  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>Nama fasilitas harus unik dan kapasitas minimal 1.</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 overflow-y-auto p-5" noValidate>
          <Field>
            <FieldLabel htmlFor="nama">Nama</FieldLabel>
            <Input id="nama" name="nama" defaultValue={facility?.nama ?? ""} maxLength={100} required aria-invalid={Boolean(errors.nama)} />
            {errors.nama && <FieldError>{errors.nama}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="tipe">Tipe</FieldLabel>
            <Combobox
              name="tipe"
              items={TIPE_FASILITAS}
              defaultValue={facility?.tipe ?? "ruang_kelas"}
              modal={false}
              itemToStringLabel={(value) => LABEL_TIPE_FASILITAS[value as TipeFasilitas]}
            >
              <ComboboxInput
                id="tipe"
                placeholder="Pilih tipe"
                triggerLabel="Buka daftar tipe"
                aria-invalid={Boolean(errors.tipe)}
              />
              <ComboboxContent>
                <ComboboxList>
                  {(option: string) => (
                    <ComboboxItem key={option} value={option}>
                      {LABEL_TIPE_FASILITAS[option as TipeFasilitas]}
                    </ComboboxItem>
                  )}
                </ComboboxList>
                <ComboboxEmpty>Tipe tidak ditemukan.</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
            {errors.tipe && <FieldError>{errors.tipe}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="lokasi">Lokasi</FieldLabel>
            <Input id="lokasi" name="lokasi" defaultValue={facility?.lokasi ?? ""} maxLength={200} required aria-invalid={Boolean(errors.lokasi)} />
            {errors.lokasi && <FieldError>{errors.lokasi}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="kapasitas">Kapasitas</FieldLabel>
            <Input
              id="kapasitas"
              name="kapasitas"
              type="number"
              min={1}
              defaultValue={facility?.kapasitas ?? 1}
              required
              aria-invalid={Boolean(errors.kapasitas)}
            />
            {errors.kapasitas && <FieldError>{errors.kapasitas}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="deskripsi">Deskripsi (opsional)</FieldLabel>
            <textarea
              id="deskripsi"
              name="deskripsi"
              defaultValue={facility?.deskripsi ?? ""}
              maxLength={2000}
              rows={4}
              className={controlClass}
              aria-invalid={Boolean(errors.deskripsi)}
            />
            {errors.deskripsi && <FieldError>{errors.deskripsi}</FieldError>}
          </Field>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" className="min-h-11" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function SheetStatus({
  facility,
  errors,
  pending,
  onClose,
  onSubmit,
}: {
  facility: AdminFacility | null;
  errors: FieldErrors;
  pending: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const options = facility ? allowedTransitions(facility.status, "admin") : [];
  return (
    <Sheet open={facility !== null} onOpenChange={(value) => !value && onClose()}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Ubah status fasilitas</SheetTitle>
          <SheetDescription>{facility?.nama}</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 overflow-y-auto p-5" noValidate>
          <Field>
            <FieldLabel htmlFor="status-baru">Status baru</FieldLabel>
            <Combobox
              name="status"
              items={options}
              defaultValue={options[0] ?? null}
              modal={false}
              itemToStringLabel={(value) => LABEL_STATUS_FASILITAS[value as StatusFasilitas]}
            >
              <ComboboxInput
                id="status-baru"
                placeholder="Pilih status"
                triggerLabel="Buka daftar status"
                aria-invalid={Boolean(errors.status)}
              />
              <ComboboxContent>
                <ComboboxList>
                  {(option: string) => (
                    <ComboboxItem key={option} value={option}>
                      {LABEL_STATUS_FASILITAS[option as StatusFasilitas]}
                    </ComboboxItem>
                  )}
                </ComboboxList>
                <ComboboxEmpty>Status tidak ditemukan.</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
          </Field>

          <p className="text-sm text-muted-foreground">
            Mengubah status ke {LABEL_STATUS_FASILITAS.UNDER_MAINTENANCE} membatalkan seluruh reservasi yang
            sudah disetujui pada fasilitas ini. Fasilitas {LABEL_STATUS_FASILITAS.INACTIVE} akan hilang dari
            halaman publik.
          </p>
          {errors.status && <FieldError>{errors.status}</FieldError>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" className="min-h-11" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={pending || options.length === 0}>
              {pending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
