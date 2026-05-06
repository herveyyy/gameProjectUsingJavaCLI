import type { PlayerState } from './types'

export type InnateRank = 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS'

export type InnateEffect =
  | { type: 'flatDamage'; amount: number }
  | { type: 'percentDamage'; percent: number }
  | { type: 'statBonus'; strength?: number; agility?: number; intelligence?: number }
  /** Enemy melee turn deals no damage (always evade). */
  | { type: 'perfectDodge' }
  | { type: 'dodgeChance'; percent: number }
  /** Heal for % of HP damage you deal to foes after shields (PvE / PvP). */
  | { type: 'lifeSteal'; percent: number }
  /** When enemy cuts your HP, echo % of that loss back as bonus damage to them (PvE). */
  | { type: 'thornAura'; percent: number }
  /** Multiplier on HP lost from enemy blows — stacks multiplicatively (e.g. 0.85 = 15% less taken). */
  | { type: 'sanctuary'; damageTakenMul: number }
  /** Random rupture — strike damage multiplied when it fires (disaster-tier offensive). */
  | { type: 'cataclysmSurge'; procChance: number; bonusDamagePercent: number }

export interface InnateDef {
  id: string
  name: string
  rank: InnateRank
  description: string
  effect: InnateEffect
  /** Higher tiers often bundle multiple miracles — each stacks independently. */
  extraEffects?: readonly InnateEffect[]
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
    description: 'Violence feeds itself — your wrath leaks lifeforce back.',
    effect: { type: 'percentDamage', percent: 20 },
    extraEffects: [{ type: 'lifeSteal', percent: 7 }],
  },
  {
    id: 'innate_s_nullstep',
    name: 'Nullstep',
    rank: 'S',
    description: 'Exist between beats — weapons disagree with reality.',
    effect: { type: 'perfectDodge' },
  },
  {
    id: 'innate_ss_world',
    name: 'Worldbreaker Echo',
    rank: 'SS',
    description: 'Echoes of extinction — mass quakes; blood pays tithe.',
    effect: { type: 'statBonus', strength: 4, agility: 2 },
    extraEffects: [
      { type: 'lifeSteal', percent: 6 },
      { type: 'cataclysmSurge', procChance: 9, bonusDamagePercent: 55 },
    ],
  },
  {
    id: 'innate_ss_after',
    name: 'Afterimage Law',
    rank: 'SS',
    description: 'You leave behind jurisprudence that eats strikes.',
    effect: { type: 'perfectDodge' },
    extraEffects: [{ type: 'sanctuary', damageTakenMul: 0.93 }],
  },
  {
    id: 'innate_sss_infinity',
    name: 'Infinity Stride',
    rank: 'SSS',
    description: 'Linear time forfeits — nothing connects unless you permit it.',
    effect: { type: 'perfectDodge' },
  },
  {
    id: 'innate_sss_cataclysm',
    name: 'Cataclysm Spark',
    rank: 'SSS',
    description: 'Creation’s backup spark — sometimes the world doubles your verdict.',
    effect: { type: 'percentDamage', percent: 26 },
    extraEffects: [{ type: 'cataclysmSurge', procChance: 16, bonusDamagePercent: 120 }],
  },
  {
    id: 'innate_f_sparktongue',
    name: 'Spark Tongue',
    rank: 'F',
    description: 'Words taste like copper — cantrips bite harder.',
    effect: { type: 'statBonus', intelligence: 1 },
  },
  {
    id: 'innate_f_pebbleluck',
    name: 'Pebble Luck',
    rank: 'F',
    description: 'Tiny stones find kidneys.',
    effect: { type: 'flatDamage', amount: 2 },
  },
  {
    id: 'innate_e_coppermind',
    name: 'Copper Mind',
    rank: 'E',
    description: 'Cheap metal still conducts intent.',
    effect: { type: 'statBonus', intelligence: 1 },
  },
  {
    id: 'innate_e_brambleskin',
    name: 'Bramble Skin',
    rank: 'E',
    description: 'Thorns catch swings meant for organs.',
    effect: { type: 'dodgeChance', percent: 6 },
  },
  {
    id: 'innate_d_arcwell',
    name: 'Arc Well',
    rank: 'D',
    description: 'Mana-shaped scar tissue amplifies output.',
    effect: { type: 'percentDamage', percent: 10 },
  },
  {
    id: 'innate_d_ledgereye',
    name: 'Ledger Eye',
    rank: 'D',
    description: 'You read weaknesses like totals.',
    effect: { type: 'statBonus', intelligence: 2 },
  },
  {
    id: 'innate_c_twinpulse',
    name: 'Twin Pulse',
    rank: 'C',
    description: 'Two heartbeats race — pick the faster blade.',
    effect: { type: 'statBonus', strength: 1, agility: 1 },
  },
  {
    id: 'innate_c_mistwalker',
    name: 'Mist Walker',
    rank: 'C',
    description: 'Fog remembers your outline wrong.',
    effect: { type: 'dodgeChance', percent: 18 },
  },
  {
    id: 'innate_b_spellbreaker',
    name: 'Spellbreaker Tilt',
    rank: 'B',
    description: 'Angles that punish arrogance.',
    effect: { type: 'percentDamage', percent: 16 },
  },
  {
    id: 'innate_b_mirrorveins',
    name: 'Mirror Veins',
    rank: 'B',
    description: 'Blood routes strikes into reflections.',
    effect: { type: 'dodgeChance', percent: 26 },
  },
  {
    id: 'innate_a_archon',
    name: 'Archon Echo',
    rank: 'A',
    description: 'Borrowed lecture halls still thunder.',
    effect: { type: 'statBonus', intelligence: 3 },
  },
  {
    id: 'innate_a_hurricane',
    name: 'Hurricane Step',
    rank: 'A',
    description: 'Feet dispute ownership of the floor.',
    effect: { type: 'dodgeChance', percent: 38 },
  },
  {
    id: 'innate_s_ruin_atlas',
    name: 'Ruin Atlas',
    rank: 'S',
    description: 'Continents crack along your intent — ruin sometimes doubles.',
    effect: { type: 'percentDamage', percent: 17 },
    extraEffects: [{ type: 'cataclysmSurge', procChance: 10, bonusDamagePercent: 72 }],
  },
  {
    id: 'innate_s_phantom_law',
    name: 'Phantom Legislation',
    rank: 'S',
    description: 'Laws are ink — harm refunds as spectral verdicts.',
    effect: { type: 'thornAura', percent: 14 },
    extraEffects: [{ type: 'sanctuary', damageTakenMul: 0.9 }],
  },
  {
    id: 'innate_ss_lattice',
    name: 'Lattice Mind',
    rank: 'SS',
    description: 'Conceptual scaffolding — you steal momentum from outcomes.',
    effect: { type: 'statBonus', intelligence: 4 },
    extraEffects: [{ type: 'lifeSteal', percent: 11 }],
  },
  {
    id: 'innate_ss_mirage',
    name: 'Mirage Crown',
    rank: 'SS',
    description: 'Illusions bleed — attackers pay for every hallucination.',
    effect: { type: 'dodgeChance', percent: 38 },
    extraEffects: [{ type: 'thornAura', percent: 11 }, { type: 'sanctuary', damageTakenMul: 0.94 }],
  },
  {
    id: 'innate_sss_omniplex',
    name: 'Omniplex Soul',
    rank: 'SSS',
    description: 'God-chart symmetry — all stats sing; violence tithes back.',
    effect: { type: 'statBonus', strength: 3, agility: 3, intelligence: 3 },
    extraEffects: [
      { type: 'lifeSteal', percent: 9 },
      { type: 'sanctuary', damageTakenMul: 0.87 },
    ],
  },
  {
    id: 'innate_sss_annihilation',
    name: 'Annihilation Chorus',
    rank: 'SSS',
    description: 'When the choir peaks, causality pays interest in blood and thunder.',
    effect: { type: 'percentDamage', percent: 22 },
    extraEffects: [
      { type: 'lifeSteal', percent: 13 },
      { type: 'thornAura', percent: 17 },
      { type: 'cataclysmSurge', procChance: 12, bonusDamagePercent: 105 },
    ],
  },
]

