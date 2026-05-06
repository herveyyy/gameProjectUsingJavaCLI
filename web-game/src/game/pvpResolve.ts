import { getCombatSkillEntries, wearGearSlot, wearPerAttackUse } from './gear'
import {
  applyMaxCaps,
  getEffectiveManaCost,
  getEffectiveSkillDamage,
  getEffectiveStaminaCost,
} from './progression'
import { absorbDamageWithShield } from './statusEffects'
import type { CombatStatusEntry, PlayerState } from './types'

/** First player at or below this HP loses (no KO — rubber-band duel). */
export const PVP_HP_LOSS_THRESHOLD = 10

export function pvpHostStrikesFirst(hostAgility: number, guestAgility: number): boolean {
  if (hostAgility !== guestAgility) return hostAgility > guestAgility
  return true
}

export interface PvpStrikeResult {
  attackerAfter: PlayerState
  /** HP lost after shields absorb part of the hit. */
  damage: number
  defenderHpAfter: number
  /** Present when shield absorption ran (PvP). */
  defenderStatusesAfter?: CombatStatusEntry[]
}

/**
 * Apply one PvP strike: attacker spends resources & gear wear; defender loses HP.
 * No random dodge in PvP (deterministic).
 */
export function applyPvpStrike(
  attacker: PlayerState,
  defenderHp: number,
  skillIndex: number,
  bonusDamage = 0,
  defenderStatuses?: CombatStatusEntry[],
): PvpStrikeResult | null {
  const entries = getCombatSkillEntries(attacker)
  const entry = entries[skillIndex]
  if (!entry) return null

  const sk = entry.skill
  const mpCost = getEffectiveManaCost(attacker, sk)
  const staCost = getEffectiveStaminaCost(attacker, sk)

  if (mpCost > attacker.mana + 1e-6 || staCost > attacker.stamina + 1e-6) return null

  let attackerAfter = applyMaxCaps({
    ...attacker,
    mana: attacker.mana - mpCost,
    stamina: attacker.stamina - staCost,
  })

  if (entry.kind === 'gear' && entry.slot) {
    attackerAfter = wearGearSlot(attackerAfter, entry.slot, wearPerAttackUse(sk))
  }

  const rawDamage = Math.max(0, Math.floor(getEffectiveSkillDamage(attacker, sk) + bonusDamage))

  if (defenderStatuses != null) {
    const abs = absorbDamageWithShield(defenderStatuses, rawDamage)
    const defenderHpAfter = Math.max(0, defenderHp - abs.damageToHp)
    return {
      attackerAfter,
      damage: abs.damageToHp,
      defenderHpAfter,
      defenderStatusesAfter: abs.statuses,
    }
  }

  const defenderHpAfter = Math.max(0, defenderHp - rawDamage)
  return { attackerAfter, damage: rawDamage, defenderHpAfter }
}

export function isPvpLossHp(hp: number): boolean {
  return hp <= PVP_HP_LOSS_THRESHOLD
}
