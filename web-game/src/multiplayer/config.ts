import type { PeerJSOption } from 'peerjs'

/**
 * ICE servers merged into PeerJS `config` (STUN/TURN for strict NATs).
 * See `vite-env.d.ts` for env vars.
 */
export function getIceServers(): RTCIceServer[] {
  const raw = import.meta.env.VITE_WEBRTC_ICE_SERVERS as string | undefined
  if (raw?.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as RTCIceServer[]
      }
    } catch {
      /* ignore */
    }
  }

  const servers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

  const extraStun = import.meta.env.VITE_STUN_URLS as string | undefined
  if (extraStun?.trim()) {
    for (const u of extraStun
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)) {
      servers.push({ urls: u })
    }
  }

  const turnUrlsRaw = import.meta.env.VITE_TURN_URLS as string | undefined
  const turnUser = import.meta.env.VITE_TURN_USERNAME as string | undefined
  const turnCred =
    (import.meta.env.VITE_TURN_CREDENTIAL as string | undefined) ||
    (import.meta.env.VITE_TURN_PASSWORD as string | undefined)

  const urls =
    turnUrlsRaw
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? []
  if (urls.length && turnUser && turnCred) {
    servers.push({
      urls: urls.length === 1 ? urls[0]! : urls,
      username: turnUser,
      credential: turnCred,
    })
  }

  return servers
}

/**
 * PeerJS options: defaults use public PeerServer (`0.peerjs.com`).
 * Set `VITE_PEERJS_HOST` (and optional port/path/key) to use your own PeerServer.
 */
export function getPeerJsOptions(): PeerJSOption {
  const opt: PeerJSOption = {
    config: { iceServers: getIceServers() },
  }

  const host = (import.meta.env.VITE_PEERJS_HOST as string | undefined)?.trim()
  if (!host) return opt

  opt.host = host
  opt.port = Number(import.meta.env.VITE_PEERJS_PORT || 443)
  const pathRaw = (import.meta.env.VITE_PEERJS_PATH as string | undefined)?.trim()
  const path = pathRaw && pathRaw.length > 0 ? pathRaw : '/'
  opt.path = path.startsWith('/') ? path : `/${path}`
  opt.secure = import.meta.env.VITE_PEERJS_SECURE !== 'false'
  const key = (import.meta.env.VITE_PEERJS_KEY as string | undefined)?.trim()
  if (key) opt.key = key

  return opt
}
