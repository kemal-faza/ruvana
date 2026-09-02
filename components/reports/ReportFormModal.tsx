"use client";

import { useEffect, useRef, useState } from "react";
import type { Facility, ReportFormData } from "./types";

interface ReportFormModalProps {
  open: boolean;
  facilities: Facility[];
  onClose: () => void;
  onSubmit: (data: ReportFormData) => void;
}

const inputBase =
  "w-full rounded-lg border border-[#6F8987]/35 bg-white px-3 py-2 text-sm text-[#263B3A] placeholder:text-[#9AAEAD] transition-colors focus:border-[#405E5C] focus:outline-none focus:ring-2 focus:ring-[#405E5C]/10 disabled:cursor-not-allowed disabled:bg-[#E5EFF0]/60";

const labelBase = "mb-1.5 block text-sm font-medium text-[#405E5C]";

interface FieldError {
  facilityId?: string;
  kategori?: string;
  deskripsi?: string;
  foto?: string;
}

export default function ReportFormModal({ open, facilities, onClose, onSubmit }: ReportFormModalProps) {
  const [facilityId, setFacilityId] = useState("");
  const [kategori, setKategori] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [fotoName, setFotoName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const readFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setFieldErrors((p) => ({ ...p, foto: "File harus berupa gambar (JPG/PNG)." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors((p) => ({ ...p, foto: "Ukuran foto maksimal 5 MB." }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFoto(reader.result as string);
      setFotoName(file.name);
      setFieldErrors((p) => ({ ...p, foto: undefined }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const validate = (): boolean => {
    const errs: FieldError = {};
    if (!facilityId) errs.facilityId = "Pilih fasilitas yang dilaporkan.";
    if (!kategori) errs.kategori = "Pilih kategori laporan.";
    if (!deskripsi.trim()) errs.deskripsi = "Tuliskan deskripsi kerusakan.";
    else if (deskripsi.trim().length < 10) errs.deskripsi = "Deskripsi minimal 10 karakter.";
    if (!foto) errs.foto = "Foto wajib dilampirkan.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    window.setTimeout(() => {
      onSubmit({
        facilityId: Number(facilityId),
        kategori,
        deskripsi: deskripsi.trim(),
        fotoFile: fotoName ? new File([foto ?? ""], fotoName, { type: "image/jpeg" }) : null,
      });
      setSubmitting(false);
      setSuccess(true);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Ajukan laporan kerusakan">
      <div className="flex min-h-full items-end justify-center sm:items-center sm:p-4">
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-rv-fade" onClick={onClose} />
        <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-[#FAFCFB] shadow-2xl animate-rv-slide-up sm:rounded-2xl">
          <header className="flex items-center justify-between border-b border-[#405E5C]/15 bg-white px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-[#263B3A]">Ajukan Laporan</h2>
              <p className="text-xs text-[#6D8080]">Laporkan kerusakan atau masalah fasilitas kampus</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md p-1.5 text-[#6D8080] transition-colors hover:bg-[#E5EFF0] hover:text-[#405E5C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D1A438]"
              aria-label="Tutup form laporan"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </header>

          {success ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center animate-rv-fade">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <svg className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold text-[#263B3A]">Laporan berhasil diajukan</p>
                <p className="mt-1 text-sm text-[#6D8080]">
                  Terima kasih! Laporan Anda telah tercatat dan akan diproses oleh petugas.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 rounded-lg bg-[#D1A438] px-4 py-2 text-sm font-semibold text-[#263B3A] shadow-sm transition-all hover:brightness-105 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D1A438] focus-visible:ring-offset-2"
              >
                Selesai
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
                <fieldset className="space-y-4">
                  <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#6D8080]">
                    Detail Kerusakan
                  </legend>

                  <div>
                    <label htmlFor="facility" className={labelBase}>
                      Fasilitas <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="facility"
                      value={facilityId}
                      onChange={(e) => {
                        setFacilityId(e.target.value);
                        setFieldErrors((p) => ({ ...p, facilityId: undefined }));
                      }}
                      className={inputBase}
                      aria-invalid={!!fieldErrors.facilityId}
                    >
                      <option value="" disabled>
                        Pilih fasilitas
                      </option>
                      {facilities.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nama} — {f.lokasi}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.facilityId && (
                      <p className="mt-1 text-xs text-rose-600">{fieldErrors.facilityId}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="kategori" className={labelBase}>
                      Kategori <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="kategori"
                      value={kategori}
                      onChange={(e) => {
                        setKategori(e.target.value);
                        setFieldErrors((p) => ({ ...p, kategori: undefined }));
                      }}
                      className={inputBase}
                      aria-invalid={!!fieldErrors.kategori}
                    >
                      <option value="" disabled>
                        Pilih kategori kerusakan
                      </option>
                      {[
                        "Kerusakan Ringan",
                        "Kerusakan Berat",
                        "Pemeliharaan Rutin",
                        "Kebutuhan Perbaikan Segera",
                        "Lainnya",
                      ].map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.kategori && (
                      <p className="mt-1 text-xs text-rose-600">{fieldErrors.kategori}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="deskripsi" className={labelBase}>
                      Deskripsi <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      id="deskripsi"
                      value={deskripsi}
                      onChange={(e) => {
                        setDeskripsi(e.target.value);
                        setFieldErrors((p) => ({ ...p, deskripsi: undefined }));
                      }}
                      placeholder="Jelaskan kerusakan atau masalah yang ditemukan secara detail..."
                      rows={4}
                      maxLength={200}
                      className={`${inputBase} resize-none`}
                      aria-invalid={!!fieldErrors.deskripsi}
                    />
                    <div className="mt-1 flex items-center justify-between">
                      {fieldErrors.deskripsi ? (
                        <p className="text-xs text-rose-600">{fieldErrors.deskripsi}</p>
                      ) : (
                        <span />
                      )}
                      <p className="ml-auto text-xs text-[#9AAEAD] tabular-nums">{deskripsi.length} / 200</p>
                    </div>
                  </div>
                </fieldset>

                <fieldset className="space-y-2">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-[#6D8080]">
                    Foto Bukti <span className="text-rose-500">*</span>
                  </legend>

                  {foto ? (
                    <div className="relative overflow-hidden rounded-xl border border-[#405E5C]/15 animate-rv-fade">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={foto} alt="Pratinjau foto laporan" className="h-48 w-full object-cover" />
                      <div className="flex items-center justify-between bg-[#263B3A]/75 px-3 py-2 text-xs text-white">
                        <span className="truncate">{fotoName}</span>
                        <div className="flex shrink-0 items-center gap-3">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="font-medium underline underline-offset-2 hover:text-white/70"
                          >
                            Ganti
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFoto(null);
                              setFotoName("");
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="font-medium text-rose-300 hover:text-rose-200"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-9 text-sm text-[#6D8080] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D1A438] ${
                        dragOver
                          ? "border-[#405E5C] bg-[#E5EFF0]"
                          : fieldErrors.foto
                          ? "border-rose-300 bg-rose-50/40"
                          : "border-[#6F8987]/50 bg-[#E5EFF0]/40 hover:border-[#405E5C]/70 hover:bg-[#E5EFF0]/70"
                      }`}
                    >
                      <svg
                        className={`h-8 w-8 ${dragOver ? "text-[#405E5C]" : "text-[#6F8987]"}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden
                      >
                        <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614z" />
                        <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                      </svg>
                      <span className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center">
                        <span className="font-semibold text-[#405E5C]">Klik untuk unggah</span>
                        <span className="text-[#6D8080]">atau seret foto di sini</span>
                      </span>
                      <span className="text-xs text-[#6D8080]">JPG, PNG · maks 5 MB · wajib diisi</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                  {fieldErrors.foto && !foto && (
                    <p className="text-xs text-rose-600">{fieldErrors.foto}</p>
                  )}
                </fieldset>
              </div>

              <footer className="flex items-center justify-end gap-3 border-t border-[#405E5C]/10 bg-[#E5EFF0]/40 px-6 py-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-[#6D8080] transition-colors hover:bg-[#E5EFF0] hover:text-[#405E5C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D1A438] disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#D1A438] px-4 py-2 text-sm font-semibold text-[#263B3A] shadow-sm shadow-[#D1A438]/25 transition-all hover:brightness-105 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D1A438] focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  {submitting && (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {submitting ? "Mengirim..." : "Kirim Laporan"}
                </button>
              </footer>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
