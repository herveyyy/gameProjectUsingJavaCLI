import { COMBAT_GEAR_SLOT_ORDER, GEAR_BY_ID } from './gear'
import type { EquipmentSlotId, GearFacetRuntime, GearItemDef, PlayerState } from './types'

export function facetRuntimeFromDef(def: GearItemDef): GearFacetRuntime | null {
  if (!def.facets?.length) return null
  const run: GearFacetRuntime = {}
  let reviveFrac = 0.5
  for (const f of def.facets) {
    if (f.kind === 'revive') {
      run.revive = (run.revive ?? 0) + f.charges
      reviveFrac = Math.max(reviveFrac, f.reviveHpFraction ?? 0.5)
    } else if (f.kind === 'stun_ward') {
      run.stunWard = (run.stunWard ?? 0) + f.charges
    }
  }
  if (run.revive != null && run.revive > 0) run.reviveHpFrac = reviveFrac
  return Object.keys(run).length ? run : null
}

function clampRuntime(run: GearFacetRuntime, max: GearFacetRuntime): GearFacetRuntime {
  const out: GearFacetRuntime = {}
  if (max.revive != null) {
    out.revive = Math.min(max.revive, Math.max(0, run.revive ?? max.revive))
    if (max.reviveHpFrac != null) out.reviveHpFrac = max.reviveHpFrac
  }
  if (max.stunWard != null) {
    out.stunWard = Math.min(max.stunWard, Math.max(0, run.stunWard ?? max.stunWard))
  }
  return out
}

/** After equipping / unequipping: preserve charges when the same gear id stays in the slot. */
/** Load / validate saves — fill missing facet slots and clamp to gear defs. */
export function sanitizeEquipmentFacetCharges(player: PlayerState): PlayerState {
  const fc = player.equipmentFacetCharges ?? {}
  const out: Partial<Record<EquipmentSlotId, GearFacetRuntime>> = {}
  for (const slot of COMBAT_GEAR_SLOT_ORDER) {
    const gid = player.equipment[slot]
    if (!gid) continue
    const def = GEAR_BY_ID[gid]
    const maxRun = facetRuntimeFromDef(def)
    if (!maxRun) continue
    const saved = fc[slot]
    out[slot] = saved ? clampRuntime(saved, maxRun) : maxRun
  }
  return { ...player, equipmentFacetCharges: out }
}

export function syncEquipmentFacetCharges(prev: PlayerState, next: PlayerState): PlayerState {
  const prevF = prev.equipmentFacetCharges ?? {}
  const out: Partial<Record<EquipmentSlotId, GearFacetRuntime>> = {}
  for (const slot of COMBAT_GEAR_SLOT_ORDER) {
    const gid = next.equipment[slot]
    if (!gid) continue
    const def = GEAR_BY_ID[gid]
    const maxRun = facetRuntimeFromDef(def)
    if (!maxRun) continue
    const oldGid = prev.equipment[slot]
    const preserved = oldGid === gid ? prevF[slot] : undefined
    out[slot] = preserved ? clampRuntime(preserved, maxRun) : maxRun
  }
  return { ...next, equipmentFacetCharges: out }
}

export function tryConsumeReviveFacet(
  player: PlayerState,
  maxHp: number,
): { player: PlayerState; hp: number } | null {
  const fc = player.equipmentFacetCharges ?? {}
  for (const slot of COMBAT_GEAR_SLOT_ORDER) {
    const slotRun = fc[slot]
    if (!slotRun?.revive || slotRun.revive <= 0) continue
    const id = player.equipment[slot]
    if (!id) continue
    const nextFc = { ...fc }
    const ch = { ...slotRun }
    ch.revive = (ch.revive ?? 0) - 1
    if (ch.revive <= 0) {
      delete ch.revive
      delete ch.reviveHpFrac
    }
    if (!ch.revive && !ch.stunWard) delete nextFc[slot]
    else nextFc[slot] = ch

    const frac = slotRun.reviveHpFrac ?? 0.5
    const hp = Math.max(1, Math.floor(maxHp * frac))
    return {
      player: { ...player, equipmentFacetCharges: nextFc, hp },
      hp,
    }
  }
  return null
}

export function tryConsumeStunWardFacet(player: PlayerState): {
  player: PlayerState
  consumed: boolean
  slot?: EquipmentSlotId
} {
  const fc = player.equipmentFacetCharges ?? {}
  for (const slot of COMBAT_GEAR_SLOT_ORDER) {
    const slotRun = fc[slot]
    if (!slotRun?.stunWard || slotRun.stunWard <= 0) continue
    const id = player.equipment[slot]
    if (!id) continue

    const nextFc = { ...fc }
    const ch = { ...slotRun }
    ch.stunWard = (ch.stunWard ?? 0) - 1
    if (ch.stunWard <= 0) delete ch.stunWard
    if (!ch.revive && !ch.stunWard) delete nextFc[slot]
    else nextFc[slot] = ch

    return { player: { ...player, equipmentFacetCharges: nextFc }, consumed: true, slot }
  }
  return { player, consumed: false }
}

/** Short UI line for remaining facet charges on worn gear (PvP / combat HUD). */
export function formatEquippedFacetRuntimeSummary(player: PlayerState): string | null {
  const fc = player.equipmentFacetCharges ?? {}
  const parts: string[] = []
  for (const slot of COMBAT_GEAR_SLOT_ORDER) {
    const gid = player.equipment[slot]
    const run = fc[slot]
    if (!gid || !run) continue
    const gearName = GEAR_BY_ID[gid]?.name ?? slot
    const bits: string[] = []
    if (run.revive != null && run.revive > 0) {
      const pct = run.reviveHpFrac != null ? Math.round(run.reviveHpFrac * 100) : 50
      bits.push(`Revive ×${run.revive} (~${pct}% HP)`)
    }
    if (run.stunWard != null && run.stunWard > 0) bits.push(`Stun Ward ×${run.stunWard}`)
    if (bits.length) parts.push(`${gearName}: ${bits.join(', ')}`)
  }
  return parts.length ? parts.join(' · ') : null
}
