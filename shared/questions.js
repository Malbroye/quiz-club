import { existingMedia, mediaLibrary, webQuestions } from './web-questions.js'
import { customMedia, customMediaLibrary, customQuestions } from './mes-questions.js'
import questionPacks, { expansionPacks, subjectPacks, supplementPacks } from './banque/index.js'
import { trueFalseQuestions } from './banque/vrai-faux.js'
import { expansionImages } from './banque/extension/images.js'
import { mediaQuestions, questionVideos } from './banque/media-questions.js'

export const categories = [
  { id: 'culture', name: 'Culture générale', icon: 'brain' },
  { id: 'animals', name: 'Animaux', icon: 'paw' },
  { id: 'sports', name: 'Sport', icon: 'trophy' },
  { id: 'twitch', name: 'Twitch & Streaming', icon: 'twitch' },
  { id: 'youtube', name: 'YouTube', icon: 'youtube' },
  { id: 'memes', name: 'Mèmes & Culture Internet', icon: 'smile' },
  { id: 'games', name: 'Jeux vidéo', icon: 'gamepad' },
  { id: 'cinema', name: 'Cinéma & Séries', icon: 'film' },
]

export const illustratedCategory = { id: 'illustrated', name: 'Illustré', icon: 'image' }
const screenThemes = [
  { id: 'films', name: 'Cinéma', icon: 'film' },
  { id: 'series', name: 'Séries', icon: 'tv' },
]
export const homeThemes = [...categories, ...screenThemes]
export const themeOptions = [...homeThemes, illustratedCategory]

