import type { PvpCombatSnapshot } from './pvpProtocol'

/**
 * Gold change for the local player when a duel ends.
 * Uses snapshot profile gold (duel start) so host and guest agree without a server.
 */
export function computePvpGoldDelta(
  snap: PvpCombatSnapshot,
  role: 'host' | 'guest',
  outcome: 'win' | 'loss',
): number {
  const bet = snap.duelBetGold ?? 0
  const stripe = snap.stripeLoserMode ?? false
  if (bet <= 0 && !stripe) return 0

  const myProf = role === 'host' ? snap.hostProfile : snap.guestProfile
  const oppProf = role === 'host' ? snap.guestProfile : snap.hostProfile

  if (outcome === 'win') {
    if (stripe) return Math.max(0, oppProf.gold)
    return Math.min(bet, Math.max(0, oppProf.gold))
  }
  if (stripe) return -Math.max(0, myProf.gold)
  return -Math.min(bet, Math.max(0, myProf.gold))
}
