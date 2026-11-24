function youtube(id, caption) {
  return { type: 'video', stage: 'reveal', id, caption, source: 'https://www.youtube.com/watch?v=' + id }
}

export const questionVideos = {
  'twitch-1': youtube('nt247IltHis', 'Voir la bande-annonce du GP Explorer'),
  'youtube-5': youtube('6VgKYd0JWq4', 'Voir la bande-annonce de Kaizen'),
}

const hummingbird = {
  type: 'video', stage: 'question', caption: 'Voir le colibri en vol stationnaire',
  url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/b/b1/Hummingbird_hovering_in_mid-air.ogv/Hummingbird_hovering_in_mid-air.ogv.240p.vp9.webm#t=0,8',
  source: 'https://commons.wikimedia.org/wiki/File:Hummingbird_hovering_in_mid-air.ogv',
  credit: 'Daniel Johnson', license: 'https://creativecommons.org/licenses/by/2.0/',
  preview: { type: 'image', file: 'animals/colibri/illustration.svg', alt: 'Un oiseau vole près d’une fleur, son bec fin tendu vers la corolle.' },
}

const tuxRacer = {
  type: 'video', stage: 'reveal', caption: 'Voir la partie de Tux Racer',
  url: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Tux_Racer_gameplay_%28Ingo%27s_Speedway%29.webm#t=5,14',
  source: 'https://commons.wikimedia.org/wiki/File:Tux_Racer_gameplay_(Ingo%27s_Speedway).webm',
  credit: 'Sunspire Studios', license: 'https://www.gnu.org/licenses/old-licenses/gpl-2.0.html',
}

const audio = (subject, caption, description) => ({ type: 'audio', stage: 'question', file: 'culture/' + subject + '/indice.wav', caption, description })

const rows = [
  ['culture', 'morse', 'Quel message est encodé dans cette suite de bips ?',
    ['SOS', 'OK', 'STOP', 'MAYDAY'], audio('morse', 'Signal de détresse en morse', 'Trois bips courts, trois longs, puis trois courts.')],
  ['culture', 'valse', 'À quelle danse associe-t-on ce rythme ?',
    ['La valse', 'Le rock à six temps', 'Le cha-cha-cha', 'La marche militaire'], audio('valse', 'Rythme de valse à trois temps', 'Un temps fort suivi de deux temps faibles, à intervalles réguliers.')],
  ['culture', 'colisee', 'Dans cet amphithéâtre, quels combattants s’affrontaient pour divertir le public ?',
    ['Des gladiateurs', 'Des samouraïs', 'Des mousquetaires', 'Des chevaliers teutoniques'], 'colisee'],
  ['animals', 'colibri', 'Quel détail aide cet oiseau à atteindre le nectar au fond des fleurs ?',
    ['Son long bec fin', 'Ses larges pattes palmées', 'Sa queue en éventail', 'Son plumage imperméable'], hummingbird],
  ['sports', 'bolt', 'Sur quelles deux distances individuelles ce sprinteur a-t-il remporté l’or à Londres en 2012 ?',
    ['100 m et 200 m', '200 m et 400 m', '400 m et 800 m', '800 m et 1 500 m'], 'usain-bolt'],
  ['twitch', 'gpexplorer', 'Quel circuit accueille le GP Explorer, événement de course automobile organisé par le streameur sur cette photo ?',
    ['Le circuit Bugatti', 'Le circuit Paul-Ricard', 'Le circuit de Monaco', 'Le circuit de Nevers Magny-Cours'], 'squeezie', questionVideos['twitch-1']],
  ['youtube', 'kaizen', 'Quel est le titre du documentaire dans lequel le vidéaste sur cette photo relève un défi d’alpinisme ?',
    ['Kaizen', '14 x 8000', 'Free Solo', 'The Summit'], 'inoxtag', questionVideos['youtube-5']],
  ['memes', 'seau', 'Quel geste fallait-il accomplir dans ce défi viral de 2014 ?',
    ['Se verser un seau d’eau glacée sur la tête', 'Empiler des gobelets en dix secondes', 'Danser sur place avec les yeux bandés', 'Rester immobile le plus longtemps possible'], 'ice-bucket-geste'],
  ['games', 'tux-racer', 'Dans Tux Racer, que ramasse le manchot en glissant sur les pistes enneigées ?',
    ['Des harengs', 'Des pièces d’or', 'Des carottes', 'Des anneaux'], undefined, tuxRacer],
  ['cinema', 'matrix', 'Dans Matrix, qui présente ces deux pilules à Néo ?',
    ['Morpheus', 'Trinity', 'L’agent Smith', 'Cypher'], 'matrix-pilules'],
]

export const mediaQuestions = rows.map(([category, subject, prompt, choices, media, followUp]) => ({
  id: `${category}-media-${subject}`, category, prompt, choices, answer: 0, media, followUp,
}))
