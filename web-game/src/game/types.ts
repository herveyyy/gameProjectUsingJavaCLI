export type StatusEffectId =
  | 'burning'
  | 'poisoned'
  | 'bleeding'
  | 'chilled'
  | 'stunned'
  | 'shielded'
  | 'empowered'

/** Applied when a skill or enemy hit connects. */
export interface StatusApply {
  id: StatusEffectId
  turns: number
  potency?: number
}

export interface SkillStatusOnHit {
  /** Applied to the enemy (PvE) or defender (PvP). */
  target?: StatusApply[]
  /** Applied to the attacker. */
  self?: StatusApply[]
}

export interface SkillDef {
  name: string
  damage: number
  /** MP spent when greater than zero. */
  manaCost: number
  /** STA spent when greater than zero — stamina-only skills use this with `manaCost: 0`. */
  staminaCost?: number
  /** Optional debuffs/buffs applied when the strike connects. */
  statusOnHit?: SkillStatusOnHit
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

/**
 * Kit flavor: common tiers (shop + world drops) plus boss-only **mystic** / **legend** weapons.
 */
export type GearArchetypeId = 'warrior' | 'rogue' | 'mage' | 'hybrid' | 'mystic' | 'legend'

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

/** One stack in pack — duplicates are separate stacks with their own durability. */
export interface GearStack {
  gearId: string
  durability: number
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
  archetype: GearArchetypeId
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
  /** Gear in pack — each entry is its own stack with durability. */
  gearOwned: GearStack[]
  equipment: PlayerEquipment
  /** Current durability for worn pieces (must align with equipment slots that hold gear). */
  equipmentDurability: Partial<Record<EquipmentSlotId, number>>
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
  /** Region boss — drops mystic / legend weapons only (never merchant stock). */
  isBoss?: boolean
  /** Statuses applied to the player when this enemy hits (deterministic). */
  playerStatusesOnHit?: StatusApply[]
}

/** Active combat ailments — parallel arrays per combatant in PvE. */
export interface CombatStatusEntry {
  id: StatusEffectId
  turns: number
  potency?: number
}

export interface BattleState {
  enemyHp: number
  playerHp: number
  playerStatuses: CombatStatusEntry[]
  enemyStatuses: CombatStatusEntry[]
}

export type Phase =
  | 'name'
  | 'adventure'
  | 'shop'
  | 'blacksmith'
  | 'gear'
  | 'battle_menu'
  | 'pick_skill'
  | 'use_item_battle'
  | 'confirm_home'
  | 'done'
  | 'multiplayer_hub'
  | 'pvp_host_wait'
  | 'pvp_rps'
  | 'pvp_battle_menu'
  | 'pvp_pick_skill'

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

export type ShopStatTomeId = 'strengthTome' | 'agilityTome' | 'intelligenceTome'

/** Permanent +1 STR / AGI / INT — gold cost scales with current value; capped at 999 each. */
export interface ShopStatTomeDef {
  id: ShopStatTomeId
  stat: 'strength' | 'agility' | 'intelligence'
  name: string
  description: string
  icon: 'book'
}

export type PlaceId =
  | 'sunlit_meadow'
  | 'whisper_Wela'
  | 'black_fen'
  | 'ruined_tower'
  | 'frostpeak_pass'
  | 'obsidian_depths'
  | 'amber_glades'
  | 'sunken_court'
  | 'ember_highlands'
  | 'veilgrave_catacombs'
  | 'stormbreak_coast'
  | 'astral_spire'

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
