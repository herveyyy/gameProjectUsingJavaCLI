export type RpsChoice = 'rock' | 'paper' | 'scissors'

export const RPS_LABELS: Record<RpsChoice, string> = {
  rock: 'Rock',
  paper: 'Paper',
  scissors: 'Scissors',
}

export function beats(a: RpsChoice, b: RpsChoice): boolean {
  return (
    (a === 'rock' && b === 'scissors') ||
    (a === 'scissors' && b === 'paper') ||
    (a === 'paper' && b === 'rock')
  )
}

/** Host-authoritative tie-breaker — call only on host before broadcasting snapshot. */
export function resolveRpsBattle(hostChoice: RpsChoice, guestChoice: RpsChoice): {
  attackerIsHost: boolean
  usedCoinFlip: boolean
} {
  if (hostChoice === guestChoice) {
    const hostWinsAttack = Math.random() < 0.5
    return { attackerIsHost: hostWinsAttack, usedCoinFlip: true }
  }
  if (beats(hostChoice, guestChoice)) {
    return { attackerIsHost: true, usedCoinFlip: false }
  }
  return { attackerIsHost: false, usedCoinFlip: false }
}