export const INNATE_BY_ID: Readonly<Record<string, InnateDef>> = Object.fromEntries(
  INNATE_CATALOG.map((i) => [i.id, i]),
)

/** Primary + optional stacked effects (S+ gifts). */
export function allEffectsForDef(def: InnateDef): InnateEffect[] {
  return def.extraEffects?.length ? [def.effect, ...def.extraEffects] : [def.effect]
}

function forEachInnateEffect(player: PlayerState, fn: (e: InnateEffect) => void): void {
  for (const id of player.innates) {
    const def = INNATE_BY_ID[id]
    if (!def) continue
    for (const e of allEffectsForDef(def)) fn(e)
  }
}

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
  forEachInnateEffect(player, (e) => {
    if (e.type !== 'statBonus') return
    strength += e.strength ?? 0
    agility += e.agility ?? 0
    intelligence += e.intelligence ?? 0
  })
  return { strength, agility, intelligence }
}

/** Apply flat + percent damage modifiers from all innates (after base skill math). */
export function applyInnateDamageBonuses(player: PlayerState, baseDamage: number): number {
  let v = baseDamage
  let pct = 0
  forEachInnateEffect(player, (effect) => {
    if (effect.type === 'flatDamage') v += effect.amount
    else if (effect.type === 'percentDamage') pct += effect.percent
  })
  if (pct !== 0) v *= 1 + pct / 100
  return v
}

