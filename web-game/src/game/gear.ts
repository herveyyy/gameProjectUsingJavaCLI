import { getEffectiveStats } from './innates'
import type {
  EquipmentSlotId,
  GearArchetypeId,
  GearItemDef,
  GearStack,
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

/** Stable order for gear kit labels / filters (mystic & legend are boss drops only). */
export const GEAR_ARCHETYPE_ORDER: readonly GearArchetypeId[] = [
  'warrior',
  'rogue',
  'mage',
  'hybrid',
  'mystic',
  'legend',
]

export const GEAR_ARCHETYPE_LABELS: Record<GearArchetypeId, string> = {
  warrior: 'Warrior',
  rogue: 'Rogue',
  mage: 'Mage',
  hybrid: 'Hybrid',
  mystic: 'Mystic',
  legend: 'Legend',
}

/** Boss-exclusive relic weapons — never sold by the merchant; rolled only after boss fights. */
export function isBossDropGear(g: GearItemDef): boolean {
  return g.archetype === 'mystic' || g.archetype === 'legend'
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
    archetype: 'warrior',
    name: 'Iron Barbute',
    slot: 'head',
    description: 'Heavy visor; bashers train strikes through the helm.',
    price: 55,
    requirements: { strength: 5 },
    skill: {
      name: 'Visor Bash',
      damage: 6,
      manaCost: 0,
      staminaCost: 4,
      statusOnHit: { target: [{ id: 'stunned', turns: 1 }] },
    },
  },
  {
    id: 'gear_circlet_whisper',
    archetype: 'mage',
    name: 'Circlet of Whispers',
    slot: 'head',
    description: 'Thin silver band humming with wind cantrips.',
    price: 42,
    requirements: { intelligence: 4 },
    skill: {
      name: 'Mind Gale',
      damage: 7,
      manaCost: 8,
      statusOnHit: { self: [{ id: 'empowered', turns: 1, potency: 6 }] },
    },
  },
  {
    id: 'gear_pearl_earrings',
    archetype: 'rogue',
    name: 'Pearl Droplets',
    slot: 'ears',
    description: 'Catch sound and throw it back as pain.',
    price: 28,
    requirements: { agility: 2 },
    skill: { name: 'Echo Pin', damage: 5, manaCost: 5 },
  },
  {
    id: 'gear_jade_hooks',
    archetype: 'rogue',
    name: 'Jade Hooks',
    slot: 'ears',
    description: 'Hooks said to bleed poison when tugged.',
    price: 36,
    requirements: { agility: 4 },
    skill: { name: 'Needle Taunt', damage: 8, manaCost: 6 },
  },
  {
    id: 'gear_chain_gorget',
    archetype: 'warrior',
    name: 'Chain Gorget',
    slot: 'neck',
    description: 'Protects the throat; doubles as a taught cord strike.',
    price: 32,
    requirements: { strength: 3 },
    skill: { name: 'Choker Snap', damage: 6, manaCost: 0, staminaCost: 4 },
  },
  {
    id: 'gear_amulet_ember',
    archetype: 'mage',
    name: 'Ember Amulet',
    slot: 'neck',
    description: 'Warm coal shard on a bronze chain.',
    price: 48,
    requirements: { intelligence: 5 },
    skill: {
      name: 'Coal Bloom',
      damage: 10,
      manaCost: 10,
      statusOnHit: { target: [{ id: 'burning', turns: 2, potency: 4 }] },
    },
  },
  {
    id: 'gear_leather_tunic',
    archetype: 'rogue',
    name: 'Road Leather',
    slot: 'body',
    description: 'Flexible coat that rewards rolling through blows.',
    price: 38,
    requirements: { agility: 3 },
    skill: { name: 'Roll Strike', damage: 7, manaCost: 0, staminaCost: 5 },
  },
  {
    id: 'gear_plate_hauberk',
    archetype: 'hybrid',
    name: 'Riveted Hauberk',
    slot: 'body',
    description: 'Ring steel — loud, honest, brutal.',
    price: 72,
    requirements: { strength: 7, agility: 4 },
    skill: { name: 'Iron Wave', damage: 11, manaCost: 9 },
  },
  {
    id: 'gear_gloves_thief',
    archetype: 'rogue',
    name: 'Thief Gloves',
    slot: 'hands',
    description: 'Fingerless grip for knives and pockets.',
    price: 34,
    requirements: { agility: 3 },
    skill: { name: 'Razor Tap', damage: 9, manaCost: 0, staminaCost: 7 },
  },
  {
    id: 'gear_gauntlets_knight',
    archetype: 'warrior',
    name: 'Knight Gauntlets',
    slot: 'hands',
    description: 'Weighted knuckles for cracking guards.',
    price: 58,
    requirements: { strength: 6 },
    skill: { name: 'Gauntlet Spike', damage: 10, manaCost: 0, staminaCost: 8 },
  },
  {
    id: 'gear_travelers_cloak',
    archetype: 'rogue',
    name: 'Traveler Cloak',
    slot: 'back',
    description: 'Thick wool — good for hiding a spinning reprisal.',
    price: 30,
    requirements: { agility: 2 },
    skill: { name: 'Cloak Reversal', damage: 6, manaCost: 0, staminaCost: 5 },
  },
  {
    id: 'gear_wyrm_cape',
    archetype: 'hybrid',
    name: 'Wyrmhide Cape',
    slot: 'back',
    description: 'Scales whisper when swept — enemy flinch included.',
    price: 64,
    requirements: { strength: 5, agility: 5 },
    skill: { name: 'Tail Lash', damage: 12, manaCost: 11 },
  },
  {
    id: 'gear_cloth_trousers',
    archetype: 'rogue',
    name: 'Stitched Leggings',
    slot: 'legs',
    description: 'Double seams — kick templates woven in.',
    price: 26,
    requirements: { agility: 2 },
    skill: { name: 'Low Sweep', damage: 5, manaCost: 0, staminaCost: 4 },
  },
  {
    id: 'gear_greaves_steel',
    archetype: 'warrior',
    name: 'Steel Greaves',
    slot: 'legs',
    description: 'Shin plates — stomps echo like bells.',
    price: 52,
    requirements: { strength: 5 },
    skill: { name: 'Bronze Stomp', damage: 9, manaCost: 0, staminaCost: 7 },
  },
  {
    id: 'gear_boots_wander',
    archetype: 'rogue',
    name: 'Wander Boots',
    slot: 'feet',
    description: 'Soft soles, sudden sprint.',
    price: 24,
    requirements: { agility: 2 },
    skill: { name: 'Dust Kick', damage: 4, manaCost: 0, staminaCost: 3 },
  },
  {
    id: 'gear_sabatons_knight',
    archetype: 'hybrid',
    name: 'Knight Sabatons',
    slot: 'feet',
    description: 'Full steel toes — cruel arcs.',
    price: 46,
    requirements: { strength: 6, agility: 4 },
    skill: { name: 'Arc Cleave', damage: 8, manaCost: 0, staminaCost: 6 },
  },
  {
    id: 'gear_short_blade',
    archetype: 'rogue',
    name: 'Shortblade',
    slot: 'mainHand',
    description: 'Fast steel for one hand.',
    price: 44,
    requirements: { strength: 4, agility: 3 },
    skill: { name: 'Quick Pierce', damage: 11, manaCost: 0, staminaCost: 8 },
  },
  {
    id: 'gear_greatsword_oath',
    archetype: 'warrior',
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
    archetype: 'mage',
    name: 'Oak Wand',
    slot: 'mainHand',
    description: 'Channel focus for cheap bolts.',
    price: 40,
    requirements: { intelligence: 4 },
    skill: { name: 'Splinter Bolt', damage: 9, manaCost: 6 },
  },
  {
    id: 'gear_buckler',
    archetype: 'warrior',
    name: 'Buckler',
    slot: 'offHand',
    description: 'Small shield — bash and parry angles.',
    price: 35,
    requirements: { strength: 5 },
    skill: { name: 'Targe Punch', damage: 7, manaCost: 0, staminaCost: 5 },
  },
  {
    id: 'gear_spell_focus',
    archetype: 'mage',
    name: 'Spell Focus',
    slot: 'offHand',
    description: 'Crystal orb for off-hand amplification.',
    price: 50,
    requirements: { intelligence: 6 },
    skill: { name: 'Pulse Echo', damage: 10, manaCost: 9 },
  },
  {
    id: 'gear_coif_riveted',
    archetype: 'warrior',
    name: 'Riveted Coif',
    slot: 'head',
    description: 'Mail curtain — turns glancing cuts into ringing insults.',
    price: 62,
    requirements: { strength: 6 },
    skill: { name: 'Ring Snap', damage: 8, manaCost: 0, staminaCost: 6 },
  },
  {
    id: 'gear_mask_night',
    archetype: 'rogue',
    name: 'Night-Fabric Mask',
    slot: 'head',
    description: 'Breathable weave that drinks torchlight.',
    price: 54,
    requirements: { agility: 6 },
    skill: { name: 'Thread Blind', damage: 9, manaCost: 0, staminaCost: 7 },
  },
  {
    id: 'gear_diadem_fractal',
    archetype: 'mage',
    name: 'Fractal Diadem',
    slot: 'head',
    description: 'Geometry that refuses to resolve — hurts to stare at.',
    price: 68,
    requirements: { intelligence: 7 },
    skill: { name: 'Glare Knot', damage: 12, manaCost: 11 },
  },
  {
    id: 'gear_blooddrop_studs',
    archetype: 'rogue',
    name: 'Blooddrop Studs',
    slot: 'ears',
    description: 'Rubies that warm when battle nears.',
    price: 44,
    requirements: { agility: 5 },
    skill: {
      name: 'Pin Bleed',
      damage: 9,
      manaCost: 6,
      statusOnHit: { target: [{ id: 'bleeding', turns: 3, potency: 3 }] },
    },
  },
  {
    id: 'gear_echo_loops',
    archetype: 'mage',
    name: 'Echo Loops',
    slot: 'ears',
    description: 'Hoops that replay your insult on impact.',
    price: 52,
    requirements: { intelligence: 6 },
    skill: {
      name: 'Reverb Hex',
      damage: 10,
      manaCost: 8,
      statusOnHit: { target: [{ id: 'poisoned', turns: 3, potency: 3 }] },
    },
  },
  {
    id: 'gear_torque_wolf',
    archetype: 'warrior',
    name: 'Wolf-Iron Torque',
    slot: 'neck',
    description: 'Cold iron torc stamped with old pack sigils.',
    price: 58,
    requirements: { strength: 7 },
    skill: { name: 'Neck Ram', damage: 10, manaCost: 0, staminaCost: 8 },
  },
  {
    id: 'gear_locket_mist',
    archetype: 'hybrid',
    name: 'Mist Locket',
    slot: 'neck',
    description: 'Glass that never fogs — breath becomes fog elsewhere.',
    price: 56,
    requirements: { agility: 5, intelligence: 5 },
    skill: { name: 'Veil Tag', damage: 11, manaCost: 9 },
  },
  {
    id: 'gear_brigandine',
    archetype: 'hybrid',
    name: 'Brigandine Jack',
    slot: 'body',
    description: 'Small plates under cloth — stubborn against blades.',
    price: 66,
    requirements: { strength: 6, agility: 5 },
    skill: { name: 'Rivet Drive', damage: 11, manaCost: 0, staminaCost: 9 },
  },
  {
    id: 'gear_robes_astral',
    archetype: 'mage',
    name: 'Astral Layer Robes',
    slot: 'body',
    description: 'Layers of silk threaded with star-metal dust.',
    price: 78,
    requirements: { intelligence: 8 },
    skill: { name: 'Fold Nova', damage: 14, manaCost: 13 },
  },
  {
    id: 'gear_bracers_rune',
    archetype: 'warrior',
    name: 'Rune-Branded Bracers',
    slot: 'hands',
    description: 'Heat-sealed runes hum when you block.',
    price: 60,
    requirements: { strength: 7 },
    skill: {
      name: 'Sigil Shove',
      damage: 11,
      manaCost: 0,
      staminaCost: 8,
      statusOnHit: { self: [{ id: 'shielded', turns: 2, potency: 18 }] },
    },
  },
  {
    id: 'gear_gloves_duelist',
    archetype: 'rogue',
    name: 'Duelist Gloves',
    slot: 'hands',
    description: 'Thin leather — thumb trains for eye-level counters.',
    price: 62,
    requirements: { agility: 7 },
    skill: { name: 'Tempo Jab', damage: 12, manaCost: 0, staminaCost: 9 },
  },
  {
    id: 'gear_mantle_frost',
    archetype: 'mage',
    name: 'Frostthread Mantle',
    slot: 'back',
    description: 'Weft of hoarfrost — leaves rime on whatever it brushes.',
    price: 70,
    requirements: { intelligence: 7 },
    skill: {
      name: 'Rime Wake',
      damage: 13,
      manaCost: 12,
      statusOnHit: { target: [{ id: 'chilled', turns: 2, potency: 3 }] },
    },
  },
  {
    id: 'gear_cape_harrier',
    archetype: 'rogue',
    name: 'Harrier Cape',
    slot: 'back',
    description: 'Cut for sprint turns and rude angles.',
    price: 58,
    requirements: { agility: 7 },
    skill: { name: 'Cross Draft', damage: 11, manaCost: 0, staminaCost: 8 },
  },
  {
    id: 'gear_hose_padded',
    archetype: 'rogue',
    name: 'Padded Hose',
    slot: 'legs',
    description: 'Quilted legs — landings become jokes.',
    price: 48,
    requirements: { agility: 5 },
    skill: { name: 'Drop Knee', damage: 8, manaCost: 0, staminaCost: 6 },
  },
  {
    id: 'gear_greaves_ironwood',
    archetype: 'warrior',
    name: 'Ironwood Greaves',
    slot: 'legs',
    description: 'Living grain — heavy stomps splinter stone.',
    price: 74,
    requirements: { strength: 8 },
    skill: { name: 'Root Stomp', damage: 12, manaCost: 0, staminaCost: 10 },
  },
  {
    id: 'gear_sandals_wind',
    archetype: 'rogue',
    name: 'Windlace Sandals',
    slot: 'feet',
    description: 'Laces that snap themselves tight mid-dash.',
    price: 50,
    requirements: { agility: 6 },
    skill: { name: 'Sprint Cut', damage: 9, manaCost: 0, staminaCost: 7 },
  },
  {
    id: 'gear_spurs_commander',
    archetype: 'hybrid',
    name: 'Commander Spurs',
    slot: 'feet',
    description: 'Rowels that ring charges into teeth.',
    price: 64,
    requirements: { strength: 7, agility: 5 },
    skill: { name: 'Rowel Hook', damage: 10, manaCost: 0, staminaCost: 8 },
  },
  {
    id: 'gear_rapier_duell',
    archetype: 'rogue',
    name: 'Court Rapier',
    slot: 'mainHand',
    description: 'Narrow blade — etiquette optional.',
    price: 82,
    requirements: { agility: 8, strength: 5 },
    skill: { name: 'Lunge Etude', damage: 16, manaCost: 0, staminaCost: 11 },
  },
  {
    id: 'gear_flail_chain',
    archetype: 'warrior',
    name: 'Chain Flail',
    slot: 'mainHand',
    description: 'Weighted links — physics does the insulting.',
    price: 76,
    requirements: { strength: 8 },
    skill: { name: 'Arc Flail', damage: 15, manaCost: 0, staminaCost: 11 },
  },
  {
    id: 'gear_staff_glass',
    archetype: 'mage',
    name: 'Glasswind Staff',
    slot: 'mainHand',
    description: 'Hollow core whistles spells through cracks.',
    price: 88,
    requirements: { intelligence: 9 },
    skill: { name: 'Shard Gale', damage: 17, manaCost: 12 },
  },
  {
    id: 'gear_glaive_lowlands',
    archetype: 'warrior',
    name: 'Lowlands Glaive',
    slot: 'mainHand',
    description: 'Long curve — reach out and correct someone.',
    price: 105,
    twoHanded: true,
    requirements: { strength: 10, agility: 7 },
    skill: { name: 'Reach Reaper', damage: 24, manaCost: 0, staminaCost: 15 },
  },
  {
    id: 'gear_torch_offhand',
    archetype: 'warrior',
    name: 'Branded Torch',
    slot: 'offHand',
    description: 'Tar-soaked — off-hand heat for stubborn guards.',
    price: 42,
    requirements: { strength: 5 },
    skill: { name: 'Brand Swing', damage: 9, manaCost: 0, staminaCost: 6 },
  },
  {
    id: 'gear_chisel_parma',
    archetype: 'hybrid',
    name: 'Parma Chisel',
    slot: 'offHand',
    description: 'Small round shield riveted to a sharpened rim.',
    price: 58,
    requirements: { strength: 7, agility: 5 },
    skill: { name: 'Rim Hook', damage: 10, manaCost: 0, staminaCost: 7 },
  },
  {
    id: 'gear_orb_dusk',
    archetype: 'mage',
    name: 'Dusk Orb',
    slot: 'offHand',
    description: 'Smoky glass — drinks daylight for a rude pulse.',
    price: 84,
    requirements: { intelligence: 9 },
    skill: { name: 'Gloom Pulse', damage: 15, manaCost: 14 },
  },
  {
    id: 'gear_helm_rustleaf',
    archetype: 'warrior',
    name: 'Rustleaf Barbute',
    slot: 'head',
    description: 'Orange lichen armor — smells like autumn rain and violence.',
    price: 58,
    requirements: { strength: 6 },
    skill: { name: 'Canopy Bash', damage: 9, manaCost: 0, staminaCost: 7 },
  },
  {
    id: 'gear_circlet_tidewake',
    archetype: 'mage',
    name: 'Tidewake Circlet',
    slot: 'head',
    description: 'Pearl pins that hum when spray hits your brow.',
    price: 62,
    requirements: { intelligence: 6 },
    skill: { name: 'Brine Needle', damage: 10, manaCost: 10 },
  },
  {
    id: 'gear_hoops_glimmer',
    archetype: 'rogue',
    name: 'Glimmer Hoops',
    slot: 'ears',
    description: 'Catch torchlight and throw it into eyes.',
    price: 46,
    requirements: { agility: 5 },
    skill: { name: 'Glare Tag', damage: 8, manaCost: 4 },
  },
  {
    id: 'gear_torque_stormloop',
    archetype: 'hybrid',
    name: 'Stormloop Torque',
    slot: 'neck',
    description: 'Bronze serpent eats its tail when thunder rolls.',
    price: 68,
    requirements: { strength: 6, agility: 5 },
    skill: { name: 'Loop Shock', damage: 11, manaCost: 6, staminaCost: 6 },
  },
  {
    id: 'gear_tunic_barkweave',
    archetype: 'rogue',
    name: 'Barkweave Tunic',
    slot: 'body',
    description: 'Flexible bark linen — silent between trees.',
    price: 72,
    requirements: { agility: 7 },
    skill: { name: 'Weave Step', damage: 11, manaCost: 0, staminaCost: 8 },
  },
  {
    id: 'gear_mail_warmridge',
    archetype: 'warrior',
    name: 'Warmridge Hauberk',
    slot: 'body',
    description: 'Riveted rings tempered above lava vents.',
    price: 92,
    requirements: { strength: 9 },
    skill: { name: 'Ridge Ram', damage: 14, manaCost: 0, staminaCost: 11 },
  },
  {
    id: 'gear_bracers_runegrip',
    archetype: 'mage',
    name: 'Runegrip Bracers',
    slot: 'hands',
    description: 'Etched cuffs — spells leave bruises on air.',
    price: 78,
    requirements: { intelligence: 8 },
    skill: { name: 'Grip Sigil', damage: 13, manaCost: 11 },
  },
  {
    id: 'gear_gloves_thiefmesh',
    archetype: 'rogue',
    name: 'Thiefmesh Gloves',
    slot: 'hands',
    description: 'Silk mail fingers — coins hear you coming anyway.',
    price: 66,
    requirements: { agility: 8 },
    skill: { name: 'Palming Strike', damage: 12, manaCost: 0, staminaCost: 8 },
  },
  {
    id: 'gear_cloak_tidewrack',
    archetype: 'mage',
    name: 'Tidewrack Cloak',
    slot: 'back',
    description: 'Still damp — drag salt curtains across their sight.',
    price: 74,
    requirements: { intelligence: 7 },
    skill: { name: 'Spray Veil', damage: 12, manaCost: 11 },
  },
  {
    id: 'gear_cape_mothrift',
    archetype: 'rogue',
    name: 'Mothrift Cape',
    slot: 'back',
    description: 'Powdered wings — dust blinds honest folk.',
    price: 70,
    requirements: { agility: 7 },
    skill: { name: 'Drift Ash', damage: 11, manaCost: 0, staminaCost: 8 },
  },
  {
    id: 'gear_chaps_leatherwild',
    archetype: 'warrior',
    name: 'Leatherwild Chaps',
    slot: 'legs',
    description: 'Studded trails — knees speak louder than threats.',
    price: 64,
    requirements: { strength: 7 },
    skill: { name: 'Stamp Hook', damage: 11, manaCost: 0, staminaCost: 9 },
  },
  {
    id: 'gear_skirt_chainlace',
    archetype: 'hybrid',
    name: 'Chainlace Skirt',
    slot: 'legs',
    description: 'Soft plates ring like polite laughter.',
    price: 76,
    requirements: { agility: 7, intelligence: 5 },
    skill: { name: 'Lace Sweep', damage: 12, manaCost: 5, staminaCost: 8 },
  },
  {
    id: 'gear_boots_highstorm',
    archetype: 'rogue',
    name: 'Highstorm Boots',
    slot: 'feet',
    description: 'Soles grounded — hair still tries to stand.',
    price: 72,
    requirements: { agility: 8 },
    skill: { name: 'Static Kick', damage: 11, manaCost: 0, staminaCost: 8 },
  },
  {
    id: 'gear_sabatons_warmarch',
    archetype: 'warrior',
    name: 'Warmarch Sabatons',
    slot: 'feet',
    description: 'Ash crept inside the forge — still warm.',
    price: 88,
    requirements: { strength: 9 },
    skill: { name: 'Forge Stomp', damage: 13, manaCost: 0, staminaCost: 10 },
  },
  {
    id: 'gear_cutlass_saltbite',
    archetype: 'rogue',
    name: 'Saltbite Cutlass',
    slot: 'mainHand',
    description: 'Corrosion polished to an edge.',
    price: 96,
    requirements: { agility: 9, strength: 6 },
    skill: { name: 'Salt Riposte', damage: 18, manaCost: 0, staminaCost: 12 },
  },
  {
    id: 'gear_hammer_runeforge',
    archetype: 'warrior',
    name: 'Runeforge Hammer',
    slot: 'mainHand',
    description: 'Head stamped with laws metal obeys.',
    price: 102,
    requirements: { strength: 10 },
    skill: { name: 'Law Blow', damage: 21, manaCost: 0, staminaCost: 13 },
  },
  {
    id: 'gear_staff_aetherfocus',
    archetype: 'mage',
    name: 'Aetherfocus Staff',
    slot: 'mainHand',
    description: 'Lens crown bends stray mana into spite.',
    price: 108,
    requirements: { intelligence: 10 },
    skill: { name: 'Focus Ray', damage: 19, manaCost: 13 },
  },
  {
    id: 'gear_blade_coastal',
    archetype: 'warrior',
    name: 'Coastal Falchion',
    slot: 'mainHand',
    description: 'Salt pit steel — tide marks on every notch.',
    price: 98,
    requirements: { strength: 9, agility: 7 },
    skill: { name: 'Breaker Cut', damage: 19, manaCost: 0, staminaCost: 12 },
  },
  {
    id: 'gear_buckler_waverise',
    archetype: 'warrior',
    name: 'Waverise Buckler',
    slot: 'offHand',
    description: 'Boss painted like surf — clang sounds wet.',
    price: 68,
    requirements: { strength: 7 },
    skill: { name: 'Surf Bash', damage: 11, manaCost: 0, staminaCost: 8 },
  },
  {
    id: 'gear_glyph_satchel',
    archetype: 'mage',
    name: 'Satchel of Glyphs',
    slot: 'offHand',
    description: 'Paper charms rustle — math bites.',
    price: 82,
    requirements: { intelligence: 9 },
    skill: { name: 'Paper Burn', damage: 14, manaCost: 13 },
  },
  {
    id: 'gear_mystic_veilrod',
    archetype: 'mystic',
    name: 'Veilthread Rod',
    slot: 'mainHand',
    description: 'Pulled from the Tyrant’s hoard — fate catches where you point.',
    price: 999,
    requirements: { intelligence: 11 },
    skill: { name: 'Thread Collapse', damage: 26, manaCost: 17 },
  },
  {
    id: 'gear_mystic_nightlace',
    archetype: 'mystic',
    name: 'Nightlace Kris',
    slot: 'mainHand',
    description: 'Boss-forged edge; the shadow still remembers the cut.',
    price: 999,
    requirements: { agility: 11, intelligence: 6 },
    skill: { name: 'Silent Diagram', damage: 22, manaCost: 11 },
  },
  {
    id: 'gear_legend_worldrend',
    archetype: 'legend',
    name: 'Worldrend Claymore',
    slot: 'mainHand',
    description: 'Quenched in obsidian breath — crowns kneel before it.',
    price: 999,
    twoHanded: true,
    requirements: { strength: 13, agility: 8 },
    skill: { name: 'Crown Splitter', damage: 34, manaCost: 0, staminaCost: 19 },
  },
  {
    id: 'gear_legend_stormlance',
    archetype: 'legend',
    name: 'Stormpierce Lance',
    slot: 'mainHand',
    description: 'Griffin-down wrap and a tip that outsprints thunder.',
    price: 999,
    twoHanded: true,
    requirements: { strength: 12, agility: 10 },
    skill: { name: 'Sky Rent', damage: 32, manaCost: 0, staminaCost: 17 },
  },
]

