import express from 'express'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { act, addPlayer, createRoom, makeCode, normalizeRoomCode, removePlayer, setConnected, tick, view } from '../shared/game.js'
import { aimArcade, arcadeFrame, arcadeStep, tickArcade } from '../shared/arcade.js'

const isDevelopment = process.argv.includes('--dev')
const app = express()
app.disable('x-powered-by')
const server = createServer(app)
const socketIO = await import('socket.io').catch((error) => {
  if (!isDevelopment || error.code !== 'ERR_MODULE_NOT_FOUND' || !error.message.startsWith("Cannot find package 'socket.io'")) throw error
  console.warn('Mode solo uniquement. Pour activer les salons, lance npm install puis relance npm run dev.')
  return null
})
// A start action can include the host's ordered history for the whole question bank.
const io = socketIO && new socketIO.Server(server, { maxHttpBufferSize: 64 * 1024 })
const storage = io && process.env.QUIZ_DB ? (await import('./storage.js')).openStorage(process.env.QUIZ_DB) : null
const rooms = new Map(storage?.load().map((record) => [record.room.code, record]) ?? [])
app.get('/health', (_request, response) => response.json({ ok: true }))
if (!io) app.use('/socket.io', (_request, response) => response.sendStatus(503))

if (isDevelopment) {
  const { createServer: createViteServer } = await import('vite')
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: { server },
    },
  })
  app.use(vite.middlewares)
} else {
  const dist = fileURLToPath(new URL('../dist/', import.meta.url))
  app.use(express.static(dist))
  app.get('/', (_request, response) => response.sendFile('index.html', { root: dist }))
}

function publish(record, now = Date.now()) {
  storage?.save(record)
  for (const [id, socket] of record.sockets) {
    if (socket.connected) socket.emit('state', view(record.room, id, now))
  }
}

function attach(socket, record, id, token) {
  const previous = record.sockets.get(id)
  socket.data.session = { record, id, token }
  record.sockets.set(id, socket)
  record.away.delete(id)
  if (previous && previous !== socket) previous.disconnect()
  setConnected(record.room, id, true)
  record.room.touched = Date.now()
}

function closeRoom(record, hostId) {
  const { code } = record.room
  storage?.remove(code)
  rooms.delete(code)
  for (const [id, member] of record.sockets) {
    delete member.data.session
    if (id !== hostId) member.emit('room-closed')
  }
  record.sockets.clear()
  record.tokens.clear()
  record.away.clear()
}

function detach(socket, leaving = false) {
  const session = socket.data.session
  if (!session) return
  const { record, id, token } = session
  const current = record.sockets.get(id) === socket
  if (current && leaving && record.room.hostId === id) {
    closeRoom(record, id)
    return
  }
  delete socket.data.session
  if (!current) return
  record.sockets.delete(id)
  if (leaving) {
    record.tokens.delete(token)
    record.away.delete(id)
    removePlayer(record.room, id)
  } else {
    record.away.set(id, Date.now())
    setConnected(record.room, id, false)
  }
  record.room.touched = Date.now()
  publish(record)
}

io?.on('connection', (socket) => {
  let windowStart = Date.now()
  let events = 0

  function handle(event, callback) {
    socket.on(event, (payload, reply) => {
      if (typeof reply !== 'function') return
      const now = Date.now()
      if (now - windowStart > 1000) {
        windowStart = now
        events = 0
      }
      if (++events > 30) return reply({ ok: false, error: 'Réessaie dans un instant.' })
      try {
        const result = callback(payload, now)
        reply({ ok: true, ...result })
      } catch (error) {
        reply({ ok: false, error: error.message })
      }
    })
  }

  handle('enter', (payload, now) => {
    if (socket.data.session) {
      const { record, id, token } = socket.data.session
      return { state: view(record.room, id, now), token }
    }
    if (payload?.mode === 'resume') {
      const record = rooms.get(payload.code)
      if (!record) throw new Error('Ce salon est fermé ou a expiré.')
      const id = record.tokens.get(payload.token)
      if (!id || !record.room.players.has(id)) throw new Error('Ta place a expiré. Rejoins le salon avec son code.')
      attach(socket, record, id, payload.token)
      publish(record, now)
      return { state: view(record.room, id, now), token: payload.token }
    }
    const token = randomUUID()
    let record
    let player
    if (payload?.mode === 'create') {
      if (rooms.size >= 500) throw new Error('Le serveur est plein. Réessaie dans quelques minutes.')
      let code
      do { code = makeCode() } while (rooms.has(code))
      const created = createRoom(payload.profile, { code, now, personalityTest: payload.personalityTest, arcade: payload.arcade === true, groupHome: payload.groupHome === true })
      player = created.player
      record = { room: created.room, tokens: new Map(), sockets: new Map(), away: new Map() }
      rooms.set(code, record)
    } else if (payload?.mode === 'join') {
      const code = normalizeRoomCode(payload.code)
      record = rooms.get(code)
      if (!record) throw new Error('Salon introuvable. Vérifie le code.')
      player = addPlayer(record.room, payload.profile)
    } else {
      throw new Error('Action inconnue.')
    }
    record.tokens.set(token, player.id)
    attach(socket, record, player.id, token)
    publish(record, now)
    return { state: view(record.room, player.id, now), token }
  })

  handle('action', (input, now) => {
    const session = socket.data.session
    if (!session) throw new Error('Rejoins un salon pour jouer.')
    if (input?.type === 'leave') {
      detach(socket, true)
      return
    }
    const { record, id } = session
    act(record.room, id, input, now)
    if (input.type === 'start' || input.type === 'rematch') {
      for (const [token, playerId] of record.tokens) {
        if (!record.room.players.has(playerId)) {
          record.tokens.delete(token)
          record.away.delete(playerId)
        }
      }
    }
    publish(record, now)
  })

  socket.on('disconnect', () => detach(socket))
  let lastAimAt = 0
  socket.on('arcade-aim', (angle) => {
    const session = socket.data.session
    const now = Date.now()
    if (!session?.record.room.arcade || now - lastAimAt < 25) return
    lastAimAt = now
    aimArcade(session.record.room, session.id, angle)
  })
})

setInterval(() => {
  const now = Date.now()
  for (const record of rooms.values()) {
    if (record.room.phase !== 'arcade' || !record.sockets.size) continue
    if (tickArcade(record.room, now)) {
      publish(record, now)
      continue
    }
    const frame = arcadeFrame(record.room, now)
    for (const socket of record.sockets.values()) socket.volatile.emit('arcade-frame', frame)
  }
}, arcadeStep).unref()

setInterval(() => {
  const now = Date.now()
  for (const [code, record] of rooms) {
    if (!record.sockets.size && now - record.room.touched > (record.room.phase === 'lobby' ? 120_000 : 1_800_000)) {
      rooms.delete(code)
      storage?.remove(code)
      continue
    }
    let changed = tick(record.room, now)
    if (record.room.phase === 'lobby') {
      for (const [token, id] of record.tokens) {
        const awaySince = record.away.get(id)
        if (awaySince == null || now - awaySince < 45_000) continue
        removePlayer(record.room, id)
        record.tokens.delete(token)
        record.away.delete(id)
        changed = true
      }
    }
    if (changed) {
      publish(record, now)
    }
  }
}, 100).unref()

const port = Number(process.env.PORT || (isDevelopment ? 3000 : 3001))
server.listen(port, '0.0.0.0', () => console.log(`La Bande de Quiz · http://localhost:${port}`))
