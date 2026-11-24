import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, Brain, Check,
  ChevronRight, CircleHelp, Clock3, Copy, Crown, Film, Flame, Gamepad2, Globe2, PawPrint,
  HeartHandshake, Image, Maximize2, Play, Plus, Shuffle, Smile, Sparkles, Square, Swords, TimerReset, Trophy, Twitch, Users, Volume2, X, Youtube, Zap,
} from 'lucide-react'
import '@fontsource-variable/geist'
import { act, avatars, counts, createRoom, defaultSettings, durations, jokerFitsQuestion, jokers, maxSpeedBonus, mergeQuestionHistory, questionCounts, tick, view } from '../shared/game.js'
import { categories, illustratedCategory, themeOptions } from '../shared/questions.js'
import { getPersonalityQuestion } from '../shared/personality.js'
import { PlayerAvatar, PlayerName, ProfileAppearance } from './profile.jsx'
import { PersonalityIntro, PersonalityResults, PersonalityRound, PersonalitySetup } from './personality.jsx'
import { SpeechSettings, useQuestionSpeech } from './speech.jsx'
import { heroLines, illustratedCovers, pickHomeItem } from './home-content.js'
import './styles.css'

const categoryIcons = { brain: Brain, paw: PawPrint, trophy: Trophy, twitch: Twitch, youtube: Youtube, smile: Smile, gamepad: Gamepad2, film: Film, image: Image }
const jokerIcons = { half: Sparkles, poll: BarChart3, double: Swords, time: TimerReset }
const letters = ['A', 'B', 'C', 'D']
const score = new Intl.NumberFormat('fr-FR')
const historyKey = 'qc-question-history'
const speechKey = 'qc-speech'
const codeFromUrl = new URLSearchParams(location.search).get('room')?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) ?? ''

function stored(key, fallback, storage = 'sessionStorage') {
  try { return JSON.parse(window[storage].getItem(key)) ?? fallback } catch { return fallback }
}

function store(key, value, storage = 'sessionStorage') {
  try { window[storage].setItem(key, JSON.stringify(value)) } catch { /* Private browsing can disable storage. */ }
}

function request(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(4500).emit(event, payload, (error, response) => {
      if (error) reject(new Error('Serveur indisponible. Tu peux jouer en solo pendant ce temps.'))
      else if (!response?.ok) reject(new Error(response?.error || 'L’action a échoué.'))
      else resolve(response)
    })
  })
}

let clientLibrary
function loadSocket() {
  if (location.protocol === 'file:') return Promise.reject(new Error('Cet aperçu est hors ligne. Lance le serveur du projet pour jouer entre amis.'))
  if (window.io) return Promise.resolve(window.io)
  if (clientLibrary) return clientLibrary
  clientLibrary = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    function fail() {
      clearTimeout(timer)
      script.remove()
      clientLibrary = null
      reject(new Error('Serveur indisponible. Tu peux jouer en solo pendant ce temps.'))
    }
    const timer = setTimeout(fail, 3500)
    script.onload = () => {
      clearTimeout(timer)
      if (window.io) resolve(window.io)
      else fail()
    }
    script.onerror = fail
    script.src = '/socket.io/socket.io.js'
    document.head.append(script)
  })
  return clientLibrary
}

function useGame() {
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const local = useRef(null)
  const socket = useRef(null)
  const session = useRef(stored('qc-session', null))
  const clockOffset = useRef(0)
  const ignoreState = useRef(false)
  const entering = useRef(false)
  const questionHistory = useRef([])
  const lastRound = useRef('')

  function readHistory() {
    return stored(historyKey, questionHistory.current, 'localStorage')
  }

  function receive(next) {
    if (next.selfId === next.hostId && next.question && next.personal) {
      const round = `${next.code}/${next.personal.start}/${next.index}/${next.question.id}`
      if (round !== lastRound.current) {
        lastRound.current = round
        questionHistory.current = mergeQuestionHistory(readHistory(), [next.question.id])
        store(historyKey, questionHistory.current, 'localStorage')
      }
    }
    clockOffset.current = next.now - Date.now()
    setState(next)
  }

  async function connect() {
    if (socket.current) return socket.current
    const io = await loadSocket()
    if (socket.current) return socket.current
    const client = io({ autoConnect: false, reconnection: true, timeout: 3500 })
    client.on('state', (next) => { if (socket.current === client && !ignoreState.current) receive(next) })
    client.on('disconnect', () => { if (socket.current === client && session.current) setReconnecting(true) })
    client.on('connect_error', () => {
      if (socket.current !== client || entering.current || !session.current) return
      setReconnecting(false)
      setError('Serveur indisponible. Tu peux jouer en solo pendant ce temps.')
    })
    client.on('connect', async () => {
      const pending = session.current
      if (!pending || entering.current) return
      const stillCurrent = () => socket.current === client && session.current === pending
      try {
        const response = await request(client, 'enter', { ...pending, mode: 'resume' })
        if (stillCurrent() && !ignoreState.current) {
          setError('')
          receive(response.state)
        }
      } catch (problem) {
        if (!stillCurrent()) return
        session.current = null
        store('qc-session', null)
        setState(null)
        setError(problem.message)
        client.disconnect()
      } finally {
        if (socket.current === client) setReconnecting(false)
      }
    })
    socket.current = client
    return client
  }

  useEffect(() => {
    if (session.current && (!codeFromUrl || codeFromUrl === session.current.code)) {
      setBusy(true)
      setReconnecting(true)
      connect().then((client) => client.connect()).catch((problem) => {
        setError(problem.message)
        setReconnecting(false)
      }).finally(() => setBusy(false))
    }
    const interval = setInterval(() => {
      const game = local.current
      if (game && tick(game.room)) receive(view(game.room, game.player.id))
    }, 100)
    return () => {
      clearInterval(interval)
      socket.current?.disconnect()
    }
  }, [])

  async function enter(mode, profile, { code, theme, personalityTest, speedBonus = defaultSettings.speedBonus } = {}) {
    setError('')
    setBusy(true)
    try {
      if (mode === 'local') {
        session.current = null
        store('qc-session', null)
        socket.current?.disconnect()
        setReconnecting(false)
        local.current = createRoom(profile, { local: true, personalityTest })
        const { room, player } = local.current
        if (theme) act(room, player.id, { type: 'settings', settings: { themes: [theme], speedBonus } })
        if (personalityTest) act(room, player.id, { type: 'start' })
        else if (theme === illustratedCategory.id) act(room, player.id, { type: 'start', history: readHistory() })
        receive(view(room, player.id))
      } else {
        session.current = null
        store('qc-session', null)
        entering.current = true
        ignoreState.current = false
        const client = (await connect()).connect()
        const response = await request(client, 'enter', { mode, code, profile, personalityTest })
        session.current = { code: response.state.code, token: response.token }
        store('qc-session', session.current)
        receive(response.state)
      }
      store('qc-profile', { ...profile, name: profile.name.trim().replace(/\s+/g, ' ') }, 'localStorage')
      return true
    } catch (problem) {
      if (mode !== 'local') socket.current?.disconnect()
      setError(problem.message)
      return false
    } finally {
      entering.current = false
      setBusy(false)
    }
  }

  async function action(input) {
    setError('')
    const command = input.type === 'start' && !state?.personality ? { ...input, history: readHistory() } : input
    try {
      if (local.current) {
        act(local.current.room, local.current.player.id, command)
        receive(view(local.current.room, local.current.player.id))
      } else {
        if (!socket.current?.connected || reconnecting) throw new Error('Reconnexion au salon en cours…')
        await request(socket.current, 'action', command)
      }
    } catch (problem) {
      setError(problem.message)
    }
  }

  function leave() {
    ignoreState.current = true
    local.current = null
    session.current = null
    store('qc-session', null)
    const client = socket.current
    socket.current = null
    if (client?.connected) request(client, 'action', { type: 'leave' }).catch(() => {}).finally(() => client.disconnect())
    else client?.disconnect()
    setState(null)
    setError('')
    setReconnecting(false)
    const url = new URL(location.href)
    url.searchParams.delete('room')
    history.replaceState(null, '', url)
  }

  return { state, busy, error, reconnecting, clockOffset, enter, action, leave, clearError: () => setError('') }
}

