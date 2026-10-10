const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
const secret = process.env.CRON_SECRET
if (!siteUrl || !secret) throw new Error("URL situs atau CRON_SECRET Production belum tersedia.")

const endpoint = new URL("/api/cron/expire-reservations", siteUrl)

/**
 * Domain yang dilindungi Deployment Protection membalas 3xx ke vercel.com/sso-api.
 * Tanpa `redirect: "manual"` fetch akan mengikuti alihan itu dan status aslinya
 * hilang, sehingga penyebab kegagalan sulit dibaca dari log rilis.
 */
function petunjukAlihan(response) {
  const location = response.headers.get("location")
  if (!location) return ""
  if (location.includes("vercel.com/sso-api")) {
    return (
      " Domain ini terlindungi Deployment Protection (Vercel Authentication), sehingga permintaan anonim dialihkan ke SSO." +
      " Arahkan NEXT_PUBLIC_SITE_URL ke domain kanonis publik (custom domain), bukan alias *.vercel.app."
    )
  }
  return ` Dialihkan ke ${location}.`
}

function pastikanStatus(response, diharapkan, label) {
  if (response.status === diharapkan) return
  const alihan = response.status >= 300 && response.status < 400
  const keterangan = alihan ? petunjukAlihan(response) : ""
  throw new Error(`${label} membalas ${response.status}; diharapkan ${diharapkan}.${keterangan}`)
}

const anonymous = await fetch(endpoint, { redirect: "manual", cache: "no-store" })
pastikanStatus(anonymous, 401, "Cron tanpa kredensial")

const authorized = await fetch(endpoint, {
  headers: { Authorization: `Bearer ${secret}` },
  redirect: "manual",
  cache: "no-store",
})
pastikanStatus(authorized, 200, "Cron dengan kredensial")

const body = await authorized.json()
if (!Number.isInteger(body.expired) || typeof body.processedAt !== "string") {
  throw new Error("Respons cron tidak memuat expired dan processedAt yang valid.")
}
console.log("Cron Production lulus pemeriksaan 401/200.")
