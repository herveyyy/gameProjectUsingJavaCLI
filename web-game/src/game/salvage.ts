import type { PlayerState } from './types'

export interface SalvageItemDef {
  id: string
  name: string
  description: string
  /** Gold when sold to the merchant. */
  sellPrice: number
  /** Only eligible when battle mob id >= this. */
  minMob: number
  /** Relative pick weight within the eligible pool. */
  weight: number
}

export const SALVAGE_CATALOG: readonly SalvageItemDef[] = [
  {
    id: 'salvage_slime_gel',
    name: 'Slime Gel',
    description: 'Tacky and faintly sour.',
    sellPrice: 2,
    minMob: 1,
    weight: 4,
  },
  {
    id: 'salvage_wispy_fur',
    name: 'Wispy Fur',
    description: 'Barely enough to stitch a glove.',
    sellPrice: 3,
    minMob: 2,
    weight: 4,
  },
  {
    id: 'salvage_cracked_tooth',
    name: 'Cracked Fang',
    description: 'Still sharp at one end.',
    sellPrice: 5,
    minMob: 3,
    weight: 3,
  },
  {
    id: 'salvage_boar_tusk',
    name: 'Boar Tusk',
    description: 'Yellow ivory scored by mud.',
    sellPrice: 8,
    minMob: 5,
    weight: 3,
  },
  {
    id: 'salvage_bandit_sigil',
    name: 'Tarnished Sigil',
    description: 'Someone’s road-tax badge.',
    sellPrice: 10,
    minMob: 6,
    weight: 2,
  },
  {
    id: 'salvage_troll_chip',
    name: 'Stone Chip',
    description: 'Flaked from a club impact.',
    sellPrice: 14,
    minMob: 7,
    weight: 2,
  },
  {
    id: 'salvage_frost_shard',
    name: 'Frost Shard',
    description: 'Cold long after the kill.',
    sellPrice: 18,
    minMob: 8,
    weight: 2,
  },
  {
    id: 'salvage_spider_silk',
    name: 'Web Silk Clump',
    description: 'Strong if you can untangle it.',
    sellPrice: 16,
    minMob: 10,
    weight: 2,
  },
  {
    id: 'salvage_grave_rust',
    name: 'Grave Rust',
    description: 'Flakes off armor like dried blood.',
    sellPrice: 22,
    minMob: 11,
    weight: 2,
  },
  {
    id: 'salvage_obsidian_splinter',
    name: 'Obsidian Splinter',
    description: 'Glass-black and whisper-thin.',
    sellPrice: 28,
    minMob: 13,
    weight: 2,
  },
  {
    id: 'salvage_void_dust',
    name: 'Void Dust',
    description: 'Falls upward if you drop it wrong.',
    sellPrice: 35,
    minMob: 15,
    weight: 1,
  },
]

export const SALVAGE_BY_ID: Readonly<Record<string, SalvageItemDef>> = Object.fromEntries(
  SALVAGE_CATALOG.map((s) => [s.id, s]),
)

/** Extra stackable junk roll — independent of gear salvage drops. */
export function rollSalvageLoot(mobId: number): string | null {
  const baseChance = 0.2 + mobId * 0.018
  const chance = Math.min(0.48, baseChance)
  if (Math.random() >= chance) return null

  const pool = SALVAGE_CATALOG.filter((s) => s.minMob <= mobId)
  if (pool.length < 1) return null

  const totalW = pool.reduce((a, s) => a + s.weight, 0)
  let r = Math.random() * totalW
  for (const s of pool) {
    r -= s.weight
    if (r <= 0) return s.id
  }
  return pool[pool.length - 1]!.id
}

export function addSalvageStacks(player: PlayerState, itemId: string, qty: number): PlayerState {
  if (qty < 1) return player
  const cur = player.salvageLoot[itemId] ?? 0
  return {
    ...player,
    salvageLoot: { ...player.salvageLoot, [itemId]: cur + qty },
  }
}
