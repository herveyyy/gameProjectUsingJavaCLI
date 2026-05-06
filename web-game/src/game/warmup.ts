import { SHOP_CONSUMABLES, SHOP_STAT_TOMES, SHOP_UPGRADES } from './constants'
import { EQUIPMENT_SLOT_LABELS, GEAR_ARCHETYPE_LABELS, GEAR_CATALOG, getCombatSkillEntries } from './gear'
import { getEffectiveStats } from './innates'
import { applyMaxCaps, getMaxStats } from './progression'
import type { PlayerState } from './types'

/** Mirrors App shop search (empty query = match all). */
function shopTextMatches(query: string, ...texts: string[]): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return texts.some((t) => t.toLowerCase().includes(needle))
}

/**
 * Runs the same hot paths the game screen hits on first paint (stats, combat skills,
 * full catalog filtering) so JIT/layout cost lands before the transition instead of on it.
 */
export function warmGameCaches(saved: PlayerState | null): void {
  if (saved) {
    const p = applyMaxCaps(saved)
    getMaxStats(p)
    getEffectiveStats(p)
    getCombatSkillEntries(p)
  }

  const q = ''
  SHOP_CONSUMABLES.filter((c) => shopTextMatches(q, c.name, c.description))
  SHOP_UPGRADES.filter((u) => shopTextMatches(q, u.name, u.description))
  SHOP_STAT_TOMES.filter((t) => shopTextMatches(q, t.name, t.description))
  GEAR_CATALOG.filter((g) =>
    shopTextMatches(
      q,
      g.name,
      g.description,
      EQUIPMENT_SLOT_LABELS[g.slot],
      GEAR_ARCHETYPE_LABELS[g.archetype],
      g.skill.name,
    ),
  )
}
