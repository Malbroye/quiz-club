import animals from './animals.js'
import cinema from './cinema/index.js'
import strangerThings from './cinema/stranger-things.js'
import culture from './culture.js'
import games from './games.js'
import memes from './memes.js'
import sports from './sports.js'
import twitch from './twitch.js'
import youtube from './youtube.js'
import moreAnimals from './extension/animals.js'
import moreCinema from './extension/cinema.js'
import moreCulture from './extension/culture.js'
import moreGames from './extension/games.js'
import moreMemes from './extension/memes.js'
import moreSports from './extension/sports.js'
import moreTwitch from './extension/twitch.js'
import moreYouTube from './extension/youtube.js'

export default { animals, cinema, culture, games, memes, sports, twitch, youtube }
export const subjectPacks = [
  { category: 'cinema', subject: 'stranger-things', rows: strangerThings },
]

export const expansionPacks = {
  animals: moreAnimals,
  cinema: moreCinema,
  culture: moreCulture,
  games: moreGames,
  memes: moreMemes,
  sports: moreSports,
  twitch: moreTwitch,
  youtube: moreYouTube,
}
