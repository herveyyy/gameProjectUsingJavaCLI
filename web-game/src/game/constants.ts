import { COMBAT_GEAR_SLOT_ORDER, emptyPlayerEquipment, maxDurabilityForGearId } from './gear'
import { rollBirthInnates } from './innates'
import type {
  EnemyState,
  EquipmentSlotId,
  PlaceDef,
  PlayerEquipment,
  PlayerState,
  ShopConsumableDef,
  ShopStatTomeDef,
  ShopUpgradeDef,
} from './types'

/** Single template — no classes; growth comes from level, upgrades, and gear you can wear (stat gates). */
export const ADVENTURER_BASE = {
  hp: 100,
  stamina: 100,
  mana: 85,
  level: 1,
  gold: 24,
  stats: { strength: 3, agility: 3, intelligence: 3 },
} as const

export const MOBS = [
  null,
  { key: 1, display: 'Slime', hp: 20, skill: 'Smash', damage: 5 },
  { key: 2, display: 'Rabbit(Harmless)', hp: 10, skill: 'Do Nothing', damage: 0 },
  { key: 3, display: 'Wild Cat', hp: 15, skill: 'Cat Slash', damage: 6 },
  { key: 4, display: 'Wolf', hp: 25, skill: 'Sharp Claws', damage: 7 },
  { key: 5, display: 'Goblin', hp: 25, skill: 'Dagger Swipe', damage: 10 },
  { key: 6, display: 'Ironhide Boar', hp: 38, skill: 'Tusk Rush', damage: 13 },
  { key: 7, display: 'Highway Bandit', hp: 42, skill: 'Dirty Strike', damage: 15 },
  { key: 8, display: 'Cave Troll', hp: 58, skill: 'Boulder Toss', damage: 19 },
  { key: 9, display: 'Frost Wraith', hp: 48, skill: 'Chill Touch', damage: 17 },
  { key: 10, display: 'Frost Jarl', hp: 75, skill: 'Ice Cleaver', damage: 24 },
  { key: 11, display: 'Giant Spider', hp: 44, skill: 'Venom Bite', damage: 16 },
  { key: 12, display: 'Grave Knight', hp: 70, skill: 'Rusting Cleave', damage: 21 },
  { key: 13, display: 'Basilisk', hp: 74, skill: 'Stone Glare', damage: 23 },
  { key: 14, display: 'Stone Guardian', hp: 96, skill: 'Hammer Punch', damage: 27 },
  { key: 15, display: 'Crimson Vampire', hp: 82, skill: 'Drain Claw', damage: 26 },
  { key: 16, display: 'Storm Griffin', hp: 92, skill: 'Lightning Talon', damage: 30 },
  { key: 17, display: 'Ash Drake', hp: 108, skill: 'Molten Breath', damage: 33 },
  { key: 18, display: 'Void Herald', hp: 118, skill: 'Null Pulse', damage: 35 },
  /** Obsidian Depths region boss — drops mystic / legend weapons only. */
  { key: 19, display: 'Obsidian Tyrant', hp: 185, skill: 'Cataclysm Shear', damage: 44 },
  { key: 20, display: 'Rotwood Brambler', hp: 50, skill: 'Thorn Lash', damage: 17 },
  { key: 21, display: 'Drowned Courtier', hp: 48, skill: 'Salt Pull', damage: 17 },
  { key: 22, display: 'Ember Homunculus', hp: 44, skill: 'Cinder Dart', damage: 16 },
  { key: 23, display: 'Crown Asp', hp: 54, skill: 'Coil Fang', damage: 18 },
  { key: 24, display: 'Bog Ancient', hp: 168, skill: 'Root Tyranny', damage: 38 },
  { key: 25, display: 'Murk Reaver', hp: 56, skill: 'Silt Slash', damage: 18 },
  { key: 26, display: 'Iron Choir Knight', hp: 60, skill: 'Bell Strike', damage: 19 },
  { key: 27, display: 'Ash Stalker', hp: 58, skill: 'Ember Kick', damage: 19 },
  { key: 28, display: 'Tidebreaker Hydra', hp: 178, skill: 'Triple Spite', damage: 40 },
  { key: 29, display: 'Highland Raider', hp: 64, skill: 'Axe Descent', damage: 20 },
  { key: 30, display: 'Magma Skulk', hp: 68, skill: 'Slag Toss', damage: 21 },
  { key: 31, display: 'Glasswing Sentinel', hp: 72, skill: 'Prism Cut', damage: 22 },
  { key: 32, display: 'Ashfang Patriarch', hp: 192, skill: 'Molten Edict', damage: 42 },
  { key: 33, display: 'Bone Auditor', hp: 76, skill: 'Ledger Slam', damage: 23 },
  { key: 34, display: 'Veil Revenant', hp: 80, skill: 'Grave Pulse', damage: 24 },
  { key: 35, display: 'Storm Corsair', hp: 84, skill: 'Chain Bolt', damage: 25 },
  { key: 36, display: 'Catacomb Lich', hp: 208, skill: 'Soul Ledger', damage: 44 },
  { key: 37, display: 'Spire Archivist', hp: 88, skill: 'Index Bolt', damage: 26 },
  { key: 38, display: 'Astral Usurper', hp: 228, skill: 'Star Rivet', damage: 48 },
  { key: 39, display: 'Cloud Leviathan', hp: 94, skill: 'Pressure Bite', damage: 28 },
] as const

