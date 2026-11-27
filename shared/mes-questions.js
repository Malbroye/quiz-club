// Dépose tes images dans public/media. Les modèles ci-dessous sont à décommenter.
// Le fichier public/media/README.md indique aussi les noms déjà reliés au quiz.

// Un sujet peut être réutilisé par plusieurs questions.
export const customMediaLibrary = {
  'timothee-chalamet': {
    type: 'image',
    file: 'cinema/timothee-chalamet/portrait.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Timoth%C3%A9e_Chalamet_2024_%28cropped%29.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Timoth%C3%A9e_Chalamet_2024_(cropped).jpg',
    alt: 'Timothée Chalamet',
  },
  // 'inception': {
  //   type: 'image',
  //   stage: 'question',
  //   file: 'cinema/inception/inception-affiche.jpg',
  //   alt: 'Affiche du film Inception.',
  // },
}

// Ajouter une image à une question existante en utilisant son identifiant.
export const customMedia = {
  // 'cinema-1': {
  //   type: 'image',
  //   stage: 'question',
  //   file: 'cinema/squid-game/squid-game-dalgona.jpg',
  //   alt: 'Un biscuit dalgona dans sa boîte ronde.',
  // },
}

// Ajouter une nouvelle question. answer commence à 0 : 0, 1, 2 ou 3.
export const customQuestions = [
  // Pour réutiliser des images existantes, tu peux écrire media: 'stranger-things'.
  // {
  //   id: 'perso-cinema-inception',
  //   category: 'cinema',
  //   prompt: 'Quel réalisateur a signé ce film ?',
  //   choices: ['Christopher Nolan', 'Denis Villeneuve', 'Steven Spielberg', 'James Cameron'],
  //   answer: 0,
  //   media: {
  //     type: 'image',
  //     stage: 'question',
  //     file: 'cinema/inception/inception-affiche.jpg',
  //     alt: 'Affiche du film Inception.',
  //   },
  // },
]
