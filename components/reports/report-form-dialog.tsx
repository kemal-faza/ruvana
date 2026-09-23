"use client"

import { useEffect, useId, useRef, useState } from "react"
import { ImagePlus, Trash2, X } from "lucide-react"

import { KATEGORI_LAPORAN, MAKS_DESKRIPSI_LAPORAN } from "@/config/business"
import { LABEL_TIPE_FASILITAS } from "@/config/labels"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { createReportAction, type CreateReportActionResult } from "@/app/reports/actions"
import { validateReportSubmission, type ReportSubmissionErrors } from "@/lib/validation/report"
import type { FacilityReportOption, ReportItem } from "@/lib/services/report-service"

const cx = {
  control:
    "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none cursor-pointer placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
}

interface ReportFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  facilityOptions: FacilityReportOption[]
  onCreated: (item: ReportItem) => void
}

export function ReportFormDialog({ open, onOpenChange, facilityOptions, onCreated }: ReportFormDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const fotoPreviewRef = useRef<string | null>(null)
  const [facilityId, setFacilityId] = useState(() => facilityOptions[0]?.id.toString() ?? "")
  const [kategori, setKategori] = useState("")
  const [deskripsi, setDeskripsi] = useState("")
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<ReportSubmissionErrors>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    return () => {
      if (fotoPreviewRef.current) {
        URL.revokeObjectURL(fotoPreviewRef.current)
      }
    }
  }, [])

  if (!open) return null

  const handleFile = (file: File | null) => {
    if (file) {
      const previewUrl = URL.createObjectURL(file)
      fotoPreviewRef.current = previewUrl
      setFotoPreview(previewUrl)
    } else {
      fotoPreviewRef.current = null
      setFotoPreview(null)
    }
    setFoto(file)
    setErrors((current) => ({ ...current, foto: undefined }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validation = validateReportSubmission({
      facilityId: facilityId ? Number(facilityId) : null,
      kategori,
      deskripsi,
      hasFoto: foto != null,
      fotoType: foto?.type,
      fotoSize: foto?.size,
    })
    if (!validation.ok) {
      setErrors(validation.errors)
      return
    }

    setSubmitting(true)
    setErrors({})
    const formData = new FormData()
    formData.set("facilityId", facilityId)
    formData.set("kategori", kategori)
    formData.set("deskripsi", deskripsi)
    if (foto) formData.set("foto", foto)

    const result: CreateReportActionResult = await createReportAction(formData)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.item)
    } else {
      setErrors(result.errors)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Tutup formulir"
        onClick={() => onOpenChange(false)}
        className="fixed inset-0 cursor-default bg-black/10 backdrop-blur-xs"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative flex max-h-[min(100dvh-2rem,48rem)] w-full max-w-lg flex-col overflow-hidden rounded-card border border-border bg-popover shadow-lg"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 id={titleId} className="font-heading text-lg font-semibold tracking-tight text-foreground">
              Ajukan laporan
            </h2>
            <p id={descriptionId} className="mt-0.5 text-sm text-muted-foreground">
              Laporkan kerusakan fasilitas kampus beserta foto pendukung.
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Tutup formulir" onClick={() => onOpenChange(false)}>
            <X aria-hidden="true" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 overflow-y-auto p-5">
          <Field>
            <FieldLabel htmlFor={`${titleId}-facility`} required>
              Fasilitas
            </FieldLabel>
            <FieldContent>
              <select
                id={`${titleId}-facility`}
                className={cx.control}
                value={facilityId}
                onChange={(event) => setFacilityId(event.target.value)}
                aria-invalid={errors.facilityId ? true : undefined}
                disabled={facilityOptions.length === 0}
              >
                {facilityOptions.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.nama} - {LABEL_TIPE_FASILITAS[facility.tipe]}
                  </option>
                ))}
              </select>
              {facilityOptions.length === 0 && (
                <p className="text-sm text-muted-foreground">Belum ada fasilitas yang tersedia untuk dilaporkan.</p>
              )}
              <FieldError errors={[{ message: errors.facilityId }]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor={`${titleId}-category`} required>
              Kategori
            </FieldLabel>
            <FieldContent>
              <select
                id={`${titleId}-category`}
                className={cx.control}
                value={kategori}
                onChange={(event) => setKategori(event.target.value)}
                aria-invalid={errors.kategori ? true : undefined}
              >
                <option value="">Pilih kategori...</option>
                {KATEGORI_LAPORAN.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <FieldError errors={[{ message: errors.kategori }]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor={`${titleId}-desc`} required>
              Deskripsi kerusakan
            </FieldLabel>
            <FieldContent>
              <textarea
                id={`${titleId}-desc`}
                rows={4}
                maxLength={MAKS_DESKRIPSI_LAPORAN}
                className="min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
                placeholder="Jelaskan kerusakan yang Anda temukan..."
                value={deskripsi}
                onChange={(event) => setDeskripsi(event.target.value)}
                aria-invalid={errors.deskripsi ? true : undefined}
              />
              <div className="flex items-center justify-between">
                <FieldError errors={[{ message: errors.deskripsi }]} />
                <span className="ml-auto text-xs text-muted-foreground">
                  {deskripsi.length}/{MAKS_DESKRIPSI_LAPORAN}
                </span>
              </div>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor={`${titleId}-photo`} required>
              Foto
            </FieldLabel>
            <FieldContent>
              <input
                ref={inputRef}
                id={`${titleId}-photo`}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
                aria-invalid={errors.foto ? true : undefined}
              />
              {fotoPreview ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- foto unggahan runtime, tidak dioptimasi */}
                  <img
                    src={fotoPreview}
                    alt="Pratinjau foto laporan"
                    className="size-20 rounded-lg border border-border object-cover"
                  />
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="truncate text-sm">{foto?.name}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFile(null)}
                      className="w-fit"
                    >
                      <Trash2 aria-hidden="true" />
                      Hapus
                    </Button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor={`${titleId}-photo`}
                  className="flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-input px-4 py-6 text-center text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
                >
                  <ImagePlus aria-hidden="true" className="size-5" />
                  <span>
                    Unggah foto <span className="font-medium text-foreground">JPG, PNG, atau WebP</span>
                  </span>
                  <span className="text-xs">Maksimal 5 MB</span>
                </label>
              )}
              <FieldError errors={[{ message: errors.foto }]} />
            </FieldContent>
          </Field>

          <div className="mt-2 flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" loading={submitting}>
              {submitting ? null : "Kirim laporan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}