/** Primary legacy boss id (Obsidian Tyrant). {@link BOSS_MOB_IDS} lists all bosses. */
export const BOSS_MOB_ID = 19

/** Region bosses — mystic/legend relic drops; encounter ramp uses pools that include these ids. */
export const BOSS_MOB_IDS: readonly number[] = [19, 24, 28, 32, 36, 38]

const BOSS_MOB_SET = new Set(BOSS_MOB_IDS)

/** Regions — each has a mob pool and displayed recommended levels. */
export const PLACES: readonly PlaceDef[] = [
  {
    id: 'sunlit_meadow',
    name: 'Sunlit Meadow',
    shortName: 'the meadow',
    description: 'Soft grass and harmless critters. Ideal first steps.',
    levelRecommended: '1–2',
    levelMin: 1,
    levelMax: 2,
    mobPool: [2, 1],
  },
  {
    id: 'whisper_Wela',
    name: 'Whisper Wela',
    shortName: 'the Wela',
    description: 'Dense trees and the encounters you know from camp tales.',
    levelRecommended: '1–4',
    levelMin: 1,
    levelMax: 4,
    mobPool: [1, 2, 3],
  },
  {
    id: 'black_fen',
    name: 'Black Fen',
    shortName: 'the fen',
    description: 'Marsh gas and teeth. Tougher beasts roam here.',
    levelRecommended: '3–6',
    levelMin: 3,
    levelMax: 6,
    mobPool: [3, 4, 5, 11],
  },
  {
    id: 'ruined_tower',
    name: 'Ruined Tower',
    shortName: 'the ruins',
    description: 'Collapsed stone and bandits nesting in the stairwells.',
    levelRecommended: '5–9',
    levelMin: 5,
    levelMax: 9,
    mobPool: [4, 5, 6, 7, 11, 12, 13],
  },
  {
    id: 'frostpeak_pass',
    name: 'Frostpeak Pass',
    shortName: 'the pass',
    description: 'Thin air, ice, and things that do not forgive mistakes.',
    levelRecommended: '8–14',
    levelMin: 8,
    levelMax: 14,
    mobPool: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  },
  {
    id: 'obsidian_depths',
    name: 'Obsidian Depths',
    shortName: 'the depths',
    description: 'Glass-black caverns and things that end quests.',
    levelRecommended: '12–20',
    levelMin: 12,
    levelMax: 20,
    mobPool: [14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19],
  },
  {
    id: 'amber_glades',
    name: 'Amber Glades',
    shortName: 'the glades',
    description: 'Honeyed light through amber leaves — soft paths, sharp inhabitants.',
    levelRecommended: '4–8',
    levelMin: 4,
    levelMax: 8,
    mobPool: [5, 6, 11, 12, 20, 21, 24],
  },
  {
    id: 'sunken_court',
    name: 'Sunken Court',
    shortName: 'the court',
    description: 'Flooded halls where drowned banners still wave.',
    levelRecommended: '7–11',
    levelMin: 7,
    levelMax: 11,
    mobPool: [11, 12, 21, 22, 7, 23, 28],
  },
  {
    id: 'ember_highlands',
    name: 'Ember Highlands',
    shortName: 'the highlands',
    description: 'Ash wind and lava seams — the climb burns going up or down.',
    levelRecommended: '10–15',
    levelMin: 10,
    levelMax: 15,
    mobPool: [22, 14, 17, 26, 29, 30, 32],
  },
  {
    id: 'veilgrave_catacombs',
    name: 'Veilgrave Catacombs',
    shortName: 'Veilgrave',
    description: 'Stacked dead cities — something audits the ledger below.',
    levelRecommended: '13–18',
    levelMin: 13,
    levelMax: 18,
    mobPool: [12, 13, 31, 33, 34, 36],
  },
  {
    id: 'stormbreak_coast',
    name: 'Stormbreak Coast',
    shortName: 'the coast',
    description: 'Salt cliffs where lightning argues with the tide.',
    levelRecommended: '15–22',
    levelMin: 15,
    levelMax: 22,
    mobPool: [16, 17, 33, 34, 35, 35, 28],
  },
  {
    id: 'astral_spire',
    name: 'Astral Spire',
    shortName: 'the Spire',
    description: 'The stair rises through cloud — sky-things answer the bell.',
    levelRecommended: '18–28',
    levelMin: 18,
    levelMax: 28,
    mobPool: [17, 18, 37, 39, 38, 38],
  },
]