// The first choice in each entry is correct. The game shuffles choices before play.
const bank = {
  culture: [
    ['Quelle planète possède la Grande Tache rouge ?', 'Jupiter', 'Mars', 'Saturne', 'Neptune'],
    ['Dans quel pays se trouve la ville de Kyoto ?', 'Japon', 'Chine', 'Vietnam', 'Corée du Sud'],
    ['Quel est le symbole chimique de l’or ?', 'Au', 'Ag', 'Fe', 'Or'],
    ['Qui a peint Guernica ?', 'Pablo Picasso', 'Salvador Dalí', 'Joan Miró', 'Claude Monet'],
    ['Quel instrument indique la pression atmosphérique ?', 'Baromètre', 'Hygromètre', 'Anémomètre', 'Sismographe'],
    ['De quel pays la Nouvelle-Zélande tient-elle son nom ?', 'Pays-Bas', 'Royaume-Uni', 'Australie', 'Danemark'],
    ['Quel océan borde à la fois le Brésil et le Sénégal ?', 'Atlantique', 'Pacifique', 'Indien', 'Arctique'],
    ['Dans quel roman trouve-t-on le personnage de Big Brother ?', '1984', 'Fahrenheit 451', 'Le Meilleur des mondes', 'La Ferme des animaux'],
  ],
  animals: [
    ['Combien de cœurs une pieuvre possède-t-elle ?', 'Trois', 'Un', 'Deux', 'Quatre'],
    ['Quel mammifère pond des œufs ?', 'L’ornithorynque', 'Le koala', 'Le wombat', 'Le suricate'],
    ['Chez quel animal le mâle porte-t-il les petits avant leur naissance ?', 'L’hippocampe', 'Le dauphin', 'La méduse', 'Le manchot'],
    ['Quel oiseau peut voler en arrière ?', 'Le colibri', 'L’albatros', 'Le héron', 'Le corbeau'],
    ['Sous l’eau, quels mammifères utilisent principalement les clics d’écholocalisation ?', 'Les cétacés à dents', 'Les cétacés à fanons', 'Les lamantins', 'Les loutres de mer'],
    ['À quel groupe appartiennent les axolotls ?', 'Les amphibiens', 'Les reptiles', 'Les poissons', 'Les crustacés'],
    ['Quelle est la plus grande espèce de manchot ?', 'Le manchot empereur', 'Le manchot royal', 'Le manchot Adélie', 'Le manchot papou'],
    ['À quelle famille appartient le panda roux ?', 'Les Ailuridés', 'Les Ursidés', 'Les Canidés', 'Les Félidés'],
  ],
  sports: [
    ['Quelle équipe a remporté la Coupe du monde masculine de football en 2022 ?', 'Argentine', 'France', 'Brésil', 'Allemagne'],
    ['Dans quel sport utilise-t-on un fleuret ?', 'Escrime', 'Tir à l’arc', 'Équitation', 'Hockey'],
    ['Quelle est la couleur du maillot du leader du classement général du Tour de France ?', 'Jaune', 'Vert', 'Blanc', 'Rouge'],
    ['Combien de points vaut un essai au rugby à XV ?', '5', '3', '6', '7'],
    ['Sur quelle surface se joue Wimbledon ?', 'Gazon', 'Terre battue', 'Dur', 'Moquette'],
    ['Quelle ville a accueilli les Jeux olympiques d’été en 2024 ?', 'Paris', 'Tokyo', 'Los Angeles', 'Londres'],
    ['Combien de joueurs d’une équipe de basket commencent un match NBA sur le terrain ?', '5', '4', '6', '7'],
    ['En Formule 1, que signale le drapeau à damier en fin de course ?', 'L’arrivée', 'Le départ', 'Une neutralisation', 'Une pénalité'],
  ],
  twitch: [
    ['Sur quelle chaîne Twitch était diffusé le GP Explorer 3 en 2025 ?', 'Squeezie', 'ZeratoR', 'Domingo', 'Kameto'],
    ['Quel duo a lancé le Z Event à partir du projet Avengers ?', 'ZeratoR et Dach', 'Squeezie et Gotaga', 'Kameto et Kotei', 'Domingo et Xari'],
    ['Sur Twitch, qu’est-ce qu’un raid ?', 'Envoyer son public vers un autre direct', 'Bloquer temporairement un diffuseur', 'Créer une émoticône', 'Effacer un replay'],
    ['Quel terme désigne les rediffusions consultables après un direct ?', 'VOD', 'HUD', 'AFK', 'FPS'],
    ['Quelle entreprise a racheté Twitch en 2014 ?', 'Amazon', 'Google', 'Microsoft', 'Meta'],
    ['Dans quelle ville s’est tenue la TwitchCon Europe 2026 ?', 'Rotterdam', 'Berlin', 'Paris', 'Bruxelles'],
    ['Quel créateur anime le talk-show Popcorn ?', 'Domingo', 'Mister V', 'AmineMaTue', 'Joueur du Grenier'],
    ['Comment s’appelle le collectif lancé par Gotaga, Brawks et Squeezie en 2023 ?', 'Gentle Mates', 'Karmine Corp', 'Team Vitality', 'Solary'],
  ],
  youtube: [
    ['Quelle vidéo a ouvert l’histoire de YouTube, qui a fêté ses 20 ans en 2025 ?', 'Me at the zoo', 'Charlie bit my finger', 'Evolution of Dance', 'Gangnam Style'],
    ['Quel créateur a lancé la compétition Beast Games en 2024 ?', 'MrBeast', 'Mark Rober', 'Markiplier', 'PewDiePie'],
    ['Quel vidéaste français a lancé le format « Qui est l’imposteur ? » sur sa chaîne principale ?', 'Squeezie', 'Mastu', 'Inoxtag', 'Cyprien'],
    ['Quel nom portent les vidéos courtes de YouTube ?', 'Shorts', 'Reels', 'Snaps', 'Vines'],
    ['De quel sommet parle le documentaire Kaizen d’Inoxtag ?', 'Everest', 'Mont Blanc', 'Kilimandjaro', 'Aconcagua'],
    ['Qui présentait la version française des « Recettes Pompettes » sur YouTube ?', 'Monsieur Poulpe', 'McFly et Carlito', 'Bigflo et Oli', 'Mastu et Joyca'],
    ['Quel tournoi a donné lieu à la première YouTube FIFA Creator Cup, à New York en 2026 ?', 'La Coupe du monde de football', 'La Coupe d’Afrique des nations', 'L’Euro de football', 'La Copa América'],
    ['Combien d’abonnés faut-il généralement atteindre pour le trophée YouTube Argent ?', '100 000', '10 000', '50 000', '1 000 000'],
  ],
  memes: [
    ['Dans l’Italian brainrot de 2025, quel animal est Tralalero Tralala ?', 'Un requin', 'Un crocodile', 'Un gorille', 'Un pigeon'],
    ['Dans le débat viral de 2025, quel animal affronte cent hommes ?', 'Un gorille', 'Un ours', 'Un lion', 'Un hippopotame'],
    ['Quel objet est central dans les vidéos « Skibidi Toilet » ?', 'Des toilettes', 'Un frigo', 'Un téléphone', 'Une baignoire'],
    ['Quel animal est « Chill Guy », le personnage devenu viral fin 2024 ?', 'Un chien', 'Un chat', 'Une grenouille', 'Un renard'],
    ['Quelle chanson entend-on dans un rickroll ?', 'Never Gonna Give You Up', 'Take On Me', 'Careless Whisper', 'Africa'],
    ['Quel objet le personnage dessiné de « This Is Fine » tient-il pendant l’incendie ?', 'Une tasse', 'Un parapluie', 'Un téléphone', 'Une bougie'],
    ['Dans quelle série voit-on le mème des Spider-Man qui se pointent du doigt à l’origine ?', 'Le dessin animé de 1967', 'La série animée de 1994', 'Ultimate Spider-Man', 'Spectacular Spider-Man'],
    ['À quelle décennie le « Great Meme Reset » de 2026 voulait-il revenir ?', 'Les années 2010', 'Les années 1980', 'Les années 1990', 'Les années 2000'],
  ],
  games: [
    ['Dans Minecraft, quel objet aide à localiser une forteresse de l’End ?', 'Un œil de l’Ender', 'Une perle de l’Ender', 'Une boussole de récupération', 'Une étoile du Nether'],
    ['Quel studio a développé Clair Obscur: Expedition 33 ?', 'Sandfall Interactive', 'Asobo Studio', 'Dontnod Entertainment', 'Supergiant Games'],
    ['Quel héros incarnes-tu le plus souvent dans The Legend of Zelda ?', 'Link', 'Zelda', 'Ganondorf', 'Tingle'],
    ['Dans Among Us, quels joueurs peuvent saboter le vaisseau ?', 'Les imposteurs', 'Les ingénieurs', 'Les anges gardiens', 'Tous les joueurs'],
    ['Dans quel jeu affronte-t-on Ondine, championne d’arène à Azuria ?', 'Pokémon Rouge et Bleu', 'Animal Crossing', 'Stardew Valley', 'Final Fantasy VII'],
    ['Dans quelle ville fictive se déroule l’essentiel de Cyberpunk 2077 ?', 'Night City', 'Raccoon City', 'Los Santos', 'Midgar'],
    ['Quel est le nom du véhicule qui largue les joueurs dans Fortnite Battle Royale ?', 'Le Bus de combat', 'Le Bus fantôme', 'Le Transporteur', 'Le Planeur royal'],
    ['Quel jeu met en scène le robot Astro, récompensé aux Game Awards 2024 ?', 'Astro Bot', 'Astro’s Playroom', 'Ratchet & Clank: Rift Apart', 'Sackboy: A Big Adventure'],
  ],
  cinema: [
    ['Dans Squid Game, quelle forme Gi-hun doit-il découper dans son biscuit dalgona ?', 'Un parapluie', 'Une étoile', 'Un cercle', 'Un triangle'],
    ['Quel acteur joue Paul Atréides dans les films Dune de Denis Villeneuve ?', 'Timothée Chalamet', 'Tom Holland', 'Robert Pattinson', 'Paul Mescal'],
    ['Quel film a remporté l’Oscar du meilleur film en 2025 ?', 'Anora', 'Dune : Deuxième partie', 'Wicked', 'Conclave'],
    ['Dans quelle ville fictive se déroule Stranger Things ?', 'Hawkins', 'Riverdale', 'Stars Hollow', 'Hill Valley'],
    ['Quel studio a produit Le Voyage de Chihiro ?', 'Studio Ghibli', 'Pixar', 'DreamWorks', 'Toei Animation'],
    ['Quel prénom porte le protagoniste de la série Lupin avec Omar Sy ?', 'Assane', 'Arsène', 'Idriss', 'Malik'],
    ['Dans Kaamelott, quel chevalier est associé au « c’est pas faux » ?', 'Perceval', 'Karadoc', 'Lancelot', 'Gauvain'],
    ['Quel accessoire de Retour vers le futur II est exposé sur cette photo ?', 'Un hoverboard', 'Un skateboard électrique', 'Un tapis volant', 'Un snowboard'],
  ],
}

