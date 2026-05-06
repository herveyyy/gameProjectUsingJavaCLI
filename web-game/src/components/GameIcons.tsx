import type { ClassKey } from '../game/types'

const ink = '#0a0a0a'

export function IconCoin({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#fde047" stroke={ink} strokeWidth="2" />
      <text
        x="12"
        y="15"
        textAnchor="middle"
        fontSize="11"
        fontWeight="900"
        fill={ink}
        fontFamily="system-ui,sans-serif"
      >
        G
      </text>
    </svg>
  )
}

export function IconXpSpark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"
        fill="#c4b5fd"
        stroke={ink}
        strokeWidth="1.5"
      />
    </svg>
  )
}

export function ClassPortrait({ classKey, size = 56 }: { classKey: ClassKey; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 48 48', 'aria-hidden': true as const }
  if (classKey === 'warrior') {
    return (
      <svg {...common}>
        <rect x="6" y="8" width="36" height="36" rx="6" fill="#99f6e4" stroke={ink} strokeWidth="3" />
        <path d="M14 38 L24 14 L34 38 Z" fill="#fb7185" stroke={ink} strokeWidth="2" />
        <rect x="20" y="18" width="8" height="10" fill="#fef08a" stroke={ink} strokeWidth="2" />
      </svg>
    )
  }
  if (classKey === 'rogue') {
    return (
      <svg {...common}>
        <rect x="6" y="8" width="36" height="36" rx="6" fill="#fbcfe8" stroke={ink} strokeWidth="3" />
        <circle cx="24" cy="26" r="10" fill="#a7f3d0" stroke={ink} strokeWidth="2" />
        <path d="M24 16 L30 10 L32 14 Z" fill="#0a0a0a" />
      </svg>
    )
  }
  if (classKey === 'ranger') {
    return (
      <svg {...common}>
        <rect x="6" y="8" width="36" height="36" rx="6" fill="#d9f99d" stroke={ink} strokeWidth="3" />
        <path d="M12 18 L24 12 L36 18 L36 34 L12 34 Z" fill="#86efac" stroke={ink} strokeWidth="2" />
        <path d="M22 14 L28 8 L30 12 Z" fill="#15803d" stroke={ink} strokeWidth="1.5" />
        <circle cx="18" cy="26" r="3" fill="#fef08a" stroke={ink} strokeWidth="1.5" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <rect x="6" y="8" width="36" height="36" rx="6" fill="#e9d5ff" stroke={ink} strokeWidth="3" />
      <path d="M16 32 Q24 12 32 32" fill="none" stroke="#38bdf8" strokeWidth="4" />
      <circle cx="24" cy="20" r="4" fill="#fde047" stroke={ink} strokeWidth="2" />
    </svg>
  )
}

type ShopVisual = 'potion' | 'vial' | 'leaf' | 'heart' | 'sword' | 'spark' | 'wind'

export function ShopIcon({ kind, size = 28 }: { kind: ShopVisual; size?: number }) {
  const w = size
  const h = size
  switch (kind) {
    case 'potion':
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" aria-hidden>
          <rect x="9" y="4" width="6" height="4" fill="#fb7185" stroke={ink} strokeWidth="2" />
          <path d="M8 10h8l2 14H6z" fill="#fecdd3" stroke={ink} strokeWidth="2" />
        </svg>
      )
    case 'vial':
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" aria-hidden>
          <path d="M9 3h6v4l3 14a3 3 0 01-3 3H9a3 3 0 01-3-3L9 7z" fill="#93c5fd" stroke={ink} strokeWidth="2" />
        </svg>
      )
    case 'leaf':
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" aria-hidden>
          <path d="M4 16 C14 4 22 20 12 20 C8 20 4 18 4 16z" fill="#86efac" stroke={ink} strokeWidth="2" />
        </svg>
      )
    case 'heart':
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 20s-7-4.7-7-10a4 4 0 017-2 4 4 0 017 2c0 5.3-7 10-7 10z"
            fill="#fb7185"
            stroke={ink}
            strokeWidth="2"
          />
        </svg>
      )
    case 'sword':
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" aria-hidden>
          <path d="M5 19l14-14M9 19l-4 4" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          <path d="M14 8l4 4" fill="#e2e8f0" stroke={ink} strokeWidth="2" />
        </svg>
      )
    case 'spark':
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" aria-hidden>
          <path d="M12 3v6M12 15v6M3 12h6M15 12h6" stroke="#fde047" strokeWidth="3" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" fill="#c4b5fd" stroke={ink} strokeWidth="2" />
        </svg>
      )
    case 'wind':
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" aria-hidden>
          <path d="M4 14c4-8 10-8 14 0" fill="none" stroke="#6ee7b7" strokeWidth="3" />
          <path d="M4 18c5-6 11-6 16 0" fill="none" stroke={ink} strokeWidth="2" />
        </svg>
      )
    default:
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" aria-hidden>
          <path d="M5 14c4-8 10-8 14 0" fill="none" stroke="#6ee7b7" strokeWidth="3" />
        </svg>
      )
  }
}
