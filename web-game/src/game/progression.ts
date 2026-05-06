import {
  ADVENTURER_BASE,
  MAX_PLAYER_STAT,
  SHOP_CONSUMABLES,
  SHOP_STAT_TOMES,
  SHOP_UPGRADES,
  statTomePrice,
  upgradePrice,
  xpRequiredForNextLevel,
} from './constants'
import {
  GEAR_BY_ID,
  getSlotDurability,
  isBossDropGear,
  maxDurabilityForGear,
  merchantBuyPrice,
  newGearStack,
  normalizeGearStack,
  repairCostForStack,
} from './gear'
import { SALVAGE_BY_ID } from './salvage'
import { applyInnateDamageBonuses } from './innates'
import type {
  EquipmentSlotId,
  PlayerState,
  ShopConsumableId,
  ShopStatTomeId,
  ShopUpgradeId,
  SkillDef,
} from './types'

export interface MaxStats {
  maxHp: number
  maxStamina: number
  maxMana: number
}

export function getMaxStats(player: PlayerState): MaxStats {
  const def = ADVENTURER_BASE
  const L = player.level
  const u = player.upgrades
  const hpFromLevel = (L - 1) * 6
  const staFromLevel = (L - 1) * 5
  const manaFromLevel = (L - 1) * 4
  return {
    maxHp: def.hp + hpFromLevel + u.vitality * 10,
    maxStamina: def.stamina + staFromLevel + u.endurance * 10,
    maxMana: def.mana + manaFromLevel + u.arcana * 12,
  }
}

/** Striking upgrade + light level scaling + innate flat/% damage gifts. */
export function getEffectiveSkillDamage(player: PlayerState, skill: SkillDef): number {
  const levelMul = 1 + (player.level - 1) * 0.022
  let raw = skill.damage * levelMul + player.upgrades.striking
  raw = applyInnateDamageBonuses(player, raw)
  return Math.max(0, Math.floor(raw))
}

export function getEffectiveManaCost(player: PlayerState, skill: SkillDef): number {
  const reduc = Math.min(0.35, player.level * 0.01 + player.upgrades.arcana * 0.02)
  return Math.max(0, skill.manaCost * (1 - reduc))
}

/** Same scaling pattern as mana, keyed off Endurance upgrades. */
export function getEffectiveStaminaCost(player: PlayerState, skill: SkillDef): number {
  const base = skill.staminaCost ?? 0
  const reduc = Math.min(0.35, player.level * 0.01 + player.upgrades.endurance * 0.02)
  return Math.max(0, base * (1 - reduc))
}

/** Shop / codex: printed resource line before battle reductions. */
export function formatSkillResourceDef(skill: SkillDef): string {
  const mp = skill.manaCost
  const st = skill.staminaCost ?? 0
  const parts: string[] = []
  if (mp > 0) parts.push(`${mp} MP`)
  if (st > 0) parts.push(`${st} STA`)
  return parts.length ? parts.join(' · ') : 'Free'
}

export function clampResource(current: number, max: number): number {
  return Math.min(max, Math.max(0, current))
}

export function clampPlayerBaseStats(player: PlayerState): PlayerState {
  return {
    ...player,
    stats: {
      strength: Math.min(MAX_PLAYER_STAT, Math.max(1, player.stats.strength)),
      agility: Math.min(MAX_PLAYER_STAT, Math.max(1, player.stats.agility)),
      intelligence: Math.min(MAX_PLAYER_STAT, Math.max(1, player.stats.intelligence)),
    },
  }
}

export function applyMaxCaps(player: PlayerState): PlayerState {
  const p = clampPlayerBaseStats(player)
  const m = getMaxStats(p)
  return {
    ...p,
    hp: clampResource(p.hp, m.maxHp),
    stamina: clampResource(p.stamina, m.maxStamina),
    mana: clampResource(p.mana, m.maxMana),
  }
}

