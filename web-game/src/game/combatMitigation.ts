import { COMBAT_GEAR_SLOT_ORDER, GEAR_BY_ID, resolveGearMitigation } from './gear'
import type { DamageKind, EnemyState, PlayerState, SkillDef, StatusApply } from './types'

/** When skill omits damageKind: MP-forward → magical, stamina-forward → physical. */
export function defaultSkillDamageKind(skill: SkillDef): DamageKind {
  if (skill.damageKind) return skill.damageKind
  const mc = skill.manaCost ?? 0
  const sc = skill.staminaCost ?? 0
  if (mc > 0 && sc === 0) return 'magical'
  if (mc === 0 && sc > 0) return 'physical'
  if (mc > sc) return 'magical'
  if (sc > mc) return 'physical'
  return mc > 0 ? 'magical' : 'physical'
}

export interface AggregatedMitigation {
  physicalTakenMul: number
  magicalTakenMul: number
  stunImmune: boolean
}

/** Stack multiplicative mitigation from every equipped piece. */
export function aggregateGearMitigation(player: PlayerState): AggregatedMitigation {
  let physicalTakenMul = 1
  let magicalTakenMul = 1
  let stunImmune = false
  for (const slot of COMBAT_GEAR_SLOT_ORDER) {
    const id = player.equipment[slot]
    if (!id) continue
    const g = GEAR_BY_ID[id]
    if (!g) continue
    const m = resolveGearMitigation(g)
    if (m.physicalTakenMul != null) physicalTakenMul *= m.physicalTakenMul
    if (m.magicalTakenMul != null) magicalTakenMul *= m.magicalTakenMul
    if (m.stunImmune) stunImmune = true
  }
  return { physicalTakenMul, magicalTakenMul, stunImmune }
}

/** Multiplier on damage you deal to this foe for this strike type. */
export function enemyTakenMultiplier(enemy: {
  physicalTakenMul?: number
  magicalTakenMul?: number
}, kind: DamageKind): number {
  const v = kind === 'physical' ? enemy.physicalTakenMul : enemy.magicalTakenMul
  return v != null && Number.isFinite(v) ? v : 1
}

/** Short combat-log suffix when matchup is not neutral. */
export function describeOutgoingAffinity(mult: number): string {
  if (mult >= 1.18) return 'Super effective!'
  if (mult <= 0.82) return 'Not very effective…'
  if (mult > 1.04) return 'Effective.'
  if (mult < 0.96) return 'Resisted.'
  return ''
}

/** Short label for incoming enemy strike after your gear. */
export function describeIncomingAffinity(mult: number): string {
  if (mult <= 0.82) return 'Resisted well.'
  if (mult >= 1.18) return 'Hit hard!'
  if (mult < 0.96) return 'Reduced.'
  if (mult > 1.04) return 'Painful.'
  return ''
}

export function filterStunApplies(list: StatusApply[], stunImmune: boolean): StatusApply[] {
  if (!stunImmune) return list
  return list.filter((s) => s.id !== 'stunned')
}

/** Enemy swing after your gear’s resist profile (before shield absorb). */
export function resolveIncomingDamageFromEnemy(
  enemy: EnemyState,
  player: PlayerState,
): {
  atkKind: DamageKind
  grossDamage: number
  affinityNote: string
  stunImmune: boolean
} {
  const mit = aggregateGearMitigation(player)
  const atkKind = enemy.attackKind ?? 'physical'
  const mul = atkKind === 'physical' ? mit.physicalTakenMul : mit.magicalTakenMul
  const grossDamage = Math.max(0, Math.floor(enemy.damage * mul))
  return {
    atkKind,
    grossDamage,
    affinityNote: describeIncomingAffinity(mul),
    stunImmune: mit.stunImmune,
  }
}
