import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, Brain, Check,
  ChevronRight, CircleHelp, Clock3, Copy, Crown, Film, Flame, Gamepad2, Globe2, PawPrint, Pencil,
  HeartHandshake, Image, Maximize2, Play, Plus, Shuffle, Smile, Sparkles, Square, Swords, TimerReset, Trophy, Tv, Twitch, Users, Volume2, X, Youtube, Zap,
} from 'lucide-react'
import '@fontsource-variable/geist'
import { act, avatars, counts, createRoom, defaultSettings, durations, jokerFitsQuestion, jokers, maxSpeedBonus, mergeQuestionHistory, normalizeRoomCode, questionCounts, questionPool, revealDuration, roomCodeLength, tick, view } from '../shared/game.js'
import { categories, homeThemes, illustratedCategory, themeOptions } from '../shared/questions.js'
import { getPersonalityQuestion } from '../shared/personality.js'
import { chatHistoryLimit } from '../shared/lobby-chat.js'
import { arcadeLimit } from '../shared/arcade.js'
import { ArcadeIntro, ArcadeResults, ArcadeRound, headSource } from './arcade.jsx'
import { PlayerAvatar, PlayerName, ProfileAppearance } from './profile.jsx'
import { LobbyChat, RoomChatDock } from './lobby-chat.jsx'
import { PersonalityIntro, PersonalityResults, PersonalityRound, PersonalitySetup } from './personality.jsx'
import { SpeechSettings, useQuestionSpeech } from './speech.jsx'
import { heroLines, illustratedCovers, pickHomeItem } from './home-content.js'
import './styles.css'

