import { syncEquipmentFacetCharges } from './facets'
import { COMBAT_GEAR_SLOT_ORDER, emptyPlayerEquipment, maxDurabilityForGearId } from './gear'
import { rollBirthInnates } from './innates'
import type {
  DamageKind,
  EnemyState,
  EquipmentSlotId,
  PlaceDef,
  PlayerEquipment,
  PlayerState,
  ShopConsumableDef,
  ShopStatTomeDef,
  ShopUpgradeDef,
  StatusApply,
} from './types'

/** Static mob row — optional affinity fields alter damage dealt/taken in combat. */
export interface MobTemplate {
  key: number
  display: string
  hp: number
  skill: string
  damage: number
  attackKind?: DamageKind
  physicalTakenMul?: number
  magicalTakenMul?: number
  stunImmune?: boolean
}

/** Single template — no classes; growth comes from level, upgrades, and gear you can wear (stat gates). */
export const ADVENTURER_BASE = {
  hp: 100,
  stamina: 100,
  mana: 85,
  level: 1,
  gold: 24,
  stats: { strength: 3, agility: 3, intelligence: 3 },
} as const

export const MOBS: (MobTemplate | null)[] = [
  null,
  { key: 1, display: 'Slime', hp: 20, skill: 'Smash', damage: 5, physicalTakenMul: 0.88, magicalTakenMul: 1.28 },
  { key: 2, display: 'Rabbit(Harmless)', hp: 10, skill: 'Do Nothing', damage: 0 },
  { key: 3, display: 'Wild Cat', hp: 15, skill: 'Cat Slash', damage: 6, physicalTakenMul: 0.92 },
  { key: 4, display: 'Wolf', hp: 25, skill: 'Sharp Claws', damage: 7 },
  { key: 5, display: 'Goblin', hp: 25, skill: 'Dagger Swipe', damage: 10 },
  {
    key: 6,
    display: 'Ironhide Boar',
    hp: 38,
    skill: 'Tusk Rush',
    damage: 13,
    physicalTakenMul: 0.72,
    magicalTakenMul: 1.15,
  },
  { key: 7, display: 'Highway Bandit', hp: 42, skill: 'Dirty Strike', damage: 15 },
  { key: 8, display: 'Cave Troll', hp: 58, skill: 'Boulder Toss', damage: 19, physicalTakenMul: 0.82 },
  {
    key: 9,
    display: 'Frost Wraith',
    hp: 48,
    skill: 'Chill Touch',
    damage: 17,
    attackKind: 'magical',
    physicalTakenMul: 1.22,
    magicalTakenMul: 0.78,
  },
  {
    key: 10,
    display: 'Frost Jarl',
    hp: 75,
    skill: 'Ice Cleaver',
    damage: 24,
    attackKind: 'magical',
    physicalTakenMul: 0.78,
    magicalTakenMul: 0.92,
  },
  { key: 11, display: 'Giant Spider', hp: 44, skill: 'Venom Bite', damage: 16 },
  {
    key: 12,
    display: 'Grave Knight',
    hp: 70,
    skill: 'Rusting Cleave',
    damage: 21,
    physicalTakenMul: 0.68,
    magicalTakenMul: 1.06,
    stunImmune: true,
  },
  {
    key: 13,
    display: 'Basilisk',
    hp: 74,
    skill: 'Stone Glare',
    damage: 23,
    attackKind: 'magical',
    magicalTakenMul: 0.85,
  },
  {
    key: 14,
    display: 'Stone Guardian',
    hp: 96,
    skill: 'Hammer Punch',
    damage: 27,
    physicalTakenMul: 0.62,
    magicalTakenMul: 1.12,
  },
  { key: 15, display: 'Crimson Vampire', hp: 82, skill: 'Drain Claw', damage: 26, magicalTakenMul: 0.9 },
  {
    key: 16,
    display: 'Storm Griffin',
    hp: 92,
    skill: 'Lightning Talon',
    damage: 30,
    attackKind: 'magical',
    physicalTakenMul: 1.1,
    magicalTakenMul: 0.88,
  },
  {
    key: 17,
    display: 'Ash Drake',
    hp: 108,
    skill: 'Molten Breath',
    damage: 33,
    attackKind: 'magical',
    physicalTakenMul: 1.05,
    magicalTakenMul: 0.82,
  },
  {
    key: 18,
    display: 'Void Herald',
    hp: 118,
    skill: 'Null Pulse',
    damage: 35,
    attackKind: 'magical',
    physicalTakenMul: 0.88,
    magicalTakenMul: 0.88,
  },
  /** Obsidian Depths region boss — drops mystic / legend weapons only. */
  {
    key: 19,
    display: 'Obsidian Tyrant',
    hp: 185,
    skill: 'Cataclysm Shear',
    damage: 44,
    physicalTakenMul: 0.55,
    magicalTakenMul: 0.58,
    stunImmune: true,
  },
  { key: 20, display: 'Rotwood Brambler', hp: 50, skill: 'Thorn Lash', damage: 17, physicalTakenMul: 0.9 },
  {
    key: 21,
    display: 'Drowned Courtier',
    hp: 48,
    skill: 'Salt Pull',
    damage: 17,
    attackKind: 'magical',
    physicalTakenMul: 1.08,
    magicalTakenMul: 0.86,
  },
  { key: 22, display: 'Ember Homunculus', hp: 44, skill: 'Cinder Dart', damage: 16, attackKind: 'magical' },
  { key: 23, display: 'Crown Asp', hp: 54, skill: 'Coil Fang', damage: 18 },
  {
    key: 24,
    display: 'Bog Ancient',
    hp: 168,
    skill: 'Root Tyranny',
    damage: 38,
    physicalTakenMul: 0.58,
    magicalTakenMul: 0.62,
    stunImmune: true,
  },
  { key: 25, display: 'Murk Reaver', hp: 56, skill: 'Silt Slash', damage: 18 },
  {
    key: 26,
    display: 'Iron Choir Knight',
    hp: 60,
    skill: 'Bell Strike',
    damage: 19,
    physicalTakenMul: 0.75,
    stunImmune: true,
  },
  { key: 27, display: 'Ash Stalker', hp: 58, skill: 'Ember Kick', damage: 19 },
  {
    key: 28,
    display: 'Tidebreaker Hydra',
    hp: 178,
    skill: 'Triple Spite',
    damage: 40,
    physicalTakenMul: 0.52,
    magicalTakenMul: 0.55,
    stunImmune: true,
  },
  { key: 29, display: 'Highland Raider', hp: 64, skill: 'Axe Descent', damage: 20 },
  { key: 30, display: 'Magma Skulk', hp: 68, skill: 'Slag Toss', damage: 21, attackKind: 'magical' },
  {
    key: 31,
    display: 'Glasswing Sentinel',
    hp: 72,
    skill: 'Prism Cut',
    damage: 22,
    physicalTakenMul: 0.95,
    magicalTakenMul: 0.82,
  },
  {
    key: 32,
    display: 'Ashfang Patriarch',
    hp: 192,
    skill: 'Molten Edict',
    damage: 42,
    attackKind: 'magical',
    physicalTakenMul: 0.54,
    magicalTakenMul: 0.56,
    stunImmune: true,
  },
  {
    key: 33,
    display: 'Bone Auditor',
    hp: 76,
    skill: 'Ledger Slam',
    damage: 23,
    physicalTakenMul: 0.78,
    magicalTakenMul: 1.05,
  },
  {
    key: 34,
    display: 'Veil Revenant',
    hp: 80,
    skill: 'Grave Pulse',
    damage: 24,
    attackKind: 'magical',
    physicalTakenMul: 1.05,
    magicalTakenMul: 0.8,
  },
  {
    key: 35,
    display: 'Storm Corsair',
    hp: 84,
    skill: 'Chain Bolt',
    damage: 25,
    attackKind: 'magical',
    physicalTakenMul: 1.06,
    magicalTakenMul: 0.87,
  },
  {
    key: 36,
    display: 'Catacomb Lich',
    hp: 208,
    skill: 'Soul Ledger',
    damage: 44,
    attackKind: 'magical',
    physicalTakenMul: 0.56,
    magicalTakenMul: 0.52,
    stunImmune: true,
  },
  {
    key: 37,
    display: 'Spire Archivist',
    hp: 88,
    skill: 'Index Bolt',
    damage: 26,
    attackKind: 'magical',
    magicalTakenMul: 0.84,
  },
  {
    key: 38,
    display: 'Astral Usurper',
    hp: 228,
    skill: 'Star Rivet',
    damage: 48,
    attackKind: 'magical',
    physicalTakenMul: 0.52,
    magicalTakenMul: 0.5,
    stunImmune: true,
  },
  { key: 39, display: 'Cloud Leviathan', hp: 94, skill: 'Pressure Bite', damage: 28, physicalTakenMul: 0.78 },
  { key: 40, display: 'Saltmarsh Eel', hp: 52, skill: 'Brine Snap', damage: 19, attackKind: 'magical', physicalTakenMul: 1.06, magicalTakenMul: 0.9 },
  { key: 41, display: 'Mossback Tortoise', hp: 68, skill: 'Shell Ram', damage: 15, physicalTakenMul: 0.66 },
  { key: 42, display: 'Lantern Wisp', hp: 44, skill: 'Will-o-Blast', damage: 16, attackKind: 'magical', magicalTakenMul: 0.88 },
  { key: 43, display: 'Briar Hexling', hp: 56, skill: 'Thorn Hex', damage: 18, attackKind: 'magical', physicalTakenMul: 1.04, magicalTakenMul: 0.86 },
  { key: 44, display: 'Crypt Duster', hp: 62, skill: 'Ash Veil', damage: 18, physicalTakenMul: 0.93 },
  { key: 45, display: 'Gargoyle Fledgling', hp: 58, skill: 'Stone Peck', damage: 17, physicalTakenMul: 0.74, magicalTakenMul: 0.95 },
  { key: 46, display: 'Frostbite Hound', hp: 64, skill: 'Rime Jaw', damage: 21, attackKind: 'magical', physicalTakenMul: 1.02, magicalTakenMul: 0.84 },
  { key: 47, display: 'Shiver Shade', hp: 50, skill: 'Cold Grasp', damage: 17, attackKind: 'magical', magicalTakenMul: 0.82 },
  { key: 48, display: 'Ridge Harpy', hp: 54, skill: 'Dive Talon', damage: 20, physicalTakenMul: 0.91 },
  { key: 49, display: 'Bog Leech Cluster', hp: 48, skill: 'Sanguine Suck', damage: 17, physicalTakenMul: 1.08, magicalTakenMul: 0.9 },
  { key: 50, display: 'Brass Golem', hp: 88, skill: 'Gear Slam', damage: 23, physicalTakenMul: 0.7, magicalTakenMul: 1.08, stunImmune: true },
  { key: 51, display: 'Silk Widow', hp: 62, skill: 'Web Nova', damage: 19, attackKind: 'magical', magicalTakenMul: 0.86 },
  { key: 52, display: 'Cinder Djinn', hp: 76, skill: 'Spark Wish', damage: 24, attackKind: 'magical', physicalTakenMul: 1.04, magicalTakenMul: 0.82 },
  { key: 53, display: 'Saltborn Pillager', hp: 70, skill: 'Harpoon Hook', damage: 21, physicalTakenMul: 0.88 },
  { key: 54, display: 'Mirror Sprite', hp: 46, skill: 'Refraction Cut', damage: 16, attackKind: 'magical', physicalTakenMul: 1.12, magicalTakenMul: 0.78 },
  { key: 55, display: 'Ironvine Treant', hp: 92, skill: 'Root Lash', damage: 25, physicalTakenMul: 0.62, magicalTakenMul: 1.1 },
  { key: 56, display: 'Gloom Puppet', hp: 58, skill: 'Marionette Slash', damage: 18, attackKind: 'magical' },
  { key: 57, display: 'Dusk Stalker', hp: 72, skill: 'Shadow Pounce', damage: 22, physicalTakenMul: 0.86, magicalTakenMul: 0.92 },
  { key: 58, display: 'Ember Serpent', hp: 78, skill: 'Coil Burn', damage: 24, attackKind: 'magical', magicalTakenMul: 0.84 },
  { key: 59, display: 'Tidecaller Shrimp', hp: 52, skill: 'Bubble Cannon', damage: 17, attackKind: 'magical', physicalTakenMul: 1.06, magicalTakenMul: 0.88 },
  { key: 60, display: 'Quarry Crusher', hp: 96, skill: 'Hammer Fist', damage: 26, physicalTakenMul: 0.68, stunImmune: true },
  { key: 61, display: 'Starveling Bat', hp: 42, skill: 'Screech Dive', damage: 15, physicalTakenMul: 0.94 },
  { key: 62, display: 'Ledger Ghost', hp: 56, skill: 'Ink Smear', damage: 18, attackKind: 'magical', magicalTakenMul: 0.9 },
  { key: 63, display: 'Sulfur Imp', hp: 48, skill: 'Stink Bomb', damage: 16, attackKind: 'magical', physicalTakenMul: 1.02, magicalTakenMul: 0.88 },
  { key: 64, display: 'Quicksilver Ooze', hp: 74, skill: 'Mercury Wave', damage: 21, attackKind: 'magical', physicalTakenMul: 1.08, magicalTakenMul: 0.78 },
  { key: 65, display: 'Wicker Bogey', hp: 54, skill: 'Twig Thrash', damage: 18, physicalTakenMul: 0.9 },
  { key: 66, display: 'Nightglass Stalker', hp: 80, skill: 'Shard Kick', damage: 23, physicalTakenMul: 0.84, magicalTakenMul: 0.88 },
  { key: 67, display: 'Rust Knight', hp: 84, skill: 'Oxide Cleave', damage: 24, physicalTakenMul: 0.72, magicalTakenMul: 1.04, stunImmune: true },
  { key: 68, display: 'Spore Monarch', hp: 66, skill: 'Spore Crown', damage: 20, attackKind: 'magical', magicalTakenMul: 0.86 },
  { key: 69, display: 'Deepwater Angler', hp: 88, skill: 'Lure Strike', damage: 24, attackKind: 'magical', physicalTakenMul: 1.02, magicalTakenMul: 0.82 },
  { key: 70, display: 'Granite Colossus', hp: 118, skill: 'Seismic Stomp', damage: 30, physicalTakenMul: 0.58, magicalTakenMul: 1.12, stunImmune: true },
  { key: 71, display: 'Umbral Lynx', hp: 76, skill: 'Gloom Rip', damage: 23, physicalTakenMul: 0.88, magicalTakenMul: 0.9 },
  { key: 72, display: 'Thunderscale Drake', hp: 102, skill: 'Static Breath', damage: 29, attackKind: 'magical', physicalTakenMul: 0.98, magicalTakenMul: 0.8 },
  { key: 73, display: 'Pale Reaper', hp: 72, skill: 'Scythe Arc', damage: 24, attackKind: 'magical', magicalTakenMul: 0.84 },
  { key: 74, display: 'Runic Sentinel', hp: 94, skill: 'Glyph Beam', damage: 26, attackKind: 'magical', physicalTakenMul: 0.92, magicalTakenMul: 0.78, stunImmune: true },
  { key: 75, display: 'Bloodletter Cultist', hp: 64, skill: 'Ritual Knife', damage: 21, physicalTakenMul: 0.96 },
  { key: 76, display: 'Mire Hydra Spawn', hp: 98, skill: 'Triple Nip', damage: 27, physicalTakenMul: 0.64, magicalTakenMul: 0.94 },
  { key: 77, display: 'Sunscorch Elemental', hp: 86, skill: 'Solar Flare', damage: 27, attackKind: 'magical', magicalTakenMul: 0.82 },
  { key: 78, display: 'Obsidian Gremlin', hp: 58, skill: 'Glass Shatter', damage: 19, physicalTakenMul: 0.88, magicalTakenMul: 0.92 },
  { key: 79, display: 'Void-Touched Ape', hp: 104, skill: 'Null Slam', damage: 29, attackKind: 'magical', physicalTakenMul: 0.9, magicalTakenMul: 0.86 },
  { key: 80, display: 'Coral Crown Knight', hp: 112, skill: 'Reef Lance', damage: 31, physicalTakenMul: 0.7, magicalTakenMul: 0.96, stunImmune: true },
  { key: 81, display: 'Nimbus Roc', hp: 96, skill: 'Gale Rend', damage: 28, physicalTakenMul: 0.92 },
  { key: 82, display: 'Chorus Banshee', hp: 84, skill: 'Wail Wave', damage: 27, attackKind: 'magical', magicalTakenMul: 0.8 },
  { key: 83, display: 'Pyre Tyrant Spawn', hp: 122, skill: 'Cinder Roar', damage: 33, attackKind: 'magical', physicalTakenMul: 0.62, magicalTakenMul: 0.72 },
  { key: 84, display: 'Moonlit Werewolf', hp: 108, skill: 'Lunar Maul', damage: 32, physicalTakenMul: 0.76, magicalTakenMul: 0.94 },
  { key: 85, display: 'Azure Shieldguard', hp: 116, skill: 'Aegis Bash', damage: 31, physicalTakenMul: 0.66, magicalTakenMul: 1.06, stunImmune: true },
  { key: 86, display: 'Eclipse Oracle', hp: 92, skill: 'Omen Bolt', damage: 29, attackKind: 'magical', magicalTakenMul: 0.76 },
  { key: 87, display: 'Worldshell Beetle', hp: 132, skill: 'Carapace Ram', damage: 30, physicalTakenMul: 0.6, magicalTakenMul: 1.08, stunImmune: true },
  { key: 88, display: 'Halo Seraph (Fallen)', hp: 140, skill: 'Ruined Smite', damage: 35, attackKind: 'magical', physicalTakenMul: 0.66, magicalTakenMul: 0.74 },
  { key: 89, display: 'Endstrom Leviathan', hp: 188, skill: 'Maelstrom Maw', damage: 40, attackKind: 'magical', physicalTakenMul: 0.58, magicalTakenMul: 0.62, stunImmune: true },
]

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
    mobPool: [2, 1, 61],
  },
  {
    id: 'whisper_Wela',
    name: 'Whisper Wela',
    shortName: 'the Wela',
    description: 'Dense trees and the encounters you know from camp tales.',
    levelRecommended: '1–4',
    levelMin: 1,
    levelMax: 4,
    mobPool: [1, 2, 3, 40, 41],
  },
  {
    id: 'black_fen',
    name: 'Black Fen',
    shortName: 'the fen',
    description: 'Marsh gas and teeth. Tougher beasts roam here.',
    levelRecommended: '3–6',
    levelMin: 3,
    levelMax: 6,
    mobPool: [3, 4, 5, 11, 42, 43, 49],
  },
  {
    id: 'ruined_tower',
    name: 'Ruined Tower',
    shortName: 'the ruins',
    description: 'Collapsed stone and bandits nesting in the stairwells.',
    levelRecommended: '5–9',
    levelMin: 5,
    levelMax: 9,
    mobPool: [4, 5, 6, 7, 11, 12, 13, 44, 45, 48, 53, 54, 57],
  },
  {
    id: 'frostpeak_pass',
    name: 'Frostpeak Pass',
    shortName: 'the pass',
    description: 'Thin air, ice, and things that do not forgive mistakes.',
    levelRecommended: '8–14',
    levelMin: 8,
    levelMax: 14,
    mobPool: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 46, 47, 56, 50, 55],
  },
  {
    id: 'obsidian_depths',
    name: 'Obsidian Depths',
    shortName: 'the depths',
    description: 'Glass-black caverns and things that end quests.',
    levelRecommended: '12–20',
    levelMin: 12,
    levelMax: 20,
    mobPool: [14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 78, 79, 83, 70, 71, 74],
  },
  {
    id: 'amber_glades',
    name: 'Amber Glades',
    shortName: 'the glades',
    description: 'Honeyed light through amber leaves — soft paths, sharp inhabitants.',
    levelRecommended: '4–8',
    levelMin: 4,
    levelMax: 8,
    mobPool: [5, 6, 11, 12, 20, 21, 24, 49, 51, 65],
  },
  {
    id: 'sunken_court',
    name: 'Sunken Court',
    shortName: 'the court',
    description: 'Flooded halls where drowned banners still wave.',
    levelRecommended: '7–11',
    levelMin: 7,
    levelMax: 11,
    mobPool: [11, 12, 21, 22, 7, 23, 28, 59, 63, 69],
  },
  {
    id: 'ember_highlands',
    name: 'Ember Highlands',
    shortName: 'the highlands',
    description: 'Ash wind and lava seams — the climb burns going up or down.',
    levelRecommended: '10–15',
    levelMin: 10,
    levelMax: 15,
    mobPool: [22, 14, 17, 26, 29, 30, 32, 52, 58, 64, 75, 76, 77],
  },
  {
    id: 'veilgrave_catacombs',
    name: 'Veilgrave Catacombs',
    shortName: 'Veilgrave',
    description: 'Stacked dead cities — something audits the ledger below.',
    levelRecommended: '13–18',
    levelMin: 13,
    levelMax: 18,
    mobPool: [12, 13, 31, 33, 34, 36, 56, 62, 66, 73, 60, 67, 68],
  },
  {
    id: 'stormbreak_coast',
    name: 'Stormbreak Coast',
    shortName: 'the coast',
    description: 'Salt cliffs where lightning argues with the tide.',
    levelRecommended: '15–22',
    levelMin: 15,
    levelMax: 22,
    mobPool: [16, 17, 33, 34, 35, 35, 28, 69, 72, 81, 82, 80, 85],
  },
  {
    id: 'astral_spire',
    name: 'Astral Spire',
    shortName: 'the Spire',
    description: 'The stair rises through cloud — sky-things answer the bell.',
    levelRecommended: '18–28',
    levelMin: 18,
    levelMax: 28,
    mobPool: [17, 18, 37, 39, 38, 38, 72, 79, 84, 86, 88, 89, 87],
  },
]

