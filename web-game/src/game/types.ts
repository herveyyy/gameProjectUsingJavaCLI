export type ClassKey = 'warrior' | 'rogue' | 'mage'

export interface SkillDef {
  name: string
  damage: number
  manaCost: number
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

export interface PlayerState {
  name: string
  classKey: ClassKey
  classLabel: string
  hp: number
  stamina: number
  mana: number
  level: number
  gold: number
  xp: number
  xpToNext: number
  stats: { strength: number; agility: number; intelligence: number }
  skills: SkillDef[]
  upgrades: PlayerUpgrades
  inventory: PlayerInventory
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
  | 'class'
  | 'adventure'
  | 'shop'
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
