import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Gamepad2, TimerReset, Trophy } from 'lucide-react'
import { arcadeColors, arcadeHeight, arcadeStep, arcadeWidth } from '../shared/arcade.js'
import { PlayerAvatar, PlayerName } from './profile.jsx'
import './arcade.css'

const headNames = ['Axel', 'Mathis', 'Flo']
const pelletColors = ['#dfff68', '#ff84bc', '#82dfff', '#ffbd71']
const keyDirections = {
  ArrowUp: [0, -1], z: [0, -1], w: [0, -1],
  ArrowDown: [0, 1], s: [0, 1],
  ArrowLeft: [-1, 0], q: [-1, 0], a: [-1, 0],
  ArrowRight: [1, 0], d: [1, 0],
}

export function headSource(player) {
  const name = player.name.toLowerCase()
  return player.photo || (headNames.some((head) => head.toLowerCase() === name) ? `/${name}.png` : undefined)
}

export function ArcadeAvatar({ player }) {
  return <PlayerAvatar player={{ ...player, photo: headSource(player) }} />
}

export function ArcadeIntro() {
  return <section className="panel arcade-intro">
    <Gamepad2 size={26} />
    <h2 className="display">Snake des potes</h2>
    <div className="arcade-heads" aria-hidden="true">{headNames.map((name, index) => <img key={name} src={headSource({ name })} alt="" style={{ '--snake-color': arcadeColors[index] }} />)}</div>
    <p>Ramasse les pastilles pour grandir. Si tu touches un mur ou un autre serpent, tu perds deux points et tu repars plus petit.</p>
    <p className="field-note">45 secondes pour finir devant tes potes. Souris, flèches, ZQSD ou glisse ton doigt dans l’arène.</p>
  </section>
}

function latestFrame(frameRef, initial) {
  const frame = frameRef.current
  return frame?.startsAt === initial.startsAt && frame.now >= initial.now ? frame : initial
}

function drawArena(ctx, frame, previous, blend, players, images, selfId) {
  ctx.clearRect(0, 0, arcadeWidth, arcadeHeight)
  for (const pellet of frame.pellets) {
    ctx.fillStyle = pelletColors[pellet.color]
    ctx.beginPath()
    ctx.arc(pellet.x, pellet.y, 5, 0, Math.PI * 2)
    ctx.fill()
  }
  for (const snake of frame.snakes) {
    const player = players.find(({ id }) => id === snake.id)
    if (!player) continue
    const last = previous?.snakes.find(({ id, shieldUntil }) => id === snake.id && shieldUntil === snake.shieldUntil)
    const x = last ? last.x + (snake.x - last.x) * blend : snake.x
    const y = last ? last.y + (snake.y - last.y) * blend : snake.y
    const color = arcadeColors[snake.slot]
    ctx.globalAlpha = snake.shielded ? .64 : 1
    ctx.strokeStyle = color
    ctx.lineWidth = 15
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (const point of snake.trail) ctx.lineTo(point.x, point.y)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(x, y, 19, 0, Math.PI * 2)
    ctx.fillStyle = '#181821'
    ctx.fill()
    ctx.lineWidth = snake.id === selfId ? 5 : 3
    ctx.stroke()
    const photo = images.get(player.id)
    ctx.save()
    ctx.clip()
    if (photo?.complete && photo.naturalWidth) {
      const scale = 38 / Math.max(photo.naturalWidth, photo.naturalHeight)
      const width = photo.naturalWidth * scale
      const height = photo.naturalHeight * scale
      ctx.drawImage(photo, x - width / 2, y - height / 2, width, height)
    } else {
      ctx.fillStyle = '#fff'
      ctx.font = '22px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(player.avatar, x, y + 1)
    }
    ctx.restore()

    ctx.globalAlpha = 1
    ctx.font = 'bold 16px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.strokeStyle = '#100f17'
    ctx.fillStyle = snake.id === selfId ? color : '#fff'
    ctx.lineWidth = 4
    const label = snake.id === selfId ? 'TOI' : player.name
    const labelY = y < 44 ? y + 40 : y - 27
    ctx.strokeText(label, x, labelY, 170)
    ctx.fillText(label, x, labelY, 170)
  }
}