const categoryIcons = { brain: Brain, paw: PawPrint, trophy: Trophy, twitch: Twitch, youtube: Youtube, smile: Smile, gamepad: Gamepad2, film: Film, tv: Tv, image: Image }
const jokerIcons = { half: Sparkles, poll: BarChart3, double: Swords, time: TimerReset }
const letters = ['A', 'B', 'C', 'D']
const score = new Intl.NumberFormat('fr-FR')
const responseSeconds = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const historyKey = 'qc-question-history'
const speechKey = 'qc-speech'
const codeFromUrl = normalizeRoomCode(new URLSearchParams(location.search).get('room'))

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
  const [chat, setChat] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [notice, setNotice] = useState('')
  const [leaving, setLeaving] = useState(false)
  const local = useRef(null)
  const socket = useRef(null)
  const arcadeFrame = useRef(null)
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
    client.on('chat-message', ({ code, message }) => {
      if (socket.current === client && session.current?.code === code) {
        setChat((messages) => [...messages, message].slice(-chatHistoryLimit))
      }
    })
    client.on('room-closed', () => {
      if (socket.current === client) returnHome('L’hôte a quitté la partie. Le salon est fermé.')
    })
    client.on('arcade-frame', (frame) => { if (socket.current === client && !ignoreState.current) arcadeFrame.current = frame })
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
          setChat(response.chat ?? [])
          receive(response.state)
        }
      } catch (problem) {
        if (!stillCurrent()) return
        returnHome(problem.message)
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

  async function enter(mode, profile, { code, theme, personalityTest, arcade, groupHome, speedBonus = defaultSettings.speedBonus } = {}) {
    setError('')
    setNotice('')
    setChat([])
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
        const response = await request(client, 'enter', { mode, code, profile, personalityTest, arcade, groupHome })
        if (socket.current !== client) return false
        session.current = { code: response.state.code, token: response.token }
        store('qc-session', session.current)
        setChat(response.chat ?? [])
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
    const command = input.type === 'start' && !state?.personality && !state?.arcade ? { ...input, history: readHistory() } : input
    try {
      if (local.current) {
        act(local.current.room, local.current.player.id, command)
        receive(view(local.current.room, local.current.player.id))
      } else {
        if (!socket.current?.connected || reconnecting) throw new Error('Reconnexion au salon en cours…')
        await request(socket.current, 'action', command)
      }
      return true
    } catch (problem) {
      setError(problem.message)
      return false
    }
  }

  function returnHome(message = '') {
    ignoreState.current = true
    arcadeFrame.current = null
    local.current = null
    session.current = null
    store('qc-session', null)
    const client = socket.current
    socket.current = null
    client?.disconnect()
    setState(null)
    setChat([])
    setError('')
    setReconnecting(false)
    setNotice(message)
    const url = new URL(location.href)
    url.searchParams.delete('room')
    history.replaceState(null, '', url)
  }

  async function leave() {
    if (leaving) return false
    const client = socket.current
    const onlineHost = state && !state.local && state.selfId === state.hostId
    setError('')
    if (onlineHost && !client?.connected) {
      setError('Attends la reconnexion pour fermer le salon.')
      return false
    }
    if (client?.connected) {
      setLeaving(true)
      try {
        await request(client, 'action', { type: 'leave' })
      } catch (problem) {
        if (socket.current === client) setError(problem.message)
        return false
      } finally {
        setLeaving(false)
      }
      if (socket.current !== client) return false
    }
    returnHome()
    return true
  }

  const aimArcade = useCallback((angle) => {
    if (socket.current?.connected) socket.current.volatile.emit('arcade-aim', angle)
  }, [])
  async function sendChat(text) {
    if (!socket.current?.connected || reconnecting) throw new Error('Reconnexion au salon en cours.')
    await request(socket.current, 'chat-send', text)
  }
  async function loadAvatarPreview(id) {
    if (local.current) return local.current.room.players.get(id)?.photoPreview ?? null
    if (!socket.current?.connected || reconnecting) throw new Error('Reconnexion au salon en cours.')
    return (await request(socket.current, 'avatar-preview', id)).photo ?? null
  }
  return { state, chat, sendChat, busy, error, reconnecting, notice, leaving, clockOffset, enter, action, leave, arcadeFrame, aimArcade, loadAvatarPreview, clearError: () => setError('') }
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

function Home({ game, profile, setProfile, photoBusy, setPhotoBusy, openCreate, openSolo, openPersonality, resumeGame, group, code, setCode }) {
  const headline = useHomeRotation(heroLines, 'qc-hero')
  const cover = useHomeRotation(illustratedCovers, 'qc-illustrated-cover')
  const [stickersPaused, setStickersPaused] = useState(() => stored('qc-stickers-paused', false, 'localStorage'))
  const canChoose = !group || (group.groupHome && group.selfId === group.hostId)
  const legacyCode = codeFromUrl.length === 6 && code.length > roomCodeLength
  useEffect(() => { store('qc-stickers-paused', stickersPaused, 'localStorage') }, [stickersPaused])
  return <main className="home page-width">
    <HomeStickers paused={stickersPaused} />
    <section className="hero" aria-labelledby="home-title">
      <div className="hero-copy">
        <h1 className="display hero-title" id="home-title">{headline[0]} <em>{headline[1]}</em></h1>
        <p>{group ? group.groupHome ? 'Ton groupe est réuni pour la prochaine partie.' : 'Tu es toujours dans le groupe. Reprends la partie quand tu veux.' : 'Défie tes amis ou joue en solo contre trois bots.'}</p>
        <div className="home-actions">
          {!group ? <>
            <button className="button primary" disabled={game.busy} onClick={openCreate}><Plus size={20} /> Créer un groupe</button>
            <button className="button secondary" disabled={game.busy} onClick={() => openSolo()}><Play size={17} /> Jouer en solo</button>
          </> : !group.groupHome ? <button className="button primary" onClick={resumeGame}><Play size={17} /> Reprendre la partie</button>
            : canChoose && <button className="button primary" disabled={game.reconnecting} onClick={() => openSolo()}><Play size={17} /> Préparer le quiz</button>}
        </div>
        {canChoose && <><button className="illustrated-card" type="button" onClick={() => openSolo(illustratedCategory.id)} disabled={game.busy || game.reconnecting}>
          <img src={localMediaPaths(cover)[0]} alt="" />
          <span className="illustrated-copy"><span className="illustrated-label"><Image size={15} /> Images et vidéos</span><strong>Quiz illustré</strong></span>
          <span className="illustrated-arrow"><ArrowRight size={20} /></span>
        </button>
        <button className="personality-entry" type="button" onClick={openPersonality} disabled={game.busy || game.reconnecting}>
          <HeartHandshake size={23} /><span><strong>Tests de personnalité</strong><small>8 questions, un verdict absurde. En solo ou entre potes.</small></span><ArrowRight size={18} />
        </button></>}
      </div>
      <div className="hero-side">
        {group ? <section className="join-panel" aria-label="Ton groupe">
          <div className="join-heading"><h2 className="display">Ton groupe</h2><Users size={22} /></div>
          <RoomInvite code={group.code} />
          <RoomPlayers state={group} action={game.action} reconnecting={game.reconnecting} loadAvatarPreview={game.loadAvatarPreview} />
          {group.selfId !== group.hostId && group.groupHome && <p className="wait-note"><span /> L’hôte choisit le prochain jeu.</p>}
          <ErrorText>{game.error}</ErrorText>
        </section> : <form className="join-panel" onSubmit={(event) => { event.preventDefault(); game.enter('join', profile, { code }) }}>
          <div className="join-heading"><h2 className="display">Rejoindre un salon</h2><Users size={22} /></div>
          <label className="field-label" htmlFor="room-code">Code du salon</label>
          <div className="code-input-wrap"><input id="room-code" className="code-input" placeholder="ABC" autoComplete="off" spellCheck="false" maxLength={legacyCode ? 6 : roomCodeLength} minLength={roomCodeLength} pattern={legacyCode ? '[A-Za-z0-9]{6}|[A-Za-z]{3}' : '[A-Za-z]{3}'} required value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(legacyCode ? /[^A-Z0-9]/g : /[^A-Z]/g, '').slice(0, legacyCode ? 6 : roomCodeLength))} /><span>#</span></div>
          <label className="field-label" htmlFor="join-name">Ton pseudo</label>
          <input id="join-name" placeholder="Ex. Pixel42" autoComplete="nickname" required maxLength={20} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
          <ProfileAppearance {...{ profile, setProfile, photoBusy, setPhotoBusy }} />
          <ErrorText>{game.error}</ErrorText>
          <button className="button outlined w-full justify-center" disabled={game.busy || photoBusy}>Rejoindre <ArrowRight size={17} /></button>
        </form>}
        {group?.phase === 'lobby' && <LobbyChat key={group.code} selfId={group.selfId} players={group.players} messages={game.chat} send={game.sendChat} reconnecting={game.reconnecting} />}
      </div>
    </section>
    {canChoose && <section className="themes" aria-labelledby="themes-title">
      <div className="themes-heading"><h2 className="display" id="themes-title">Jouer par thème</h2><button className="sticker-toggle" type="button" onClick={() => setStickersPaused(!stickersPaused)}>{stickersPaused ? 'Afficher les stickers' : 'Masquer les stickers'}</button></div>
      <div className="theme-grid">
        {homeThemes.map((category) => <button type="button" className="theme-card" key={category.id} onClick={() => openSolo(category.id)} disabled={game.busy || game.reconnecting}><span className="theme-icon"><CategoryIcon category={category} size={19} /></span><span>{category.name}</span><ArrowRight className="theme-arrow" size={16} /></button>)}
      </div>
    </section>}
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
  const limit = settings.themes.length ? questionPool(settings.themes).length : total
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