function CategoryIcon({ category, size = 22 }) {
  const Icon = categoryIcons[category.icon]
  return <Icon size={size} strokeWidth={2} />
}

function Logo() {
  return <span className="logo"><span className="logo-mark"><Zap size={20} strokeWidth={3} fill="currentColor" /></span><span className="logo-wordmark"><span>LA BANDE</span>{' '}<span>DE QUIZ</span></span></span>
}

function Modal({ title, children, close, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])
  function dismiss() {
    ref.current.close()
    close()
  }
  return <dialog ref={ref} className={'modal ' + className} aria-label={title} onCancel={(event) => { event.preventDefault(); dismiss() }} onClick={(event) => { if (event.target === event.currentTarget) dismiss() }}>
    <div className="modal-body">
      <div className="modal-heading"><h2 className="display">{title}</h2><button type="button" className="icon-button" onClick={dismiss} aria-label="Fermer"><X size={20} /></button></div>
      {children}
    </div>
  </dialog>
}

function ErrorText({ children }) {
  return children ? <p className="error-text" role="alert">{children}</p> : null
}

const homeStickers = [
  { name: 'flo', x: 8, y: 11, size: 131, tilt: -17, cycle: 13, delay: -2 },
  { name: 'mathis', x: 69, y: 7, size: 96, tilt: 13, cycle: 16, delay: -11 },
  { name: 'axel', x: 92, y: 16, size: 144, tilt: 15, cycle: 17, delay: -1 },
  { name: 'mathis', x: 27, y: 16, size: 106, tilt: -14, cycle: 14, delay: -5 },
  { name: 'axel', x: 50, y: 24, size: 125, tilt: 11, cycle: 19, delay: -3 },
  { name: 'flo', x: 78, y: 34, size: 70, tilt: 18, cycle: 12, delay: -9 },
  { name: 'axel', x: 6, y: 43, size: 95, tilt: -16, cycle: 15, delay: -6 },
  { name: 'mathis', x: 44, y: 44, size: 141, tilt: -12, cycle: 18, delay: -1 },
  { name: 'flo', x: 95, y: 51, size: 128, tilt: 9, cycle: 14, delay: -5.5 },
  { name: 'mathis', x: 16, y: 63, size: 118, tilt: 17, cycle: 17, delay: -2 },
  { name: 'axel', x: 57, y: 60, size: 87, tilt: -9, cycle: 12, delay: -3.1 },
  { name: 'flo', x: 33, y: 73, size: 113, tilt: -22, cycle: 16, delay: -13.1 },
  { name: 'mathis', x: 76, y: 77, size: 121, tilt: 12, cycle: 15, delay: -2.6 },
  { name: 'axel', x: 19, y: 93, size: 152, tilt: -11, cycle: 19, delay: -5.4 },
  { name: 'flo', x: 61, y: 91, size: 74, tilt: 13, cycle: 13, delay: -4.8 },
  { name: 'mathis', x: 90, y: 90, size: 102, tilt: -15, cycle: 16, delay: -10.2 },
]

