import type { ClassKey, EnemyState, PlaceDef, PlayerState, ShopConsumableDef, ShopUpgradeDef, SkillDef } from './types'

/** Five tiers — every 3 class levels (Lv 1–3, 4–6, 7–9, 10–12, 13+). */
export const CLASS_SKILL_TIERS: Record<ClassKey, readonly SkillDef[][]> = {
  warrior: [
    [
      { name: 'Horizontal Slash I', damage: 7, manaCost: 10.5 },
      { name: 'Vertical Slash I', damage: 8, manaCost: 12 },
      { name: 'Shield Bash I', damage: 2, manaCost: 2 },
    ],
    [
      { name: 'Horizontal Slash II', damage: 11, manaCost: 10 },
      { name: 'Vertical Slash II', damage: 13, manaCost: 11.5 },
      { name: 'Shield Bash II', damage: 5, manaCost: 2 },
    ],
    [
      { name: 'Reaping Arc III', damage: 16, manaCost: 9.5 },
      { name: 'Cleave III', damage: 19, manaCost: 10.5 },
      { name: 'Guard Break III', damage: 9, manaCost: 2.5 },
    ],
    [
      { name: 'Whirlwind Rend IV', damage: 22, manaCost: 9 },
      { name: 'Sky Splitter IV', damage: 26, manaCost: 10 },
      { name: 'Fortress Slam IV', damage: 14, manaCost: 2 },
    ],
    [
      { name: 'Excalibur Cleave V', damage: 30, manaCost: 8.5 },
      { name: 'World Splitter V', damage: 35, manaCost: 9.5 },
      { name: 'Cataclysm Bash V', damage: 20, manaCost: 2 },
    ],
  ],
  rogue: [
    [
      { name: 'Dagger Slash I', damage: 7, manaCost: 10.5 },
      { name: 'Poison Blade I', damage: 8, manaCost: 12 },
      { name: 'Evasion I', damage: 0, manaCost: 0 },
    ],
    [
      { name: 'Twin Fang II', damage: 11, manaCost: 10 },
      { name: 'Venom Weave II', damage: 13, manaCost: 11 },
      { name: 'Shadow Step II', damage: 0, manaCost: 0 },
    ],
    [
      { name: 'Gutting Strike III', damage: 15, manaCost: 9.5 },
      { name: 'Night Toxin III', damage: 18, manaCost: 10 },
      { name: 'Blur III', damage: 0, manaCost: 0 },
    ],
    [
      { name: 'Assassin\'s Puncture IV', damage: 20, manaCost: 9 },
      { name: 'Crimson Bloom IV', damage: 24, manaCost: 9.5 },
      { name: 'Mirage IV', damage: 0, manaCost: 0 },
    ],
    [
      { name: 'Death Lottery V', damage: 26, manaCost: 8.5 },
      { name: 'Plague Edge V', damage: 32, manaCost: 9 },
      { name: 'Vanish V', damage: 0, manaCost: 0 },
    ],
  ],
  mage: [
    [
      { name: 'Fireball I', damage: 5, manaCost: 7.5 },
      { name: 'Gust Lance I', damage: 6, manaCost: 9 },
      { name: 'Splash I', damage: 4, manaCost: 6 },
    ],
    [
      { name: 'Scorch Bolt II', damage: 9, manaCost: 7 },
      { name: 'Wind Shear II', damage: 11, manaCost: 8.5 },
      { name: 'Tidal Wave II', damage: 8, manaCost: 5.5 },
    ],
    [
      { name: 'Inferno Lance III', damage: 14, manaCost: 6.5 },
      { name: 'Cyclone III', damage: 17, manaCost: 8 },
      { name: 'Aqua Prison III', damage: 12, manaCost: 5 },
    ],
    [
      { name: 'Pyroclasm IV', damage: 20, manaCost: 6 },
      { name: 'Tempest IV', damage: 24, manaCost: 7.5 },
      { name: 'Deluge IV', damage: 17, manaCost: 4.5 },
    ],
    [
      { name: 'Sunfall V', damage: 27, manaCost: 5.5 },
      { name: 'Sky Rend V', damage: 32, manaCost: 7 },
      { name: 'Tsunami V', damage: 23, manaCost: 4 },
    ],
  ],
  ranger: [
    [
      { name: 'Pine Needle Shot I', damage: 7, manaCost: 10.5 },
      { name: 'Snaring Roots I', damage: 8, manaCost: 12 },
      { name: 'Companion Peck I', damage: 2, manaCost: 2 },
    ],
    [
      { name: 'Twin Volley II', damage: 11, manaCost: 10 },
      { name: 'Thorn Ward II', damage: 13, manaCost: 11 },
      { name: 'Wolf Fangs II', damage: 5, manaCost: 2 },
    ],
    [
      { name: 'Piercing Gale III', damage: 16, manaCost: 9.5 },
      { name: 'Briar Crown III', damage: 18, manaCost: 10 },
      { name: 'Stampede III', damage: 9, manaCost: 2.5 },
    ],
    [
      { name: 'Starfall Arrow IV', damage: 22, manaCost: 9 },
      { name: 'Entangling Sky IV', damage: 25, manaCost: 10 },
      { name: 'Bear Maul IV', damage: 14, manaCost: 2 },
    ],
    [
      { name: 'Eclipse Shot V', damage: 30, manaCost: 8.5 },
      { name: 'Verdant Ruin V', damage: 34, manaCost: 9 },
      { name: 'Apex Predator V', damage: 20, manaCost: 2 },
    ],
  ],
}