export function isBossMob(mobId: number): boolean {
  return BOSS_MOB_SET.has(mobId)
}

export const SHOP_CONSUMABLES: ShopConsumableDef[] = [
  {
    id: 'healthPotion',
    name: 'Red Tonic',
    description: 'Restore 40 HP (up to your max).',
    price: 25,
    icon: 'potion',
  },
  {
    id: 'manaDraught',
    name: 'Blue Tonic',
    description: 'Restore 35 MP.',
    price: 22,
    icon: 'vial',
  },
  {
    id: 'staminaBrew',
    name: 'Green Tonic',
    description: 'Restore 30 STA.',
    price: 18,
    icon: 'leaf',
  },
]

export const SHOP_UPGRADES: ShopUpgradeDef[] = [
  {
    id: 'vitality',
    name: 'Vitality',
    description: '+10 max HP per rank.',
    basePrice: 40,
    icon: 'heart',
  },
  {
    id: 'striking',
    name: 'Striking',
    description: '+1 skill damage per rank.',
    basePrice: 55,
    icon: 'sword',
  },
  {
    id: 'arcana',
    name: 'Arcana',
    description: '+12 max MP per rank.',
    basePrice: 48,
    icon: 'spark',
  },
  {
    id: 'endurance',
    name: 'Endurance',
    description: '+10 max STA per rank.',
    basePrice: 38,
    icon: 'wind',
  },
]

/** Maximum base STR / AGI / INT (level-ups and attribute tomes stop here). */
export const MAX_PLAYER_STAT = 999

/**
 * Gold for the next +1 on this stat via an attribute tome (current value before purchase).
 * Cost rises like Elden-style scaling — late points are a heavy gold sink.
 */
export function statTomePrice(currentStat: number): number {
  if (currentStat >= MAX_PLAYER_STAT) return Number.POSITIVE_INFINITY
  const s = Math.max(1, currentStat)
  return Math.max(18, Math.floor(22 + Math.pow(s, 1.28)))
}

export const SHOP_STAT_TOMES: readonly ShopStatTomeDef[] = [
  {
    id: 'strengthTome',
    stat: 'strength',
    name: 'Tome of Might',
    description: 'Permanently +1 Strength (base stat). Max 999 STR.',
    icon: 'book',
  },
  {
    id: 'agilityTome',
    stat: 'agility',
    name: 'Tome of Cinderswift',
    description: 'Permanently +1 Agility (base stat). Max 999 AGI.',
    icon: 'book',
  },
  {
    id: 'intelligenceTome',
    stat: 'intelligence',
    name: 'Tome of First Principles',
    description: 'Permanently +1 Intelligence (base stat). Max 999 INT.',
    icon: 'book',
  },
]

