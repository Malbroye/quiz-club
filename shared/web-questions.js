const commons = 'https://commons.wikimedia.org/wiki/File:'
const moonCredit = { credit: 'Georges Méliès · Domaine public', license: 'https://creativecommons.org/publicdomain/mark/1.0/' }
const moonStill = (number, path) => {
  const name = 'M%C3%A9li%C3%A8s,_viaggio_nella_luna_(1902)_' + number + '.jpg'
  return {
    ...moonCredit, file: 'cinema/voyage-dans-la-lune/voyage-lune-' + number + '.jpg',
    source: commons + name, url: 'https://upload.wikimedia.org/wikipedia/commons/' + path + '/' + name,
    alt: 'Photogramme du Voyage dans la Lune (' + number + ').',
  }
}
const moonStills = [moonStill('01', 'f/f8'), moonStill('02', '9/92'), moonStill('05', '5/51')]

export const mediaImages = {
  doge: {
    type: 'image', stage: 'question',
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/be/Doge_meme_example.jpg/330px-Doge_meme_example.jpg',
    file: 'memes/doge/doge.jpg', alt: 'Un chien dans la neige entouré de mots colorés.',
    credit: 'likeaduck · CC BY 2.0',
    source: commons + 'Doge_meme_example.jpg', license: 'https://creativecommons.org/licenses/by/2.0/',
  },
  grumpy: {
    type: 'image', stage: 'question',
    url: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Grumpy_Cat_meme_example.jpg',
    file: 'memes/grumpy-cat/grumpy-cat.jpg', alt: 'Un chat blanc et brun à la mine renfrognée.',
    credit: 'Gage Skidmore · CC BY-SA 4.0',
    source: commons + 'Grumpy_Cat_meme_example.jpg', license: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  hover: {
    type: 'image', stage: 'question',
    url: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Prop_Department_-_Back_To_The_Future_Hoverboard_%282561987496%29.jpg',
    file: 'cinema/retour-vers-le-futur-2/hoverboard.jpg', alt: 'Le dessous d’une planche volante de Retour vers le futur II, avec trois tubes à l’arrière.',
    credit: 'Rob Young · CC BY 2.0',
    source: commons + 'Prop_Department_-_Back_To_The_Future_Hoverboard_(2561987496).jpg', license: 'https://creativecommons.org/licenses/by/2.0/',
  },
  moon: {
    type: 'image', stage: 'question',
    url: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Trip-to-moon-1902.jpg',
    file: 'cinema/voyage-dans-la-lune/voyage-lune.jpg', alt: 'Image historique de la Lune avec un visage et une capsule dans un œil.',
    ...moonCredit, source: commons + 'Trip-to-moon-1902.jpg',
  },
}

const moonGallery = { type: 'image', stage: 'question', items: [mediaImages.moon, ...moonStills] }
const netflixGallery = 'https://www.netflix.com/tudum/galleries/millie-bobby-brown-eleven-photos-stranger-things'
const strangerGallery = {
  type: 'image', stage: 'question',
  items: [
    ['AAAAQX5_8RDA8z5xOcIi7PUaqWodIUb8H-vVb8EIaG8dZhRbHkAi95Bm8-Syjq09TVbPAt313oZ5d-f5wdW2nCDb8x8hJ-xnINFlVz90X123eKdHPi3JN-GI03I3__Vvqndm46lnoiohnCeIdjBvtTJg9l30ID4.jpg?r=b21', 'Eleven dans la première saison.'],
    ['AAAAQZh4DYVn0gcMb6VkzDCszgkSlN98OV6CKHN-XBvPzHu6rrXinozyknJvxJgcCPeVfS9E1oOgD4PCOj957MP47G1yHG1AF3o8aKNN-4zX8k7uFqaT8FGwIm9Yef-mvS1QqMdxZDblbtKXXk82_apgYLRMako.jpg?r=ba8', 'Mike et Eleven.'],
    ['AAAAQZlmYsmO9B8Pu0FdUSeye8TovGh4nO77xp2AbfBpQWmgbC8JFi9Aw84wgguUA-MmIEzT3mwlf4msijfCEgsxkEQy5cOi47ZeC7s_rQu3b_m4DWnoHq3MV-4N7RvnEtCmAbmq8KTYbpe05ZxhSNnQRepNmqo.jpg?r=ff4', 'Eleven et Lucas.'],
    ['AAAAQQIu3R4ZWKxo-sho18E1nAFBzDrIvmSgutqxeAWER_YaRAM72Op3wVLSvqt-gH7ZyN11U6S6gOpTooO8oLmsLgEW5F1-neLjdBsgH2eLcPFjferu9zkoDLkjwR-xRBXdCQIjaBxdBPoVcE0z5MwFFvVkepw.jpg?r=523', 'Joyce, Eleven et Hopper.'],
  ].map(([path, alt], index) => ({
    file: 'cinema/stranger-things/stranger-things-0' + (index + 1) + '.jpg',
    url: 'https://dnm.nflximg.net/api/v6/a01MIaQTUgSJoLaS_OCn68Eg3hU/' + path,
    alt, credit: 'Netflix Tudum', source: netflixGallery,
  })),
}

function youtubeImage(id, file, alt, credit) {
  return { type: 'image', stage: 'question', file, alt, credit,
    url: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg',
    source: 'https://www.youtube.com/watch?v=' + id,
  }
}

export const mediaLibrary = {
  doge: mediaImages.doge,
  'grumpy-cat': mediaImages.grumpy,
  'stranger-things': strangerGallery,
  'retour-vers-le-futur-2': mediaImages.hover,
  'voyage-dans-la-lune': moonGallery,
  'keyboard-cat': youtubeImage('J---aiyznGQ', 'memes/keyboard-cat/keyboard-cat.jpg', 'Un chat devant un instrument.', 'Charlie Schmidt'),
  'nyan-cat': youtubeImage('2yJgwwDcgV8', 'memes/nyan-cat/nyan-cat.jpg', 'Un chat en pixel art dans l’espace.', 'NyanCat'),
}

const generalSource = commons + 'The_General_(1926)_-_short_video_selection.ogv'
const generalClip = {
  type: 'video', stage: 'question', caption: 'Extrait du Mécano de la « General »',
  source: generalSource,
  url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/b/b7/The_General_%281926%29_-_short_video_selection.ogv/The_General_%281926%29_-_short_video_selection.ogv.240p.vp9.webm#t=0,12',
  poster: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/The_General_%281926%29_-_short_video_selection.ogv/330px--The_General_%281926%29_-_short_video_selection.ogv.jpg',
  credit: 'United Artists · Wikimedia Commons',
}

function video(id, caption, segment, preview) {
  return { type: 'video', stage: segment ? 'question' : 'reveal', id, caption, segment, preview, source: 'https://www.youtube.com/watch?v=' + id }
}

export const existingMedia = {
  'memes-5': video('dQw4w9WgXcQ', 'Le clip officiel de Rick Astley'),
  'youtube-1': video('jNQXAC9IVRw', 'Me at the zoo, la première vidéo YouTube'),
  'cinema-8': 'retour-vers-le-futur-2',
}

const nasaMoon = 'https://www.nasa.gov/learning-resources/for-kids-and-students/what-was-the-apollo-program-grades-k-4/'
const louvre = 'https://www.louvre.fr/decouvrir/les-parcours-de-visite/chefs-d-oeuvre-du-louvre/une-star-face-a-132-personnages'
const memePets = 'https://knowyourmeme.com/editorials/collections/the-real-pets-behind-the-10-most-iconic-memes'

// Questions rédigées en français à partir des faits vérifiés dans les sources indiquées.
// Chaque tuple contient la question, quatre choix (le premier est exact), puis sa source.
export const webQuestions = {
  culture: [
    ['Quel est le plus grand océan de la planète ?', ['Le Pacifique', 'L’Atlantique', 'L’Indien', 'L’Arctique'], 'https://oceanservice.noaa.gov/facts/biggestocean.html'],
    ['Quelle planète surnomme-t-on « la planète rouge » ?', ['Mars', 'Vénus', 'Mercure', 'Neptune'], 'https://science.nasa.gov/mars/facts/'],
    ['Qui a peint La Joconde ?', ['Léonard de Vinci', 'Michel-Ange', 'Raphaël', 'Le Caravage'], louvre],
    ['En quelle année a eu lieu la prise de la Bastille ?', ['1789', '1776', '1799', '1815'], 'https://www.elysee.fr/la-presidence/la-fete-nationale-du-14-juillet'],
    ['Qui a été le premier à marcher sur la Lune ?', ['Neil Armstrong', 'Buzz Aldrin', 'Youri Gagarine', 'Michael Collins'], nasaMoon],
    ['À quelle température l’eau pure gèle-t-elle sous pression atmosphérique normale ?', ['0 °C', '−10 °C', '5 °C', '10 °C'], 'https://forecast.weather.gov/glossary.php?word=kelvin+temperature+scale'],
    ['Quelle est la capitale de l’Australie ?', ['Canberra', 'Sydney', 'Melbourne', 'Perth'], 'https://www.australia.com/en-us/places/canberra-and-surrounds/guide-to-canberra.html'],
    ['Quelle est la capitale du Canada ?', ['Ottawa', 'Toronto', 'Montréal', 'Vancouver'], 'https://www.canada.ca/en/immigration-refugees-citizenship/services/settle-canada/land-climate.html'],
    ['Quel volcan a enseveli Pompéi en 79 ?', ['Le Vésuve', 'L’Etna', 'Le Stromboli', 'Le mont Saint Helens'], 'https://whc.unesco.org/en/list/829/'],
    ['Qui a écrit Roméo et Juliette ?', ['William Shakespeare', 'Victor Hugo', 'Molière', 'Charles Dickens'], 'https://www.rsc.org.uk/romeo-and-juliet/about-the-play'],
    ['Quel métal est représenté par le symbole Fe ?', ['Le fer', 'Le fluor', 'Le cuivre', 'Le plomb'], 'https://periodic-table.rsc.org/element/26/iron'],
    ['Pour quelle Exposition universelle la tour Eiffel a-t-elle été construite ?', ['Celle de 1889', 'Celle de 1855', 'Celle de 1900', 'Celle de 1937'], 'https://www.toureiffel.paris/fr/le-monument/histoire'],
  ],
  animals: [
    ['Que mange principalement le panda géant ?', ['Du bambou', 'De l’eucalyptus', 'Des glands', 'Des figues'], 'https://www.worldwildlife.org/species/giant-panda/'],
    ['Quel est le plus grand animal vivant ?', ['La baleine bleue', 'Le requin-baleine', 'L’éléphant de savane', 'Le cachalot'], 'https://www.fisheries.noaa.gov/species/blue-whale'],
  ],
  sports: [
    ['Combien d’anneaux compte le symbole olympique ?', ['Cinq', 'Quatre', 'Six', 'Sept'], 'https://www.olympics.com/ioc/olympic-rings'],
    ['Sur quelle surface se joue Roland-Garros ?', ['Terre battue', 'Gazon', 'Dur', 'Moquette'], 'https://www.rolandgarros.com/fr-fr/'],
  ],
  twitch: [
    ['Quelle monnaie virtuelle utilise-t-on pour envoyer un Cheer sur Twitch ?', ['Les Bits', 'Les Robux', 'Les V-Bucks', 'Les crédits Steam'], 'https://help.twitch.tv/s/article/guide-to-cheering-with-bits?language=fr'],
    ['Comment s’appellent les récompenses en jeu que Twitch donne parfois aux spectateurs ?', ['Les Drops', 'Les Clips', 'Les Raids', 'Les VOD'], 'https://help.twitch.tv/s/article/mission-based-drops?language=fr'],
  ],
  youtube: [
    ['Quel cofondateur de YouTube apparaît au zoo dans la première vidéo de la plateforme ?', ['Jawed Karim', 'Steve Chen', 'Chad Hurley', 'Susan Wojcicki'], 'https://blog.youtube/news-and-events/va-museum-youtube-first-video/'],
    ['Combien de temps dure « Me at the zoo », la première vidéo de YouTube ?', ['19 secondes', '5 secondes', '43 secondes', '1 minute 30'], 'https://blog.youtube/news-and-events/va-museum-youtube-first-video/'],
  ],
  memes: [
    ['Quelle race de chien a inspiré le mème Doge ?', ['Shiba inu', 'Akita inu', 'Welsh corgi', 'Beagle'], memePets, 'doge'],
    ['Quel surnom a rendu célèbre la chatte Tardar Sauce ?', ['Grumpy Cat', 'Keyboard Cat', 'Nyan Cat', 'Longcat'], memePets, 'grumpy-cat'],
    ['De quel instrument le chat semble-t-il jouer dans le mème « Keyboard Cat » ?', ['Un clavier', 'Une guitare', 'Une batterie', 'Un violon'], memePets, video('J---aiyznGQ', 'Vidéo originale de Keyboard Cat', [0, 11], 'keyboard-cat')],
    ['Quelle traînée le chat de « Nyan Cat » laisse-t-il derrière lui ?', ['Un arc-en-ciel', 'Des confettis', 'Des éclairs', 'De la fumée'], 'https://www.youtube.com/watch?v=2yJgwwDcgV8', video('2yJgwwDcgV8', 'Vidéo de Nyan Cat', [0, 10], 'nyan-cat')],
  ],
  games: [
    ['Comment s’appelle le frère de Mario, généralement vêtu de vert ?', ['Luigi', 'Wario', 'Toad', 'Yoshi'], 'https://mario.nintendo.com/characters/'],
    ['De quel type est Pikachu ?', ['Électrik', 'Feu', 'Normal', 'Combat'], 'https://www.pokemon.com/fr/pokedex/pikachu'],
  ],
  cinema: [
    ['Quel film a remporté l’Oscar du meilleur film en 1998 ?', ['Titanic', 'Will Hunting', 'L.A. Confidential', 'Pour le pire et pour le meilleur'], 'https://www.oscars.org/oscars/ceremonies/1998'],
    ['Comment s’appelle le jeune lion du Roi Lion ?', ['Simba', 'Mufasa', 'Scar', 'Timon'], 'https://movies.disney.com/the-lion-king'],
    ['Qui a réalisé Le Voyage dans la Lune en 1902 ?', ['Georges Méliès', 'Charlie Chaplin', 'Buster Keaton', 'Alice Guy'], mediaImages.moon.source, { ref: 'voyage-dans-la-lune', frame: 1 }],
    ['Dans quelle décennie commence l’histoire de Stranger Things ?', ['Les années 1980', 'Les années 1970', 'Les années 1990', 'Les années 2000'], 'https://www.netflix.com/tudum/articles/stranger-things-season-1-recap', video('b9EkMc79ZSU', 'Bande-annonce officielle de Stranger Things', [8, 21], 'stranger-things')],
    ['Quelle est la mission initiale du robot WALL·E sur Terre ?', ['Ramasser les déchets', 'Planter des arbres', 'Chercher des survivants', 'Réparer des satellites'], 'https://movies.disney.com/wall-e', video('81nYibxXWCo', 'Bande-annonce officielle de WALL·E', [16, 30])],
    ['Qui tient le rôle principal dans le film muet Le Mécano de la « General » ?', ['Buster Keaton', 'Charlie Chaplin', 'Harold Lloyd', 'Douglas Fairbanks'], generalSource, generalClip],
    ['Dans quel État américain se trouve la ville fictive de Hawkins ?', ['L’Indiana', 'L’Ohio', 'L’Illinois', 'Le Michigan'], 'https://www.netflix.com/tudum/videos/season-1-recap-stranger-things'],
    ['Quel duo a créé la série Stranger Things ?', ['Les frères Duffer', 'Les frères Russo', 'Les frères Coen', 'Les sœurs Wachowski'], 'https://about.netflix.com/en/news/netflix-opens-the-rift-to-a-treasure-trove-of-all-new-stranger-things-must-haves'],
  ],
}
