import { personalityTests } from './personality-tests.js'
import { legacyPersonalityTests } from './personality-tests-legacy.js'

export { personalityTests }

const friendNames = ['Axel', 'Mathis', 'Flo']

export function getPersonalityTest(id, legacy = false) {
  const catalog = legacy ? legacyPersonalityTests : personalityTests
  return typeof id === 'string' && Object.hasOwn(catalog, id) ? catalog[id] : undefined
}

export function getPersonalityQuestion(testId, step, { names = {}, legacy = false } = {}) {
  const question = getPersonalityTest(testId, legacy)?.questions[step]
  if (!question?.[0].includes('{pote}')) return question
  const [prompt, ...choices] = question
  return [prompt.replaceAll('{pote}', names[step] ?? friendNames[step % friendNames.length]), ...choices]
}

function drawFriendNames(questions) {
  const available = [...friendNames]
  const names = {}
  questions.forEach(([prompt], index) => {
    if (!prompt.includes('{pote}')) return
    if (!available.length) available.push(...friendNames)
    names[index] = available.splice(Math.floor(Math.random() * available.length), 1)[0]
  })
  return names
}

function profileFor(test, answers) {
  if (test.graded) {
    const average = answers.reduce((sum, choice) => sum + choice, 0) / answers.length
    return test.profiles[Math.round(average)]
  }
  const score = test.profiles.map(() => 0)
  for (const choice of answers) score[choice]++
  const peak = Math.max(...score)
  // When traits tie, the player's earliest answer among those traits decides.
  return test.profiles[answers.find((choice) => score[choice] === peak)]
}

function progress(room, total) {
  const completed = []
  let waiting = 0
  for (const player of room.players.values()) {
    const answers = room.personality.answers[player.id]
    if (answers?.length === total) completed.push({ id: player.id, answers })
    else if (player.connected) waiting++
  }
  return { completed, waiting }
}

function isLegacyRun(room) {
  return room.phase !== 'lobby'
    && room.personality.revision === undefined
    && Object.hasOwn(legacyPersonalityTests, room.personality.testId)
}

export function actPersonality(room, id, action) {
  const test = getPersonalityTest(room.personality.testId, isLegacyRun(room))
  const total = test.questions.length
  if (action?.type === 'start' && room.phase === 'lobby') {
    const active = [...room.players.values()].filter((player) => player.connected)
    if (!room.local && active.length < 2) throw new Error('Attends qu’un autre joueur rejoigne le salon.')
    for (const player of room.players.values()) if (!player.connected) room.players.delete(player.id)
    room.personality.answers = Object.fromEntries(active.map(({ id }) => [id, []]))
    room.personality.revision = 2
    if (test.cast) room.personality.names = drawFriendNames(test.questions)
    room.personality.run++
    room.phase = 'personality'
    return
  }

  if (action?.type === 'rematch' && room.phase === 'personality-final') {
    room.personality.answers = {}
    for (const player of room.players.values()) if (!player.connected) room.players.delete(player.id)
    room.phase = 'lobby'
    return
  }

  if (action?.type === 'answer' && (room.phase === 'personality' || room.phase === 'personality-final')) {
    const answers = room.personality.answers[id]
    const { step, choice, run } = action
    if (run !== room.personality.run) throw new Error('Cette partie est terminée.')
    if (!Number.isInteger(choice) || choice < 0 || choice >= test.profiles.length || !Number.isInteger(step) || step < 0 || step >= total) throw new Error('Cette réponse est indisponible.')
    // A replay of an already accepted answer is safe even if it ended the test.
    if (answers?.[step] === choice) return
    if (room.phase !== 'personality' || step !== answers?.length) throw new Error('Cette question n’est plus disponible.')
    answers.push(choice)
    if (progress(room, total).completed.length === room.players.size) room.phase = 'personality-final'
    return
  }

  if (action?.type === 'finish-personality' && room.phase === 'personality') {
    const { completed, waiting } = progress(room, total)
    if (waiting || !completed.length) throw new Error('Des joueurs connectés répondent encore au questionnaire.')
    room.phase = 'personality-final'
    return
  }

  throw new Error('Cette action est indisponible à ce stade.')
}

export function personalityView(room, id) {
  const { testId, answers, names } = room.personality
  const legacy = isLegacyRun(room)
  const test = getPersonalityTest(testId, legacy)
  const total = test.questions.length
  const step = answers[id]?.length ?? 0
  const { completed, waiting } = progress(room, total)
  const final = room.phase === 'personality-final'
  return {
    testId, total, step, names, legacy, run: room.personality.run, complete: completed.length,
    canFinish: room.phase === 'personality' && !waiting && completed.length > 0 && id === room.hostId,
    profiles: final ? completed.map(({ id, answers }) => ({ id, ...profileFor(test, answers) })) : [],
    votes: final && !room.local ? test.questions.map((_, index) => {
      const votes = test.profiles.map(() => 0)
      for (const player of completed) votes[player.answers[index]]++
      return votes
    }) : [],
  }
}