function RoomInvite({ code }) {
  const [copied, setCopied] = useState('')
  async function copy(kind) {
    const url = new URL(location.href)
    url.searchParams.set('room', code)
    setCopied(await copyText(kind === 'code' ? code : url.toString()) ? kind : 'failed')
  }
  return <div className="lobby-code"><div className="field-label">Code du groupe</div><strong className="display">{code}</strong><div className="flex flex-wrap gap-2"><button className="button small secondary" onClick={() => copy('code')}>{copied === 'code' ? <Check size={15} /> : <Copy size={15} />}{copied === 'code' ? 'Code copié' : 'Copier le code'}</button><button className="button small secondary" onClick={() => copy('link')}>{copied === 'link' ? <Check size={15} /> : <Copy size={15} />}{copied === 'link' ? 'Lien copié' : 'Copier le lien'}</button></div>{copied === 'failed' && <p className="field-note" role="status">Sélectionne le code pour le copier.</p>}</div>
}

function LobbyAvatar({ player, arcade, loadAvatarPreview }) {
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState(undefined)
  const trigger = useRef(null)
  const loading = useRef(false)
  const photo = arcade ? headSource(player) : player.photo
  if (!photo) return <PlayerAvatar player={player} />
  const label = `Photo de profil de ${player.name}`
  const preparing = player.hasPhotoPreview && detail === undefined

  async function loadDetail() {
    if (!player.hasPhotoPreview || detail || loading.current) return
    loading.current = true
    try {
      setDetail(await loadAvatarPreview(player.id))
    } catch {
      setDetail(null)
    } finally {
      loading.current = false
    }
  }

  function closePhoto() {
    setExpanded(false)
    trigger.current?.focus({ preventScroll: true })
  }

  return <div className="room-photo-wrap">
    <button className="room-photo-trigger" ref={trigger} type="button" aria-label={`Agrandir la photo de ${player.name}`} aria-haspopup="dialog" onPointerEnter={(event) => { if (event.pointerType === 'mouse') loadDetail() }} onClick={() => { loadDetail(); setExpanded(true) }}>
      <PlayerAvatar player={{ ...player, photo: detail ?? photo }} />
      <span className="room-photo-zoom"><Maximize2 size={12} aria-hidden="true" /></span>
    </button>
    {!expanded && <div className="room-photo-preview" aria-hidden="true">{preparing
      ? <div className="room-photo-loading">Chargement…</div>
      : <img src={detail ?? photo} alt="" />}</div>}
    {expanded && <Modal title={label} className="image-modal room-photo-modal" close={closePhoto}>
      {preparing ? <div className="room-photo-loading" role="status">Chargement de la photo…</div> : <img src={detail ?? photo} alt={label} />}
    </Modal>}
  </div>
}