function HomeStickers({ paused }) {
  const prefix = location.protocol === 'file:' ? './' : '/'
  return <div className="home-stickers" data-paused={paused} aria-hidden="true">
    {homeStickers.map(({ name, x, y, size, tilt, cycle, delay }) => <img
      key={`${x}-${y}`} className="home-sticker" src={`${prefix}${name}.png`} alt="" decoding="async"
      style={{ left: `${x}%`, top: `${y}%`, '--size': `${size}px`, '--tilt': `${tilt}deg`, animationDuration: `${cycle}s`, animationDelay: `${delay}s` }}
    />)}
  </div>
}

function useHomeRotation(items, key) {
  const [selection] = useState(() => pickHomeItem(items, stored(key, [], 'localStorage')))
  useEffect(() => { store(key, selection.history, 'localStorage') }, [key, selection])
  return selection.item
}

function Home({ game, profile, setProfile, photoBusy, setPhotoBusy, openCreate, openSolo, openPersonality, code, setCode }) {
  const headline = useHomeRotation(heroLines, 'qc-hero')
  const cover = useHomeRotation(illustratedCovers, 'qc-illustrated-cover')
  const [stickersPaused, setStickersPaused] = useState(() => stored('qc-stickers-paused', false, 'localStorage'))
  useEffect(() => { store('qc-stickers-paused', stickersPaused, 'localStorage') }, [stickersPaused])
  return <main className="home page-width">
    <HomeStickers paused={stickersPaused} />
    <section className="hero" aria-labelledby="home-title">
      <div className="hero-copy">
        <h1 className="display hero-title" id="home-title">{headline[0]} <em>{headline[1]}</em></h1>
        <p>Défie tes amis ou joue en solo contre trois bots.</p>
        <div className="home-actions">
          <button className="button primary" onClick={openCreate}><Plus size={20} /> Créer un salon</button>
          <button className="button secondary" disabled={game.busy} onClick={() => openSolo()}><Play size={17} /> Jouer en solo</button>
        </div>
        <button className="illustrated-card" type="button" onClick={() => openSolo(illustratedCategory.id)} disabled={game.busy}>
          <img src={localMediaPaths(cover)[0]} alt="" />
          <span className="illustrated-copy"><span className="illustrated-label"><Image size={15} /> Images et vidéos</span><strong>Quiz illustré</strong></span>
          <span className="illustrated-arrow"><ArrowRight size={20} /></span>
        </button>
        <button className="personality-entry" type="button" onClick={openPersonality} disabled={game.busy}>
          <HeartHandshake size={23} /><span><strong>Tests de personnalité</strong><small>8 questions, un verdict absurde. En solo ou entre potes.</small></span><ArrowRight size={18} />
        </button>
      </div>
      <div className="hero-side">
        <form className="join-panel" onSubmit={(event) => { event.preventDefault(); game.enter('join', profile, { code }) }}>
          <div className="join-heading"><h2 className="display">Rejoindre un salon</h2><Users size={22} /></div>
          <label className="field-label" htmlFor="room-code">Code du salon</label>
          <div className="code-input-wrap"><input id="room-code" className="code-input" placeholder="ABC123" autoComplete="off" spellCheck="false" maxLength={6} minLength={6} pattern="[A-Za-z0-9]{6}" required value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} /><span>#</span></div>
          <label className="field-label" htmlFor="join-name">Ton pseudo</label>
          <input id="join-name" placeholder="Ex. Pixel42" autoComplete="nickname" required maxLength={20} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
          <ProfileAppearance {...{ profile, setProfile, photoBusy, setPhotoBusy }} />
          <ErrorText>{game.error}</ErrorText>
          <button className="button outlined w-full justify-center" disabled={game.busy || photoBusy}>Rejoindre <ArrowRight size={17} /></button>
        </form>
      </div>
    </section>
    <section className="themes" aria-labelledby="themes-title">
      <div className="themes-heading"><h2 className="display" id="themes-title">Jouer par thème</h2><button className="sticker-toggle" type="button" onClick={() => setStickersPaused(!stickersPaused)}>{stickersPaused ? 'Afficher les stickers' : 'Masquer les stickers'}</button></div>
      <div className="theme-grid">
        {categories.map((category) => <button type="button" className="theme-card" key={category.id} onClick={() => openSolo(category.id)} disabled={game.busy}><span className="theme-icon"><CategoryIcon category={category} size={19} /></span><span>{category.name}</span><ArrowRight className="theme-arrow" size={16} /></button>)}
      </div>
    </section>
  </main>
}

function SpeedBonusSetting({ enabled, onChange, disabled = false }) {
  return <label className="speed-setting">
    <Zap size={19} aria-hidden="true" />
    <span><strong>Bonus de rapidité</strong><small>Jusqu’à {maxSpeedBonus} points en plus par bonne réponse.</small></span>
    <input type="checkbox" checked={enabled} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
  </label>
}