export function ArcadeRound({ state, frameRef, aim, reconnecting, error, paused }) {
  const canvas = useRef(null)
  const pointer = useRef(null)
  const initial = state.arcade.frame
  const [hud, setHud] = useState(initial)
  const images = useRef(new Map())

  useEffect(() => {
    images.current = new Map(state.players.flatMap((player) => {
      const source = headSource(player)
      if (!source) return []
      const photo = new Image()
      photo.src = source
      return [[player.id, photo]]
    }))
  }, [state.players])

  useEffect(() => {
    const ctx = canvas.current.getContext('2d')
    let active = initial
    let previous
    let arrived = performance.now()
    let animation
    function render(time) {
      const frame = latestFrame(frameRef, initial)
      if (frame !== active) {
        previous = active
        arrived = time
        active = frame
      }
      drawArena(ctx, active, previous, Math.min(1, (time - arrived) / arcadeStep), state.players, images.current, state.selfId)
      animation = requestAnimationFrame(render)
    }
    animation = requestAnimationFrame(render)
    const updateHud = setInterval(() => setHud(latestFrame(frameRef, initial)), 125)
    return () => {
      cancelAnimationFrame(animation)
      clearInterval(updateHud)
    }
  }, [frameRef, initial, state.players, state.selfId])

  useEffect(() => {
    if (paused || reconnecting) return
    const pressed = new Set()
    function keyDown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.target.matches?.('input, textarea, select')) return
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
      if (!Object.hasOwn(keyDirections, key)) return
      event.preventDefault()
      pressed.add(key)
      pointer.current = null
    }
    function keyUp(event) {
      pressed.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key)
    }
    function blur() {
      pressed.clear()
      pointer.current = null
    }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', blur)
    const send = setInterval(() => {
      const directions = [...pressed].map((key) => keyDirections[key])
      const x = Math.sign(directions.reduce((sum, direction) => sum + direction[0], 0))
      const y = Math.sign(directions.reduce((sum, direction) => sum + direction[1], 0))
      if (x || y) {
        aim(Math.atan2(y, x))
        return
      }
      if (!pointer.current) return
      const frame = latestFrame(frameRef, initial)
      const self = frame.snakes.find(({ id }) => id === state.selfId)
      if (!self) return
      const dx = pointer.current.x - self.x
      const dy = pointer.current.y - self.y
      if (Math.hypot(dx, dy) > 24) aim(Math.atan2(dy, dx))
    }, arcadeStep)
    return () => {
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', blur)
      clearInterval(send)
      pointer.current = null
    }
  }, [aim, frameRef, initial, paused, reconnecting, state.selfId])

  function steer(event) {
    if (event.pointerType !== 'mouse' && event.buttons === 0) return
    const bounds = event.currentTarget.getBoundingClientRect()
    pointer.current = {
      x: (event.clientX - bounds.left) / bounds.width * arcadeWidth,
      y: (event.clientY - bounds.top) / bounds.height * arcadeHeight,
    }
  }

  const { now } = hud
  const countdown = Math.max(0, Math.ceil((initial.startsAt - now) / 1000))
  const seconds = Math.max(0, Math.ceil((initial.endsAt - Math.max(now, initial.startsAt)) / 1000))
  return <main className="page-width game-page arcade-page">
    <div className="game-heading arcade-heading"><h1 className="display">Snake des potes</h1><span className="arcade-timer" aria-label="Temps restant">{seconds} s</span></div>
    <ul className="arcade-scores" aria-label="Scores">{hud.snakes.map((snake) => {
      const player = state.players.find(({ id }) => id === snake.id)
      return player && <li key={snake.id} style={{ '--snake-color': arcadeColors[snake.slot] }}><ArcadeAvatar player={player} /><PlayerName player={player} /><strong>{snake.score}</strong></li>
    })}</ul>
    <div className="arcade-board">
      <canvas ref={canvas} width={arcadeWidth} height={arcadeHeight} aria-label="Arène de Snake des potes"
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); steer(event) }} onPointerMove={steer}
        onPointerUp={() => { pointer.current = null }} onPointerCancel={() => { pointer.current = null }}
        onPointerLeave={() => { pointer.current = null }} />
      {countdown > 0 && <span className="arcade-countdown display" role="status">{countdown}</span>}
    </div>
    <p className="field-note arcade-controls">Souris · Flèches · ZQSD · Glisse ton doigt sur l’arène</p>
    {(error || reconnecting) && <p className="error-text" role="status">{error || 'Reconnexion à l’arène…'}</p>}
  </main>
}

export function ArcadeResults({ state, action, leave, error }) {
  const ranking = [...state.arcade.frame.snakes].sort((a, b) => Number(b.connected) - Number(a.connected) || b.score - a.score)
  const [first, second] = ranking
  const winner = state.players.find(({ id }) => id === first.id)
  const tie = second && first.score === second.score && first.connected === second.connected
  return <main className="page-width game-page arcade-page">
    <div className="game-heading"><div className="eyebrow">Snake des potes</div><h1 className="display">{tie ? 'Égalité !' : `${winner.name} gagne !`}</h1></div>
    <section className="panel">
      <div className="section-head"><h2 className="display">Classement</h2><Trophy size={22} /></div>
      <ol className="player-list">{ranking.map((snake) => {
        const player = state.players.find(({ id }) => id === snake.id)
        return <li key={snake.id}><ArcadeAvatar player={player} /><div><strong><PlayerName player={player} /></strong>{!snake.connected && <p>Déconnecté</p>}</div><strong className="arcade-points">{snake.score} pts</strong></li>
      })}</ol>
    </section>
    {error && <p className="error-text" role="alert">{error}</p>}
    <div className="personality-actions">
      {state.selfId === state.hostId && <button className="button primary" onClick={() => action({ type: 'rematch' })}><TimerReset size={19} /> Rejouer</button>}
      <button className="button secondary" onClick={leave}><ArrowLeft size={17} /> Accueil</button>
    </div>
  </main>
}
