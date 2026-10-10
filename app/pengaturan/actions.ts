"use server"

import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"

import {
  BATAS_NAMA_AKUN_KARAKTER,
  BATAS_PASSWORD_AKUN_MIN_BYTE,
  BATAS_PASSWORD_AKUN_BYTE,
} from "@/config/business"
import {
  deleteOtherAuthSessions,
  findPasswordHashByUserId,
  updatePasswordAndRevokeOtherSessions,
  updateUserName,
} from "@/lib/db/auth"
import { getCurrentSessionTokenHash, getSessionUser, type SessionUser } from "@/lib/auth"

export interface SettingsActionState {
  ok: boolean
  message: string
  fieldErrors?: Record<string, string>
}

const SETTINGS_PATH_BY_ROLE: Record<SessionUser["role"], string> = {
  pengguna: "/pengaturan",
  petugas: "/petugas/pengaturan",
  admin: "/admin/pengaturan",
}

export async function updateProfileAction(
  _previous: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const user = await getSessionUser()
  if (!user) return { ok: false, message: "Sesi berakhir. Masuk kembali untuk mengubah profil." }

  const nama = String(formData.get("nama") ?? "").trim()
  if (!nama || nama.length > BATAS_NAMA_AKUN_KARAKTER) {
    return {
      ok: false,
      message: "Periksa kembali nama Anda.",
      fieldErrors: { nama: `Nama wajib diisi dan maksimal ${BATAS_NAMA_AKUN_KARAKTER} karakter.` },
    }
  }

  try {
    const result = await updateUserName(user.id, nama)
    if (result.count !== 1) return { ok: false, message: "Profil tidak dapat diperbarui. Muat ulang halaman." }
  } catch {
    return { ok: false, message: "Gagal memperbarui profil. Coba lagi." }
  }

  revalidatePath(SETTINGS_PATH_BY_ROLE[user.role])
  return { ok: true, message: "Profil berhasil diperbarui." }
}

export async function changePasswordAction(
  _previous: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const user = await getSessionUser()
  if (!user) return { ok: false, message: "Sesi berakhir. Masuk kembali untuk mengubah kata sandi." }

  const currentPassword = String(formData.get("currentPassword") ?? "")
  const newPassword = String(formData.get("newPassword") ?? "")
  const confirmation = String(formData.get("confirmation") ?? "")
  const fieldErrors: Record<string, string> = {}

  if (!currentPassword) fieldErrors.currentPassword = "Kata sandi saat ini wajib diisi."
  const passwordBytes = Buffer.byteLength(newPassword, "utf8")
  if (passwordBytes < BATAS_PASSWORD_AKUN_MIN_BYTE) fieldErrors.newPassword = `Kata sandi minimal ${BATAS_PASSWORD_AKUN_MIN_BYTE} karakter.`
  else if (passwordBytes > BATAS_PASSWORD_AKUN_BYTE) fieldErrors.newPassword = `Kata sandi maksimal ${BATAS_PASSWORD_AKUN_BYTE} karakter.`
  if (newPassword !== confirmation) fieldErrors.confirmation = "Konfirmasi kata sandi belum cocok."
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Periksa kembali isian kata sandi.", fieldErrors }
  }

  try {
    const [account, currentTokenHash] = await Promise.all([
      findPasswordHashByUserId(user.id),
      getCurrentSessionTokenHash(),
    ])
    if (!account || !currentTokenHash || !(await bcrypt.compare(currentPassword, account.password))) {
      return {
        ok: false,
        message: "Kata sandi saat ini tidak cocok.",
        fieldErrors: { currentPassword: "Periksa kata sandi saat ini." },
      }
    }
    if (await bcrypt.compare(newPassword, account.password)) {
      return {
        ok: false,
        message: "Gunakan kata sandi yang berbeda dari kata sandi saat ini.",
        fieldErrors: { newPassword: "Kata sandi baru harus berbeda." },
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    const updated = await updatePasswordAndRevokeOtherSessions(user.id, passwordHash, currentTokenHash)
    if (updated !== 1) return { ok: false, message: "Akun tidak dapat diperbarui. Masuk kembali." }
  } catch {
    return { ok: false, message: "Gagal memperbarui kata sandi. Coba lagi." }
  }

  return { ok: true, message: "Kata sandi diperbarui. Sesi di perangkat lain telah diakhiri." }
}

export async function revokeOtherSessionsAction(
  _previous: SettingsActionState,
  _formData: FormData,
): Promise<SettingsActionState> {
  void _previous
  void _formData
  const user = await getSessionUser()
  if (!user) return { ok: false, message: "Sesi berakhir. Masuk kembali untuk mengelola sesi." }

  try {
    const currentTokenHash = await getCurrentSessionTokenHash()
    if (!currentTokenHash) return { ok: false, message: "Sesi saat ini tidak ditemukan. Masuk kembali." }
    const result = await deleteOtherAuthSessions(user.id, currentTokenHash)
    return {
      ok: true,
      message: result.count === 0
        ? "Tidak ada sesi lain yang perlu diakhiri."
        : `Berhasil mengakhiri ${result.count} sesi di perangkat lain.`,
    }
  } catch {
    return { ok: false, message: "Gagal mengakhiri sesi lain. Coba lagi." }
  }
}
