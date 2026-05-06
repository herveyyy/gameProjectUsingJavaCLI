import { CLASSES, SHOP_CONSUMABLES, SHOP_UPGRADES, upgradePrice, xpRequiredForNextLevel } from './constants'
import type { PlayerState, ShopConsumableId, ShopUpgradeId, SkillDef } from './types'

export interface MaxStats {
  maxHp: number
  maxStamina: number
  maxMana: number
}

export function getMaxStats(player: PlayerState): MaxStats {
  const def = CLASSES[player.classKey]
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

/** Level scaling + Striking upgrade — matches displayed skill row. */
export function getEffectiveSkillDamage(player: PlayerState, skill: SkillDef): number {
  const levelMul = 1 + (player.level - 1) * 0.035
  const raw = skill.damage * levelMul + player.upgrades.striking
  return Math.max(0, Math.floor(raw))
}

export function getEffectiveManaCost(player: PlayerState, skill: SkillDef): number {
  const reduc = Math.min(0.35, player.level * 0.01 + player.upgrades.arcana * 0.02)
  return Math.max(0, skill.manaCost * (1 - reduc))
}

export function clampResource(current: number, max: number): number {
  return Math.min(max, Math.max(0, current))
}

export function applyMaxCaps(player: PlayerState): PlayerState {
  const m = getMaxStats(player)
  return {
    ...player,
    hp: clampResource(player.hp, m.maxHp),
    stamina: clampResource(player.stamina, m.maxStamina),
    mana: clampResource(player.mana, m.maxMana),
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
        strength: p.stats.strength + 1,
        agility: p.stats.agility + 1,
        intelligence: p.stats.intelligence + 1,
      },
      xpToNext: xpRequiredForNextLevel(newLevel),
    }
    levelsGained += 1
    messages.push(`LEVEL UP! You are now level ${newLevel}. Stats +1 all.`)
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
