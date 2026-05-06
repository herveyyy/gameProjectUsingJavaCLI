/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Self-hosted PeerServer hostname (omit to use PeerJS cloud `0.peerjs.com`). */
  readonly VITE_PEERJS_HOST?: string
  readonly VITE_PEERJS_PORT?: string
  readonly VITE_PEERJS_PATH?: string
  /** Default true; set `false` for ws-only dev PeerServer. */
  readonly VITE_PEERJS_SECURE?: string
  readonly VITE_PEERJS_KEY?: string
  /** Comma-separated extra STUN URLs (optional). */
  readonly VITE_STUN_URLS?: string
  readonly VITE_TURN_URLS?: string
  readonly VITE_TURN_USERNAME?: string
  readonly VITE_TURN_CREDENTIAL?: string
  readonly VITE_TURN_PASSWORD?: string
  /** Optional JSON array of `RTCIceServer` — replaces built-in STUN/TURN merge. */
  readonly VITE_WEBRTC_ICE_SERVERS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
