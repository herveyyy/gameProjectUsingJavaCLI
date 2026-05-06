import Peer from 'peerjs'
import type { DataConnection, PeerJSOption } from 'peerjs'
import { getPeerJsOptions } from './config'
import type { PvpGameMessage } from './pvpProtocol'
import { parseGameMessage, serializeGameMessage } from './pvpProtocol'

/** Six unambiguous chars (no 0/O/1/I) for typing & dictation. */
function genPvpRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

function isUnavailablePeerId(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    (err as { type: string }).type === 'unavailable-id'
  )
}

export interface PvpSessionCallbacks {
  onDataOpen: () => void
  onGameMessage: (msg: PvpGameMessage) => void
  onPeerGone: () => void
  onSignalError: (message: string) => void
}

/**
 * PVP transport via PeerJS (broker + WebRTC DataConnection).
 */
export class PvpSession {
  private peer: Peer | null = null
  private conn: DataConnection | null = null
  private roomCode: string | null = null
  private role: 'host' | 'guest' | null = null
  private destroyedByUs = false
  private readonly cb: PvpSessionCallbacks

  constructor(cb: PvpSessionCallbacks) {
    this.cb = cb
  }

  getRoomCode(): string | null {
    return this.roomCode
  }

  getRole(): 'host' | 'guest' | null {
    return this.role
  }

  sendGame(msg: PvpGameMessage): boolean {
    if (!this.conn?.open) return false
    try {
      this.conn.send(serializeGameMessage(msg))
      return true
    } catch {
      return false
    }
  }

  /**
   * Host: claim a short 6-character Peer id (room code). Retries if id is taken.
   */
  async startHost(): Promise<string> {
    this.destroyedByUs = false
    this.teardownPeer()
    this.role = 'host'

    const opts = getPeerJsOptions()

    for (let attempt = 0; attempt < 32; attempt++) {
      const code = genPvpRoomCode()
      try {
        await this.attemptHostOnce(code, opts)
        this.roomCode = code
        return code
      } catch (err) {
        this.teardownPeer()
        if (isUnavailablePeerId(err)) continue
        throw err instanceof Error ? err : new Error(String(err))
      }
    }

    throw new Error('Could not claim a room code — try again.')
  }

  private attemptHostOnce(roomId: string, opts: PeerJSOption): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false

      try {
        this.peer = new Peer(roomId, opts)
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)))
        return
      }

      const timer = window.setTimeout(() => {
        if (!settled) {
          settled = true
          reject(new Error('Timed out connecting to PeerServer'))
        }
      }, 25000)

      this.peer.on('open', () => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        resolve()
      })

      this.peer.on('connection', (c) => {
        if (this.conn) {
          try {
            c.close()
          } catch {
            /* ignore */
          }
          return
        }
        this.wireConnection(c)
      })

      this.peer.on('error', (err) => {
        if (!settled) {
          settled = true
          window.clearTimeout(timer)
          reject(err)
          return
        }
        this.cb.onSignalError(err.message ?? String(err))
      })

      this.peer.on('disconnected', () => {
        if (!this.destroyedByUs) this.cb.onSignalError('Disconnected from PeerServer')
      })
    })
  }

  /** Guest: connect to the host’s Peer id (6-character room code). */
  async joinGuest(roomId: string): Promise<void> {
    const id = roomId
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6)
    if (id.length !== 6) throw new Error('Enter the full 6-character room code')

    this.destroyedByUs = false
    this.teardownPeer()
    this.role = 'guest'
    this.roomCode = id

    const opts = getPeerJsOptions()
    let settled = false

    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        if (!settled) reject(new Error('Timed out connecting to host'))
      }, 35000)

      try {
        this.peer = new Peer(opts)
      } catch (e) {
        window.clearTimeout(timer)
        reject(e instanceof Error ? e : new Error(String(e)))
        return
      }

      this.peer.on('open', () => {
        const c = this.peer!.connect(id, { reliable: true })
        c.on('open', () => {
          if (settled) return
          window.clearTimeout(timer)
          settled = true
          this.wireConnection(c)
          resolve(undefined)
        })
        c.on('error', () => {
          if (settled) return
          window.clearTimeout(timer)
          settled = true
          reject(new Error('Data connection failed'))
        })
      })

      this.peer.on('error', (err) => {
        if (settled) return
        window.clearTimeout(timer)
        settled = true
        reject(new Error(err.message ?? String(err)))
      })
    })
  }

  private wireConnection(c: DataConnection) {
    this.conn = c

    const fireOpen = () => this.cb.onDataOpen()
    if (c.open) fireOpen()
    else c.on('open', fireOpen)

    c.on('data', (data: unknown) => {
      const raw = typeof data === 'string' ? data : JSON.stringify(data)
      const parsed = parseGameMessage(raw)
      if (parsed) this.cb.onGameMessage(parsed)
    })

    c.on('close', () => this.cb.onPeerGone())
    c.on('error', () => this.cb.onSignalError('Peer connection error'))
  }

  private teardownPeer() {
    try {
      this.conn?.close()
    } catch {
      /* ignore */
    }
    this.conn = null
    try {
      if (this.peer && !this.peer.destroyed) this.peer.destroy()
    } catch {
      /* ignore */
    }
    this.peer = null
  }

  disconnect() {
    this.destroyedByUs = true
    this.teardownPeer()
    this.roomCode = null
    this.role = null
  }
}