const builtInQuestions = Object.entries(bank).flatMap(([category, entries]) => [
  ...entries.map(([prompt, ...choices], index) => {
    const id = `${category}-${index + 1}`
    return { id, category, prompt, choices, answer: 0, media: existingMedia[id] }
  }),
  ...webQuestions[category].map(([prompt, choices, source, media], index) => ({
    id: `${category}-web-${index + 1}`, category, prompt, choices, answer: 0, source, media,
  })),
])

function questionsFromPacks(packs) {
  return packs.flatMap(({ category, subject, rows, series = 'pack' }) =>
    rows.map(([prompt, correct, second, third, fourth, source, media], index) => ({
      id: [category, subject, series, index + 1].filter(Boolean).join('-'),
      category, prompt, choices: [correct, second, third, fourth], answer: 0, source, media,
    })),
  )
}

const packQuestions = questionsFromPacks([
  ...Object.entries(questionPacks).map(([category, rows]) => ({ category, rows })),
  ...subjectPacks,
  ...Object.entries(expansionPacks).map(([category, rows]) => ({ category, rows, series: 'extension' })),
])
const extraQuestions = questionsFromPacks(
  Object.entries(supplementPacks).map(([category, rows]) => ({ category, rows, series: 'supplement' })),
)

export const imageCatalog = { ...mediaLibrary, ...expansionImages, ...customMediaLibrary }

