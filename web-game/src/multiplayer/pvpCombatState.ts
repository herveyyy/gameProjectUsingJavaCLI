import { filterIncomingPlayerApplies } from '../game/incomingStatuses'
import { getCombatSkillEntries } from '../game/gear'
import { aggregateThornReflectPercent } from '../game/innates'
import {
  consumeEmpoweredBonus,
  consumeStunSkip,
  hasStun,
  mergeStatuses,
  splitSkillStatuses,
  tickTwoSideStatuses,
} from '../game/statusEffects'
import { applyPvpStrike, isPvpLossHp } from '../game/pvpResolve'
import { getMaxStats } from '../game/progression'
import type { PlayerState } from '../game/types'
import type { PvpCombatSnapshot, PvpLastContest } from './pvpProtocol'
import type { RpsChoice } from './pvpRps'
import { resolveRpsBattle } from './pvpRps'

export function clonePlayer(p: PlayerState): PlayerState {
  return JSON.parse(JSON.stringify(p)) as PlayerState
}

export function buildInitialSnapshot(
  hostProfile: PlayerState,
  guestProfile: PlayerState,
  duel: { duelBetGold: number; stripeLoserMode: boolean } = { duelBetGold: 0, stripeLoserMode: false },
): PvpCombatSnapshot {
  const h = clonePlayer(hostProfile)
  const g = clonePlayer(guestProfile)
  return {
    hostProfile: h,
    guestProfile: g,
    hostHp: getMaxStats(h).maxHp,
    guestHp: getMaxStats(g).maxHp,
    hostStatuses: [],
    guestStatuses: [],
    pvpPhase: 'rps',
    attackerIsHost: null,
    contestSeq: 0,
    lastContest: null,
    seq: 0,
    duelBetGold: duel.duelBetGold,
    stripeLoserMode: duel.stripeLoserMode,
  }
}

function winnerFromHp(hostHp: number, guestHp: number): 'host' | 'guest' | null {
  if (isPvpLossHp(guestHp)) return 'host'
  if (isPvpLossHp(hostHp)) return 'guest'
  return null
}

/** Host only: apply RPS (+ coin on tie) and move to strike phase. */
export function resolveContestToStrike(
  snap: PvpCombatSnapshot,
  hostChoice: RpsChoice,
  guestChoice: RpsChoice,
): PvpCombatSnapshot | null {
  if (snap.pvpPhase !== 'rps') return null
  const { attackerIsHost, usedCoinFlip } = resolveRpsBattle(hostChoice, guestChoice)
  const lastContest: PvpLastContest = {
    hostChoice,
    guestChoice,
    attackerIsHost,
    usedCoinFlip,
  }
  return {
    ...snap,
    pvpPhase: 'strike',
    attackerIsHost,
    lastContest,
    seq: snap.seq + 1,
  }
}

function afterStrikeOrPassBase(snap: PvpCombatSnapshot): Pick<
  PvpCombatSnapshot,
  'pvpPhase' | 'attackerIsHost' | 'lastContest' | 'contestSeq'
> {
  return {
    pvpPhase: 'rps',
    attackerIsHost: null,
    lastContest: null,
    contestSeq: snap.contestSeq + 1,
  }
}

/** Used when the striker must pass (stunned) — next clash is a fresh RPS round. */
export function passStunnedFromSnapshot(snap: PvpCombatSnapshot): {
  next: PvpCombatSnapshot
  damage: number
  winner: 'host' | 'guest' | null
} | null {
  if (snap.pvpPhase !== 'strike' || snap.attackerIsHost === null) return null
  const strikerIsHost = snap.attackerIsHost

  let hostHp = snap.hostHp
  let guestHp = snap.guestHp
  let hostStatuses = snap.hostStatuses ?? []
  let guestStatuses = snap.guestStatuses ?? []

  const ticked = tickTwoSideStatuses(
    { aHp: hostHp, bHp: guestHp, aStatuses: hostStatuses, bStatuses: guestStatuses },
    { a: snap.hostProfile.name || 'Host', b: snap.guestProfile.name || 'Guest' },
  )
  hostHp = ticked.state.aHp
  guestHp = ticked.state.bHp
  hostStatuses = ticked.state.aStatuses
  guestStatuses = ticked.state.bStatuses

  const winAfterTick = winnerFromHp(hostHp, guestHp)
  if (winAfterTick) {
    const next: PvpCombatSnapshot = {
      ...snap,
      hostHp,
      guestHp,
      hostStatuses,
      guestStatuses,
      seq: snap.seq + 1,
    }
    return { next, damage: 0, winner: winAfterTick }
  }

  const strikerStatuses = strikerIsHost ? hostStatuses : guestStatuses
  if (!hasStun(strikerStatuses)) return null

  const cleared = consumeStunSkip(strikerStatuses)
  if (strikerIsHost) hostStatuses = cleared
  else guestStatuses = cleared

  const tail = afterStrikeOrPassBase(snap)

  const next: PvpCombatSnapshot = {
    ...snap,
    hostHp,
    guestHp,
    hostStatuses,
    guestStatuses,
    ...tail,
    seq: snap.seq + 1,
  }
  return {
    next,
    damage: 0,
    winner: winnerFromHp(next.hostHp, next.guestHp),
  }
}

