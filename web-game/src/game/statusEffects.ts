import type {
  BattleState,
  CombatStatusEntry,
  SkillDef,
  StatusApply,
  StatusEffectId,
} from './types'

export type { StatusEffectId, CombatStatusEntry, StatusApply } from './types'

export type StatusKind = 'dot' | 'control' | 'buff'

export const STATUS_META: Record<
  StatusEffectId,
  { label: string; kind: StatusKind; defaultPotency: number; verb: string }
> = {
  burning: { label: 'Burning', kind: 'dot', defaultPotency: 4, verb: 'Burn' },
  poisoned: { label: 'Poisoned', kind: 'dot', defaultPotency: 3, verb: 'Poison' },
  bleeding: { label: 'Bleeding', kind: 'dot', defaultPotency: 3, verb: 'Bleed' },
  chilled: { label: 'Chilled', kind: 'dot', defaultPotency: 2, verb: 'Chill' },
  stunned: { label: 'Stunned', kind: 'control', defaultPotency: 0, verb: 'Stun' },
  shielded: { label: 'Shielded', kind: 'buff', defaultPotency: 15, verb: 'Shield' },
  empowered: { label: 'Empowered', kind: 'buff', defaultPotency: 6, verb: 'Empower' },
}

export function formatStatusLine(entry: CombatStatusEntry): string {
  const m = STATUS_META[entry.id]
  if (!m) return entry.id
  if (m.kind === 'dot' || entry.id === 'shielded' || entry.id === 'empowered') {
    const p = entry.potency ?? m.defaultPotency
    return `${m.label} (${entry.turns}t · ${p})`
  }
  return `${m.label} (${entry.turns}t)`
}

function potencyFor(a: StatusApply): number {
  return a.potency ?? STATUS_META[a.id]?.defaultPotency ?? 0
}

/** Merge into list: same id refreshes duration; potency uses max where relevant. */
export function mergeStatuses(current: CombatStatusEntry[], add: StatusApply[]): CombatStatusEntry[] {
  const map = new Map<StatusEffectId, CombatStatusEntry>()
  for (const e of current) map.set(e.id, { ...e })

  for (const a of add) {
    const pot = potencyFor(a)
    const prev = map.get(a.id)
    const meta = STATUS_META[a.id]
    if (!prev) {
      map.set(a.id, { id: a.id, turns: a.turns, potency: pot })
    } else {
      const turns = Math.max(prev.turns, a.turns)
      let potency = prev.potency
      if (meta?.kind === 'dot' || a.id === 'shielded' || a.id === 'empowered') {
        potency = Math.max(prev.potency ?? 0, pot)
      }
      map.set(a.id, { ...prev, turns, potency })
    }
  }
  return [...map.values()]
}

function isDot(id: StatusEffectId): boolean {
  return STATUS_META[id]?.kind === 'dot'
}

export interface TickResult {
  battle: BattleState
  lines: string[]
}

export interface TwoSideTickState {
  aHp: number
  bHp: number
  aStatuses: CombatStatusEntry[]
  bStatuses: CombatStatusEntry[]
}

/** DoT damage + duration on dots; then decay buffs/debuffs except stun (skip turn) and empowered (spent on attack). */
export function tickTwoSideStatuses(
  input: TwoSideTickState,
  labels: { a: string; b: string },
): { state: TwoSideTickState; lines: string[] } {
  const lines: string[] = []
  let aHp = input.aHp
  let bHp = input.bHp

  const tickSide = (
    statuses: CombatStatusEntry[],
    applyHp: (d: number) => void,
    who: string,
  ): CombatStatusEntry[] => {
    const next: CombatStatusEntry[] = []
    for (const s of statuses) {
      if (isDot(s.id)) {
        const dmg = s.potency ?? STATUS_META[s.id].defaultPotency
        if (dmg > 0) {
          applyHp(dmg)
          lines.push(`${STATUS_META[s.id].verb}: ${who} takes ${dmg}.`)
        }
        const t = s.turns - 1
        if (t > 0) next.push({ ...s, turns: t })
      } else {
        next.push(s)
      }
    }
    return next
  }

  let aS = tickSide(
    input.aStatuses,
    (d) => {
      aHp = Math.max(0, aHp - d)
    },
    labels.a,
  )
  let bS = tickSide(
    input.bStatuses,
    (d) => {
      bHp = Math.max(0, bHp - d)
    },
    labels.b,
  )

  const decOther = (statuses: CombatStatusEntry[]) => {
    const out: CombatStatusEntry[] = []
    for (const s of statuses) {
      if (isDot(s.id)) {
        out.push(s)
        continue
      }
      if (s.id === 'stunned' || s.id === 'empowered') {
        out.push(s)
        continue
      }
      const t = s.turns - 1
      if (t > 0) out.push({ ...s, turns: t })
    }
    return out
  }

  aS = decOther(aS)
  bS = decOther(bS)

  return {
    state: { aHp, bHp, aStatuses: aS, bStatuses: bS },
    lines,
  }
}

