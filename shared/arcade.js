export const arcadeWidth = 960
export const arcadeHeight = 600
export const arcadeLimit = 3
export const arcadeStep = 50
export const arcadeDuration = 45_000
export const arcadeColors = ['#dfff68', '#ff84bc', '#82dfff']

const headRadius = 19
const pelletCount = 34
const pelletColors = 4
const reconnectGrace = 8000
const spawns = [
  { x: 180, y: 170, angle: .4 },
  { x: 780, y: 170, angle: Math.PI - .4 },
  { x: 480, y: 470, angle: -Math.PI / 2 },
]
const distance = (x, y) => x * x + y * y

function spawn(snake, shieldUntil) {
  const { x, y, angle } = spawns[snake.slot]
  Object.assign(snake, { x, y, angle, target: angle, shieldUntil, trail: [{ x, y }] })
}

function pellet() {
  return {
    x: 34 + Math.round(Math.random() * (arcadeWidth - 68)),
    y: 34 + Math.round(Math.random() * (arcadeHeight - 68)),
    color: Math.floor(Math.random() * pelletColors),
  }
}

export function actArcade(room, action, now) {
  if (action?.type === 'start' && room.phase === 'lobby') {
    const active = [...room.players.values()].filter((player) => player.connected)
    if (active.length < 2) throw new Error('Il faut au moins deux têtes pour lancer l’arène.')
    for (const player of room.players.values()) if (!player.connected) room.players.delete(player.id)
    const startsAt = now + 3000
    const snakes = active.map(({ id }, slot) => {
      const snake = { id, slot, score: 0 }
      spawn(snake, startsAt + 1200)
      return snake
    })
    room.arcade = { startsAt, endsAt: startsAt + arcadeDuration, snakes, pellets: Array.from({ length: pelletCount }, pellet) }
    room.phase = 'arcade'
    return
  }
  if (action?.type === 'rematch' && room.phase === 'arcade-final') {
    for (const player of room.players.values()) if (!player.connected) room.players.delete(player.id)
    room.arcade = {}
    room.phase = 'lobby'
    return
  }
  throw new Error('Cette action est indisponible dans l’arène.')
}

export function aimArcade(room, id, angle) {
  if (room.phase !== 'arcade' || !Number.isFinite(angle) || Math.abs(angle) > Math.PI) return
  const snake = room.arcade.snakes.find((candidate) => candidate.id === id)
  if (snake && room.players.get(id)?.connected) snake.target = angle
}

function advance(snake) {
  const delta = Math.atan2(Math.sin(snake.target - snake.angle), Math.cos(snake.target - snake.angle))
  snake.angle += Math.max(-.26, Math.min(.26, delta))
  const speed = 7.5 - Math.min(snake.score, 18) * .1
  snake.x += Math.cos(snake.angle) * speed
  snake.y += Math.sin(snake.angle) * speed
  if (distance(snake.x - snake.trail[0].x, snake.y - snake.trail[0].y) >= 13 ** 2) {
    snake.trail.unshift({ x: snake.x, y: snake.y })
    snake.trail.length = Math.min(snake.trail.length, 5 + Math.min(snake.score, 22))
  }
}

export function tickArcade(room, now) {
  if (room.phase !== 'arcade') return false
  const { startsAt, endsAt, snakes, pellets } = room.arcade
  if (now < startsAt) return false
  const active = snakes.filter(({ id }) => room.players.get(id)?.connected)
  room.arcade.shortSince = active.length < 2 ? room.arcade.shortSince ?? now : null
  if (now >= endsAt || (room.arcade.shortSince !== null && now - room.arcade.shortSince >= reconnectGrace)) {
    for (const snake of snakes) snake.connectedAtFinish = Boolean(room.players.get(snake.id)?.connected)
    room.phase = 'arcade-final'
    room.touched = now
    return true
  }
  for (const snake of active) advance(snake)
  const crashed = new Set(active.filter((snake) => {
    const { x, y, shieldUntil } = snake
    if (x < headRadius || y < headRadius || x > arcadeWidth - headRadius || y > arcadeHeight - headRadius) return true
    return now >= shieldUntil && active.some((other) =>
      other !== snake && now >= other.shieldUntil && (
        distance(x - other.x, y - other.y) < (headRadius * 1.65) ** 2
        || other.trail.some((point) => distance(x - point.x, y - point.y) < (headRadius + 6) ** 2)
      ),
    )
  }))
  for (const snake of active) {
    if (crashed.has(snake)) {
      snake.score = Math.max(0, snake.score - 2)
      spawn(snake, now + 1200)
      continue
    }
    pellets.forEach((point, index) => {
      if (distance(snake.x - point.x, snake.y - point.y) >= (headRadius + 6) ** 2) return
      snake.score++
      pellets[index] = pellet()
    })
  }
  return false
}

export function arcadeFrame(room, now) {
  const { startsAt, endsAt, snakes, pellets } = room.arcade
  if (!snakes) return null
  return {
    startsAt, endsAt, now, pellets,
    snakes: snakes.filter(({ id }) => room.phase === 'arcade-final' || room.players.get(id)?.connected)
      .map(({ id, slot, x, y, score, trail, shieldUntil, connectedAtFinish }) => ({
        id, slot, x, y, score, trail, shielded: now < shieldUntil, shieldUntil,
        connected: connectedAtFinish ?? true,
      })),
  }
}
