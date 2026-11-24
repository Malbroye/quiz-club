import { categories, illustratedCategory, questions, themeOptions } from './questions.js'
import { actPersonality, getPersonalityTest, personalityView } from './personality.js'
import { actArcade, arcadeFrame, arcadeLimit } from './arcade.js'

export const avatars = ['👾', '🦊', '🐸', '🤖', '🐙', '🦄', '👻', '🐼', '🐱', '👽', '🦖', '🐝']
export const nameColors = [
  { id: 'default', label: 'Blanc', hex: '#f4f2f7' },
  { id: 'lime', label: 'Citron', hex: '#e5f876' },
  { id: 'mint', label: 'Menthe', hex: '#9cf0c5' },
  { id: 'sky', label: 'Bleu ciel', hex: '#9ad9ff' },
  { id: 'lilac', label: 'Lilas', hex: '#d3baff' },
  { id: 'pink', label: 'Rose', hex: '#ffb1d5' },
  { id: 'peach', label: 'Pêche', hex: '#ffc292' },
]

export function isCustomNameColor(value) {
  return typeof value === 'string' && value.length === 7 && /^#[0-9a-f]{6}$/i.test(value)
}

export const maxAvatarPhotoLength = 4096

export function isAvatarPhoto(photo) {
  if (typeof photo !== 'string' || photo.length > maxAvatarPhotoLength) return false
  const encoded = /^data:image\/jpeg;base64,(\/9j\/[A-Za-z0-9+/]+={0,2})$/.exec(photo)?.[1]
  return Boolean(encoded && encoded.length % 4 === 0 && atob(encoded).endsWith('\xff\xd9'))
}

export const jokers = [
  { id: 'half', name: '50/50', description: 'Retire deux mauvaises réponses.' },
  { id: 'poll', name: 'Sondage', description: 'Consulte les votes des autres joueurs, ou une estimation.' },
  { id: 'double', name: 'Double chance', description: 'Tente deux réponses. Une bonne suffit.' },
  { id: 'time', name: '+10 secondes', description: 'Prolonge ton chrono personnel.' },
]
export const counts = [5, 10, 15, 20, 30]
export const durations = [10, 15, 20, 30]
export const maxSpeedBonus = 400
export const revealDuration = 5000
export const defaultSettings = {
  themes: [],
  total: 5,
  duration: 15,
  speedBonus: true,
  jokers: Object.fromEntries(jokers.map(({ id }) => [id, 1])),
}

export function jokerFitsQuestion(joker, choiceCount) {
  return choiceCount !== 2 || (joker !== 'half' && joker !== 'double')
}

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const roomCodeLength = 3
const botNames = ['Pixel', 'Mochi', 'Glitch']
const botSkill = [0.74, 0.55, 0.4]
const questionIds = new Set(questions.map(({ id }) => id))

export function mergeQuestionHistory(history, recent) {
  const ordered = new Set()
  for (const list of [history, recent]) {
    if (!Array.isArray(list)) continue
    for (const id of list) {
      if (!questionIds.has(id)) continue
      ordered.delete(id)
      ordered.add(id)
    }
  }
  return [...ordered]
}

export function makeCode() {
  return Array.from(crypto.getRandomValues(new Uint16Array(roomCodeLength)), (value) => letters[value % letters.length]).join('')
}

export function normalizeRoomCode(value) {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return /^[A-Z]{3}$|^[A-Z0-9]{6}$/.test(code) ? code : ''
}

function shuffle(items) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function questionPool(themes) {
  if (themes.includes(illustratedCategory.id)) {
    return questions.filter(({ media }) => media?.stage === 'question' && (media.type === 'image' || media.type === 'video'))
  }
  return themes.length ? questions.filter((question) => themes.includes(question.category)) : questions
}

export const questionCounts = Object.fromEntries(themeOptions.map(({ id }) => [id, questionPool([id]).length]))

function settingsFrom(input) {
  const requestedThemes = Array.isArray(input?.themes) ? input.themes : []
  const themes = requestedThemes.includes(illustratedCategory.id)
    ? [illustratedCategory.id]
    : categories.filter(({ id }) => requestedThemes.includes(id)).map(({ id }) => id)
  const max = questionPool(themes).length
  const requested = counts.includes(input?.total) ? input.total : defaultSettings.total
  return {
    themes,
    total: counts.filter((count) => count <= max && count <= requested).at(-1) ?? 5,
    duration: durations.includes(input?.duration) ? input.duration : defaultSettings.duration,
    speedBonus: typeof input?.speedBonus === 'boolean' ? input.speedBonus : defaultSettings.speedBonus,
    jokers: Object.fromEntries(jokers.map(({ id }) => {
      const value = input?.jokers?.[id]
      return [id, Number.isInteger(value) && value >= 0 && value <= 3 ? value : defaultSettings.jokers[id]]
    })),
  }
}

