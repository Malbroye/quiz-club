# Mettre tes images dans Quiz Club

Les images sont classées dans `public/media/cinema/<sujet>/` ou `public/media/memes/<sujet>/`. Dépose ta photo dans le dossier du sujet, remplace le nom indiqué si nécessaire, puis recharge [localhost:3000](http://localhost:3000/).

Tu peux remplir ce dossier avec les images web manquantes en lançant `npm run media:scrape` depuis le dossier du projet. Le [README du projet](../../README.md#importer-les-images-originales) explique comment installer Scrapling. L’import garde tous les fichiers que tu as personnalisés.

## Images déjà reliées à une question

| Sujet | Dossier, depuis `public/media/` | Fichiers |
| --- | --- | --- |
| Stranger Things | `cinema/stranger-things/` | `stranger-things-01.jpg` à `stranger-things-04.jpg` |
| Retour vers le futur II | `cinema/retour-vers-le-futur-2/` | `hoverboard.jpg` |
| Le Voyage dans la Lune | `cinema/voyage-dans-la-lune/` | `voyage-lune.jpg`, `voyage-lune-01.jpg`, `voyage-lune-02.jpg`, `voyage-lune-05.jpg` |
| Doge | `memes/doge/` | `doge.jpg` |
| Grumpy Cat | `memes/grumpy-cat/` | `grumpy-cat.jpg` |
| Keyboard Cat | `memes/keyboard-cat/` | `keyboard-cat.jpg` |
| Nyan Cat | `memes/nyan-cat/` | `nyan-cat.jpg` |

Tu peux remplacer un seul fichier d’un lot. Pour vérifier un fichier directement, ouvre par exemple [l’image locale de Doge](http://localhost:3000/media/memes/doge/doge.jpg).

## Réutiliser les images d’un sujet

Dans une nouvelle question de `shared/mes-questions.js`, ajoute simplement `media: 'stranger-things'`. Le quiz choisit une photo dans le lot existant. Pour afficher le lot complet sur une question, écris `media: { ref: 'stranger-things', gallery: true }`.

Les sujets disponibles sont `stranger-things`, `doge`, `grumpy-cat`, `keyboard-cat`, `nyan-cat`, `retour-vers-le-futur-2` et `voyage-dans-la-lune`. Pour créer ton sujet, ajoute ses images une seule fois dans `customMediaLibrary`. Dans `file`, indique le chemin sous `public/media/`, par exemple `cinema/inception/affiche.jpg`.

Pour écrire plusieurs questions d’un coup, utilise le fichier du thème dans [shared/banque](../../shared/banque). Le fichier [Stranger Things](../../shared/banque/cinema/stranger-things.js) montre comment ajouter une ligne par question et partager les images.

## Illustrer une autre question

Ouvre [shared/mes-questions.js](../../shared/mes-questions.js) et ajoute un bloc dans `customMedia`. Le modèle `cinema-1` est déjà dans le fichier. Retire les `//` de ses lignes et dépose le fichier correspondant.

| Identifiant | Question | Exemple d’image | Nom à mettre dans `file` |
| --- | --- | --- | --- |
| `cinema-1` | Quelle forme Gi-hun doit-il découper dans *Squid Game* ? | Une photo de l’épreuve avec le biscuit encore caché si tu veux garder la difficulté | `cinema/squid-game/squid-game-dalgona.jpg` |
| `cinema-2` | Quel acteur joue Paul Atréides dans *Dune* ? | Un photogramme de Paul dans le désert | `cinema/dune/dune-paul.jpg` |
| `cinema-6` | Quel prénom porte le protagoniste de *Lupin* avec Omar Sy ? | Une image d’Omar Sy dans la série | `cinema/lupin/lupin-portrait.jpg` |
| `games-3` | Quel héros incarnes-tu le plus souvent dans *The Legend of Zelda* ? | Une capture montrant le personnage jouable | `games/zelda/zelda-heros.png` |

Pour trouver les identifiants des autres questions, lance cette commande depuis le dossier du projet.

```sh
node --input-type=module -e "import { questions } from './shared/questions.js'; for (const q of questions) console.log(q.id + ' | ' + q.prompt)"
```

## Ajouter une nouvelle question avec une image

1. Dépose par exemple ton affiche dans `public/media/cinema/inception/inception-affiche.jpg`.
2. Dans `shared/mes-questions.js`, décommente le modèle dans `customQuestions` ou copie le bloc ci-dessous à l’intérieur de ce tableau.
3. Donne un identifiant unique à chaque question. Mets quatre réponses dans `choices`. `answer: 0` désigne la première réponse, `1` la deuxième, `2` la troisième et `3` la quatrième. Le quiz mélange ensuite les choix.

```js
{
  id: 'perso-cinema-inception',
  category: 'cinema',
  prompt: 'Quel réalisateur a signé ce film ?',
  choices: ['Christopher Nolan', 'Denis Villeneuve', 'Steven Spielberg', 'James Cameron'],
  answer: 0,
  media: {
    type: 'image',
    stage: 'question',
    file: 'cinema/inception/inception-affiche.jpg',
    alt: 'Affiche du film Inception.',
  },
},
```

Les thèmes disponibles sont `culture`, `animals`, `sports`, `twitch`, `youtube`, `memes`, `games` et `cinema`. Quand tu ajoutes une question, recharge l’aperçu et lance une nouvelle partie dans son thème. Les questions sont tirées au sort.

### Variante avec quatre images

Remplace le bloc `media` du modèle par celui-ci et dépose les quatre fichiers.

```js
media: {
  type: 'image',
  stage: 'question',
  items: [
    { file: 'cinema/inception/inception-01.jpg', alt: 'Une affiche du film.' },
    { file: 'cinema/inception/inception-02.jpg', alt: 'Une ville qui se replie sur elle-même.' },
    { file: 'cinema/inception/inception-03.jpg', alt: 'Un couloir d’hôtel.' },
    { file: 'cinema/inception/inception-04.jpg', alt: 'Une toupie sur une table.' },
  ],
},
```

Utilise `stage: 'reveal'` si tu veux montrer l’image uniquement avec le résultat, par exemple quand l’affiche donne la réponse. Tu peux ajouter `credit` et `source` à chaque image pour indiquer son auteur et sa page d’origine.

Pour tes nouvelles images, `.jpg`, `.png` et `.webp` conviennent. Le nom dans `file` doit correspondre au fichier, extension comprise. Pour les images du premier tableau, garde le format JPEG indiqué.

## Réutiliser un extrait ou un son

Les questions avec des extraits et des sons sont dans [shared/banque/media-questions.js](../../shared/banque/media-questions.js). Dans `media`, une vidéo ou un son sert d’indice. Dans `followUp`, la vidéo apparaît après la réponse.

Pour un fichier local, indique par exemple `type: 'video'` et `file: 'cinema/mon-film/extrait.mp4'`, ou `type: 'audio'` et `file: 'culture/mon-sujet/indice.wav'`. Garde les fichiers sous `public/media/`, dans le dossier du sujet. Une vidéo en ligne peut utiliser `url` pour un fichier lisible directement ou `id` pour le lecteur YouTube. Donne aussi un `caption` et, pour une vidéo externe, son `source`. Le champ `description` permet d’ajouter un indice écrit au lecteur audio.

Pour les sujets avec une bande-annonce ou un clip, `illustration.svg` sert d’indice local quand la vignette `indice.jpg` est absente. La commande d’import continue de chercher les vignettes dans leur dossier d’origine.
