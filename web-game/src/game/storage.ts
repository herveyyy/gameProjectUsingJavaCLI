import { MAX_PLAYER_STAT } from './constants'
import { emptyPlayerEquipment, maxDurabilityForGearId, normalizeGearStack } from './gear'
import { INNATE_BY_ID } from './innates'
import { applyMaxCaps } from './progression'
import type {
  EquipmentSlotId,
  GearStack,
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

function isGearStackRow(x: unknown): x is GearStack {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return typeof o.gearId === 'string' && typeof o.durability === 'number'
}

function isGearOwned(x: unknown): x is GearStack[] {
  return Array.isArray(x) && x.every(isGearStackRow)
}

function migrateGearOwned(raw: unknown): GearStack[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  const first = raw[0]
  if (typeof first === 'string') {
    return (raw as string[]).map((gearId) => ({
      gearId,
      durability: maxDurabilityForGearId(gearId),
    }))
  }
  const out: GearStack[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    if (typeof o.gearId !== 'string') continue
    const d =
      typeof o.durability === 'number' ? Math.max(0, o.durability) : maxDurabilityForGearId(o.gearId)
    out.push({ gearId: o.gearId, durability: d })
  }
  return out
}

function isEquipmentDurability(x: unknown): x is Partial<Record<EquipmentSlotId, number>> {
  if (!x || typeof x !== 'object') return false
  return Object.entries(x as Record<string, unknown>).every(
    ([k, v]) => EQUIP_SLOTS.includes(k as EquipmentSlotId) && typeof v === 'number',
  )
}

function isSalvageLoot(x: unknown): x is Record<string, number> {
  if (!x || typeof x !== 'object') return false
  return Object.entries(x as Record<string, unknown>).every(
    ([k, v]) => typeof k === 'string' && typeof v === 'number' && Number.isInteger(v) && v > 0,
  )
}

/** Strip legacy class fields; migrate pack stacks & worn durability. */
function migratePlayerShape(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const o = raw as Record<string, unknown>
  const next: Record<string, unknown> = { ...o }
  delete next.classKey
  delete next.classLabel
  delete next.skills

  const migratedPack = migrateGearOwned(next.gearOwned)
  next.gearOwned = migratedPack
    .map((row) => normalizeGearStack(row))
    .filter((s): s is GearStack => s != null)

  if (!isSalvageLoot(next.salvageLoot)) {
    next.salvageLoot = {}
  }
  if (!isEquipment(next.equipment)) {
    next.equipment = emptyPlayerEquipment()
  }

  const eq = next.equipment as PlayerEquipment
  const ed: Partial<Record<EquipmentSlotId, number>> = {}
  if (next.equipmentDurability && typeof next.equipmentDurability === 'object') {
    const rawEd = next.equipmentDurability as Record<string, unknown>
    for (const slot of EQUIP_SLOTS) {
      const v = rawEd[slot]
      if (typeof v === 'number') ed[slot] = Math.max(0, v)
    }
  }
  for (const slot of EQUIP_SLOTS) {
    const id = eq[slot]
    if (id && typeof id === 'string' && ed[slot] === undefined) {
      ed[slot] = maxDurabilityForGearId(id)
    }
  }
  next.equipmentDurability = ed

  if (!Array.isArray(next.innates)) {
    next.innates = []
  } else {
    next.innates = (next.innates as unknown[])
      .filter((id): id is string => typeof id === 'string' && id in INNATE_BY_ID)
      .slice(0, 2)
  }

  if (next.stats && typeof next.stats === 'object') {
    const st = next.stats as Record<string, unknown>
    const clampStat = (v: unknown) => {
      const n = typeof v === 'number' && Number.isFinite(v) ? v : 3
      return Math.min(MAX_PLAYER_STAT, Math.max(1, Math.floor(n)))
    }
    next.stats = {
      strength: clampStat(st.strength),
      agility: clampStat(st.agility),
      intelligence: clampStat(st.intelligence),
    }
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
  if (
    st.strength < 1 ||
    st.strength > MAX_PLAYER_STAT ||
    st.agility < 1 ||
    st.agility > MAX_PLAYER_STAT ||
    st.intelligence < 1 ||
    st.intelligence > MAX_PLAYER_STAT
  )
    return false
  if (!isUpgrades(o.upgrades)) return false
  if (!isInventory(o.inventory)) return false
  if (!isGearOwned(o.gearOwned)) return false
  if (!isSalvageLoot(o.salvageLoot)) return false
  if (!isEquipment(o.equipment)) return false
  if (!isEquipmentDurability(o.equipmentDurability)) return false
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