export function aggregateLifeStealPercent(player: PlayerState): number {
  let s = 0
  forEachInnateEffect(player, (e) => {
    if (e.type === 'lifeSteal') s += e.percent
  })
  return Math.min(40, s)
}

export function aggregateThornReflectPercent(player: PlayerState): number {
  let s = 0
  forEachInnateEffect(player, (e) => {
    if (e.type === 'thornAura') s += e.percent
  })
  return Math.min(45, s)
}

/** Product of sanctuary multipliers — stacks multiplicatively; clamped so hits never fully vanish. */
export function aggregateSanctuaryTakenMul(player: PlayerState): number {
  let m = 1
  forEachInnateEffect(player, (e) => {
    if (e.type === 'sanctuary') m *= e.damageTakenMul
  })
  return Math.max(0.52, Math.min(1, m))
}

export function applySurgeToOutgoingDamage(
  player: PlayerState,
  rawDamage: number,
): { damage: number; surgeLabel: string | null } {
  let procChance = 0
  let bonusSum = 0
  forEachInnateEffect(player, (e) => {
    if (e.type === 'cataclysmSurge') {
      procChance += e.procChance
      bonusSum += e.bonusDamagePercent
    }
  })
  procChance = Math.min(42, procChance)
  if (bonusSum <= 0 || procChance <= 0) return { damage: rawDamage, surgeLabel: null }
  if (Math.random() * 100 >= procChance) return { damage: rawDamage, surgeLabel: null }
  const mul = Math.min(3.4, 1 + bonusSum / 100)
  return { damage: rawDamage * mul, surgeLabel: 'REALITY SURGE' }
}

/** If false, enemy deals no damage this turn (dodge / perfect evade). */
export function enemyAttackHits(player: PlayerState): boolean {
  let perfect = false
  forEachInnateEffect(player, (e) => {
    if (e.type === 'perfectDodge') perfect = true
  })
  if (perfect) return false
  let missChance = 0
  forEachInnateEffect(player, (e) => {
    if (e.type === 'dodgeChance') missChance += e.percent
  })
  missChance = Math.min(95, missChance)
  if (missChance > 0 && Math.random() * 100 < missChance) return false
  return true
}
