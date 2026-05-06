import { aggregateGearMitigation, defaultSkillDamageKind } from './combatMitigation'
import { getCombatSkillEntries, wearGearSlot, wearPerAttackUse } from './gear'
import {
  aggregateLifeStealPercent,
  aggregateSanctuaryTakenMul,
  applySurgeToOutgoingDamage,
} from './innates'
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
  /** HP healed on striker from innate life steal (duel pool cap handled by caller). */
  lifeStealHeal?: number
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
  defenderProfile?: PlayerState,
  attackerStatuses?: CombatStatusEntry[] | null,
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

  const skillGearId = entry.kind === 'gear' ? entry.gearId : undefined
  let dmg = getEffectiveSkillDamage(attacker, sk, attackerStatuses ?? null, skillGearId) + bonusDamage
  dmg = Math.floor(applySurgeToOutgoingDamage(attacker, dmg).damage)
  if (defenderProfile) {
    const kind = defaultSkillDamageKind(sk)
    const mit = aggregateGearMitigation(defenderProfile)
    const mul = kind === 'physical' ? mit.physicalTakenMul : mit.magicalTakenMul
    dmg = Math.floor(dmg * mul)
    dmg = Math.floor(dmg * aggregateSanctuaryTakenMul(defenderProfile))
  }
  const rawDamage = Math.max(0, dmg)

  if (defenderStatuses != null) {
    const abs = absorbDamageWithShield(defenderStatuses, rawDamage)
    const defenderHpAfter = Math.max(0, defenderHp - abs.damageToHp)
    const lsPct = aggregateLifeStealPercent(attacker)
    const lifeStealHeal =
      lsPct > 0 && abs.damageToHp > 0 ? Math.floor(abs.damageToHp * (lsPct / 100)) : 0
    return {
      attackerAfter,
      damage: abs.damageToHp,
      defenderHpAfter,
      defenderStatusesAfter: abs.statuses,
      lifeStealHeal: lifeStealHeal > 0 ? lifeStealHeal : undefined,
    }
  }

  const defenderHpAfter = Math.max(0, defenderHp - rawDamage)
  const lsPct = aggregateLifeStealPercent(attacker)
  const lifeStealHeal =
    lsPct > 0 && rawDamage > 0 ? Math.floor(rawDamage * (lsPct / 100)) : 0
  return {
    attackerAfter,
    damage: rawDamage,
    defenderHpAfter,
    lifeStealHeal: lifeStealHeal > 0 ? lifeStealHeal : undefined,
  }
}

export function isPvpLossHp(hp: number): boolean {
  return hp <= PVP_HP_LOSS_THRESHOLD
}