export interface LevelUpResult {
  player: PlayerState
  levelsGained: number
  messages: string[]
}

/** Apply XP; may chain level-ups. Full heal on each level gained. */
export function addXp(player: PlayerState, amount: number): LevelUpResult {
  let p: PlayerState = { ...player, xp: player.xp + amount }
  const messages: string[] = []
  let levelsGained = 0

  while (p.xp >= p.xpToNext) {
    p.xp -= p.xpToNext
    const newLevel = p.level + 1
    p = {
      ...p,
      level: newLevel,
      stats: {
        strength: Math.min(MAX_PLAYER_STAT, p.stats.strength + 1),
        agility: Math.min(MAX_PLAYER_STAT, p.stats.agility + 1),
        intelligence: Math.min(MAX_PLAYER_STAT, p.stats.intelligence + 1),
      },
      xpToNext: xpRequiredForNextLevel(newLevel),
    }
    levelsGained += 1
    messages.push(`LEVEL UP! You are now level ${newLevel}. STR / AGI / INT +1 each — new gear may unlock.`)
    const max = getMaxStats(p)
    p = { ...p, hp: max.maxHp, stamina: max.maxStamina, mana: max.maxMana }
  }

  return { player: applyMaxCaps(p), levelsGained, messages }
}

export function tryBuyConsumable(player: PlayerState, id: ShopConsumableId): PlayerState | null {
  const def = SHOP_CONSUMABLES.find((c) => c.id === id)
  if (!def || player.gold < def.price) return null
  return {
    ...player,
    gold: player.gold - def.price,
    inventory: { ...player.inventory, [id]: player.inventory[id] + 1 },
  }
}

export function tryBuyGear(player: PlayerState, gearId: string): PlayerState | null {
  const def = GEAR_BY_ID[gearId]
  if (!def || isBossDropGear(def) || player.gold < def.price) return null
  return applyMaxCaps({
    ...player,
    gold: player.gold - def.price,
    gearOwned: [...player.gearOwned, newGearStack(gearId)],
  })
}

/** Sell one copy from pack only (not worn gear). Returns gold gained. */
export function trySellSalvageStack(
  player: PlayerState,
  salvageId: string,
): { player: PlayerState; goldGained: number } | null {
  const def = SALVAGE_BY_ID[salvageId]
  if (!def) return null
  const n = player.salvageLoot[salvageId] ?? 0
  if (n < 1) return null
  const nextLoot = { ...player.salvageLoot }
  if (n <= 1) delete nextLoot[salvageId]
  else nextLoot[salvageId] = n - 1
  const goldGained = def.sellPrice
  return {
    player: applyMaxCaps({ ...player, gold: player.gold + goldGained, salvageLoot: nextLoot }),
    goldGained,
  }
}

export function trySellGearFromBag(
  player: PlayerState,
  packIndex: number,
): { player: PlayerState; goldGained: number } | null {
  if (!Number.isFinite(packIndex) || packIndex < 0 || packIndex !== Math.floor(packIndex)) return null
  const stack = normalizeGearStack(player.gearOwned[packIndex])
  if (!stack) return null
  const def = GEAR_BY_ID[stack.gearId]
  if (!def) return null
  const goldGained = merchantBuyPrice(def)
  const gearOwned = player.gearOwned.filter((_, i) => i !== packIndex)
  return {
    player: applyMaxCaps({
      ...player,
      gold: player.gold + goldGained,
      gearOwned,
    }),
    goldGained,
  }
}

export function tryRepairGearInBag(player: PlayerState, packIndex: number): PlayerState | null {
  if (!Number.isFinite(packIndex) || packIndex < 0 || packIndex !== Math.floor(packIndex)) return null
  const stack = normalizeGearStack(player.gearOwned[packIndex])
  if (!stack) return null
  const cost = repairCostForStack(stack)
  if (cost <= 0 || player.gold < cost) return null
  const def = GEAR_BY_ID[stack.gearId]
  if (!def) return null
  const max = maxDurabilityForGear(def)
  const repaired = { gearId: stack.gearId, durability: max }
  const gearOwned = player.gearOwned.map((s, i) => (i === packIndex ? repaired : s))
  return applyMaxCaps({ ...player, gold: player.gold - cost, gearOwned })
}

