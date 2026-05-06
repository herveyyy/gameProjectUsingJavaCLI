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

/** Legacy single-save key — migrated into slot 0 when present. */
export const LEGACY_STORAGE_KEY = 'Wela-rpg-save-v1'

export const STORAGE_KEY = 'Wela-rpg-save-v2'

/** Number of independent character saves in localStorage. */
export const SAVE_SLOT_COUNT = 3

export interface SavePayload {
  version: 1
  player: PlayerState
}

export interface SavePayloadV2 {
  version: 2
  slots: (PlayerState | null)[]
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

function emptySlots(): (PlayerState | null)[] {
  return Array.from({ length: SAVE_SLOT_COUNT }, () => null)
}

function normalizeSlots(raw: unknown): (PlayerState | null)[] {
  const base = emptySlots()
  if (!Array.isArray(raw)) return base
  for (let i = 0; i < SAVE_SLOT_COUNT && i < raw.length; i++) {
    const cell = raw[i]
    if (cell === null || cell === undefined) {
      base[i] = null
      continue
    }
    const migrated = migratePlayerShape(cell)
    if (!isValidPlayer(migrated)) {
      base[i] = null
      continue
    }
    base[i] = applyMaxCaps(migrated as PlayerState)
  }
  return base
}

function readSlotsFromStorage(): (PlayerState | null)[] {
  try {
    const v2raw = localStorage.getItem(STORAGE_KEY)
    if (v2raw) {
      const data = JSON.parse(v2raw) as unknown
      if (data && typeof data === 'object') {
        const rec = data as Record<string, unknown>
        if (rec.version === 2 && Array.isArray(rec.slots)) {
          return normalizeSlots(rec.slots)
        }
      }
    }

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacyRaw) {
      const data = JSON.parse(legacyRaw) as unknown
      if (data && typeof data === 'object') {
        const rec = data as Record<string, unknown>
        if (rec.version === 1) {
          const migrated = migratePlayerShape(rec.player)
          if (isValidPlayer(migrated)) {
            const slots = normalizeSlots([applyMaxCaps(migrated as PlayerState)])
            writeSlotsInternal(slots)
            try {
              localStorage.removeItem(LEGACY_STORAGE_KEY)
            } catch {
              /* ignore */
            }
            return slots
          }
        }
      }
    }
  } catch {
    /* ignore */
  }
  return emptySlots()
}

function writeSlotsInternal(slots: (PlayerState | null)[]): void {
  const payload: SavePayloadV2 = { version: 2, slots: [...slots] }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

/** Summaries for the main menu (one row per save slot). */
export function listSlotSummaries(): { index: number; player: PlayerState | null }[] {
  const slots = readSlotsFromStorage()
  return slots.map((player, index) => ({ index, player }))
}

/** First slot with a valid save — used to warm caches after splash. */
export function getAnySavedPlayer(): PlayerState | null {
  for (const p of readSlotsFromStorage()) {
    if (p) return p
  }
  return null
}

export function loadProgress(slotIndex: number): PlayerState | null {
  if (slotIndex < 0 || slotIndex >= SAVE_SLOT_COUNT) return null
  const slots = readSlotsFromStorage()
  return slots[slotIndex] ?? null
}

export function saveProgress(slotIndex: number, player: PlayerState): void {
  if (slotIndex < 0 || slotIndex >= SAVE_SLOT_COUNT) return
  const slots = readSlotsFromStorage()
  slots[slotIndex] = JSON.parse(JSON.stringify(player)) as PlayerState
  writeSlotsInternal(slots)
}

export function clearProgress(slotIndex: number): void {
  if (slotIndex < 0 || slotIndex >= SAVE_SLOT_COUNT) return
  const slots = readSlotsFromStorage()
  slots[slotIndex] = null
  writeSlotsInternal(slots)
}

export function hasSavedGame(): boolean {
  return readSlotsFromStorage().some(Boolean)
}