function Settings({ state, action, host }) {
  const { settings } = state
  const themeCounts = state.questionCounts ?? questionCounts
  const total = categories.reduce((sum, { id }) => sum + themeCounts[id], 0)
  const limit = settings.themes.length
    ? settings.themes.reduce((sum, id) => sum + themeCounts[id], 0)
    : total
  const update = (change) => action({ type: 'settings', settings: change })
  const toggleTheme = (id) => action({ type: 'settings', theme: id })
  return <section className="panel settings">
    <div className="section-head"><h2 className="display">Paramètres</h2></div>
    <fieldset disabled={!host}>
      <legend className="field-label">Thèmes</legend>
      <div className="setting-themes">
        <button aria-pressed={!settings.themes.length} className="setting-option random" onClick={() => update({ themes: [] })}><Shuffle size={18} /> Tous les thèmes <span className="theme-question-count">{total} questions</span></button>
        {themeOptions.map((category) => <button className="setting-option" key={category.id} aria-pressed={settings.themes.includes(category.id)} onClick={() => toggleTheme(category.id)}><CategoryIcon category={category} size={17} /><span className="theme-option-label">{category.name}<small>{themeCounts[category.id]} questions</small></span></button>)}
      </div>
    </fieldset>
    <div className="settings-fields">
      <label className="field-label">Questions<select disabled={!host} value={settings.total} onChange={(event) => update({ total: Number(event.target.value) })}>{counts.map((count) => <option key={count} value={count} disabled={count > limit}>{count} questions</option>)}</select></label>
      <label className="field-label">Temps par question<select disabled={!host} value={settings.duration} onChange={(event) => update({ duration: Number(event.target.value) })}>{durations.map((seconds) => <option key={seconds} value={seconds}>{seconds} secondes</option>)}</select></label>
    </div>
    <p className="field-note" aria-live="polite">{settings.themes.length > 0 && `${limit} questions disponibles avec cette sélection.`}</p>
    <SpeedBonusSetting enabled={settings.speedBonus ?? defaultSettings.speedBonus} disabled={!host} onChange={(speedBonus) => update({ speedBonus })} />
    <div className="joker-settings">
      <div className="field-label">Jokers par joueur</div>
      {jokers.map(({ id, name, description }) => {
        const Icon = jokerIcons[id]
        return <label className="joker-setting" key={id}><span className="joker-icon"><Icon size={19} /></span><span><strong>{name}</strong><small>{description}</small></span><select aria-label={'Quantité de jokers ' + name} disabled={!host} value={settings.jokers[id]} onChange={(event) => update({ jokers: { [id]: Number(event.target.value) } })}><option value={0}>Désactivé</option>{[1, 2, 3].map((count) => <option key={count} value={count}>× {count}</option>)}</select></label>
      })}
    </div>
  </section>
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return true } catch { /* Use the selection fallback. */ }
  }
  const field = document.createElement('textarea')
  field.value = text
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.append(field)
  field.select()
  try { return document.execCommand('copy') } catch { return false } finally { field.remove() }
}

function Lobby({ state, action, error }) {
  const host = state.selfId === state.hostId
  const canStart = state.players.length >= 2 || (state.local && Boolean(state.personality))
  const [copied, setCopied] = useState('')
  async function copy(kind) {
    const url = new URL(location.href)
    url.searchParams.set('room', state.code)
    setCopied(await copyText(kind === 'code' ? state.code : url.toString()) ? kind : 'failed')
  }
  return <main className="page-width game-page">
    <div className="game-heading"><h1 className="display">{state.local ? 'Partie solo' : 'Salon d’attente'}</h1></div>
    <div className="lobby-grid">
      <section className="panel lobby-players">
        {state.local ? <div className="lobby-code local-code"><Gamepad2 size={32}/><div><strong className="display">{state.personality ? 'Questionnaire en solo' : 'Solo contre les bots'}</strong>{!state.personality && <p>Pixel, Mochi et Glitch jouent avec toi.</p>}</div></div> :
          <div className="lobby-code"><div className="field-label">Code du salon</div><strong className="display">{state.code}</strong><div className="flex flex-wrap gap-2"><button className="button small secondary" onClick={() => copy('code')}>{copied === 'code' ? <Check size={15} /> : <Copy size={15} />}{copied === 'code' ? 'Code copié' : 'Copier le code'}</button><button className="button small secondary" onClick={() => copy('link')}>{copied === 'link' ? <Check size={15} /> : <Copy size={15} />}{copied === 'link' ? 'Lien copié' : 'Copier le lien'}</button></div>{copied === 'failed' && <p className="field-note" role="status">Sélectionne le code pour le copier.</p>}</div>}
        <div className="player-heading"><h2 className="display">Joueurs</h2><span><Users size={16} /> {state.players.length}{!state.local && ' / 24'}</span></div>
        <ul className="player-list">{state.players.map((player) => <li key={player.id}><PlayerAvatar player={player} /><strong><PlayerName player={player} />{player.id === state.selfId && <small> (toi)</small>}</strong>{player.id === state.hostId && <span className="host-tag"><Crown size={14} /> Hôte</span>}{player.bot && <span className="host-tag bot-tag">Bot</span>}</li>)}</ul>
        <ErrorText>{error}</ErrorText>
        {host ? <><button className="button primary w-full justify-center mt-5" disabled={!canStart} onClick={() => action({ type: 'start' })}><Play size={19} fill="currentColor" /> {state.personality ? 'Lancer le questionnaire' : 'Lancer la partie'}</button>{!canStart && <p className="field-note text-center">Il faut au moins 2 joueurs pour démarrer.</p>}</> : <p className="wait-note"><span /> L’hôte lance la partie.</p>}
      </section>
      {state.personality ? <PersonalityIntro testId={state.personality.testId} /> : <Settings state={state} action={action} host={host} />}
    </div>
  </main>
}

function VoteBars({ percentages, choices, correct }) {
  return <div className={'vote-bars' + (choices ? ' vote-details' : '')}>
    {percentages.map((percent, index) => <div key={index} data-correct={index === correct}><span>{choices?.length === 2 ? choices[index] : letters[index] + (choices ? ' · ' + choices[index] : '')}</span><span className="vote-track"><i style={{ width: percent + '%' }} /></span><strong>{percent} %</strong></div>)}
  </div>
}

function localMediaPaths(file) {
  if (!file) return []
  return location.protocol === 'file:' ? ['./media/' + file, './public/media/' + file] : ['/media/' + file]
}