function resetPlayer(player, settings) {
  Object.assign(player, {
    score: 0, streak: 0, bestStreak: 0, correctCount: 0, bestTime: null, stock: { ...settings.jokers },
  })
}

export function addPlayer(room, profile, id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join(''), bot = false) {
  if (room.phase !== 'lobby') throw new Error('Cette partie a déjà commencé.')
  const name = typeof profile?.name === 'string' ? profile.name.trim().replace(/\s+/g, ' ').slice(0, 20) : ''
  if (!name) throw new Error('Choisis un pseudo pour entrer.')
  if (room.players.size >= (room.arcade ? arcadeLimit : 24)) throw new Error('Ce salon est complet.')
  if ([...room.players.values()].some((player) => player.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('Ce pseudo est déjà pris dans le salon.')
  }
  const player = {
    id, name, connected: true, bot,
    avatar: avatars.includes(profile.avatar) ? profile.avatar : avatars[0],
    photo: isAvatarPhoto(profile.photo) ? profile.photo : undefined,
    nameColor: isCustomNameColor(profile.nameColor)
      ? profile.nameColor.toLowerCase()
      : nameColors.find(({ id }) => id === profile.nameColor)?.id,
  }
  resetPlayer(player, room.settings)
  room.players.set(id, player)
  room.hostId ??= id
  return player
}

export function createRoom(profile, { local = false, code = makeCode(), now = Date.now(), personalityTest, arcade = false, groupHome = false } = {}) {
  if (personalityTest !== undefined && !getPersonalityTest(personalityTest)) throw new Error('Ce questionnaire est indisponible.')
  if (arcade && (local || personalityTest)) throw new Error('L’arène se joue dans son propre salon en ligne.')
  const room = {
    code, local, players: new Map(), hostId: null, phase: 'lobby', settings: settingsFrom(defaultSettings),
    deck: [], questionHistory: [], round: null, index: -1, ranking: [], touched: now, groupHome: !local && groupHome,
  }
  if (personalityTest) room.personality = { testId: personalityTest, answers: {}, run: 0 }
  if (arcade) room.arcade = {}
  const player = addPlayer(room, profile)
  if (local && !room.personality) {
    botNames.forEach((name, index) => addPlayer(room, {
      name: player.name.toLowerCase() === name.toLowerCase() ? name + ' Bot' : name,
      avatar: avatars[index + 1],
    }, 'bot-' + index, true))
  }
  return { room, player }
}

export function setConnected(room, id, connected) {
  const player = room.players.get(id)
  if (!player) return
  player.connected = connected
  if (!room.players.get(room.hostId)?.connected) {
    room.hostId = [...room.players.values()].find((candidate) => !candidate.bot && candidate.connected)?.id ?? null
  }
}

export function removePlayer(room, id) {
  setConnected(room, id, false)
  if (room.phase === 'lobby') room.players.delete(id)
}

function rank(room) {
  const useSpeed = room.settings.speedBonus !== false
  return [...room.players.values()].sort((a, b) =>
    b.score - a.score || b.correctCount - a.correctCount ||
    (useSpeed ? (a.bestTime ?? Infinity) - (b.bestTime ?? Infinity) : 0) || a.name.localeCompare(b.name, 'fr'),
  )
}

function makeDeck(settings, history) {
  const pool = questionPool(settings.themes)
  const seen = new Set(history)
  const fresh = pool.filter(({ id }) => !seen.has(id))
  const freshLimit = Math.min(settings.total, fresh.length)
  const groups = shuffle(categories.map(({ id }) => shuffle(fresh.filter((question) => question.category === id))))
  const takeQuestion = (preferredGroups, match, prefer = match) => {
    for (const group of preferredGroups) {
      const preferred = group.findIndex((question) => match(question) && prefer(question))
      const index = preferred < 0 ? group.findIndex(match) : preferred
      if (index >= 0) return group.splice(index, 1)[0]
    }
  }
  const takeMedia = (type, preferredGroups) => {
    return takeQuestion(preferredGroups, ({ media }) => media?.type === type && media.stage === 'question', ({ media }) => type === 'image' ? media.items : media.url)
  }
  const ordered = []
  if (!settings.themes.includes(illustratedCategory.id)) {
    const firstImage = takeMedia('image', groups)
    const videoGroups = groups.filter((group) => group[0]?.category !== firstImage?.category)
    const firstVideo = takeMedia('video', videoGroups) ?? takeMedia('video', groups)
    const firstAudio = (!firstVideo || settings.total >= 10) && takeMedia('audio', groups)
    ordered.push(...[firstImage, firstVideo, firstAudio].filter(Boolean))
  }
  const mediaCount = ordered.length
  const isBinary = ({ choices }) => choices.length === 2
  const binary = mediaCount < freshLimit && !ordered.some(isBinary) && takeQuestion(groups, isBinary)
  if (binary) ordered.push(binary)
  while (ordered.length < freshLimit) {
    for (const group of shuffle(groups.filter((group) => group.length))) ordered.push(group.pop())
  }
  if (ordered.length < settings.total) {
    const byId = new Map(pool.map((question) => [question.id, question]))
    for (const id of history) {
      if (byId.has(id)) ordered.push(byId.get(id))
      if (ordered.length === settings.total) break
    }
  }
  const deck = ordered.slice(0, settings.total)
  if (binary) {
    const position = mediaCount + Math.floor(Math.random() * (freshLimit - mediaCount))
    ;[deck[mediaCount], deck[position]] = [deck[position], deck[mediaCount]]
  }
  return deck.map((question) => {
    if (isBinary(question)) return { ...question }
    const indexes = shuffle(question.choices.map((_, index) => index))
    return { ...question, choices: indexes.map((index) => question.choices[index]), answer: indexes.indexOf(question.answer) }
  })
}

function openRound(room, now) {
  room.index += 1
  const question = room.deck[room.index]
  room.questionHistory = mergeQuestionHistory(room.questionHistory, [question.id])
  const duration = room.settings.duration * 1000
  const entries = new Map()
  for (const player of room.players.values()) {
    const entry = { deadline: now + duration, choices: [], locked: false, used: {}, eliminated: [], points: 0 }
    if (player.bot) {
      const skill = botSkill[Number(player.id.at(-1))]
      entry.botAt = now + Math.round(duration * (0.16 + Math.random() * 0.42))
      entry.botChoice = Math.random() < skill ? question.answer : shuffle(question.choices.map((_, index) => index).filter((index) => index !== question.answer))[0]
    }
    entries.set(player.id, entry)
  }
  const simulation = shuffle(question.choices.length === 2 ? [38, 62] : [13, 18, 25, 44])
  if (Math.random() < 0.52) {
    const favorite = simulation.indexOf(Math.max(...simulation))
    ;[simulation[favorite], simulation[question.answer]] = [simulation[question.answer], simulation[favorite]]
  }
  room.round = {
    question, openedAt: now, entries, previous: room.ranking.map(({ id }) => id),
    simulation,
  }
  room.phase = 'question'
}

function recordAnswer(entry, choice, now, answer) {
  entry.choices.push(choice)
  if (entry.used.double && choice !== answer && entry.choices.length === 1) return
  entry.locked = true
  entry.answeredAt = now
}

function distribution(votes) {
  const total = votes.reduce((sum, vote) => sum + vote, 0)
  if (!total) return votes
  const exact = votes.map((vote) => vote * 100 / total)
  const rounded = exact.map(Math.floor)
  const byRemainder = votes.map((_, index) => index).sort((a, b) => (exact[b] - rounded[b]) - (exact[a] - rounded[a]))
  const remainder = 100 - rounded.reduce((sum, value) => sum + value, 0)
  for (const index of byRemainder.slice(0, remainder)) rounded[index] += 1
  return rounded
}

function tally(room, excludedId = null) {
  const votes = room.round.question.choices.map(() => 0)
  let voters = 0
  for (const [id, entry] of room.round.entries) {
    if (id === excludedId || !entry.choices.length) continue
    if (excludedId && (!room.players.get(id)?.connected || room.players.get(id)?.bot)) continue
    votes[entry.choices.at(-1)] += 1
    voters += 1
  }
  return { votes, voters }
}

function pollFor(room, id) {
  const { votes, voters } = tally(room, id)
  return { percentages: voters >= 2 ? distribution(votes) : room.round.simulation, voters, simulated: voters < 2 }
}

function finishRound(room, now) {
  const { question, entries, openedAt } = room.round
  for (const [id, entry] of entries) {
    const player = room.players.get(id)
    if (!entry.choices.includes(question.answer)) {
      player.streak = 0
      continue
    }
    const elapsed = Math.max(0, entry.answeredAt - openedAt)
    const speed = room.settings.speedBonus === false ? 0 : Math.max(0, 1 - elapsed / (room.settings.duration * 1000))
    player.streak += 1
    player.correctCount += 1
    player.bestStreak = Math.max(player.bestStreak, player.streak)
    player.bestTime = Math.min(player.bestTime ?? Infinity, elapsed)
    entry.speedPoints = Math.round(speed * maxSpeedBonus)
    entry.points = 600 + entry.speedPoints + Math.min(5, player.streak - 1) * 75
    player.score += entry.points
  }
  room.ranking = rank(room)
  room.round.nextAt = room.local ? now : now + revealDuration
  room.phase = 'reveal'
}

export function tick(room, now = Date.now()) {
  if (room.phase !== 'question') return false
  const { entries, question } = room.round
  let changed = false
  for (const entry of entries.values()) {
    if (!entry.locked && entry.botAt != null && now >= entry.botAt) {
      recordAnswer(entry, entry.botChoice, entry.botAt, question.answer)
      changed = true
    }
    if (!entry.locked && now >= entry.deadline) {
      entry.locked = true
      changed = true
    }
  }
  const soloFinished = room.local && entries.get(room.hostId)?.locked
  if (soloFinished) {
    // Complete the simulation using the bots' preassigned answers and reaction times.
    for (const entry of entries.values()) {
      if (!entry.locked && entry.botAt != null) recordAnswer(entry, entry.botChoice, entry.botAt, question.answer)
    }
  }
  if (soloFinished || [...entries.values()].every((entry) => entry.locked)) {
    finishRound(room, now)
    return true
  }
  return changed
}

export function act(room, id, action, now = Date.now()) {
  const player = room.players.get(id)
  if (!player?.connected) throw new Error('Reconnecte-toi au salon.')
  const type = action?.type
  if (['settings', 'start', 'next', 'rematch', 'finish-personality', 'group-home', 'prepare'].includes(type) && id !== room.hostId) {
    throw new Error('Cette action est réservée à l’hôte.')
  }
  if (type === 'group-home' && !room.local) {
    Object.assign(room, { phase: 'lobby', groupHome: true, round: null, index: -1, deck: [], ranking: [], touched: now })
    room.personality = undefined
    room.arcade = undefined
    return
  }
  if (type === 'prepare' && room.groupHome) {
    const { personalityTest, arcade, theme } = action
    if (personalityTest !== undefined && !getPersonalityTest(personalityTest)) throw new Error('Ce questionnaire est indisponible.')
    if (arcade === true && personalityTest) throw new Error('Choisis un seul jeu.')
    if (arcade === true && room.players.size > arcadeLimit) throw new Error('L’arcade accueille trois joueurs maximum.')
    room.personality = personalityTest ? { testId: personalityTest, answers: {}, run: 0 } : undefined
    room.arcade = arcade === true ? {} : undefined
    if (theme) room.settings = settingsFrom({ ...room.settings, themes: [theme] })
    room.groupHome = false
    room.touched = now
    return
  }
  if (room.groupHome) throw new Error('Choisis un jeu avant de lancer la partie.')
  if (room.personality) {
    actPersonality(room, id, action)
    room.touched = now
    return
  }
  if (room.arcade) {
    actArcade(room, action, now)
    room.touched = now
    return
  }
  if (type === 'settings' && room.phase === 'lobby') {
    const { theme, settings } = action
    const current = room.settings
    const themes = theme
      ? current.themes.includes(theme)
        ? current.themes.filter((id) => id !== theme)
        : [...current.themes.filter((id) => id !== illustratedCategory.id), theme]
      : settings?.themes ?? current.themes
    room.settings = settingsFrom({ ...current, ...settings, themes, jokers: { ...current.jokers, ...settings?.jokers } })
  } else if (type === 'start' && room.phase === 'lobby') {
    const active = [...room.players.values()].filter((candidate) => candidate.connected)
    if (active.length < 2) throw new Error('Attends qu’un autre joueur rejoigne le salon.')
    for (const candidate of room.players.values()) {
      if (!candidate.connected) room.players.delete(candidate.id)
      else resetPlayer(candidate, room.settings)
    }
    const history = mergeQuestionHistory(action.history, room.questionHistory)
    room.deck = makeDeck(room.settings, history)
    room.ranking = []
    room.index = -1
    openRound(room, now)
  } else if (type === 'next' && room.phase === 'reveal') {
    if (action.round !== room.index) throw new Error('Cette manche est déjà terminée.')
    if (now < room.round.nextAt) throw new Error('Laisse quelques secondes aux joueurs pour lire les réponses.')
    if (room.index + 1 === room.deck.length) room.phase = 'final'
    else openRound(room, now)
  } else if (type === 'rematch' && room.phase === 'final') {
    room.phase = 'lobby'
    room.round = null
    room.index = -1
    room.deck = []
    room.ranking = []
    for (const candidate of room.players.values()) {
      if (!candidate.connected) room.players.delete(candidate.id)
      else resetPlayer(candidate, room.settings)
    }
  } else if ((type === 'answer' || type === 'joker') && room.phase === 'question') {
    if (action.round !== room.index) throw new Error('Cette question est déjà terminée.')
    const { question, entries } = room.round
    const entry = entries.get(id)
    if (entry.locked || now >= entry.deadline) throw new Error('Tes réponses sont closes.')
    if (type === 'answer') {
      const { choice } = action
      if (!Number.isInteger(choice) || choice < 0 || choice >= question.choices.length || entry.choices.includes(choice) || entry.eliminated.includes(choice)) {
        throw new Error('Cette réponse est indisponible.')
      }
      recordAnswer(entry, choice, now, question.answer)
    } else {
      const { joker } = action
      if (!jokers.some(({ id }) => id === joker) || !player.stock[joker] || entry.used[joker]) {
        throw new Error('Ce joker est indisponible.')
      }
      if (!jokerFitsQuestion(joker, question.choices.length)) throw new Error('Ce joker ne s’utilise pas sur un Vrai/Faux.')
      player.stock[joker] -= 1
      entry.used[joker] = true
      if (joker === 'half') {
        entry.eliminated = shuffle(question.choices.map((_, index) => index).filter((index) => index !== question.answer && !entry.choices.includes(index))).slice(0, 2)
      }
      if (joker === 'time') entry.deadline += 10000
    }
  } else {
    throw new Error('Cette action est indisponible à ce stade.')
  }
  room.touched = now
  tick(room, now)
}

export function view(room, id, now = Date.now()) {
  const { phase, round } = room
  const entry = round?.entries.get(id)
  const self = room.players.get(id)
  const revealed = phase === 'reveal' || phase === 'final'
  const votes = revealed ? tally(room) : null
  const publicPlayer = ({ id, name, avatar, photo, nameColor, connected, bot }) => ({ id, name, avatar, photo, nameColor, connected, bot })
  return {
    code: room.code, phase, local: room.local, hostId: room.hostId, selfId: id, groupHome: room.groupHome,
    now, settings: room.settings, index: room.index, questionCounts,
    personality: room.personality && personalityView(room, id),
    arcade: room.arcade && { frame: arcadeFrame(room, now) },
    players: [...room.players.values()].filter((player) => phase !== 'lobby' || player.connected).map(publicPlayer),
    stock: phase === 'lobby' ? room.settings.jokers : self.stock,
    question: round && {
      id: round.question.id,
      prompt: round.question.prompt,
      category: round.question.category,
      choices: round.question.choices,
      explanation: revealed ? round.question.explanation : undefined,
      media: round.question.media?.stage === 'question' || revealed ? round.question.media : undefined,
      followUp: revealed ? round.question.followUp : undefined,
      source: revealed ? round.question.source : undefined,
    },
    answered: round ? [...round.entries.values()].filter((item) => item.choices.length && item.locked).length : 0,
    personal: entry && {
      start: round.openedAt, deadline: entry.deadline, choices: entry.choices, locked: entry.locked,
      used: entry.used, eliminated: entry.eliminated, poll: entry.used.poll ? pollFor(room, id) : null,
      points: revealed ? entry.points : null,
      speedPoints: revealed ? entry.speedPoints ?? 0 : null,
    },
    result: revealed ? {
      answer: round.question.answer,
      percentages: distribution(votes.votes),
      voters: votes.voters,
      nextAt: round.nextAt ?? 0,
      responses: Object.fromEntries([...round.entries].map(([playerId, { choices }]) => [playerId, choices])),
    } : null,
    ranking: room.ranking.map((player, index) => {
      const previous = round.previous.indexOf(player.id)
      return {
        ...publicPlayer(player), place: index + 1, movement: previous < 0 ? null : previous - index,
        score: player.score, streak: player.streak, bestStreak: player.bestStreak, bestTime: player.bestTime, correctCount: player.correctCount,
      }
    }),
  }
}