export function tryRepairEquippedSlot(player: PlayerState, slot: EquipmentSlotId): PlayerState | null {
  const id = player.equipment[slot]
  if (!id) return null
  const cur = getSlotDurability(player, slot)
  const cost = repairCostForStack({ gearId: id, durability: cur })
  if (cost <= 0 || player.gold < cost) return null
  const def = GEAR_BY_ID[id]
  if (!def) return null
  const max = maxDurabilityForGear(def)
  return applyMaxCaps({
    ...player,
    gold: player.gold - cost,
    equipmentDurability: { ...player.equipmentDurability, [slot]: max },
  })
}

export function tryBuyStatTome(player: PlayerState, id: ShopStatTomeId): PlayerState | null {
  const def = SHOP_STAT_TOMES.find((t) => t.id === id)
  if (!def) return null
  const cur = player.stats[def.stat]
  if (cur >= MAX_PLAYER_STAT) return null
  const price = statTomePrice(cur)
  if (!Number.isFinite(price) || player.gold < price) return null
  return applyMaxCaps({
    ...player,
    gold: player.gold - price,
    stats: {
      ...player.stats,
      [def.stat]: Math.min(MAX_PLAYER_STAT, cur + 1),
    },
  })
}

export function tryBuyUpgrade(player: PlayerState, id: ShopUpgradeId): PlayerState | null {
  const def = SHOP_UPGRADES.find((u) => u.id === id)
  if (!def) return null
  const rank = player.upgrades[id]
  const price = upgradePrice(def.basePrice, rank)
  if (player.gold < price) return null

  const maxBefore = getMaxStats(player)
  const next: PlayerState = {
    ...player,
    gold: player.gold - price,
    upgrades: { ...player.upgrades, [id]: rank + 1 },
  }
  const maxAfter = getMaxStats(next)

  if (id === 'vitality') {
    const d = maxAfter.maxHp - maxBefore.maxHp
    next.hp = Math.min(maxAfter.maxHp, next.hp + d)
  } else if (id === 'endurance') {
    const d = maxAfter.maxStamina - maxBefore.maxStamina
    next.stamina = Math.min(maxAfter.maxStamina, next.stamina + d)
  } else if (id === 'arcana') {
    const d = maxAfter.maxMana - maxBefore.maxMana
    next.mana = Math.min(maxAfter.maxMana, next.mana + d)
  }

  return applyMaxCaps(next)
}

export function tryUseHealthPotion(player: PlayerState): PlayerState | null {
  if (player.inventory.healthPotion < 1) return null
  const max = getMaxStats(player).maxHp
  return applyMaxCaps({
    ...player,
    inventory: { ...player.inventory, healthPotion: player.inventory.healthPotion - 1 },
    hp: Math.min(max, player.hp + 40),
  })
}

export function tryUseManaDraught(player: PlayerState): PlayerState | null {
  if (player.inventory.manaDraught < 1) return null
  const max = getMaxStats(player).maxMana
  return applyMaxCaps({
    ...player,
    inventory: { ...player.inventory, manaDraught: player.inventory.manaDraught - 1 },
    mana: Math.min(max, player.mana + 35),
  })
}

export function tryUseStaminaBrew(player: PlayerState): PlayerState | null {
  if (player.inventory.staminaBrew < 1) return null
  const max = getMaxStats(player).maxStamina
  return applyMaxCaps({
    ...player,
    inventory: { ...player.inventory, staminaBrew: player.inventory.staminaBrew - 1 },
    stamina: Math.min(max, player.stamina + 30),
  })
}