function ImageReference({ image, multiple, reveal }) {
  const [attempt, setAttempt] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const zoomButton = useRef(null)
  const localPaths = localMediaPaths(image.file)
  const fallbacks = localMediaPaths(image.fallbackFile)
  const src = [...localPaths, ...fallbacks, image.url].filter(Boolean)[attempt]
  const illustration = fallbacks.includes(src)
  const alt = illustration ? image.fallbackAlt ?? image.alt : image.alt
  function closeImage() {
    setExpanded(false)
    zoomButton.current?.focus({ preventScroll: true })
  }
  return <figure className="image-reference">
    {src
      ? <button ref={zoomButton} type="button" className="image-zoom" aria-haspopup="dialog" aria-label={alt ? `Agrandir l’image. ${alt}` : 'Agrandir l’image'} onClick={() => setExpanded(true)}>
          <img src={src} alt={alt} onError={() => setAttempt((value) => value + 1)} referrerPolicy="no-referrer" />
          <span className="image-zoom-icon" aria-hidden="true"><Maximize2 size={17} /></span>
        </button>
      : <div className="media-unavailable">Image indisponible dans cet aperçu.</div>}
    {expanded && src && <Modal title="Image agrandie" className="image-modal" close={closeImage}>
      <img src={src} alt={alt} referrerPolicy="no-referrer" />
      {!reveal && <p>Le chrono continue.</p>}
    </Modal>}
    {illustration ? <figcaption>Illustration du quiz</figcaption> : reveal && (image.source || image.credit || image.license) && <figcaption>
      {image.source && <a href={image.source} target="_blank" rel="noreferrer">{multiple ? image.credit || 'Image originale' : 'Image originale'} <ArrowUpRight size={13} /></a>}
      {!image.source && image.credit && <span>{image.credit}</span>}
      {image.license && <a href={image.license} target="_blank" rel="noreferrer">{!multiple && image.credit ? image.credit : 'Licence'}</a>}
      {image.source && !image.license && !multiple && image.credit && <span>{image.credit}</span>}
    </figcaption>}
  </figure>
}

function QuestionImages({ media, reveal }) {
  const images = media.items ?? [media]
  return <div className={'question-media question-image' + (images.length > 1 ? ' media-gallery' : '')} aria-label={images.length > 1 ? 'Galerie de ' + images.length + ' images' : 'Image de la question'}>
    {images.map((image) => <ImageReference key={image.file ?? image.url} image={image} multiple={images.length > 1} reveal={reveal} />)}
  </div>
}

function LocalMedia({ media, reveal }) {
  const [attempt, setAttempt] = useState(0)
  const sources = [...localMediaPaths(media.file), media.url].filter(Boolean)
  const src = sources[attempt]
  const audio = media.type === 'audio'
  const handleError = () => setAttempt((value) => value + 1)
  const label = reveal ? media.caption : audio ? 'Indice sonore' : 'Extrait vidéo'
  return <>
    {media.preview && <QuestionImages media={media.preview} reveal={reveal} />}
    <figure className={'question-media ' + (audio ? 'audio-clip' : 'visual-clip')}>
      {!src ? <div className="media-unavailable">{audio ? 'Indice sonore indisponible.' : 'Vidéo indisponible.'}</div>
        : audio ? <audio key={src} controls preload="metadata" aria-label={label} src={src} onError={handleError} />
        : <video key={src} controls autoPlay={!reveal} muted={!reveal} playsInline preload={reveal ? 'none' : 'auto'} aria-label={label} poster={media.poster ?? localMediaPaths(media.preview?.file)[0]} src={src} onError={handleError} />}
      {audio && media.description && <figcaption><details><summary>Indice écrit</summary>{media.description}</details></figcaption>}
      {reveal && (media.credit || media.source) && <figcaption>
        {media.credit && <span>{media.credit}</span>}
        {media.source && <a href={media.source} target="_blank" rel="noreferrer">{media.caption} <ArrowUpRight size={13} /></a>}
        {media.license && <a href={media.license} target="_blank" rel="noreferrer">Licence</a>}
      </figcaption>}
    </figure>
  </>
}

function QuestionMedia({ media, reveal = false }) {
  const [playback, setPlayback] = useState(reveal ? null : 'auto')
  if (media.type === 'image') return <QuestionImages media={media} reveal={reveal} />
  if (media.url || media.file) return <LocalMedia media={media} reveal={reveal} />
  const params = new URLSearchParams({ autoplay: '1', playsinline: '1', rel: '0' })
  if (playback === 'auto') params.set('mute', '1')
  if (media.segment) {
    params.set('start', media.segment[0])
    params.set('end', media.segment[1])
  }
  return <div className="video-clue">
    <div className="question-media question-video">
      {playback
        ? <>
            <iframe src={'https://www.youtube-nocookie.com/embed/' + media.id + '?' + params} title={reveal ? media.caption : 'Extrait vidéo'} allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
            <div className="video-actions"><button type="button" className="button secondary small" onClick={() => setPlayback(null)}>Masquer la vidéo</button>{playback === 'auto' && <span>Active le son dans le lecteur.</span>}</div>
          </>
        : <button type="button" className="media-preview" onClick={() => setPlayback('manual')}><Play size={19} fill="currentColor" /> <span>{reveal ? media.caption : 'Lire l’extrait vidéo'}</span></button>}
      {reveal && <a className="video-source" href={media.source} target="_blank" rel="noreferrer">Ouvrir sur YouTube <ArrowUpRight size={13} /></a>}
    </div>
    {!playback && media.preview && <QuestionImages media={media.preview} reveal={reveal} />}
  </div>
}

function useClock(personal, clockOffset) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 80)
    return () => clearInterval(interval)
  }, [personal.start])
  const remaining = Math.max(0, personal.deadline - now - clockOffset.current)
  return { seconds: Math.ceil(remaining / 1000), ratio: Math.min(1, remaining / (personal.deadline - personal.start)) }
}

