import { aggregateGearMitigation } from './combatMitigation'
import { tryConsumeStunWardFacet } from './facets'
import { GEAR_BY_ID } from './gear'
import { hasImmuneBuff } from './statusEffects'
import type { CombatStatusEntry, EquipmentSlotId, PlayerState, StatusApply } from './types'

function slotGearName(player: PlayerState, slot: EquipmentSlotId | undefined): string {
  if (!slot) return 'gear'
  const id = player.equipment[slot]
  if (!id) return 'gear'
  return GEAR_BY_ID[id]?.name ?? 'gear'
}

/**
 * Mutates facet charges on player when a stun ward absorbs.
 * Order: Spellbound Aegis (immune) → stun ward facets → passive gear stun immunity.
 */
export function filterIncomingPlayerApplies(
  player: PlayerState,
  playerStatuses: CombatStatusEntry[],
  applies: StatusApply[],
): { player: PlayerState; applies: StatusApply[]; logs: string[] } {
  const logs: string[] = []
  let p = player
  let out = [...applies]

  if (!out.some((a) => a.id === 'stunned')) {
    return { player: p, applies: out, logs }
  }

  if (hasImmuneBuff(playerStatuses)) {
    out = out.filter((a) => a.id !== 'stunned')
    logs.push('Spellbound Aegis — stun ignored.')
    return { player: p, applies: out, logs }
  }

  const ward = tryConsumeStunWardFacet(p)
  p = ward.player
  if (ward.consumed) {
    out = out.filter((a) => a.id !== 'stunned')
    logs.push(`Stun Ward shatters on ${slotGearName(p, ward.slot)} — stun absorbed.`)
    return { player: p, applies: out, logs }
  }

  const mit = aggregateGearMitigation(p)
  const before = out.length
  out = out.filter((a) => !(a.id === 'stunned' && mit.stunImmune))
  if (out.length < before) logs.push('Your armor laughs off the stun.')

  return { player: p, applies: out, logs }
}