const seriesQuestionIds = new Set([
  'cinema-1', 'cinema-4', 'cinema-6', 'cinema-7',
  'cinema-web-4', 'cinema-web-7', 'cinema-web-8',
  'cinema-pack-8', 'cinema-pack-9', 'cinema-pack-10',
  ...Array.from({ length: 20 }, (_, index) => `cinema-extension-${41 + index}`),
  ...[11, 12, 13, 14, 19].map((index) => `cinema-supplement-${index}`),
  ...Array.from({ length: 20 }, (_, index) => `cinema-supplement-${61 + index}`),
])

function resolveMedia(value) {
  if (value?.type === 'video' && value.preview) return { ...value, preview: resolveMedia(value.preview) }
  const ref = typeof value === 'string' ? value : value?.ref
  if (!ref) return value
  if (!Object.hasOwn(imageCatalog, ref)) return undefined
  const entry = imageCatalog[ref]
  if (!entry.items?.length || value.gallery) return entry
  const image = entry.items[value.frame ?? 0]
  return image && { ...image, type: 'image', stage: entry.stage }
}

export const questions = [...builtInQuestions, ...packQuestions, ...mediaQuestions, ...customQuestions, ...extraQuestions, ...trueFalseQuestions].map((question) => {
  const media = customMedia[question.id] ?? question.media
  const isSeries = question.screen === 'series' || seriesQuestionIds.has(question.id) || question.id.startsWith('cinema-stranger-things-pack-')
  return {
    ...question,
    screen: question.category === 'cinema' ? (isSeries ? 'series' : 'films') : undefined,
    media: resolveMedia(media),
    followUp: question.followUp ?? questionVideos[question.id],
  }
})