function Question({ state, action, clockOffset, error, reconnecting, speech }) {
  const { question, personal, settings } = state
  const isBinary = question.choices.length === 2
  const heading = useRef(null)
  const category = categories.find(({ id }) => id === question.category)
  const { seconds, ratio } = useClock(personal, clockOffset)
  const locked = personal.locked || !seconds
  const play = (input) => action({ ...input, round: state.index })
  useEffect(() => { heading.current.focus({ preventScroll: true }) }, [state.index])
  return <main className="page-width game-page question-page">
    <div className="question-top"><span className="eyebrow">Question {state.index + 1} sur {settings.total}</span><span className="category-tag"><CategoryIcon category={category} size={17} /> {category.name}{isBinary && ' · Vrai/Faux'}</span></div>
    <div className="progress-strip" aria-hidden="true">{Array.from({ length: settings.total }, (_, index) => <i className={index <= state.index ? 'done' : ''} key={index} />)}</div>
    <section className="question-panel">
      <div className="question-heading">
        <h1 ref={heading} tabIndex={-1}>{question.prompt}</h1>
        {speech.supported && <button className="button secondary small read-question" type="button" onClick={speech.playing === 'question' ? () => speech.stop('question') : speech.read}>
          {speech.playing === 'question' ? <><Square size={14} /> Arrêter la lecture</> : <><Volume2 size={16} /> Lire la question</>}
        </button>}
        {speech.error && <p className="field-note" role="status">{speech.error}</p>}
      </div>
      <div className="clock" role="timer" aria-label={seconds + ' secondes restantes'}><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" className="clock-track"/><circle cx="40" cy="40" r="34" className={seconds <= 5 ? 'clock-fill urgent' : 'clock-fill'} pathLength="100" strokeDasharray={ratio * 100 + ' 100'} /></svg><span aria-hidden="true">{seconds}</span></div>
    </section>
    <div className="round-layout" data-visual={Boolean(question.media && question.media.type !== 'audio')}>
      {question.media && <div className="round-media"><QuestionMedia key={question.id} media={question.media} /></div>}
      <div className="round-controls">
        <div className={isBinary ? 'answer-grid binary-answers' : 'answer-grid'}>
          {question.choices.map((choice, index) => <button className="answer" key={index} disabled={locked || reconnecting || personal.eliminated.includes(index) || personal.choices.includes(index)} data-selected={personal.choices.includes(index)} data-eliminated={personal.eliminated.includes(index)} onClick={() => play({ type: 'answer', choice: index })}>
            <span aria-hidden={isBinary || undefined}>{isBinary ? (index === 0 ? <Check size={19} /> : <X size={19} />) : letters[index]}</span><strong>{choice}</strong>{personal.choices.includes(index) && <Check size={20} aria-hidden="true" />}
          </button>)}
        </div>
        <div className="question-status" role="status">{locked ? (personal.choices.length ? 'Réponse enregistrée.' : 'Temps écoulé.') : personal.used.double ? (personal.choices.length ? 'Tu peux tenter une deuxième réponse.' : 'Double chance activée.') : 'Choisis une réponse.'} <span>{state.answered} / {state.players.length} ont répondu</span></div>
      </div>
    </div>
    {jokers.some(({ id }) => settings.jokers[id]) && <section className="panel joker-tray">
      <h2 className="display">Tes jokers</h2>
      <div className="joker-buttons">{jokers.filter(({ id }) => settings.jokers[id]).map(({ id, name, description }) => {
        const Icon = jokerIcons[id]
        const available = jokerFitsQuestion(id, question.choices.length)
        return <button className="button secondary" key={id} disabled={!available || locked || reconnecting || !state.stock[id] || personal.used[id]} title={available ? description : 'Indisponible sur les Vrai/Faux'} onClick={() => play({ type: 'joker', joker: id })}><Icon size={18} /> {name} <small>×{state.stock[id]}</small></button>
      })}</div>
      {isBinary && (settings.jokers.half > 0 || settings.jokers.double > 0) && <p className="field-note">Le 50/50 et la Double chance sont réservés aux QCM.</p>}
      {personal.poll && <div className="poll-panel"><h3 className="field-label">{personal.poll.simulated ? 'Sondage simulé' : 'Votes des autres joueurs'}</h3><VoteBars percentages={personal.poll.percentages} choices={isBinary ? question.choices : undefined} /></div>}
    </section>}
    <ErrorText>{error}</ErrorText>
  </main>
}

function Leaderboard({ ranking, self }) {
  return <ol className="leaderboard">{ranking.map((player) => <li key={player.id} className={player.id === self ? 'self' : ''}>
    <span className="rank-number">{player.place}</span><PlayerAvatar player={player} /><strong><PlayerName player={player} />{player.id === self && <small> (toi)</small>}</strong>
    <span className={'movement ' + (player.movement > 0 ? 'up' : player.movement < 0 ? 'down' : '')} aria-label={player.movement ? (player.movement > 0 ? 'Monte de ' : 'Descend de ') + Math.abs(player.movement) + ' place(s)' : 'Pas de changement de place'}>{player.movement > 0 ? <ArrowUpRight size={15} /> : player.movement < 0 ? <ArrowDownRight size={15} /> : '–'}{player.movement ? Math.abs(player.movement) : ''}</span>
    <span className="rank-score">{score.format(player.score)} <small>pts</small></span>
  </li>)}</ol>
}