/** Three branches per class — columns in the skill tree (Bow / control / beast for Ranger, etc.). */
export const CLASS_SKILL_TREE_BRANCHES: Record<ClassKey, readonly [string, string, string]> = {
  warrior: ['Blade arts', 'Heavy strikes', 'Shield'],
  rogue: ['Steel', 'Toxins', 'Shadow'],
  mage: ['Fire', 'Wind', 'Water'],
  ranger: ['Bow', 'Wild', 'Companion'],
}

export const SKILL_TIER_ROMAN = ['I', 'II', 'III', 'IV', 'V'] as const

/** Tier column subtitle for the skill tree UI (matches 3-level tier bands). */
export function tierLevelRangeLabel(tierIndex: number): string {
  if (tierIndex >= SKILL_TIER_ROMAN.length - 1) return 'Lv 13+'
  const lo = tierIndex * 3 + 1
  const hi = tierIndex * 3 + 3
  return `Lv ${lo}–${hi}`
}

export function getSkillTierIndexForLevel(level: number): number {
  return Math.min(CLASS_SKILL_TIERS.warrior.length - 1, Math.max(0, Math.floor((level - 1) / 3)))
}

export function getSkillsForLevel(classKey: ClassKey, level: number): SkillDef[] {
  const tiers = CLASS_SKILL_TIERS[classKey]
  const idx = getSkillTierIndexForLevel(level)
  return tiers[idx].map((s) => ({ ...s }))
}

export const CLASSES: Record<
  ClassKey,
  Omit<
    PlayerState,
    | 'name'
    | 'classKey'
    | 'classLabel'
    | 'xp'
    | 'xpToNext'
    | 'upgrades'
    | 'inventory'
    | 'skills'
  > & {
    label: string
  }
> = {
  warrior: {
    label: 'Warrior',
    hp: 120,
    stamina: 100,
    mana: 70,
    level: 1,
    gold: 10,
    stats: { strength: 5, agility: 3, intelligence: 2 },
  },
  rogue: {
    label: 'Rogue',
    hp: 100,
    stamina: 120,
    mana: 80,
    level: 1,
    gold: 10,
    stats: { strength: 2, agility: 5, intelligence: 3 },
  },
  mage: {
    label: 'Mage',
    hp: 80,
    stamina: 90,
    mana: 120,
    level: 1,
    gold: 10,
    stats: { strength: 3, agility: 2, intelligence: 5 },
  },
  ranger: {
    label: 'Ranger',
    hp: 95,
    stamina: 115,
    mana: 85,
    level: 1,
    gold: 10,
    stats: { strength: 3, agility: 4, intelligence: 3 },
  },
}

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

export function buildPlayer(classKey: ClassKey, name: string): PlayerState {
  const def = CLASSES[classKey]
  return {
    name,
    classKey,
    classLabel: def.label,
    hp: def.hp,
    stamina: def.stamina,
    mana: def.mana,
    level: def.level,
    gold: def.gold,
    xp: 0,
    xpToNext: xpRequiredForNextLevel(1),
    stats: { ...def.stats },
    skills: getSkillsForLevel(classKey, def.level),
    upgrades: { vitality: 0, striking: 0, arcana: 0, endurance: 0 },
    inventory: { healthPotion: 0, manaDraught: 0, staminaBrew: 0 },
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
