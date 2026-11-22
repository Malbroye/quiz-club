import { DatabaseSync } from 'node:sqlite'

export function openStorage(filename) {
  const db = new DatabaseSync(filename)
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      snapshot TEXT NOT NULL
    );
  `)
  const save = db.prepare('INSERT INTO rooms (code, snapshot) VALUES (?, ?) ON CONFLICT (code) DO UPDATE SET snapshot = excluded.snapshot')
  const remove = db.prepare('DELETE FROM rooms WHERE code = ?')
  return {
    load() {
      return db.prepare('SELECT snapshot FROM rooms').all().map(({ snapshot }) => {
        const { room, tokens, away } = JSON.parse(snapshot)
        room.players = new Map(room.players)
        room.ranking = room.ranking.map((id) => room.players.get(id))
        if (room.round) room.round.entries = new Map(room.round.entries)
        const disconnected = new Map(away)
        for (const player of room.players.values()) {
          player.connected = false
          if (!disconnected.has(player.id)) disconnected.set(player.id, Date.now())
        }
        return { room, tokens: new Map(tokens), sockets: new Map(), away: disconnected }
      })
    },
    save({ room, tokens, away }) {
      const snapshot = {
        room: {
          ...room,
          players: [...room.players],
          ranking: room.ranking.map(({ id }) => id),
          round: room.round && { ...room.round, entries: [...room.round.entries] },
        },
        tokens: [...tokens],
        away: [...away],
      }
      save.run(room.code, JSON.stringify(snapshot))
    },
    remove(code) { remove.run(code) },
  }
}
