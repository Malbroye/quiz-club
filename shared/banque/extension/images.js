const commonsPhotos = [
  ["culture","tour-eiffel","Eiffel_Tower_from_Champ_de_Mars_002.jpg","27","Tour métallique vue depuis le Champ-de-Mars.","Dr Murali Mohan Gurram","by-sa/3.0"],
  ["culture","monalisa","Mona_Lisa.jpg","6a","Portrait d’une femme assise devant un paysage.","Léonard de Vinci","publicdomain/mark/1.0"],
  ["culture","colisee","Colosseum_in_Rome,_Italy_-_April_2007.jpg","53","Amphithéâtre ovale à plusieurs niveaux d’arcades.","Diliff","by-sa/2.5"],
  ["animals","guepard","Cheetah_Kruger.jpg","11","Félin élancé à pelage tacheté.","Mukul2u","by/3.0"],
  ["animals","elephant","African_bush_elephant_(Loxodonta_africana)_with_calf_Serengeti.jpg","25","Deux grands mammifères dans la savane.","Charles J. Sharp","by-sa/4.0"],
  ["animals","panda-roux","Red_Panda_(24986761703).jpg","e6","Petit mammifère arboricole au pelage roux.","Mathias Appel","publicdomain/zero/1.0"],
  ["sports","lebron","LeBron_James_dunks.jpg","ac","Joueur effectuant un dunk.","Tim Shelby","by/2.0"],
  ["sports","usain-bolt","Usain_Bolt_2012_Olympics_1_cropped.jpg","ca","Sprinteur en tenue olympique.","Nick Webb","by/2.0"],
  ["sports","nadal","Nadal_2017.jpg","81","Joueur de tennis en compétition.","Photographe Flickr 43555660@N00","by-sa/2.0"],
  ["twitch","ninja","Ninja2019screenshot.jpg","76","Créateur de contenu lors d’un événement.","Tyreek Hill","by/3.0"],
  ["twitch","ludwig","Ludwig_2021.jpg","98","Diffuseur photographié lors du ShitCamp.","Esfand","by/3.0"],
  ["twitch","pokimane","Pokimane_at_Twitchcon_Berlin_2019.png","8d","Streameuse lors d’une convention à Berlin.","SlikeR","by/3.0"],
  ["youtube","mrbeast","MrBeast_2023.jpg","54","Vidéaste photographié en 2023.","Steven Khan","by/4.0"],
  ["youtube","mark-rober","Mark_Rober_September_2024.jpg","43","Ingénieur et vidéaste photographié en 2024.","LKP2024","by/4.0"],
  ["youtube","mkbhd","MARQUES_BROWNLEE_Profile_Picture.jpg","8a","Portrait d’un vidéaste spécialisé en technologie.","Marques Brownlee","by-sa/4.0"],
  ["memes","laina-morris","Laina_Morris_by_Gage_Skidmore.jpg","b8","Une créatrice pose avec un chat lors du VidCon.","Gage Skidmore","by-sa/3.0"],
  ["memes","kabosu","Kabosu_and_Atsuko_Sato_2023-11-02_(1).jpg","cb","Un chien dans les bras de sa maîtresse.","Asanagi",null],
  ["games","nes","NES-Console-Set.jpg","82","Console grise avec manette rectangulaire.","Evan-Amos","publicdomain/mark/1.0"],
  ["games","game-boy","Game-Boy-Original.jpg","8f","Console portable grise à écran monochrome.","Evan-Amos","publicdomain/mark/1.0"],
  ["games","gamecube","GameCube-Set.jpg","d1","Console de salon violette avec manette.","Evan-Amos","publicdomain/mark/1.0"],
  ["cinema","harry-potter","Viaduc_de_Glenfinnan.jpg","4a","Train à vapeur sur un viaduc écossais.","Nono vlf","by-sa/4.0"],
  ["cinema","dark-vador","Darth_Vader_cosplay.JPG","b4","Personne costumée avec une armure noire.","Michele Miglionico","by/3.0"],
  ["cinema","charlie-chaplin","CC_The_Kid_1921.jpg","59","Affiche ancienne avec un adulte et un enfant.","Auteur inconnu · Wikimedia Commons","publicdomain/mark/1.0"],
  ["twitch","zerator","ZeratoR_et_le_mégaphone_-_ZEVENT_2026_par_Mickaël_Schauli.jpg","c9","Streameur tenant un mégaphone pendant un événement.","Mickaël Schauli","by-sa/4.0"],
  ["twitch","kameto","Kameto_ZERL.jpg","88","Streameur français en entretien.","Zack Nani","by/3.0"],
  ["twitch","gotaga","Gotaga_2026.jpg","3e","Portrait d’un joueur et streameur français.","Zack Nani","by/4.0"],
  ["youtube","squeezie","Squeezie.png","f0","Vidéaste français photographié en 2015.","SnakseDeutsche","by/4.0"],
  ["youtube","inoxtag","Inoxtag.png","13","Portrait d’un vidéaste français.","Inoxtag","by-sa/4.0"],
  ["youtube","cyprien","Minori-cyprien_Iov.jpg","7d","Vidéaste français lors d’une rencontre.","ARIELdu18","by-sa/4.0"],
  ["youtube","joueur-du-grenier","Joueur_du_Grenier.jpg","6e","Vidéaste en dédicace à Toulouse.","doodoms","by-sa/2.0"],
  ["cinema","nosferatu","Nosferatu.jpg","23","Photogramme en noir et blanc d’un vampire.","Prana-Film","publicdomain/mark/1.0"],
  ["cinema","nuit-des-morts-vivants","Duane_Jones_as_Ben_in_Night_of_the_Living_Dead_bw.jpg","71","Photogramme en noir et blanc montrant un personnage nommé Ben.","George A. Romero",null],
  ["cinema","le-mecano-de-la-general","Buster_Keaton_drives_a_two-man,_railroad_handcar_in_The_General.jpg","35","Photogramme d’un homme sur un véhicule ferroviaire.","United Artists","publicdomain/mark/1.0"],
]

