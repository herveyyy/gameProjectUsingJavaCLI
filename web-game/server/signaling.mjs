/**
 * Lightweight WebSocket signaling for WebRTC (SDP / ICE relay).
 * Run: npm run signal   (default ws://127.0.0.1:8787)
 *
 * Protocol (JSON):
 * - Client → { type: 'create' } → Server → { type: 'created', room: 'ABC12X' }
 * - Client → { type: 'join', room: 'ABC12X' } → { type: 'joined' } | { type: 'error', message }
 *   Host gets { type: 'peer_joined', room }
 * - Client → { type: 'signal', room, payload } → forwarded to the other peer as { type: 'signal', payload }
 */

import { WebSocketServer } from 'ws'

const PORT = Number(process.env.SIGNAL_PORT || process.env.PORT || 8787)
const HOST = process.env.SIGNAL_HOST || '0.0.0.0'

const rooms = new Map()

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

function safeSend(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj))
}

function destroyRoom(code) {
  rooms.delete(code)
}

const wss = new WebSocketServer({ host: HOST, port: PORT })
// eslint-disable-next-line no-console
console.log(`[signaling] ws://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}`)

wss.on('connection', (ws) => {
  ws.role = null
  ws.roomCode = null

  ws.on('message', (buf) => {
    let msg
    try {
      msg = JSON.parse(buf.toString())
    } catch {
      return
    }

    if (msg.type === 'create') {
      let code = genCode()
      while (rooms.has(code)) code = genCode()
      rooms.set(code, { host: ws, guest: null })
      ws.role = 'host'
      ws.roomCode = code
      safeSend(ws, { type: 'created', room: code })
      return
    }

    if (msg.type === 'join') {
      const code = String(msg.room || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 8)
      const room = rooms.get(code)
      if (!room || room.guest) {
        safeSend(ws, { type: 'error', message: room ? 'Room is full' : 'Room not found' })
        return
      }
      room.guest = ws
      ws.role = 'guest'
      ws.roomCode = code
      safeSend(ws, { type: 'joined', room: code })
      safeSend(room.host, { type: 'peer_joined', room: code })
      return
    }

    if (msg.type === 'signal') {
      const code = msg.room || ws.roomCode
      if (!code) return
      const room = rooms.get(code)
      if (!room) return
      const peer = ws === room.host ? room.guest : room.host
      if (peer && peer.readyState === 1) {
        safeSend(peer, { type: 'signal', payload: msg.payload })
      }
      return
    }

    if (msg.type === 'ping') {
      safeSend(ws, { type: 'pong' })
    }
  })

  ws.on('close', () => {
    const code = ws.roomCode
    if (!code) return
    const room = rooms.get(code)
    if (!room) return
    const peer = ws === room.host ? room.guest : room.host
    if (peer && peer.readyState === 1) safeSend(peer, { type: 'peer_left' })
    destroyRoom(code)
  })
})