function RoomPlayers({ state, action, reconnecting, loadAvatarPreview }) {
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const canRename = !state.local && state.phase === 'lobby' && state.selfId === state.hostId

  async function rename(event, playerId) {
    event.preventDefault()
    if (reconnecting || saving || !draft.trim()) return
    setSaving(true)
    try {
      if (await action({ type: 'rename-player', playerId, name: draft })) setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  return <>
    <div className="player-heading"><h2 className="display">Joueurs</h2><span><Users size={16} /> {state.players.length}{!state.local && ` / ${state.arcade ? arcadeLimit : 24}`}</span></div>
    <ul className="player-list room-player-list">{state.players.map((player) => <li key={player.id}>
      <LobbyAvatar player={player} arcade={state.arcade} loadAvatarPreview={loadAvatarPreview} />
      {canRename && editing === player.id ? <form className="room-rename" onSubmit={(event) => rename(event, player.id)}>
        <input aria-label={`Nouveau pseudo de ${player.name}`} value={draft} onChange={(event) => setDraft(event.target.value)} autoFocus maxLength={20} required />
        <button type="submit" className="room-rename-button" aria-label="Enregistrer le pseudo" title="Enregistrer" disabled={saving || reconnecting || !draft.trim()}><Check size={16} aria-hidden="true" /></button>
        <button type="button" className="room-rename-button" aria-label="Annuler" title="Annuler" disabled={saving} onClick={() => setEditing(null)}><X size={16} aria-hidden="true" /></button>
      </form> : <>
        <strong><PlayerName player={player} />{player.id === state.selfId && <small> (toi)</small>}</strong>
        {player.id === state.hostId && <span className="host-tag"><Crown size={14} /> Hôte</span>}
        {player.bot && <span className="host-tag bot-tag">Bot</span>}
        {canRename && !player.bot && <button type="button" className="room-rename-button" aria-label={`Renommer ${player.name}`} title="Renommer" disabled={saving || reconnecting} onClick={() => { setEditing(player.id); setDraft(player.name) }}><Pencil size={15} aria-hidden="true" /></button>}
      </>}
    </li>)}</ul>
  </>
}

function Lobby({ state, game }) {
  const { action, error } = game
  const host = state.selfId === state.hostId
  const canStart = state.players.length >= 2 || (state.local && Boolean(state.personality))
  return <main className="page-width game-page">
    <div className="game-heading"><h1 className="display">{state.local ? 'Partie solo' : 'Salon d’attente'}</h1></div>
    <div className="lobby-grid">
      <div className="lobby-social">
      <section className="panel lobby-players">
        {state.local ? <div className="lobby-code local-code"><Gamepad2 size={32}/><div><strong className="display">{state.personality ? 'Questionnaire en solo' : 'Solo contre les bots'}</strong>{!state.personality && <p>Pixel, Mochi et Glitch jouent avec toi.</p>}</div></div> :
          <RoomInvite code={state.code} />}
        <RoomPlayers state={state} action={action} reconnecting={game.reconnecting} loadAvatarPreview={game.loadAvatarPreview} />
        <ErrorText>{error}</ErrorText>
        {host ? <><button className="button primary w-full justify-center mt-5" disabled={!canStart} onClick={() => action({ type: 'start' })}><Play size={19} fill="currentColor" /> {state.personality ? 'Lancer le questionnaire' : 'Lancer la partie'}</button>{!canStart && <p className="field-note text-center">Il faut au moins 2 joueurs pour démarrer.</p>}</> : <p className="wait-note"><span /> L’hôte lance la partie.</p>}
      </section>
      {!state.local && <LobbyChat key={state.code} selfId={state.selfId} players={state.players} messages={game.chat} send={game.sendChat} reconnecting={game.reconnecting} />}
      </div>
      {state.arcade ? <ArcadeIntro /> : state.personality ? <PersonalityIntro testId={state.personality.testId} /> : <Settings state={state} action={action} host={host} />}
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
  const src = [...localPaths, image.url, ...fallbacks].filter(Boolean)[attempt]
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
  if (!src && media.preview) return <QuestionImages media={media.preview} reveal={reveal} />
  return <figure className={'question-media ' + (audio ? 'audio-clip' : 'visual-clip')}>
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

function RevealMedia({ media, followUp }) {
  const [showFollowUp, setShowFollowUp] = useState(false)
  if (!media && !followUp) return null
  const selected = showFollowUp ? followUp : media ?? followUp
  return <>
    {media && followUp && <button className="button secondary small reveal-media-switch" type="button" onClick={() => setShowFollowUp(!showFollowUp)}>
      {showFollowUp ? <Image size={16} /> : <Play size={16} />}{showFollowUp ? 'Revoir l’indice' : 'Voir la vidéo liée'}
    </button>}
    <QuestionMedia key={showFollowUp ? 'follow-up' : 'clue'} media={selected} reveal />
  </>
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
  const category = homeThemes.find(({ id }) => id === (question.screen ?? question.category))
  const { seconds, ratio } = useClock(personal, clockOffset)
  const locked = personal.locked || !seconds
  const activeJokers = jokers.filter(({ id }) => settings.jokers[id])
  const play = (input) => action({ ...input, round: state.index })
  useEffect(() => { heading.current.focus({ preventScroll: true }) }, [state.index])
  return <main className="page-width game-page question-page">
    <header className="quiz-round-heading">
      <p className="eyebrow">{state.local ? 'Partie solo' : 'Partie ' + state.code}</p>
      <p className="display">{settings.speedBonus === false ? 'À toi de jouer' : 'Réponds vite pour plus de points'}</p>
    </header>
    <div className="quiz-round-grid" data-jokers={activeJokers.length > 0}>
      {activeJokers.length > 0 && <aside className="quiz-jokers" aria-label="Tes jokers">
        <h2 className="eyebrow">Jokers</h2>
        <div className="quiz-joker-list">{activeJokers.map(({ id, name, description }) => {
          const Icon = jokerIcons[id]
          const available = jokerFitsQuestion(id, question.choices.length)
          return <button className="quiz-joker" type="button" key={id} disabled={!available || locked || reconnecting || !state.stock[id] || personal.used[id]} title={available ? description : 'Indisponible sur les Vrai/Faux'} onClick={() => play({ type: 'joker', joker: id })}>
            <span className="quiz-joker-icon"><Icon size={17} aria-hidden="true" /></span><span>{name}</span><small>{state.stock[id]}</small>
          </button>
        })}</div>
        {isBinary && (settings.jokers.half > 0 || settings.jokers.double > 0) && <p className="field-note">50/50 et Double chance sont réservés aux QCM.</p>}
      </aside>}
      <section className="panel quiz-question-card" aria-labelledby="round-question">
        <div className="progress-strip quiz-card-progress" aria-hidden="true">{Array.from({ length: settings.total }, (_, index) => <i className={index <= state.index ? 'done' : ''} key={index} />)}</div>
        <div className="quiz-card-meta">
          <div className="quiz-card-tags">
            <span className="quiz-round-number">Question {state.index + 1} / {settings.total}</span>
            <span className="category-tag"><CategoryIcon category={category} size={15} /> {category.name}{isBinary && ' · Vrai/Faux'}</span>
          </div>
          <div className="clock" role="timer" aria-label={seconds + ' secondes restantes'}>
            <svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" className="clock-track"/><circle cx="40" cy="40" r="34" className={seconds <= 5 ? 'clock-fill urgent' : 'clock-fill'} pathLength="100" strokeDasharray={ratio * 100 + ' 100'} /></svg>
            <span aria-hidden="true">{seconds}<small>sec</small></span>
          </div>
        </div>
        <div className="quiz-card-heading">
          <h1 id="round-question" ref={heading} tabIndex={-1}>{question.prompt}</h1>
          {speech.supported && <button className="button secondary small quiz-read" type="button" aria-label={speech.playing === 'question' ? 'Arrêter la lecture' : 'Lire la question'} title={speech.playing === 'question' ? 'Arrêter la lecture' : 'Lire la question'} onClick={speech.playing === 'question' ? () => speech.stop('question') : speech.read}>
            {speech.playing === 'question' ? <Square size={15} /> : <Volume2 size={17} />}
          </button>}
        </div>
        {speech.error && <p className="field-note" role="status">{speech.error}</p>}
        {question.media && <div className="quiz-clue"><QuestionMedia key={question.id} media={question.media} /></div>}
        {personal.poll && <div className="poll-panel"><h2 className="field-label">{personal.poll.simulated ? 'Sondage simulé' : 'Votes des autres joueurs'}</h2><VoteBars percentages={personal.poll.percentages} choices={isBinary ? question.choices : undefined} /></div>}
        <div className={isBinary ? 'answer-grid binary-answers' : 'answer-grid'}>
          {question.choices.map((choice, index) => <button className="answer" key={index} disabled={locked || reconnecting || personal.eliminated.includes(index) || personal.choices.includes(index)} data-selected={personal.choices.includes(index)} data-eliminated={personal.eliminated.includes(index)} onClick={() => play({ type: 'answer', choice: index })}>
            <span aria-hidden={isBinary || undefined}>{isBinary ? (index === 0 ? <Check size={19} /> : <X size={19} />) : letters[index]}</span><strong>{choice}</strong>{personal.choices.includes(index) && <Check size={20} aria-hidden="true" />}
          </button>)}
        </div>
        <div className="question-status" role="status">{locked ? (personal.choices.length ? 'Réponse enregistrée.' : 'Temps écoulé.') : personal.used.double ? (personal.choices.length ? 'Tu peux tenter une deuxième réponse.' : 'Double chance activée.') : 'Choisis une réponse.'} <span>{state.answered} / {state.players.length} ont répondu</span></div>
        <ErrorText>{error}</ErrorText>
      </section>
      <aside className="panel quiz-rank" aria-labelledby="quiz-rank-title">
        <h2 id="quiz-rank-title"><Trophy size={18} aria-hidden="true" /> Classement</h2>
        {state.ranking.length ? <Leaderboard ranking={state.ranking} self={state.selfId} /> : <p>Aucun score pour l’instant.</p>}
      </aside>
    </div>
  </main>
}

function Leaderboard({ ranking, self }) {
  return <ol className="leaderboard">{ranking.map((player) => <li key={player.id} className={player.id === self ? 'self' : ''}>
    <span className="rank-number">{player.place}</span><PlayerAvatar player={player} /><strong><PlayerName player={player} />{player.id === self && <small> (toi)</small>}</strong>
    <span className={'movement ' + (player.movement > 0 ? 'up' : player.movement < 0 ? 'down' : '')} aria-label={player.movement ? (player.movement > 0 ? 'Monte de ' : 'Descend de ') + Math.abs(player.movement) + ' place(s)' : 'Pas de changement de place'}>{player.movement > 0 ? <ArrowUpRight size={15} /> : player.movement < 0 ? <ArrowDownRight size={15} /> : '–'}{player.movement ? Math.abs(player.movement) : ''}</span>
    <span className="rank-score">{score.format(player.score)} <small>pts</small></span>
  </li>)}</ol>
}

function ResponseChoices({ selected, question, answer }) {
  if (!selected?.length) return <span className="response-empty">Aucune réponse</span>
  return <ul className="response-choices">{selected.map((choice) => {
    const correct = choice === answer
    const Icon = correct ? Check : X
    return <li key={choice} data-correct={correct}><Icon size={16} aria-hidden="true" /><span className="sr-only">{correct ? 'Bonne réponse ' : 'Mauvaise réponse '}</span>{question.choices[choice]}</li>
  })}</ul>
}

function ResponseScore({ breakdown, speedEnabled, showTotal = false }) {
  if (!breakdown) return null
  const { points, basePoints, speedPoints, streakPoints, responseTime } = breakdown
  if (responseTime === null && !points) return null
  return <p className="response-score">
    {showTotal && <b>{score.format(points)} pts</b>}
    {responseTime !== null && <span>{responseSeconds.format(responseTime / 1000)} s</span>}
    {basePoints > 0 && <span>{score.format(basePoints)} base</span>}
    {speedEnabled && basePoints > 0 && <span>+{score.format(speedPoints)} vitesse</span>}
    {streakPoints > 0 && <span>+{score.format(streakPoints)} série</span>}
  </p>
}

function Reveal({ state, action, clockOffset, reconnecting, error }) {
  const { result, question, personal } = state
  const host = state.hostId === state.selfId
  const last = state.index + 1 === state.settings.total
  const { seconds } = useClock({ start: result.nextAt - revealDuration, deadline: result.nextAt }, clockOffset)
  const correct = personal.choices.includes(result.answer)
  const verdict = correct ? 'correct' : personal.choices.length ? 'wrong' : 'timeout'
  const VerdictIcon = correct ? Check : verdict === 'wrong' ? X : Clock3
  const others = state.players.filter(({ id }) => id !== state.selfId)
  const heading = useRef(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [state.index])
  return <main className="page-width game-page reveal-page" data-verdict={verdict}>
    <header className="reveal-verdict">
      <span className="reveal-verdict-icon"><VerdictIcon size={34} aria-hidden="true" /></span>
      <div>
        <p>Question {state.index + 1} sur {state.settings.total}</p>
        <h1 className="display" ref={heading} tabIndex={-1}>{correct ? 'Bonne réponse !' : verdict === 'wrong' ? 'Mauvaise réponse' : 'Temps écoulé'}</h1>
      </div>
      <div className="reveal-points">
        <strong>{personal.points ? '+' : ''}{score.format(personal.points)} pts</strong>
      </div>
    </header>
    <div className="lobby-grid result-grid">
      <section className="panel result-panel">
        <div className="section-head"><div><div className="field-label">La bonne réponse</div><h2 className="display">{question.choices[result.answer]}</h2></div><span className="good-icon"><Check size={26} aria-hidden="true" /></span></div>
        <p className="result-question">{question.prompt}</p>
        {question.explanation && <p className="answer-explanation">{question.explanation}</p>}
        <div className="reveal-responses">
          <h3 className="field-label">{personal.choices.length > 1 ? 'Tes réponses' : 'Ta réponse'}</h3>
          <ResponseChoices selected={personal.choices} question={question} answer={result.answer} />
          <ResponseScore breakdown={result.scores?.[state.selfId]} speedEnabled={state.settings.speedBonus !== false} />
          {others.length > 0 && <>
            <h3 className="field-label">{state.local ? 'Réponses des bots' : 'Réponses des autres joueurs'}</h3>
            <ul className="player-list">{others.map((player) => <li className="reveal-player" key={player.id}>
              <PlayerAvatar player={player} />
              <div>
                <strong><PlayerName player={player} /></strong>
                <ResponseChoices selected={result.responses[player.id]} question={question} answer={result.answer} />
                <ResponseScore breakdown={result.scores?.[player.id]} speedEnabled={state.settings.speedBonus !== false} showTotal />
              </div>
            </li>)}</ul>
          </>}
        </div>
        <ErrorText>{error}</ErrorText>
        {host ? <button className="button primary w-full justify-center mb-5" disabled={seconds > 0 || reconnecting} onClick={() => action({ type: 'next', round: state.index })}>
          {last ? 'Voir le podium' : 'Question suivante'}{seconds > 0 && ` (${seconds} s)`} <ChevronRight size={21} />
        </button> : <p className="wait-note mb-4"><span /> En attente de l’hôte.</p>}
        <RevealMedia key={question.id} media={question.media} followUp={question.followUp} />
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
  const [groupPreview, setGroupPreview] = useState(false)
  const [soloTheme, setSoloTheme] = useState(null)
  const [illustratedSpeedBonus, setIllustratedSpeedBonus] = useState(defaultSettings.speedBonus)
  const [personalityTest, setPersonalityTest] = useState('bizarre')
  const [personalityMode, setPersonalityMode] = useState('create')
  const activeQuestion = state?.phase === 'question' ? state.question : null
  const activeTest = state?.phase === 'personality' && !state.personality.currentVotes ? state.personality : null
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
  const isArcadeSetup = modal === 'arcade'
  const self = state?.players.find(({ id }) => id === state.selfId)
  const online = Boolean(state && !state.local)
  const onlineHost = online && state.hostId === state.selfId
  const showingHome = !state || state.groupHome || groupPreview
  const canChooseArcade = !state || (state.groupHome && onlineHost)
  useEffect(() => { window.scrollTo(0, 0) }, [state?.phase, state?.index, state?.groupHome])
  useEffect(() => {
    if (game.notice) {
      setCode('')
      setModal('')
    }
  }, [game.notice])
  useEffect(() => {
    if (!online || state.groupHome || state.phase === 'lobby') setGroupPreview(false)
  }, [online, state?.groupHome, state?.phase])
  const openSolo = (theme = null) => {
    if (state?.groupHome) {
      game.action({ type: 'prepare', theme })
      return
    }
    setSoloTheme(theme)
    game.clearError()
    setModal('solo')
  }
  const close = () => {
    if (modal === 'speech') speech.stop('preview')
    game.clearError()
    setModal('')
  }
  const openCreate = () => {
    game.clearError()
    if (profile.name.trim() && !photoBusy) game.enter('create', profile, { groupHome: true })
    else setModal('create')
  }
  const leave = async () => {
    if (await game.leave()) {
      setCode('')
      setModal('')
      setGroupPreview(false)
    }
  }
  const goHome = async () => {
    if (!state || showingHome) return
    if (state.local) {
      await leave()
    } else if (onlineHost) {
      if (await game.action({ type: 'group-home' })) setModal('')
    } else {
      setGroupPreview(true)
      setModal('')
      window.scrollTo(0, 0)
    }
  }
  async function enterFromModal(event) {
    event.preventDefault()
    if (state?.groupHome) {
      if (await game.action({ type: 'prepare', ...(isArcadeSetup ? { arcade: true } : { personalityTest }) })) setModal('')
      return
    }
    const mode = isPersonalitySetup ? personalityMode : modal === 'solo' ? 'local' : 'create'
    const options = isArcadeSetup ? { arcade: true } : isPersonalitySetup ? { personalityTest } : modal === 'create' ? { groupHome: true } : { theme: soloTheme, speedBonus: isIllustrated ? illustratedSpeedBonus : defaultSettings.speedBonus }
    if (await game.enter(mode, profile, options)) setModal('')
  }
  return <>
    <header className="site-header"><div className="page-width header-inner">
      <button className="home-link" aria-label="La Bande de Quiz, accueil" onClick={goHome}><Logo /></button>
      <div className="header-actions">
        {self && <div className="header-player"><PlayerAvatar player={self} /><span><PlayerName player={self} /><small>{state.local ? 'Solo' : 'En ligne'}</small></span></div>}
        <button type="button" className="header-help speech-button" data-enabled={speech.preferences.enabled && speech.supported} aria-haspopup="dialog" aria-label="Réglages de lecture vocale" title="Réglages de lecture vocale" onClick={() => setModal('speech')}><Volume2 size={17} /><span>Lecture vocale</span></button>
        {online && !showingHome && <button className="header-help group-navigation" aria-label="Accueil du groupe" onClick={goHome}><ArrowLeft size={17} /> <span>Accueil</span></button>}
        {state ? <button className={`header-help quit-button${online ? ' group-navigation' : ''}`} aria-label={online ? 'Quitter le groupe' : 'Quitter la partie'} onClick={() => setModal('leave')}><X size={17} /> <span>{online ? 'Quitter le groupe' : 'Quitter'}</span></button> : <button className="header-help" onClick={() => setModal('rules')}><CircleHelp size={17} /> Comment jouer</button>}
      </div>
    </div></header>
    {game.reconnecting && <div className="connection-banner" role="status">Connexion interrompue. Reconnexion au salon…</div>}
    {game.notice && <div className="connection-banner" role="status">{game.notice}</div>}
    {showingHome ? <Home game={game} group={online ? state : null} resumeGame={() => { setGroupPreview(false); window.scrollTo(0, 0) }} {...{ profile, setProfile, photoBusy, setPhotoBusy, code, setCode, openSolo, openCreate }} openPersonality={() => { game.clearError(); setModal('personality') }} /> : <>
    {state?.phase === 'lobby' && <Lobby state={state} game={game} />}
    {state?.phase === 'question' && <Question state={state} action={game.action} clockOffset={game.clockOffset} error={game.error} reconnecting={game.reconnecting} speech={speech} />}
    {state?.phase === 'reveal' && <Reveal state={state} action={game.action} clockOffset={game.clockOffset} reconnecting={game.reconnecting} error={game.error} />}
    {state?.phase === 'final' && <Final state={state} action={game.action} leave={goHome} error={game.error} />}
    {state?.phase === 'personality' && <PersonalityRound state={state} action={game.action} reconnecting={game.reconnecting} speech={speech} error={game.error} />}
    {state?.phase === 'personality-final' && <PersonalityResults state={state} action={game.action} leave={goHome} error={game.error} />}
    {state?.phase === 'arcade' && <ArcadeRound state={state} frameRef={game.arcadeFrame} aim={game.aimArcade} paused={Boolean(modal)} reconnecting={game.reconnecting} error={game.error} />}
    {state?.phase === 'arcade-final' && <ArcadeResults state={state} action={game.action} leave={goHome} error={game.error} />}
    </>}
    {online && state.phase !== 'lobby' && <RoomChatDock key={state.code} selfId={state.selfId} players={state.players} messages={game.chat} send={game.sendChat} reconnecting={game.reconnecting} />}
    <footer className="site-footer page-width"><Logo />
      {canChooseArcade && <button className="arcade-trigger" type="button" aria-label="Ouvrir l’arcade secrète" title="Arcade secrète" disabled={game.busy || game.reconnecting} onClick={() => { game.clearError(); setModal('arcade') }}><Gamepad2 size={18} /></button>}
      <p>Créé par <a href="https://www.malbroye.fr" target="_blank" rel="noopener noreferrer">Malbroye Studio</a></p>
    </footer>
    {['create', 'solo', 'personality', 'arcade'].includes(modal) && <Modal close={close} className={isPersonalitySetup ? 'personality-modal' : ''} title={isArcadeSetup ? 'Snake des potes' : isPersonalitySetup ? 'Tests de personnalité' : modal === 'solo' ? 'Ton profil solo' : 'Créer un groupe'}><form className="modal-form" onSubmit={enterFromModal}>
      {isPersonalitySetup && <PersonalitySetup testId={personalityTest} setTestId={setPersonalityTest} mode={personalityMode} setMode={setPersonalityMode} grouped={state?.groupHome} />}
      {isArcadeSetup && <><p>{state?.groupHome ? 'Prépare Snake pour ton groupe de 2 ou 3 joueurs.' : 'Une arène en ligne pour 2 ou 3 potes. Partage le code du salon pour les inviter.'}</p>{!state?.groupHome && <p className="field-note">Les pseudos Axel, Mathis et Flo chargent vos têtes de l’accueil. Tu peux aussi ajouter ta photo dans le profil.</p>}</>}
      {modal === 'create' && <p>Invite tes potes avec le code à trois lettres. Vous pourrez enchaîner les parties dans le même groupe.</p>}
      {modal === 'solo' && selectedTheme && <p>{isIllustrated ? 'Quiz illustré · Images et vidéos' : selectedTheme.name}</p>}
      {!state?.groupHome && <><label className="field-label">Ton pseudo<input autoFocus={!isPersonalitySetup} autoComplete="nickname" placeholder="Ex. Pixel42" required maxLength={20} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
      <ProfileAppearance {...{ profile, setProfile, photoBusy, setPhotoBusy }} /></>}
      {modal === 'solo' && isIllustrated && <SpeedBonusSetting enabled={illustratedSpeedBonus} onChange={setIllustratedSpeedBonus} />}
      <ErrorText>{game.error}</ErrorText><button className="button primary w-full justify-center" disabled={game.busy || photoBusy || game.reconnecting}>{modal === 'solo' ? <Gamepad2 size={19} /> : <Globe2 size={19} />} {game.busy ? 'Connexion…' : state?.groupHome ? 'Jouer avec le groupe' : isPersonalitySetup && personalityMode === 'local' ? 'Lancer le test' : modal === 'solo' ? (isIllustrated ? 'Lancer le quiz' : 'Continuer') : modal === 'create' ? 'Créer le groupe' : 'Créer le salon'} <ArrowRight size={18} /></button>
    </form></Modal>}
    {modal === 'speech' && <Modal close={close} title="Lecture vocale"><SpeechSettings speech={speech} /></Modal>}
    {modal === 'rules' && <Modal close={close} title="Comment jouer"><ol className="rules-list"><li><Users size={22} /><div><strong>Forme ton salon</strong><p>Partage le code avec tes amis ou lance une partie solo avec trois bots.</p></div></li><li><Zap size={22} /><div><strong>Marque des points</strong><p>Enchaîne les bonnes réponses pour gagner un bonus de série. Si l’hôte active le bonus de rapidité, les bonnes réponses les plus rapides rapportent davantage.</p></div></li><li><Sparkles size={22} /><div><strong>Utilise tes jokers</strong><p>Retire des choix, consulte le sondage, tente une deuxième réponse ou prends dix secondes de plus.</p></div></li></ol><button className="button outlined w-full justify-center" onClick={close}>Compris <Check size={18}/></button></Modal>}
    {modal === 'leave' && <Modal close={close} title={onlineHost ? 'Fermer le salon ?' : 'Quitter la partie ?'}>
      <p className="modal-message">{onlineHost ? 'Tous les joueurs seront renvoyés à l’accueil.' : 'Tu vas retourner à l’accueil.'}</p>
      <ErrorText>{game.error}</ErrorText>
      <div className="flex flex-wrap gap-3"><button className="button secondary" onClick={close} disabled={game.leaving}>Rester</button><button className="button primary" onClick={leave} disabled={game.leaving}>{onlineHost ? 'Fermer le salon' : 'Quitter'}</button></div>
    </Modal>}
  </>
}

createRoot(document.getElementById('root')).render(<App />)
