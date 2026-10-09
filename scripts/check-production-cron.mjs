const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
const secret = process.env.CRON_SECRET
if (!siteUrl || !secret) throw new Error("URL situs atau CRON_SECRET Production belum tersedia.")

const endpoint = new URL("/api/cron/expire-reservations", siteUrl)
const anonymous = await fetch(endpoint, { cache: "no-store" })
if (anonymous.status !== 401) {
  throw new Error(`Cron tanpa kredensial membalas ${anonymous.status}; diharapkan 401.`)
}

const authorized = await fetch(endpoint, {
  headers: { Authorization: `Bearer ${secret}` },
  cache: "no-store",
})
if (authorized.status !== 200) {
  throw new Error(`Cron dengan kredensial membalas ${authorized.status}; diharapkan 200.`)
}

const body = await authorized.json()
if (!Number.isInteger(body.expired) || typeof body.processedAt !== "string") {
  throw new Error("Respons cron tidak memuat expired dan processedAt yang valid.")
}
console.log("Cron Production lulus pemeriksaan 401/200.")
