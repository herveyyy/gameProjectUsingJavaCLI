import type { CombatStatusEntry, PlayerState } from '../game/types'
import type { RpsChoice } from './pvpRps'

export type { RpsChoice } from './pvpRps'

/** Result of the latest rock–paper–scissors (+ optional coin) clash. */
export interface PvpLastContest {
  hostChoice: RpsChoice
  guestChoice: RpsChoice
  attackerIsHost: boolean
  usedCoinFlip: boolean
}

/** Full combat state sent after each PVP update (authoritative copy). */
export interface PvpCombatSnapshot {
  hostProfile: PlayerState
  guestProfile: PlayerState
  hostHp: number
  guestHp: number
  hostStatuses: CombatStatusEntry[]
  guestStatuses: CombatStatusEntry[]
  /** Contest vs strike exchange. */
  pvpPhase: 'rps' | 'strike'
  /** Who may use a technique this exchange — null during RPS contest. */
  attackerIsHost: boolean | null
  /** Increments after each resolved strike (or stun pass). */
  contestSeq: number
  /** Set when leaving RPS for strike — cleared after strike resolves; drives clash animation. */
  lastContest: PvpLastContest | null
  seq: number
  /** Gold wager (0 = casual). Both players must have had ≥ this at duel start. */
  duelBetGold: number
  /** If true, loser loses all gold they had at duel start; winner receives that amount. If false, loser pays `duelBetGold` (capped by balance). */
  stripeLoserMode: boolean
}

export type PvpGameMessage =
  | { type: 'profile'; profile: PlayerState }
  /** Host sends once after connect: profile + duel rules so the guest applies the same wager. */
  | {
      type: 'host_ready'
      profile: PlayerState
      duelBetGold: number
      stripeLoserMode: boolean
    }
  | { type: 'turn'; snapshot: PvpCombatSnapshot; damage?: number }
  | { type: 'rps_pick'; choice: RpsChoice; contestSeq: number }

export function serializeGameMessage(msg: PvpGameMessage): string {
  return JSON.stringify(msg)
}

export function parseGameMessage(raw: string): PvpGameMessage | null {
  try {
    const v = JSON.parse(raw) as PvpGameMessage
    if (!v || typeof v !== 'object') return null
    if (v.type === 'profile' && v.profile) return v
    if (
      v.type === 'host_ready' &&
      v.profile &&
      typeof v.duelBetGold === 'number' &&
      Number.isFinite(v.duelBetGold) &&
      typeof v.stripeLoserMode === 'boolean'
    ) {
      return {
        type: 'host_ready',
        profile: v.profile,
        duelBetGold: Math.max(0, Math.floor(v.duelBetGold)),
        stripeLoserMode: v.stripeLoserMode,
      }
    }
    if (
      v.type === 'rps_pick' &&
      (v.choice === 'rock' || v.choice === 'paper' || v.choice === 'scissors') &&
      typeof v.contestSeq === 'number'
    ) {
      return v
    }
    if (v.type === 'turn' && v.snapshot && typeof v.snapshot.seq === 'number') {
      const snap = normalizeSnapshot(v.snapshot as PvpCombatSnapshot)
      return {
        type: 'turn',
        snapshot: snap,
        damage: v.damage,
      }
    }
    return null
  } catch {
    return null
  }
}

/** Normalize older snapshots (defaults + legacy `hostsTurn` migration). */
export function normalizeSnapshot(snap: PvpCombatSnapshot): PvpCombatSnapshot {
  const legacyHostsTurn = (snap as unknown as { hostsTurn?: boolean }).hostsTurn
  const pvpPhase =
    snap.pvpPhase ??
    (legacyHostsTurn !== undefined ? 'strike' : 'rps')
  const attackerIsHost =
    snap.attackerIsHost !== undefined && snap.attackerIsHost !== null
      ? snap.attackerIsHost
      : legacyHostsTurn !== undefined
        ? legacyHostsTurn
        : null
  return {
    ...snap,
    hostStatuses: snap.hostStatuses ?? [],
    guestStatuses: snap.guestStatuses ?? [],
    pvpPhase,
    attackerIsHost,
    contestSeq: snap.contestSeq ?? 0,
    lastContest: snap.lastContest ?? null,
    duelBetGold: snap.duelBetGold ?? 0,
    stripeLoserMode: snap.stripeLoserMode ?? false,
  }
}

/** SDP / ICE relay payloads between peers */
export type RtcSignalPayload =
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ice'; candidate: RTCIceCandidateInit }