export const GEAR_BY_ID: Readonly<Record<string, GearItemDef>> = Object.fromEntries(
  GEAR_CATALOG.map((g) => [g.id, g]),
)

/** Max durability per gear definition — ties item tier/stamina sink together. */
export function maxDurabilityForGear(def: GearItemDef): number {
  return Math.min(200, 40 + Math.floor(def.price * 0.38))
}

export function maxDurabilityForGearId(id: string): number {
  const g = GEAR_BY_ID[id]
  return g ? maxDurabilityForGear(g) : 40
}

export function newGearStack(gearId: string): GearStack {
  return { gearId, durability: maxDurabilityForGearId(gearId) }
}

/** Legacy saves used raw id strings; tolerate malformed rows from older clients. */
export function normalizeGearStack(entry: unknown): GearStack | null {
  if (entry == null) return null
  if (typeof entry === 'string') {
    return { gearId: entry, durability: maxDurabilityForGearId(entry) }
  }
  if (typeof entry === 'object') {
    const o = entry as Record<string, unknown>
    const gearId = o.gearId
    if (typeof gearId !== 'string') return null
    const rawD = o.durability
    const durability =
      typeof rawD === 'number' && Number.isFinite(rawD)
        ? Math.max(0, rawD)
        : maxDurabilityForGearId(gearId)
    return { gearId, durability }
  }
  return null
}