export function isBossMob(mobId: number): boolean {
  return BOSS_MOB_SET.has(mobId)
}

export const SHOP_CONSUMABLES: ShopConsumableDef[] = [
  {
    id: 'healthPotion',
    name: 'Red Tonic',
    description:
      'Restore HP — chunky base + Vitality (+12/rank) + a generous slice of max HP.',
    price: 28,
    icon: 'potion',
  },
  {
    id: 'manaDraught',
    name: 'Blue Tonic',
    description:
      'Restore MP — chunky base + Arcana (+11/rank) + a slice of max mana.',
    price: 24,
    icon: 'vial',
  },
  {
    id: 'staminaBrew',
    name: 'Green Tonic',
    description:
      'Restore STA — chunky base + Endurance (+11/rank) + a slice of max stamina.',
    price: 20,
    icon: 'leaf',
  },
  {
    id: 'cleanseScroll',
    name: 'Cleanse Scroll',
    description: 'Battle only — strips every buff and debuff on you.',
    price: 42,
    icon: 'scroll',
  },
  {
    id: 'immunePhilter',
    name: 'Spellbound Philter',
    description: 'Battle — Spellbound Aegis (5 turns): ignores stuns.',
    price: 55,
    icon: 'shield',
  },
  {
    id: 'immuneElixir',
    name: 'Greater Aegis Elixir',
    description: 'Battle — Spellbound Aegis (10 turns): ignores stuns.',
    price: 110,
    icon: 'shield',
  },
  {
    id: 'mightDraught',
    name: 'Battle Might Draught',
    description: 'Battle — +12 strike power from Battle Might (5 turns).',
    price: 52,
    icon: 'star',
  },
  {
    id: 'sunriseCordial',
    name: 'Sunrise Cordial',
    description:
      'Anywhere — splash HP, MP, and STA at once (~58% potency each vs matching tonic). Premium pacing.',
    price: 98,
    icon: 'vial',
  },
  {
    id: 'prismaticDraught',
    name: 'Prismatic Bulwark Draught',
    description:
      'Battle — Prism Shield (58 absorption pool, 5 turns) + Battle Might (+14 strike, 5 turns).',
    price: 135,
    icon: 'shield',
  },
  {
    id: 'apexMightDraught',
    name: 'Apex Might Decanter',
    description: 'Battle — +24 strike power from Battle Might (5 turns).',
    price: 118,
    icon: 'star',
  },
  {
    id: 'veilPhilter',
    name: 'Veil Philter',
    description: 'Battle — Spellbound Aegis (8 turns): ignores stuns.',
    price: 92,
    icon: 'shield',
  },
  {
    id: 'championCordial',
    name: 'Champion Sovereign Cordial',
    description: 'Battle — Battle Might (+20 strike, 5 turns) + Spellbound Aegis (4 turns).',
    price: 168,
    icon: 'star',
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
  const base: PlayerState = {
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
    inventory: {
      healthPotion: 0,
      manaDraught: 0,
      staminaBrew: 0,
      cleanseScroll: 0,
      immunePhilter: 0,
      immuneElixir: 0,
      mightDraught: 0,
      sunriseCordial: 0,
      prismaticDraught: 0,
      apexMightDraught: 0,
      veilPhilter: 0,
      championCordial: 0,
    },
    gearOwned: [],
    equipment,
    equipmentDurability: starterEquipmentDurability(equipment),
    salvageLoot: {},
  }
  const emptyPrev: PlayerState = {
    ...base,
    equipment: emptyPlayerEquipment(),
    equipmentDurability: {},
    equipmentFacetCharges: {},
  }
  return syncEquipmentFacetCharges(emptyPrev, base)
}

/** Statuses inflicted on the player when this mob lands a hit (deterministic). */
export const COMBAT_MOB_ON_HIT: Partial<Record<number, StatusApply[]>> = {
  5: [{ id: 'bleeding', turns: 2, potency: 2 }],
  9: [{ id: 'chilled', turns: 2, potency: 2 }],
  11: [{ id: 'poisoned', turns: 3, potency: 3 }],
  17: [{ id: 'burning', turns: 2, potency: 4 }],
  12: [{ id: 'stunned', turns: 1 }],
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
    playerStatusesOnHit: COMBAT_MOB_ON_HIT[id],
    attackKind: m.attackKind,
    physicalTakenMul: m.physicalTakenMul,
    magicalTakenMul: m.magicalTakenMul,
    stunImmune: m.stunImmune,
  }
}

export function upgradePrice(basePrice: number, rank: number): number {
  return Math.floor(basePrice * Math.pow(1.32, rank))
}
