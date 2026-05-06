export interface SkillDef {
  name: string
  damage: number
  /** MP spent when greater than zero. */
  manaCost: number
  /** STA spent when greater than zero — stamina-only skills use this with `manaCost: 0`. */
  staminaCost?: number
}

export interface PlayerUpgrades {
  vitality: number
  striking: number
  arcana: number
  endurance: number
}

export interface PlayerInventory {
  healthPotion: number
  manaDraught: number
  staminaBrew: number
}

export type EquipmentSlotId =
  | 'head'
  | 'ears'
  | 'neck'
  | 'body'
  | 'hands'
  | 'back'
  | 'legs'
  | 'feet'
  | 'mainHand'
  | 'offHand'

export interface PlayerEquipment {
  head: string | null
  ears: string | null
  neck: string | null
  body: string | null
  hands: string | null
  back: string | null
  legs: string | null
  feet: string | null
  mainHand: string | null
  offHand: string | null
}

/** Minimum stats to equip; omit a key when there is no requirement for that stat. */
export interface StatRequirements {
  strength?: number
  agility?: number
  intelligence?: number
}

/** Static definition — sold in shop; each piece carries one combat skill. */
export interface GearItemDef {
  id: string
  name: string
  slot: EquipmentSlotId
  description: string
  price: number
  skill: SkillDef
  requirements?: StatRequirements
  /** Occupies main + off hand; off-hand piece is unequipped when set. */
  twoHanded?: boolean
}

export interface PlayerState {
  name: string
  /** Rolled at creation — usually one innate id; ~0.001% roll grants two. */
  innates: string[]
  hp: number
  stamina: number
  mana: number
  level: number
  gold: number
  xp: number
  xpToNext: number
  stats: { strength: number; agility: number; intelligence: number }
  upgrades: PlayerUpgrades
  inventory: PlayerInventory
  /** Item ids in the bag (multiset — duplicates allowed). */
  gearOwned: string[]
  equipment: PlayerEquipment
  /** Stackable mob salvage — sell-only at the merchant (item id → count). */
  salvageLoot: Record<string, number>
}

export interface EnemyState {
  id: number
  name: string
  maxHp: number
  hp: number
  skill: string
  damage: number
  goldReward: number
  xpReward: number
}

export interface BattleState {
  enemyHp: number
  playerHp: number
}

export type Phase =
  | 'name'
  | 'adventure'
  | 'shop'
  | 'gear'
  | 'battle_menu'
  | 'pick_skill'
  | 'use_item_battle'
  | 'confirm_home'
  | 'done'

export type ShopConsumableId = 'healthPotion' | 'manaDraught' | 'staminaBrew'

export type ShopUpgradeId = keyof PlayerUpgrades

export interface ShopConsumableDef {
  id: ShopConsumableId
  name: string
  description: string
  price: number
  icon: 'potion' | 'vial' | 'leaf'
}

export interface ShopUpgradeDef {
  id: ShopUpgradeId
  name: string
  description: string
  basePrice: number
  icon: 'heart' | 'sword' | 'spark' | 'wind'
}

export type PlaceId =
  | 'sunlit_meadow'
  | 'whisper_woods'
  | 'black_fen'
  | 'ruined_tower'
  | 'frostpeak_pass'
  | 'obsidian_depths'

export interface PlaceDef {
  id: PlaceId
  name: string
  /** Short name for battle logs */
  shortName: string
  description: string
  /** Display e.g. "1–3" */
  levelRecommended: string
  levelMin: number
  levelMax: number
  mobPool: readonly number[]
}
