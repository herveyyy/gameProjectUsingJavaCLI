import { getEffectiveStats } from './innates'
import type {
  EquipmentSlotId,
  GearItemDef,
  PlayerEquipment,
  PlayerState,
  SkillDef,
} from './types'

/** When nothing equipped grants a combat skill — keeps early fights possible. */
export const BARE_STRIKE_SKILL: SkillDef = { name: 'Bare strike', damage: 2, manaCost: 0 }

/** Display / combat order: jewelry & armor first, weapons last. */
export const COMBAT_GEAR_SLOT_ORDER: readonly EquipmentSlotId[] = [
  'head',
  'ears',
  'neck',
  'body',
  'hands',
  'back',
  'legs',
  'feet',
  'mainHand',
  'offHand',
]

export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlotId, string> = {
  head: 'Head',
  ears: 'Ears',
  neck: 'Neck',
  body: 'Body',
  hands: 'Hands',
  back: 'Back',
  legs: 'Legs',
  feet: 'Feet',
  mainHand: 'Main hand',
  offHand: 'Off hand',
}

export function emptyPlayerEquipment(): PlayerEquipment {
  return {
    head: null,
    ears: null,
    neck: null,
    body: null,
    hands: null,
    back: null,
    legs: null,
    feet: null,
    mainHand: null,
    offHand: null,
  }
}

