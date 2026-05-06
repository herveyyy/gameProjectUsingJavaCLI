import { emptyPlayerEquipment } from './gear'
import { INNATE_BY_ID } from './innates'
import { applyMaxCaps } from './progression'
import type {
  EquipmentSlotId,
  PlayerEquipment,
  PlayerInventory,
  PlayerState,
  PlayerUpgrades,
} from './types'

export const STORAGE_KEY = 'Wela-rpg-save-v1'

export interface SavePayload {
  version: 1
  player: PlayerState
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

const EQUIP_SLOTS: readonly EquipmentSlotId[] = [
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

function isEquipment(x: unknown): x is PlayerEquipment {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return EQUIP_SLOTS.every((s) => o[s] === null || typeof o[s] === 'string')
}

function isGearOwned(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((i) => typeof i === 'string')
}

function isSalvageLoot(x: unknown): x is Record<string, number> {
  if (!x || typeof x !== 'object') return false
  return Object.entries(x as Record<string, unknown>).every(
    ([k, v]) => typeof k === 'string' && typeof v === 'number' && Number.isInteger(v) && v > 0,
  )
}

/** Strip legacy class fields; fill gear defaults. */
function migratePlayerShape(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const o = raw as Record<string, unknown>
  const next: Record<string, unknown> = { ...o }
  delete next.classKey
  delete next.classLabel
  delete next.skills
  if (!isGearOwned(next.gearOwned)) {
    next.gearOwned = []
  }
  if (!isSalvageLoot(next.salvageLoot)) {
    next.salvageLoot = {}
  }
  if (!isEquipment(next.equipment)) {
    next.equipment = emptyPlayerEquipment()
  }
  if (!Array.isArray(next.innates)) {
    next.innates = []
  } else {
    next.innates = (next.innates as unknown[])
      .filter((id): id is string => typeof id === 'string' && id in INNATE_BY_ID)
      .slice(0, 2)
  }
  return next
}

function isValidPlayer(p: unknown): p is PlayerState {
  if (!p || typeof p !== 'object') return false
  const o = p as Record<string, unknown>
  if (typeof o.name !== 'string' || o.name.length === 0) return false
  if (typeof o.hp !== 'number' || typeof o.stamina !== 'number' || typeof o.mana !== 'number') return false
  if (typeof o.level !== 'number' || typeof o.gold !== 'number') return false
  if (typeof o.xp !== 'number' || typeof o.xpToNext !== 'number') return false
  if (!o.stats || typeof o.stats !== 'object') return false
  const st = o.stats as Record<string, unknown>
  if (typeof st.strength !== 'number' || typeof st.agility !== 'number' || typeof st.intelligence !== 'number')
    return false
  if (!isUpgrades(o.upgrades)) return false
  if (!isInventory(o.inventory)) return false
  if (!isGearOwned(o.gearOwned)) return false
  if (!isSalvageLoot(o.salvageLoot)) return false
  if (!isEquipment(o.equipment)) return false
  if (!Array.isArray(o.innates) || o.innates.length > 2) return false
  if (!o.innates.every((i) => typeof i === 'string')) return false
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
    const migrated = migratePlayerShape(rec.player)
    if (!isValidPlayer(migrated)) return null
    return applyMaxCaps(migrated as PlayerState)
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
