import { applyMaxCaps } from './progression'
import type { PlayerInventory, PlayerState, PlayerUpgrades, SkillDef } from './types'

export const STORAGE_KEY = 'woods-rpg-save-v1'

export interface SavePayload {
  version: 1
  player: PlayerState
}

function isSkillDef(x: unknown): x is SkillDef {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return typeof o.name === 'string' && typeof o.damage === 'number' && typeof o.manaCost === 'number'
}

function isInventory(x: unknown): x is PlayerInventory {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.healthPotion === 'number' &&
    typeof o.manaDraught === 'number' &&
    typeof o.staminaBrew === 'number'
  )
}

function isUpgrades(x: unknown): x is PlayerUpgrades {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.vitality === 'number' &&
    typeof o.striking === 'number' &&
    typeof o.arcana === 'number' &&
    typeof o.endurance === 'number'
  )
}

function isValidPlayer(p: unknown): p is PlayerState {
  if (!p || typeof p !== 'object') return false
  const o = p as Record<string, unknown>
  if (typeof o.name !== 'string' || o.name.length === 0) return false
  const ck = o.classKey
  if (ck !== 'warrior' && ck !== 'rogue' && ck !== 'mage') return false
  if (typeof o.classLabel !== 'string') return false
  if (typeof o.hp !== 'number' || typeof o.stamina !== 'number' || typeof o.mana !== 'number') return false
  if (typeof o.level !== 'number' || typeof o.gold !== 'number') return false
  if (typeof o.xp !== 'number' || typeof o.xpToNext !== 'number') return false
  if (!o.stats || typeof o.stats !== 'object') return false
  const st = o.stats as Record<string, unknown>
  if (typeof st.strength !== 'number' || typeof st.agility !== 'number' || typeof st.intelligence !== 'number')
    return false
  if (!Array.isArray(o.skills) || o.skills.length < 1 || !o.skills.every(isSkillDef)) return false
  if (!isUpgrades(o.upgrades)) return false
  if (!isInventory(o.inventory)) return false
  return true
}

export function loadProgress(): PlayerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as unknown
    if (!data || typeof data !== 'object') return null
    const rec = data as Record<string, unknown>
    if (rec.version !== 1) return null
    if (!isValidPlayer(rec.player)) return null
    return applyMaxCaps(rec.player as PlayerState)
  } catch {
    return null
  }
}

export function saveProgress(player: PlayerState): void {
  try {
    const payload: SavePayload = { version: 1, player: JSON.parse(JSON.stringify(player)) as PlayerState }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function hasSavedGame(): boolean {
  return loadProgress() !== null
}
