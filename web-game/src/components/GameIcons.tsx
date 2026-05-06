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

/** Neutral traveler — build is defined by equipment, not class. */
export function AdventurerPortrait({ size = 56 }: { size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 48 48', 'aria-hidden': true as const }
  return (
    <svg {...common}>
      <rect x="6" y="8" width="36" height="36" rx="6" fill="#e9d5ff" stroke={ink} strokeWidth="3" />
      <path d="M16 32 Q24 12 32 32" fill="none" stroke="#38bdf8" strokeWidth="4" />
      <circle cx="24" cy="20" r="4" fill="#fde047" stroke={ink} strokeWidth="2" />
    </svg>
  )
}

type ShopVisual =
  | 'potion'
  | 'vial'
  | 'leaf'
  | 'scroll'
  | 'shield'
  | 'star'
  | 'heart'
  | 'sword'
  | 'spark'
  | 'wind'
  | 'book'

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
    case 'scroll':
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" aria-hidden>
          <path
            d="M8 3h8l4 4v14a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2z"
            fill="#fef9c3"
            stroke={ink}
            strokeWidth="2"
          />
          <path d="M8 7h8M8 11h6M8 15h7" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case 'shield':
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 3l8 3v7c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V6z"
            fill="#bae6fd"
            stroke={ink}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M12 8v6M9 11h6" stroke={ink} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'star':
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 2l2.2 6.8h7l-5.7 4.1 2.2 6.8L12 15.6 6.3 19.7l2.2-6.8L2.8 8.8h7z"
            fill="#fde047"
            stroke={ink}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
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
    case 'book':
      return (
        <svg width={w} height={h} viewBox="0 0 24 24" aria-hidden>
          <path
            d="M6 4h6a3 3 0 013 3v14a3 3 0 00-3-3H6V4zM18 4h-6a3 3 0 00-3 3v14a3 3 0 013-3h6V4z"
            fill="#fde68a"
            stroke={ink}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M9 8h3M15 8h3M9 12h3M15 12h3" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
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

/** Browser fullscreen: expand vs restore (matches lucide maximize2 / minimize2). */
export function IconFullscreen({ expanded, size = 20 }: { expanded: boolean; size?: number }) {
  const ink = '#0a0a0a'
  const sw = 2
  if (expanded) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={ink}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polyline points="4 14 10 14 10 20" />
        <polyline points="20 10 14 10 14 4" />
        <line x1="14" y1="10" x2="21" y2="3" />
        <line x1="3" y1="21" x2="10" y2="14" />
      </svg>
    )
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={ink}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  )
}
