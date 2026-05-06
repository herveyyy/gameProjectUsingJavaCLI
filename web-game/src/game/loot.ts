import { GEAR_CATALOG } from './gear'

/**
 * Random gear drop on battle win. Chance scales with mob level; pricier pieces
 * only appear from stronger enemies.
 */
export function rollBattleLoot(mobId: number): string | null {
  const baseChance = 0.14 + mobId * 0.028
  const chance = Math.min(0.58, baseChance)
  if (Math.random() >= chance) return null

  const maxPrice = mobId <= 2 ? 40 : mobId <= 5 ? 55 : mobId <= 10 ? 75 : mobId <= 14 ? 95 : 9999
  const pool = GEAR_CATALOG.filter((g) => g.price <= maxPrice)
  if (pool.length < 1) return null
  return pool[Math.floor(Math.random() * pool.length)]!.id
}
