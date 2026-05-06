import type { PlayerState } from './types'

export type InnateRank = 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS'

export type InnateEffect =
  | { type: 'flatDamage'; amount: number }
  | { type: 'percentDamage'; percent: number }
  | { type: 'statBonus'; strength?: number; agility?: number; intelligence?: number }
  /** Enemy melee turn deals no damage (always evade). */
  | { type: 'perfectDodge' }
  | { type: 'dodgeChance'; percent: number }

export interface InnateDef {
  id: string
  name: string
  rank: InnateRank
  description: string
  effect: InnateEffect
}

/** Weight index aligns with {@link RANK_ORDER} — higher index = rarer. */
const RANK_WEIGHTS = [3200, 2200, 1500, 1000, 700, 450, 200, 100, 50] as const

export const RANK_ORDER: readonly InnateRank[] = [
  'F',
  'E',
  'D',
  'C',
  'B',
  'A',
  'S',
  'SS',
  'SSS',
]

export const INNATE_CATALOG: readonly InnateDef[] = [
  {
    id: 'innate_f_scuff',
    name: 'Gravel Knuckles',
    rank: 'F',
    description: 'Slightly harder punches.',
    effect: { type: 'flatDamage', amount: 1 },
  },
  {
    id: 'innate_f_wind',
    name: 'Draft Sense',
    rank: 'F',
    description: 'Feel the air before a swing.',
    effect: { type: 'flatDamage', amount: 1 },
  },
  {
    id: 'innate_e_edge',
    name: 'Keen Eye',
    rank: 'E',
    description: 'Find the soft spot more often.',
    effect: { type: 'percentDamage', percent: 4 },
  },
  {
    id: 'innate_e_stubborn',
    name: 'Stubborn Sinews',
    rank: 'E',
    description: 'A little more muscle than you look.',
    effect: { type: 'statBonus', strength: 1 },
  },
  {
    id: 'innate_d_bloom',
    name: 'Second Wind Bloom',
    rank: 'D',
    description: 'Damage carries a touch more weight.',
    effect: { type: 'percentDamage', percent: 8 },
  },
  {
    id: 'innate_d_wire',
    name: 'Wire Reflex',
    rank: 'D',
    description: 'Sometimes the blow slides past.',
    effect: { type: 'dodgeChance', percent: 8 },
  },
  {
    id: 'innate_c_brawn',
    name: 'Lesser Giant Blood',
    rank: 'C',
    description: 'Hints of raw power.',
    effect: { type: 'statBonus', strength: 2 },
  },
  {
    id: 'innate_c_skip',
    name: 'Skipping Stone',
    rank: 'C',
    description: 'Often sidestep clean.',
    effect: { type: 'dodgeChance', percent: 15 },
  },
  {
    id: 'innate_b_surge',
    name: 'Surge Strikes',
    rank: 'B',
    description: 'Bursts of extra harm.',
    effect: { type: 'percentDamage', percent: 14 },
  },
  {
    id: 'innate_b_veil',
    name: 'Ash Veil',
    rank: 'B',
    description: 'Harder to pin down.',
    effect: { type: 'dodgeChance', percent: 22 },
  },
  {
    id: 'innate_a_titan',
    name: 'Titan Stripe',
    rank: 'A',
    description: 'True super-strength vein.',
    effect: { type: 'statBonus', strength: 3 },
  },
  {
    id: 'innate_a_volt',
    name: 'Volt Nerves',
    rank: 'A',
    description: 'Feints blur reality.',
    effect: { type: 'dodgeChance', percent: 35 },
  },
  {
    id: 'innate_s_wrath',
    name: 'Wrathbrand',
    rank: 'S',
    description: 'Heavy hits hit heavier.',
    effect: { type: 'percentDamage', percent: 22 },
  },
  {
    id: 'innate_s_nullstep',
    name: 'Nullstep',
    rank: 'S',
    description: 'Wrong-foot every stalker.',
    effect: { type: 'perfectDodge' },
  },
  {
    id: 'innate_ss_world',
    name: 'Worldbreaker Echo',
    rank: 'SS',
    description: 'Legendary might leaks through.',
    effect: { type: 'statBonus', strength: 4, agility: 2 },
  },
  {
    id: 'innate_ss_after',
    name: 'Afterimage Law',
    rank: 'SS',
    description: 'Foes swing at where you were.',
    effect: { type: 'perfectDodge' },
  },
  {
    id: 'innate_sss_infinity',
    name: 'Infinity Stride',
    rank: 'SSS',
    description: 'Agility so pure attackers rarely connect.',
    effect: { type: 'perfectDodge' },
  },
  {
    id: 'innate_sss_cataclysm',
    name: 'Cataclysm Spark',
    rank: 'SSS',
    description: 'Absurd destructive talent.',
    effect: { type: 'percentDamage', percent: 40 },
  },
]

