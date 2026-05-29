import { getDb } from './db'

let settingsCache: Record<string, string> = {}
let cacheTime = 0
const CACHE_TTL = 60 * 1000

export async function getSettings(): Promise<Record<string, string>> {
  const now = Date.now()
  if (Object.keys(settingsCache).length > 0 && now - cacheTime < CACHE_TTL) {
    return settingsCache
  }
  const db = await getDb()
  const rows = await db.businessSettings.findMany()
  const map: Record<string, string> = {}
  rows.forEach((r: any) => { map[r.key] = r.value })
  settingsCache = map
  cacheTime = now
  return map
}

export async function getSetting(key: string, fallback = ''): Promise<string> {
  const settings = await getSettings()
  return settings[key] ?? fallback
}

export async function updateSetting(key: string, value: string): Promise<void> {
  const db = await getDb()
  await db.businessSettings.upsert({
    where: { key },
    update: { value },
    create: { key, value, category: 'general', label: key }
  })
  settingsCache = {}
  cacheTime = 0
}

export async function updateSettings(
  updates: Record<string, string>
): Promise<void> {
  const db = await getDb()
  await Promise.all(
    Object.entries(updates).map(([key, value]) =>
      db.businessSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value, category: 'general', label: key }
      })
    )
  )
  settingsCache = {}
  cacheTime = 0
}