/** Every piece grants one combat skill — stats gate what you can wear. */
export const GEAR_CATALOG: readonly GearItemDef[] = [
  {
    id: 'gear_iron_helm',
    name: 'Iron Barbute',
    slot: 'head',
    description: 'Heavy visor; bashers train strikes through the helm.',
    price: 55,
    requirements: { strength: 5 },
    skill: { name: 'Visor Bash', damage: 6, manaCost: 0, staminaCost: 4 },
  },
  {
    id: 'gear_circlet_whisper',
    name: 'Circlet of Whispers',
    slot: 'head',
    description: 'Thin silver band humming with wind cantrips.',
    price: 42,
    requirements: { intelligence: 4 },
    skill: { name: 'Mind Gale', damage: 7, manaCost: 8 },
  },
  {
    id: 'gear_pearl_earrings',
    name: 'Pearl Droplets',
    slot: 'ears',
    description: 'Catch sound and throw it back as pain.',
    price: 28,
    requirements: { agility: 2 },
    skill: { name: 'Echo Pin', damage: 5, manaCost: 5 },
  },
  {
    id: 'gear_jade_hooks',
    name: 'Jade Hooks',
    slot: 'ears',
    description: 'Hooks said to bleed poison when tugged.',
    price: 36,
    requirements: { agility: 4 },
    skill: { name: 'Needle Taunt', damage: 8, manaCost: 6 },
  },
  {
    id: 'gear_chain_gorget',
    name: 'Chain Gorget',
    slot: 'neck',
    description: 'Protects the throat; doubles as a taught cord strike.',
    price: 32,
    requirements: { strength: 3 },
    skill: { name: 'Choker Snap', damage: 6, manaCost: 0, staminaCost: 4 },
  },
  {
    id: 'gear_amulet_ember',
    name: 'Ember Amulet',
    slot: 'neck',
    description: 'Warm coal shard on a bronze chain.',
    price: 48,
    requirements: { intelligence: 5 },
    skill: { name: 'Coal Bloom', damage: 10, manaCost: 10 },
  },
  {
    id: 'gear_leather_tunic',
    name: 'Road Leather',
    slot: 'body',
    description: 'Flexible coat that rewards rolling through blows.',
    price: 38,
    requirements: { agility: 3 },
    skill: { name: 'Roll Strike', damage: 7, manaCost: 0, staminaCost: 5 },
  },
  {
    id: 'gear_plate_hauberk',
    name: 'Riveted Hauberk',
    slot: 'body',
    description: 'Ring steel — loud, honest, brutal.',
    price: 72,
    requirements: { strength: 7, agility: 4 },
    skill: { name: 'Iron Wave', damage: 11, manaCost: 9 },
  },
  {
    id: 'gear_gloves_thief',
    name: 'Thief Gloves',
    slot: 'hands',
    description: 'Fingerless grip for knives and pockets.',
    price: 34,
    requirements: { agility: 3 },
    skill: { name: 'Razor Tap', damage: 9, manaCost: 0, staminaCost: 7 },
  },
  {
    id: 'gear_gauntlets_knight',
    name: 'Knight Gauntlets',
    slot: 'hands',
    description: 'Weighted knuckles for cracking guards.',
    price: 58,
    requirements: { strength: 6 },
    skill: { name: 'Gauntlet Spike', damage: 10, manaCost: 0, staminaCost: 8 },
  },
  {
    id: 'gear_travelers_cloak',
    name: 'Traveler Cloak',
    slot: 'back',
    description: 'Thick wool — good for hiding a spinning reprisal.',
    price: 30,
    requirements: { agility: 2 },
    skill: { name: 'Cloak Reversal', damage: 6, manaCost: 0, staminaCost: 5 },
  },
  {
    id: 'gear_wyrm_cape',
    name: 'Wyrmhide Cape',
    slot: 'back',
    description: 'Scales whisper when swept — enemy flinch included.',
    price: 64,
    requirements: { strength: 5, agility: 5 },
    skill: { name: 'Tail Lash', damage: 12, manaCost: 11 },
  },
  {
    id: 'gear_cloth_trousers',
    name: 'Stitched Leggings',
    slot: 'legs',
    description: 'Double seams — kick templates woven in.',
    price: 26,
    requirements: { agility: 2 },
    skill: { name: 'Low Sweep', damage: 5, manaCost: 0, staminaCost: 4 },
  },
  {
    id: 'gear_greaves_steel',
    name: 'Steel Greaves',
    slot: 'legs',
    description: 'Shin plates — stomps echo like bells.',
    price: 52,
    requirements: { strength: 5 },
    skill: { name: 'Bronze Stomp', damage: 9, manaCost: 0, staminaCost: 7 },
  },
  {
    id: 'gear_boots_wander',
    name: 'Wander Boots',
    slot: 'feet',
    description: 'Soft soles, sudden sprint.',
    price: 24,
    requirements: { agility: 2 },
    skill: { name: 'Dust Kick', damage: 4, manaCost: 0, staminaCost: 3 },
  },
  {
    id: 'gear_sabatons_knight',
    name: 'Knight Sabatons',
    slot: 'feet',
    description: 'Full steel toes — cruel arcs.',
    price: 46,
    requirements: { strength: 6, agility: 4 },
    skill: { name: 'Arc Cleave', damage: 8, manaCost: 0, staminaCost: 6 },
  },
  {
    id: 'gear_short_blade',
    name: 'Shortblade',
    slot: 'mainHand',
    description: 'Fast steel for one hand.',
    price: 44,
    requirements: { strength: 4, agility: 3 },
    skill: { name: 'Quick Pierce', damage: 11, manaCost: 0, staminaCost: 8 },
  },
  {
    id: 'gear_greatsword_oath',
    name: 'Oath Greatsword',
    slot: 'mainHand',
    description: 'Two-handed blade — occupies both hands.',
    price: 95,
    twoHanded: true,
    requirements: { strength: 9, agility: 5 },
    skill: { name: 'Oath Cleave', damage: 22, manaCost: 0, staminaCost: 14 },
  },
  {
    id: 'gear_oak_wand',
    name: 'Oak Wand',
    slot: 'mainHand',
    description: 'Channel focus for cheap bolts.',
    price: 40,
    requirements: { intelligence: 4 },
    skill: { name: 'Splinter Bolt', damage: 9, manaCost: 6 },
  },
  {
    id: 'gear_buckler',
    name: 'Buckler',
    slot: 'offHand',
    description: 'Small shield — bash and parry angles.',
    price: 35,
    requirements: { strength: 5 },
    skill: { name: 'Targe Punch', damage: 7, manaCost: 0, staminaCost: 5 },
  },
  {
    id: 'gear_spell_focus',
    name: 'Spell Focus',
    slot: 'offHand',
    description: 'Crystal orb for off-hand amplification.',
    price: 50,
    requirements: { intelligence: 6 },
    skill: { name: 'Pulse Echo', damage: 10, manaCost: 9 },
  },
]

export const GEAR_BY_ID: Readonly<Record<string, GearItemDef>> = Object.fromEntries(
  GEAR_CATALOG.map((g) => [g.id, g]),
)

/** Merchant buy-back (sell) value — about 40% of list price, min 1 gold. */
export function merchantBuyPrice(def: GearItemDef): number {
  return Math.max(1, Math.floor(def.price * 0.4))
}

export interface CombatSkillEntry {
  kind: 'intrinsic' | 'gear'
  skill: SkillDef
  /** Button label in battle */
  label: string
  slot?: EquipmentSlotId
  gearId?: string
}