export const INNATE_BY_ID: Readonly<Record<string, InnateDef>> = Object.fromEntries(
  INNATE_CATALOG.map((i) => [i.id, i]),
)

function weightedPickIndex(weights: readonly number[]): number {
  const sum = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * sum
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return i
  }
  return weights.length - 1
}

/** One weighted innate; caller may roll twice for the 0.001% twin gift. */
export function rollSingleBirthInnate(): string {
  const ri = weightedPickIndex(RANK_WEIGHTS)
  const rank = RANK_ORDER[ri] ?? 'F'
  const pool = INNATE_CATALOG.filter((i) => i.rank === rank)
  const pick = pool[Math.floor(Math.random() * pool.length)]
  return pick?.id ?? INNATE_CATALOG[0]!.id
}

/** Exactly one innate for almost everyone; second roll has 0.001% chance (gameplay lottery). */
export function rollBirthInnates(): string[] {
  const first = rollSingleBirthInnate()
  const out: string[] = [first]
  if (Math.random() < 0.00001) {
    let tries = 0
    let second = rollSingleBirthInnate()
    while (second === first && tries++ < 48) {
      second = rollSingleBirthInnate()
    }
    out.push(second)
  }
  return out
}

export function formatInnateShort(id: string): string {
  const d = INNATE_BY_ID[id]
  if (!d) return id
  return `${d.rank} · ${d.name}`
}

export function getEffectiveStats(player: PlayerState): {
  strength: number
  agility: number
  intelligence: number
} {
  let strength = player.stats.strength
  let agility = player.stats.agility
  let intelligence = player.stats.intelligence
  for (const id of player.innates) {
    const def = INNATE_BY_ID[id]
    if (!def || def.effect.type !== 'statBonus') continue
    const e = def.effect
    strength += e.strength ?? 0
    agility += e.agility ?? 0
    intelligence += e.intelligence ?? 0
  }
  return { strength, agility, intelligence }
}

/** Apply flat + percent damage modifiers from all innates (after base skill math). */
export function applyInnateDamageBonuses(player: PlayerState, baseDamage: number): number {
  let v = baseDamage
  let pct = 0
  for (const id of player.innates) {
    const def = INNATE_BY_ID[id]
    if (!def) continue
    const { effect } = def
    if (effect.type === 'flatDamage') v += effect.amount
    else if (effect.type === 'percentDamage') pct += effect.percent
  }
  if (pct !== 0) v *= 1 + pct / 100
  return v
}

/** If false, enemy deals no damage this turn (dodge / perfect evade). */
export function enemyAttackHits(player: PlayerState): boolean {
  for (const id of player.innates) {
    const def = INNATE_BY_ID[id]
    if (!def) continue
    const { effect } = def
    if (effect.type === 'perfectDodge') return false
  }
  let missChance = 0
  for (const id of player.innates) {
    const def = INNATE_BY_ID[id]
    if (!def || def.effect.type !== 'dodgeChance') continue
    missChance += def.effect.percent
  }
  missChance = Math.min(95, missChance)
  if (missChance > 0 && Math.random() * 100 < missChance) return false
  return true
}
