export const chatMessageLimit = 240
export const chatHistoryLimit = 40

export function addRoomMessage(record, playerId, input, now, id) {
  const player = record.room.players.get(playerId)
  if (!player?.connected || player.bot) {
    throw new Error('Rejoins le groupe pour écrire.')
  }
  const text = typeof input === 'string' ? input.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim() : ''
  if (!text || text.length > chatMessageLimit) throw new Error(`Écris un message de 1 à ${chatMessageLimit} caractères.`)
  const history = record.chat ??= []
  const previous = history.findLast((message) => message.playerId === playerId)
  if (previous && now - previous.at < 800) throw new Error('Patiente un instant avant le prochain message.')
  const message = { id, playerId, name: player.name, text, at: now }
  history.push(message)
  if (history.length > chatHistoryLimit) history.shift()
  return message
}