export function playerMeetsStatRequirements(player: PlayerState, def: GearItemDef): boolean {
  const r = def.requirements
  if (!r) return true
  const st = getEffectiveStats(player)
  if (r.strength != null && st.strength < r.strength) return false
  if (r.agility != null && st.agility < r.agility) return false
  if (r.intelligence != null && st.intelligence < r.intelligence) return false
  return true
}

/** Human-readable requirement line for UI (shop / errors). */
export function formatRequirements(def: GearItemDef): string {
  const r = def.requirements
  if (!r) return 'No stat requirement'
  const parts: string[] = []
  if (r.strength != null) parts.push(`STR ${r.strength}`)
  if (r.agility != null) parts.push(`AGI ${r.agility}`)
  if (r.intelligence != null) parts.push(`INT ${r.intelligence}`)
  return parts.length ? parts.join(' · ') : 'No stat requirement'
}

export function describeEquipBlock(player: PlayerState, itemId: string): string | null {
  const def = GEAR_BY_ID[itemId]
  if (!def) return 'Unknown item.'
  if (!player.gearOwned.includes(itemId)) return 'That is not in your pack.'
  if (!playerMeetsStatRequirements(player, def)) {
    const st = getEffectiveStats(player)
    return `You need ${formatRequirements(def)} (effective STR ${st.strength}, AGI ${st.agility}, INT ${st.intelligence}; innates count).`
  }
  if (def.slot === 'offHand' && player.equipment.mainHand) {
    const main = GEAR_BY_ID[player.equipment.mainHand]
    if (main?.twoHanded) return 'A two-handed weapon uses both hands — stow it first.'
  }
  return null
}

function removeOneCopy(owned: readonly string[], itemId: string): string[] | null {
  const i = owned.indexOf(itemId)
  if (i === -1) return null
  return [...owned.slice(0, i), ...owned.slice(i + 1)]
}

export function tryUnequipSlot(player: PlayerState, slot: EquipmentSlotId): PlayerState | null {
  const id = player.equipment[slot]
  if (!id) return null
  return {
    ...player,
    equipment: { ...player.equipment, [slot]: null },
    gearOwned: [...player.gearOwned, id],
  }
}

export function tryEquipFromBag(player: PlayerState, itemId: string): PlayerState | null {
  const def = GEAR_BY_ID[itemId]
  if (!def) return null
  if (!player.gearOwned.includes(itemId)) return null
  if (!playerMeetsStatRequirements(player, def)) return null

  if (def.slot === 'offHand' && player.equipment.mainHand) {
    const main = GEAR_BY_ID[player.equipment.mainHand]
    if (main?.twoHanded) return null
  }

  let equipment: PlayerEquipment = { ...player.equipment }
  const bumped: string[] = []

  if (def.slot === 'mainHand' && def.twoHanded && equipment.offHand) {
    bumped.push(equipment.offHand)
    equipment.offHand = null
  }

  const previous = equipment[def.slot]
  if (previous) bumped.push(previous)

  equipment[def.slot] = itemId

  const bag = removeOneCopy(player.gearOwned, itemId)
  if (!bag) return null

  return {
    ...player,
    equipment,
    gearOwned: [...bag, ...bumped],
  }
}

function collectGearCombatSkills(player: PlayerState): CombatSkillEntry[] {
  const out: CombatSkillEntry[] = []
  for (const slot of COMBAT_GEAR_SLOT_ORDER) {
    const id = player.equipment[slot]
    if (!id) continue
    if (slot === 'offHand' && player.equipment.mainHand) {
      const main = GEAR_BY_ID[player.equipment.mainHand]
      if (main?.twoHanded) continue
    }
    const g = GEAR_BY_ID[id]
    if (!g) continue
    out.push({
      kind: 'gear',
      skill: { ...g.skill },
      label: `${g.name} — ${g.skill.name}`,
      slot,
      gearId: id,
    })
  }
  return out
}

/** Skills from equipped gear only; bare strike if nothing worn grants a technique. */
export function getCombatSkillEntries(player: PlayerState): CombatSkillEntry[] {
  const gear = collectGearCombatSkills(player)
  if (gear.length === 0) {
    return [{ kind: 'intrinsic', skill: { ...BARE_STRIKE_SKILL }, label: BARE_STRIKE_SKILL.name }]
  }
  return gear
}