/** Durability lost each time you swing this gear’s skill (bare strike does not use gear). */
export function wearPerAttackUse(skill: SkillDef): number {
  return Math.max(2, Math.min(16, 2 + Math.floor(skill.damage / 10)))
}

export function formatDurabilityLine(stack: GearStack): string {
  const g = GEAR_BY_ID[stack.gearId]
  const max = g ? maxDurabilityForGear(g) : stack.durability
  return `${stack.durability}/${max}`
}

/** Gold to restore this stack to full durability (0 if already full or unknown gear). */
export function repairCostForStack(stack: GearStack): number {
  const def = GEAR_BY_ID[stack.gearId]
  if (!def) return 0
  const max = maxDurabilityForGear(def)
  if (stack.durability >= max) return 0
  const missing = max - stack.durability
  return Math.max(1, Math.ceil((missing / max) * def.price * 0.22))
}

export function getSlotDurability(player: PlayerState, slot: EquipmentSlotId): number {
  const id = player.equipment[slot]
  if (!id) return 0
  const d = player.equipmentDurability[slot]
  if (d !== undefined && d !== null) return d
  return maxDurabilityForGearId(id)
}

export function wearGearSlot(player: PlayerState, slot: EquipmentSlotId, amount: number): PlayerState {
  const cur = getSlotDurability(player, slot)
  return {
    ...player,
    equipmentDurability: { ...player.equipmentDurability, [slot]: Math.max(0, cur - amount) },
  }
}

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