export function applyStrikeFromSnapshot(
  snap: PvpCombatSnapshot,
  skillIndex: number,
  strikerIsHost: boolean,
): { next: PvpCombatSnapshot; damage: number; winner: 'host' | 'guest' | null } | null {
  if (snap.pvpPhase !== 'strike' || snap.attackerIsHost === null) return null
  if (strikerIsHost !== snap.attackerIsHost) return null

  let hostHp = snap.hostHp
  let guestHp = snap.guestHp
  let hostStatuses = snap.hostStatuses ?? []
  let guestStatuses = snap.guestStatuses ?? []

  const ticked = tickTwoSideStatuses(
    { aHp: hostHp, bHp: guestHp, aStatuses: hostStatuses, bStatuses: guestStatuses },
    { a: snap.hostProfile.name || 'Host', b: snap.guestProfile.name || 'Guest' },
  )
  hostHp = ticked.state.aHp
  guestHp = ticked.state.bHp
  hostStatuses = ticked.state.aStatuses
  guestStatuses = ticked.state.bStatuses

  const winAfterTick = winnerFromHp(hostHp, guestHp)
  if (winAfterTick) {
    const next: PvpCombatSnapshot = {
      ...snap,
      hostHp,
      guestHp,
      hostStatuses,
      guestStatuses,
      seq: snap.seq + 1,
    }
    return { next, damage: 0, winner: winAfterTick }
  }

  const attacker = strikerIsHost ? snap.hostProfile : snap.guestProfile
  let strikerStatuses = strikerIsHost ? hostStatuses : guestStatuses

  if (hasStun(strikerStatuses)) {
    const cleared = consumeStunSkip(strikerStatuses)
    if (strikerIsHost) hostStatuses = cleared
    else guestStatuses = cleared

    const tail = afterStrikeOrPassBase(snap)

    const next: PvpCombatSnapshot = {
      ...snap,
      hostHp,
      guestHp,
      hostStatuses,
      guestStatuses,
      ...tail,
      seq: snap.seq + 1,
    }
    return {
      next,
      damage: 0,
      winner: winnerFromHp(next.hostHp, next.guestHp),
    }
  }

  const defenderStatusesBefore = strikerIsHost ? guestStatuses : hostStatuses
  const defenderProfile = strikerIsHost ? snap.guestProfile : snap.hostProfile

  const emp = consumeEmpoweredBonus(strikerStatuses)
  if (strikerIsHost) hostStatuses = emp.statuses
  else guestStatuses = emp.statuses

  const defenderHp = strikerIsHost ? guestHp : hostHp
  const strike = applyPvpStrike(
    attacker,
    defenderHp,
    skillIndex,
    emp.bonus,
    defenderStatusesBefore,
    defenderProfile,
    emp.statuses,
  )
  if (!strike) return null

  const entries = getCombatSkillEntries(attacker)
  const entry = entries[skillIndex]
  if (!entry) return null
  const split = splitSkillStatuses(entry.skill)
  const incomingCtrl = filterIncomingPlayerApplies(defenderProfile, defenderStatusesBefore, split.onEnemy)
  const defenderProfileAfter = incomingCtrl.player
  const onEnemyFiltered = incomingCtrl.applies

  let hostProfile = snap.hostProfile
  let guestProfile = snap.guestProfile

  if (strikerIsHost) {
    hostProfile = strike.attackerAfter
    guestHp = strike.defenderHpAfter
    guestProfile = defenderProfileAfter
    guestStatuses = mergeStatuses(strike.defenderStatusesAfter ?? defenderStatusesBefore, onEnemyFiltered)
    hostStatuses = mergeStatuses(hostStatuses, split.onSelf)
  } else {
    guestProfile = strike.attackerAfter
    hostHp = strike.defenderHpAfter
    hostProfile = defenderProfileAfter
    hostStatuses = mergeStatuses(strike.defenderStatusesAfter ?? defenderStatusesBefore, onEnemyFiltered)
    guestStatuses = mergeStatuses(guestStatuses, split.onSelf)
  }

  const ls = strike.lifeStealHeal ?? 0
  if (ls > 0) {
    if (strikerIsHost) {
      const cap = getMaxStats(hostProfile).maxHp
      hostHp = Math.min(cap, hostHp + ls)
    } else {
      const cap = getMaxStats(guestProfile).maxHp
      guestHp = Math.min(cap, guestHp + ls)
    }
  }

  const thPct = aggregateThornReflectPercent(defenderProfileAfter)
  if (thPct > 0 && strike.damage > 0) {
    const echo = Math.floor(strike.damage * (thPct / 100))
    if (echo > 0) {
      if (strikerIsHost) hostHp = Math.max(0, hostHp - echo)
      else guestHp = Math.max(0, guestHp - echo)
    }
  }

  const winner = winnerFromHp(hostHp, guestHp)

  let next: PvpCombatSnapshot = {
    ...snap,
    hostProfile,
    guestProfile,
    hostHp,
    guestHp,
    hostStatuses,
    guestStatuses,
    seq: snap.seq + 1,
  }
  if (!winner) {
    next = { ...next, ...afterStrikeOrPassBase(snap) }
  }

  return { next, damage: strike.damage, winner }
}

/** Whether the local player won / lost after a snapshot (HP floor rule). */
export function pvpOutcomeForRole(
  snap: PvpCombatSnapshot,
  role: 'host' | 'guest',
): 'win' | 'loss' | null {
  if (isPvpLossHp(snap.guestHp)) return role === 'host' ? 'win' : 'loss'
  if (isPvpLossHp(snap.hostHp)) return role === 'guest' ? 'win' : 'loss'
  return null
}