const commonsImages = commonsPhotos.map(([category, key, name, hash, alt, credit, license]) => {
  const fileName = encodeURIComponent(name)
  const extension = name.slice(name.lastIndexOf('.')).toLowerCase()
  const directory = hash[0] + '/' + hash
  const licensePath = license && (license.startsWith('publicdomain/') ? license : 'licenses/' + license)
  return [key, {
    type: 'image', stage: 'question',
    file: category + '/' + key + '/indice' + extension,
    url: 'https://upload.wikimedia.org/wikipedia/commons/' + directory + '/' + fileName,
    source: 'https://commons.wikimedia.org/wiki/File:' + fileName,
    alt, credit,
    license: licensePath ? 'https://creativecommons.org/' + licensePath + '/' : undefined,
  }]
})

const videoStills = [
  ['cinema', 'matrix', 'D4eJx-0g3Do', 'Deux gélules, l’une rouge et l’autre bleue.', 'Warner Bros.'],
  ['cinema', 'jurassic-park', '_jKEqDKpJLw', 'Une empreinte de dinosaure au-dessus d’une île.', 'Amblin'],
  ['cinema', 'avatar', '5PSNL1qE6VY', 'Des îles flottantes sur un ciel nocturne.', '20th Century Fox'],
  ['cinema', 'dark-knight', '_PZpmTj1Q8Q', 'Une carte à jouer devant les silhouettes d’une ville.', 'Warner Bros. Rewind'],
  ['cinema', 'severance', '_UXKlYvLGJY', 'Deux ascenseurs au fond d’un couloir de bureaux.', 'Apple TV'],
  ['cinema', 'arcane', '4Ps6nV4wiCE', 'Illustration de deux quartiers séparés par un pont.', 'Riot Games'],
  ['cinema', 'dune', 'rPqTIibDpq4', 'Une silhouette au milieu de grandes dunes orange.', 'Warner Bros.'],
  ['memes', 'hotline-bling', 'uxpDa-c-4Mc', 'Une silhouette gesticule dans un cube éclairé en rose.', 'Drake'],
  ['memes', 'harlem-shake', '384IUU43bfQ', 'Un danseur seul puis un groupe en mouvement.', 'TheSunnyCoastSkate'],
  ['memes', 'ice-bucket-challenge', 'XS6ysDFTbLU', 'Un seau verse de l’eau et des glaçons.', 'Bill Gates'],
  ['memes', 'old-town-road', 'w2Ov5jzm3j8', 'Un chapeau de cow-boy sur un décor de western.', 'Lil Nas X'],
].map(([category, key, videoId, alt, credit]) => [key, {
  type: 'image', stage: 'question', file: category + '/' + key + '/indice.jpg',
  fallbackFile: category + '/' + key + '/illustration.svg',
  url: 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg',
  source: 'https://www.youtube.com/watch?v=' + videoId, alt: 'Vignette de la vidéo originale.', fallbackAlt: alt, credit,
}])

export const subjectVideos = Object.fromEntries(videoStills.map(([key, image]) => [key, {
  type: 'video', stage: 'reveal', id: new URL(image.source).searchParams.get('v'),
  caption: image.file.startsWith('cinema/') ? 'Voir la bande-annonce' : 'Lire la vidéo originale',
  source: image.source,
}]))

export const expansionImages = Object.fromEntries([
  ...commonsImages,
  ...videoStills,
  ['rickroll', {
    type: 'image', stage: 'question', file: 'memes/rickroll/indice.jpg',
    url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    source: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    alt: 'Image du clip publié en 1987.', credit: 'Rick Astley',
  }],
  ['coffin-dance', {
    type: 'image', stage: 'question', file: 'memes/coffin-dance/indice.jpg',
    url: 'https://i.ytimg.com/vi/EroOICwfD3g/hqdefault.jpg',
    source: 'https://www.youtube.com/watch?v=EroOICwfD3g',
    alt: 'Des porteurs costumés exécutent une chorégraphie.', credit: 'BBC Africa',
  }],
  ['gangnam-style', {
    type: 'image', stage: 'question', file: 'memes/gangnam-style/indice.jpg',
    url: 'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg',
    source: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
    alt: 'Image d’un clip de danse publié en 2012.', credit: 'PSY',
  }],
])
