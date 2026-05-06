import { GEAR_CATALOG, isBossDropGear } from './gear'

/**
 * Random gear drop on battle win. Chance scales with mob level; pricier pieces
 * only appear from stronger enemies. Mystic / legend relics never drop here.
 */
export function rollBattleLoot(mobId: number): string | null {
  const baseChance = 0.14 + mobId * 0.028
  const chance = Math.min(0.58, baseChance)
  if (Math.random() >= chance) return null

  const maxPrice = mobId <= 2 ? 40 : mobId <= 5 ? 55 : mobId <= 10 ? 75 : mobId <= 14 ? 95 : 9999
  const pool = GEAR_CATALOG.filter((g) => g.price <= maxPrice && !isBossDropGear(g))
  if (pool.length < 1) return null
  return pool[Math.floor(Math.random() * pool.length)]!.id
}

/**
 * One random mystic or legend weapon — used only after defeating a region boss.
 */
export function rollBossExclusiveGear(): string | null {
  const mystic = GEAR_CATALOG.filter((g) => g.archetype === 'mystic')
  const legend = GEAR_CATALOG.filter((g) => g.archetype === 'legend')
  if (mystic.length === 0 && legend.length === 0) return null

  const wantMystic = Math.random() < 0.5
  let pool = wantMystic ? mystic : legend
  if (pool.length === 0) pool = wantMystic ? legend : mystic
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]!.id
}