export function xpRequiredForNextLevel(level: number): number {
  return 45 + (level - 1) * 28
}

/** Legacy uniform roll over original five mobs — prefer {@link rollEncounterForPlace}. */
export function rollEncounter(): number {
  return Math.floor(Math.random() * 5) + 1
}

/**
 * Picks a mob from the region pool. When the pool includes the region boss, repeated fights
 * this expedition raise the chance that roll upgrades to the boss.
 */
export function rollEncounterForPlace(place: PlaceDef, expeditionFightsCompleted = 0): number {
  const pool = place.mobPool
  const bossesInPool = pool.filter((id) => isBossMob(id))
  let mobId = pool[Math.floor(Math.random() * pool.length)]!
  if (bossesInPool.length === 0) return mobId
  if (bossesInPool.includes(mobId)) return mobId
  const p = Math.min(0.78, 0.055 + expeditionFightsCompleted * 0.075)
  if (Math.random() < p) {
    return bossesInPool[Math.floor(Math.random() * bossesInPool.length)]!
  }
  return mobId
}

/** Free gear worn from the start — all meet starting stats (3 / 3 / 3). */
export const STARTER_FREE_KIT: Partial<Record<EquipmentSlotId, string>> = {
  ears: 'gear_pearl_earrings',
  neck: 'gear_chain_gorget',
  back: 'gear_travelers_cloak',
  legs: 'gear_cloth_trousers',
  feet: 'gear_boots_wander',
}

function starterEquipment(): PlayerEquipment {
  const eq = emptyPlayerEquipment()
  for (const slot of Object.keys(STARTER_FREE_KIT) as EquipmentSlotId[]) {
    const id = STARTER_FREE_KIT[slot]
    if (id) eq[slot] = id
  }
  return eq
}

function starterEquipmentDurability(eq: PlayerEquipment): Partial<Record<EquipmentSlotId, number>> {
  const d: Partial<Record<EquipmentSlotId, number>> = {}
  for (const slot of COMBAT_GEAR_SLOT_ORDER) {
    const id = eq[slot]
    if (id) d[slot] = maxDurabilityForGearId(id)
  }
  return d
}

export function buildPlayer(name: string): PlayerState {
  const def = ADVENTURER_BASE
  const equipment = starterEquipment()
  return {
    name,
    innates: rollBirthInnates(),
    hp: def.hp,
    stamina: def.stamina,
    mana: def.mana,
    level: def.level,
    gold: def.gold,
    xp: 0,
    xpToNext: xpRequiredForNextLevel(1),
    stats: { ...def.stats },
    upgrades: { vitality: 0, striking: 0, arcana: 0, endurance: 0 },
    inventory: { healthPotion: 0, manaDraught: 0, staminaBrew: 0 },
    gearOwned: [],
    equipment,
    equipmentDurability: starterEquipmentDurability(equipment),
    salvageLoot: {},
  }
}

export function mobRewards(mobId: number): { gold: number; xp: number } {
  if (isBossMob(mobId)) {
    return { gold: 130 + mobId * 3, xp: 85 + mobId * 3 }
  }
  const gold = 6 + mobId * 4
  const xp = 12 + mobId * 6
  return { gold, xp }
}

export function spawnEnemyFromRoll(id: number): EnemyState {
  const m = MOBS[id]
  if (!m) throw new Error('Invalid mob id')
  const { gold, xp } = mobRewards(id)
  return {
    id,
    name: m.display,
    maxHp: m.hp,
    hp: m.hp,
    skill: m.skill,
    damage: m.damage,
    goldReward: gold,
    xpReward: xp,
    isBoss: isBossMob(id),
  }
}

export function upgradePrice(basePrice: number, rank: number): number {
  return Math.floor(basePrice * Math.pow(1.32, rank))
}