export function describeEquipBlock(player: PlayerState, packIndex: number): string | null {
  if (!Number.isFinite(packIndex) || packIndex < 0 || packIndex !== Math.floor(packIndex)) {
    return 'That stack is not in your pack.'
  }
  const stack = normalizeGearStack(player.gearOwned[packIndex])
  if (!stack) return 'That stack is not in your pack.'
  const def = GEAR_BY_ID[stack.gearId]
  if (!def) return 'Unknown item.'
  if (stack.durability <= 0) return 'That gear is broken — repair it at the blacksmith before wearing it.'
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

export function tryUnequipSlot(player: PlayerState, slot: EquipmentSlotId): PlayerState | null {
  const id = player.equipment[slot]
  if (!id) return null
  const d = getSlotDurability(player, slot)
  const stack: GearStack = { gearId: id, durability: d }
  const equipmentDurability = { ...player.equipmentDurability }
  delete equipmentDurability[slot]
  return {
    ...player,
    equipment: { ...player.equipment, [slot]: null },
    gearOwned: [...player.gearOwned, stack],
    equipmentDurability,
  }
}

export function tryEquipFromBag(player: PlayerState, packIndex: number): PlayerState | null {
  if (!Number.isFinite(packIndex) || packIndex < 0 || packIndex !== Math.floor(packIndex)) return null
  const stack = normalizeGearStack(player.gearOwned[packIndex])
  if (!stack || stack.durability <= 0) return null
  const def = GEAR_BY_ID[stack.gearId]
  if (!def) return null
  if (!playerMeetsStatRequirements(player, def)) return null

  if (def.slot === 'offHand' && player.equipment.mainHand) {
    const main = GEAR_BY_ID[player.equipment.mainHand]
    if (main?.twoHanded) return null
  }

  let equipment: PlayerEquipment = { ...player.equipment }
  let equipmentDurability: Partial<Record<EquipmentSlotId, number>> = { ...player.equipmentDurability }
  const bumped: GearStack[] = []

  if (def.slot === 'mainHand' && def.twoHanded && equipment.offHand) {
    const oid = equipment.offHand
    const od = getSlotDurability(player, 'offHand')
    bumped.push({ gearId: oid, durability: od })
    equipment = { ...equipment, offHand: null }
    delete equipmentDurability.offHand
  }

  const previousId = equipment[def.slot]
  if (previousId) {
    bumped.push({ gearId: previousId, durability: getSlotDurability(player, def.slot) })
  }

  equipment[def.slot] = stack.gearId
  equipmentDurability[def.slot] = stack.durability

  const gearOwned = player.gearOwned.filter((_, i) => i !== packIndex)

  return {
    ...player,
    equipment,
    equipmentDurability,
    gearOwned: [...gearOwned, ...bumped],
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
    if (getSlotDurability(player, slot) <= 0) continue
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
