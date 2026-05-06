import { emptyPlayerEquipment } from './gear'
import { rollBirthInnates } from './innates'
import type {
  EnemyState,
  EquipmentSlotId,
  PlaceDef,
  PlayerEquipment,
  PlayerState,
  ShopConsumableDef,
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
] as const

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
    id: 'whisper_woods',
    name: 'Whisper Woods',
    shortName: 'the woods',
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
    mobPool: [14, 15, 16, 17, 18],
  },
]

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

export function xpRequiredForNextLevel(level: number): number {
  return 45 + (level - 1) * 28
}

/** Legacy uniform roll over original five mobs — prefer {@link rollEncounterForPlace}. */
export function rollEncounter(): number {
  return Math.floor(Math.random() * 5) + 1
}

export function rollEncounterForPlace(place: PlaceDef): number {
  const pool = place.mobPool
  return pool[Math.floor(Math.random() * pool.length)]!
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

export function buildPlayer(name: string): PlayerState {
  const def = ADVENTURER_BASE
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
    equipment: starterEquipment(),
    salvageLoot: {},
  }
}

export function mobRewards(mobId: number): { gold: number; xp: number } {
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
  }
}

export function upgradePrice(basePrice: number, rank: number): number {
  return Math.floor(basePrice * Math.pow(1.32, rank))
}