function Reveal({ state, action, error }) {
  const { result, question, personal } = state
  const host = state.hostId === state.selfId
  const last = state.index + 1 === state.settings.total
  return <main className="page-width game-page">
    <div className="game-heading"><div className="eyebrow">Question {state.index + 1} sur {state.settings.total}</div><h1 className="display">Résultats de la manche</h1></div>
    <div className="lobby-grid result-grid">
      <section className="panel result-panel">
        <div className="section-head"><div><div className="field-label">Bonne réponse</div><h2 className="display">{question.choices[result.answer]}</h2></div><span className="good-icon"><Check size={26} /></span></div>
        <p className="result-question">{question.prompt}</p>
        {question.explanation && <p className="answer-explanation">{question.explanation}</p>}
        <p className={personal.points ? 'earned correct' : 'earned'}>
          {personal.points ? '+' + score.format(personal.points) + ' points pour toi' : '0 point sur cette question'}
          {personal.speedPoints > 0 && <span>dont +{score.format(personal.speedPoints)} de rapidité</span>}
        </p>
        <ErrorText>{error}</ErrorText>
        {host ? <button className="button primary w-full justify-center mb-5" onClick={() => action({ type: 'next', round: state.index })}>{last ? 'Voir le podium' : 'Question suivante'} <ChevronRight size={21} /></button> : <p className="wait-note mb-4"><span /> En attente de l’hôte.</p>}
        {question.media && <QuestionMedia key={question.id} media={question.media} reveal />}
        {question.followUp && <QuestionMedia key={question.id + '-video'} media={question.followUp} reveal />}
        {question.source && <a className="question-source" href={question.source} target="_blank" rel="noreferrer">Source de la réponse <ArrowUpRight size={13} /></a>}
        <h3 className="field-label">Répartition des votes · {result.voters}</h3><VoteBars percentages={result.percentages} choices={question.choices} correct={result.answer} />
      </section>
      <section className="panel ranking-panel"><div className="section-head"><h2 className="display">Classement</h2><Trophy size={23} /></div><Leaderboard ranking={state.ranking} self={state.selfId} /></section>
    </div>
  </main>
}