/** Start of player offensive phase: DoT ticks, then decrement durations for control/buffs. */
export function tickBattleStatuses(battle: BattleState): TickResult {
  const r = tickTwoSideStatuses(
    {
      aHp: battle.playerHp,
      bHp: battle.enemyHp,
      aStatuses: playerS(battle),
      bStatuses: enemyS(battle),
    },
    { a: 'You', b: 'Foe' },
  )
  return {
    battle: {
      ...battle,
      playerHp: r.state.aHp,
      enemyHp: r.state.bHp,
      playerStatuses: r.state.aStatuses,
      enemyStatuses: r.state.bStatuses,
    },
    lines: r.lines,
  }
}

function playerS(b: BattleState): CombatStatusEntry[] {
  return b.playerStatuses ?? []
}

function enemyS(b: BattleState): CombatStatusEntry[] {
  return b.enemyStatuses ?? []
}

export function hasStun(statuses: CombatStatusEntry[]): boolean {
  return statuses.some((s) => s.id === 'stunned' && s.turns > 0)
}

export function consumeStunSkip(statuses: CombatStatusEntry[]): CombatStatusEntry[] {
  return statuses
    .map((s) => {
      if (s.id !== 'stunned') return s
      const t = s.turns - 1
      return t > 0 ? { ...s, turns: t } : null
    })
    .filter((x): x is CombatStatusEntry => x !== null)
}

export function absorbDamageWithShield(
  statuses: CombatStatusEntry[],
  rawDamage: number,
): { damageToHp: number; statuses: CombatStatusEntry[] } {
  const shieldIdx = statuses.findIndex((s) => s.id === 'shielded' && (s.potency ?? 0) > 0)
  if (shieldIdx < 0 || rawDamage <= 0) {
    return { damageToHp: rawDamage, statuses }
  }
  const copy = [...statuses]
  const sh = copy[shieldIdx]!
  let pool = sh.potency ?? 0
  const absorbed = Math.min(pool, rawDamage)
  pool -= absorbed
  const toHp = rawDamage - absorbed
  if (pool <= 0) copy.splice(shieldIdx, 1)
  else copy[shieldIdx] = { ...sh, potency: pool }
  return { damageToHp: toHp, statuses: copy }
}

export function consumeEmpoweredBonus(statuses: CombatStatusEntry[]): { bonus: number; statuses: CombatStatusEntry[] } {
  const idx = statuses.findIndex((s) => s.id === 'empowered' && s.turns > 0)
  if (idx < 0) return { bonus: 0, statuses }
  const copy = [...statuses]
  const e = copy[idx]!
  const bonus = e.potency ?? STATUS_META.empowered.defaultPotency
  const t = e.turns - 1
  if (t <= 0) copy.splice(idx, 1)
  else copy[idx] = { ...e, turns: t }
  return { bonus, statuses: copy }
}

export function splitSkillStatuses(skill: SkillDef): { onEnemy: StatusApply[]; onSelf: StatusApply[] } {
  return {
    onEnemy: skill.statusOnHit?.target ? [...skill.statusOnHit.target] : [],
    onSelf: skill.statusOnHit?.self ? [...skill.statusOnHit.self] : [],
  }
}
