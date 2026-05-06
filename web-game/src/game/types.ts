export type StatusEffectId =
  | 'burning'
  | 'poisoned'
  | 'bleeding'
  | 'chilled'
  | 'stunned'
  | 'shielded'
  | 'empowered'
  /** Blocks incoming stun effects while turns remain (consumables / buffs). */
  | 'immune'
  /** Temporary combat damage bonus — potency holds flat might (e.g. +10). */
  | 'might'

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

/** Strikes are physical or magical for affinity math (matchups / resist gear). */
export type DamageKind = 'physical' | 'magical'

export interface SkillDef {
  name: string
  damage: number
  /** MP spent when greater than zero. */
  manaCost: number
  /** STA spent when greater than zero — stamina-only skills use this with `manaCost: 0`. */
  staminaCost?: number
  /** Strike element — physical vs magical affinity; inferred from MP/ST balance when omitted. */
  damageKind?: DamageKind
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
  cleanseScroll: number
  immunePhilter: number
  immuneElixir: number
  mightDraught: number
  /** Tri-restore cordial — scales like tonics but splits across HP/MP/STA. */
  sunriseCordial: number
  /** Battle — heavy shield + empower. */
  prismaticDraught: number
  /** Battle — stronger Battle Might. */
  apexMightDraught: number
  /** Battle — mid-duration stun immunity. */
  veilPhilter: number
  /** Battle — might + short Aegis. */
  championCordial: number
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

/** Multiplicative mitigation while this piece is equipped (several pieces stack). */
export interface GearMitigation {
  /** Damage taken from enemy physical hits (Slime < 1 resists). */
  physicalTakenMul?: number
  /** Damage taken from enemy magical hits. */
  magicalTakenMul?: number
  /** Ignore stun inflicted by enemies on hit. */
  stunImmune?: boolean
}

export type GearFacetKind = 'revive' | 'stun_ward'

/** Limited-use magical facets on gear — charges persist until used or gear removed. */
export interface GearFacetDef {
  kind: GearFacetKind
  /** Max charges for this facet on this piece (revive usually 1; stun ward 3–10 by rarity). */
  charges: number
  /** For `revive` facets — fraction of max HP restored (default 0.5). */
  reviveHpFraction?: number
}

/** Persisted charges while gear is worn — see {@link GearItemDef.facets}. */
export interface GearFacetRuntime {
  revive?: number
  stunWard?: number
  /** Max HP fraction for the next revive proc from this slot (from gear def). */
  reviveHpFrac?: number
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
  /** Passive resistances / immunity while worn. */
  mitigation?: GearMitigation
  /** Rare facets — revive once, or stun wards that absorb control effects. */
  facets?: GearFacetDef[]
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
  /** Remaining facet procs per slot — keyed same as equipment. */
  equipmentFacetCharges?: Partial<Record<EquipmentSlotId, GearFacetRuntime>>
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
  /** Attack flavor — affects how your gear resist applies. Default physical. */
  attackKind?: DamageKind
  /** Multiplier on damage you deal with physical skills (matchups). Default 1. */
  physicalTakenMul?: number
  /** Multiplier on damage you deal with magical skills. Default 1. */
  magicalTakenMul?: number
  /** Ignores on-hit stun from your skills (Visor Bash, etc.). */
  stunImmune?: boolean
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

export type ShopConsumableId =
  | 'healthPotion'
  | 'manaDraught'
  | 'staminaBrew'
  | 'cleanseScroll'
  | 'immunePhilter'
  | 'immuneElixir'
  | 'mightDraught'
  | 'sunriseCordial'
  | 'prismaticDraught'
  | 'apexMightDraught'
  | 'veilPhilter'
  | 'championCordial'

export type ShopUpgradeId = keyof PlayerUpgrades

export interface ShopConsumableDef {
  id: ShopConsumableId
  name: string
  description: string
  price: number
  icon: 'potion' | 'vial' | 'leaf' | 'scroll' | 'shield' | 'star'
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