function Final({ state, action, leave, error }) {
  const fastest = state.ranking.filter((player) => player.bestTime !== null).sort((a, b) => a.bestTime - b.bestTime)[0]
  const streak = [...state.ranking].sort((a, b) => b.bestStreak - a.bestStreak)[0]
  const self = state.ranking.find((player) => player.id === state.selfId)
  return <main className="page-width game-page final-page">
    <div className="game-heading"><h1 className="display">Le podium</h1></div>
    <section className="panel podium-panel" aria-label="Podium final">
      <div className="podium">
        {state.ranking.slice(0, 3).map((player) => <div className={'podium-player place-' + player.place} key={player.id}><div className="podium-person">{player.place === 1 && <Crown size={24} />}<PlayerAvatar player={player} /><strong><PlayerName player={player} /></strong><small>{score.format(player.score)} pts</small></div><div className="podium-step display">{player.place}</div></div>)}
      </div>
    </section>
    <div className="final-stats">
      <div className="panel stat"><Clock3 size={24}/><span>Réponse la plus rapide<strong>{fastest ? <>{(fastest.bestTime / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s · <PlayerName player={fastest} /></> : 'Aucune bonne réponse'}</strong></span></div>
      <div className="panel stat"><Flame size={24}/><span>Meilleure série<strong>{streak.bestStreak ? <>{streak.bestStreak} · <PlayerName player={streak} /></> : '0 bonne réponse'}</strong></span></div>
      <div className="panel stat"><Trophy size={24}/><span>Ton résultat<strong>{self.correctCount} / {state.settings.total} bonnes réponses</strong></span></div>
    </div>
    <section className="panel ranking-panel"><div className="section-head"><h2 className="display">Classement final</h2><Trophy size={23} /></div><Leaderboard ranking={state.ranking} self={state.selfId} /></section>
    <ErrorText>{error}</ErrorText>
    <div className="flex flex-wrap justify-center gap-3 mt-6">{state.selfId === state.hostId && <button className="button primary" onClick={() => action({ type: 'rematch' })}><TimerReset size={20} /> Rejouer</button>}<button className="button secondary" onClick={leave}><ArrowLeft size={19} /> Accueil</button></div>
  </main>
}

function App() {
  const game = useGame()
  const { state } = game
  const [profile, setProfile] = useState(() => stored('qc-profile', stored('qc-profile', { name: '', avatar: avatars[0] }), 'localStorage'))
  const [photoBusy, setPhotoBusy] = useState(false)
  const [code, setCode] = useState(codeFromUrl)
  const [modal, setModal] = useState('')
  const [soloTheme, setSoloTheme] = useState(null)
  const [illustratedSpeedBonus, setIllustratedSpeedBonus] = useState(defaultSettings.speedBonus)
  const [personalityTest, setPersonalityTest] = useState('bizarre')
  const [personalityMode, setPersonalityMode] = useState('create')
  const activeQuestion = state?.phase === 'question' ? state.question : null
  const activeTest = state?.phase === 'personality' ? state.personality : null
  const testPrompt = activeTest && getPersonalityQuestion(activeTest.testId, activeTest.step, activeTest)?.[0]
  const speech = useQuestionSpeech(
    activeQuestion?.prompt ?? testPrompt,
    activeQuestion ? `${state.code}/${state.index}/${state.personal.start}/${activeQuestion.id}` : activeTest && `${state.code}/${activeTest.run}/${activeTest.step}`,
    () => stored(speechKey, null, 'localStorage'),
    (preferences) => store(speechKey, preferences, 'localStorage'),
  )
  const selectedTheme = themeOptions.find(({ id }) => id === soloTheme)
  const isIllustrated = selectedTheme === illustratedCategory
  const isPersonalitySetup = modal === 'personality'
  const self = state?.players.find(({ id }) => id === state.selfId)
  useEffect(() => { window.scrollTo(0, 0) }, [state?.phase, state?.index])
  const openSolo = (theme = null) => {
    setSoloTheme(theme)
    game.clearError()
    setModal('solo')
  }
  const close = () => {
    if (modal === 'speech') speech.stop('preview')
    game.clearError()
    setModal('')
  }
  const leave = () => { game.leave(); setCode(''); setModal('') }
  async function enterFromModal(event) {
    event.preventDefault()
    const mode = isPersonalitySetup ? personalityMode : modal === 'solo' ? 'local' : 'create'
    const options = isPersonalitySetup ? { personalityTest } : { theme: soloTheme, speedBonus: isIllustrated ? illustratedSpeedBonus : defaultSettings.speedBonus }
    if (await game.enter(mode, profile, options)) setModal('')
  }
  return <>
    <header className="site-header"><div className="page-width header-inner">
      <button className="home-link" aria-label="La Bande de Quiz, accueil" onClick={() => state && setModal('leave')}><Logo /></button>
      <div className="header-actions">
        {self && <div className="header-player"><PlayerAvatar player={self} /><span><PlayerName player={self} /><small>{state.local ? 'Solo' : 'En ligne'}</small></span></div>}
        <button type="button" className="header-help speech-button" data-enabled={speech.preferences.enabled && speech.supported} aria-haspopup="dialog" aria-label="Réglages de lecture vocale" title="Réglages de lecture vocale" onClick={() => setModal('speech')}><Volume2 size={17} /><span>Lecture vocale</span></button>
        {state ? <button className="header-help quit-button" onClick={() => setModal('leave')}><ArrowLeft size={17} /> Quitter</button> : <button className="header-help" onClick={() => setModal('rules')}><CircleHelp size={17} /> Comment jouer</button>}
      </div>
    </div></header>
    {game.reconnecting && <div className="connection-banner" role="status">Connexion interrompue. Reconnexion au salon…</div>}
    {!state && <Home game={game} {...{ profile, setProfile, photoBusy, setPhotoBusy, code, setCode, openSolo }} openCreate={() => { game.clearError(); setModal('create') }} openPersonality={() => { game.clearError(); setModal('personality') }} />}
    {state?.phase === 'lobby' && <Lobby state={state} action={game.action} error={game.error} />}
    {state?.phase === 'question' && <Question state={state} action={game.action} clockOffset={game.clockOffset} error={game.error} reconnecting={game.reconnecting} speech={speech} />}
    {state?.phase === 'reveal' && <Reveal state={state} action={game.action} error={game.error} />}
    {state?.phase === 'final' && <Final state={state} action={game.action} leave={leave} error={game.error} />}
    {state?.phase === 'personality' && <PersonalityRound state={state} action={game.action} reconnecting={game.reconnecting} speech={speech} error={game.error} />}
    {state?.phase === 'personality-final' && <PersonalityResults state={state} action={game.action} leave={leave} error={game.error} />}
    <footer className="site-footer page-width"><Logo /><p>Créé par <a href="https://www.malbroye.fr" target="_blank" rel="noopener noreferrer">Malbroye Studio</a></p></footer>
    {['create', 'solo', 'personality'].includes(modal) && <Modal close={close} className={isPersonalitySetup ? 'personality-modal' : ''} title={isPersonalitySetup ? 'Tests de personnalité' : modal === 'solo' ? 'Ton profil solo' : 'Créer un salon'}><form className="modal-form" onSubmit={enterFromModal}>
      {isPersonalitySetup && <PersonalitySetup testId={personalityTest} setTestId={setPersonalityTest} mode={personalityMode} setMode={setPersonalityMode} />}
      {modal === 'create' && <p>Tu pourras partager le code du salon avec tes amis.</p>}
      {modal === 'solo' && selectedTheme && <p>{isIllustrated ? 'Quiz illustré · Images et vidéos' : selectedTheme.name}</p>}
      <label className="field-label">Ton pseudo<input autoFocus={!isPersonalitySetup} autoComplete="nickname" placeholder="Ex. Pixel42" required maxLength={20} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
      <ProfileAppearance {...{ profile, setProfile, photoBusy, setPhotoBusy }} />
      {modal === 'solo' && isIllustrated && <SpeedBonusSetting enabled={illustratedSpeedBonus} onChange={setIllustratedSpeedBonus} />}
      <ErrorText>{game.error}</ErrorText><button className="button primary w-full justify-center" disabled={game.busy || photoBusy}>{modal === 'solo' ? <Gamepad2 size={19} /> : <Globe2 size={19} />} {game.busy ? 'Connexion…' : isPersonalitySetup && personalityMode === 'local' ? 'Lancer le test' : modal === 'solo' ? (isIllustrated ? 'Lancer le quiz' : 'Continuer') : 'Créer le salon'} <ArrowRight size={18} /></button>
    </form></Modal>}
    {modal === 'speech' && <Modal close={close} title="Lecture vocale"><SpeechSettings speech={speech} /></Modal>}
    {modal === 'rules' && <Modal close={close} title="Comment jouer"><ol className="rules-list"><li><Users size={22} /><div><strong>Forme ton salon</strong><p>Partage le code avec tes amis ou lance une partie solo avec trois bots.</p></div></li><li><Zap size={22} /><div><strong>Marque des points</strong><p>Enchaîne les bonnes réponses pour gagner un bonus de série. Si l’hôte active le bonus de rapidité, les bonnes réponses les plus rapides rapportent davantage.</p></div></li><li><Sparkles size={22} /><div><strong>Utilise tes jokers</strong><p>Retire des choix, consulte le sondage, tente une deuxième réponse ou prends dix secondes de plus.</p></div></li></ol><button className="button outlined w-full justify-center" onClick={close}>Compris <Check size={18}/></button></Modal>}
    {modal === 'leave' && <Modal close={close} title="Quitter la partie ?"><p className="modal-message">Tu vas retourner à l’accueil.</p><div className="flex flex-wrap gap-3"><button className="button secondary" onClick={close}>Rester</button><button className="button primary" onClick={leave}>Quitter</button></div></Modal>}
  </>
}

createRoot(document.getElementById('root')).render(<App />)
