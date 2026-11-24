# La Bande de Quiz

Quiz multijoueur en français. Crée un salon pour jouer à 2-24, ou joue contre Pixel, Mochi et Glitch. La banque couvre huit thèmes et propose un quiz illustré.

## Jouer sans installer quoi que ce soit

1. Décompresse l’archive.
2. Ouvre `Jouer-en-solo.html` dans un navigateur récent.
3. Clique sur **Jouer en solo**, choisis ton pseudo et ton emoji, puis lance la partie. Le navigateur mémorise ton profil.

## Lancer le projet en ligne

1. Installe [Node.js](https://nodejs.org/) 22.13 ou plus récent.
2. Ouvre un terminal dans le dossier du projet et exécute les commandes suivantes.

   ```sh
   npm install
   npm run build
   npm start
   ```

3. Ouvre [http://localhost:3001](http://localhost:3001). Clique sur **Créer un salon**. Pour essayer avec deux joueurs sur la même machine, ouvre le lien du salon dans une fenêtre privée et choisis un autre pseudo.
4. Pour faire jouer d’autres appareils sur le même Wi-Fi, ouvre le site via l’adresse IP locale de l’ordinateur hôte, par exemple `http://192.168.1.42:3001`, puis partage le lien généré depuis cette page. Autorise le port 3001 sur le réseau privé si le pare-feu le demande.

### Inviter des amis à distance gratuitement

1. Garde `npm start` actif.
2. Installe [cloudflared](https://developers.cloudflare.com/tunnel/downloads/).
3. Dans un deuxième terminal, lance `cloudflared tunnel --url http://localhost:3001`.
4. Ouvre l’URL HTTPS en `trycloudflare.com` affichée par le tunnel. Crée le salon depuis cette page et copie le lien d’invitation. Le lien fonctionne pendant que le serveur et le tunnel tournent. [Documentation Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)

### Héberger le jeu sur Render Free

1. Publie les fichiers du projet dans un dépôt GitHub. Le dossier `public/media/` contient les images du quiz.
2. Dans [Render](https://dashboard.render.com/), ouvre **New → Blueprint** et sélectionne ce dépôt. Le fichier `render.yaml` configure le site et le serveur multijoueur sur un service gratuit à Francfort.
3. Attends que le service soit prêt, puis ouvre son adresse `onrender.com`. Crée un salon depuis cette adresse et partage le lien d'invitation.

Après une période d'inactivité, le premier chargement peut prendre environ une minute. Les salons en cours sont conservés en mémoire et disparaissent au redémarrage du service.

### Enregistrer les salons dans SQLite

Par défaut, Socket.IO synchronise les salons en mémoire. Pour retrouver les salons et les scores après un redémarrage, indique un fichier SQLite sur un disque persistant. Node crée le fichier et la table au premier démarrage. Aucun compte requis.

| Terminal | Commande |
| --- | --- |
| PowerShell | `$env:QUIZ_DB = './quiz.sqlite'`, puis `npm start` |
| Bash / zsh | `QUIZ_DB=./quiz.sqlite npm start` |

Garde un seul processus Node par fichier. Les salons entièrement déconnectés expirent au bout de deux minutes dans le lobby, ou trente minutes après le début de la partie. Si un redémarrage intervient pendant une question, son échéance reste valable.

### Développer avec rechargement automatique

Exécute `npm install` si tu viens d'ouvrir le projet, puis `npm run dev` et ouvre [http://localhost:3000](http://localhost:3000). Cette commande lance le site et les salons multijoueurs. Vite actualise l'interface quand tu modifies les fichiers. Relance la commande après une modification du serveur ou des règles et questions utilisées par le multijoueur.

Si Socket.IO manque et que les autres dépendances sont déjà installées, le serveur de développement démarre en solo. Termine `npm install`, puis redémarre le serveur pour activer les salons.

## Règles

- **Lecture vocale** dans l’en-tête permet d’activer la lecture automatique et de régler la voix, la vitesse et le volume sur ton appareil. Le bouton **Lire la question** permet aussi de lancer une lecture à la demande.

- L’hôte choisit les thèmes, le nombre de questions, la durée et de zéro à trois exemplaires de chaque joker par joueur. Le nombre de questions proposé dépend des thèmes retenus pour éviter les doublons.
- Les réglages indiquent le nombre de questions par thème et le total de la sélection. Le navigateur de l’hôte mémorise les questions affichées en solo et en ligne, y compris d’un salon à l’autre et en changeant de thème. Le tirage épuise les questions inédites de la sélection, puis reprend les plus anciennes.
- Une bonne réponse rapporte 600 points et 75 points par bonne réponse consécutive après la première, dans la limite de 375 points de série. Le **bonus de rapidité** peut ajouter jusqu’à 400 points selon le temps de réponse. Il est activé par défaut et l’hôte peut le couper avant de lancer la partie. Le joker de temps prolonge le délai personnel de dix secondes. Le bonus reste calculé sur le délai de départ.
- Le sondage utilise les réponses des autres joueurs humains dès que deux d’entre eux ont voté. Les pourcentages simulés sont signalés. Le bilan de manche compte le dernier choix de chaque participant qui a répondu, bots compris.
- Après chaque question, l’hôte fait avancer la partie. S’il perd la connexion, un autre joueur connecté récupère la main. Le mode en ligne permet une reconnexion depuis le même onglet.
- En solo, le résultat s’affiche dès que ta réponse est validée ou que ton chrono expire. Les bots reçoivent leurs résultats simulés immédiatement. La manche suivante attend ton clic. Le joker Double chance te laisse tenter une seconde réponse après un premier choix incorrect.

## Questions avec images et vidéos

Le [guide des médias](public/media/README.md) indique les dossiers par sujet. Un même lot d’images peut illustrer plusieurs questions, par exemple avec `media: 'stranger-things'` dans [shared/mes-questions.js](shared/mes-questions.js).

Pour ajouter des questions en lot, ouvre le fichier du thème dans [shared/banque](shared/banque). Ajoute les lignes à la fin du fichier pour garder les identifiants existants. Chaque ligne contient la question, la bonne réponse, puis trois distracteurs. Une source et une référence de média peuvent suivre. Le jeu mélange les choix et affiche les nouveaux compteurs au prochain chargement. Le lot [Stranger Things](shared/banque/cinema/stranger-things.js) montre comment associer un photogramme précis à une question qui porte sur ce qu’on y voit.

Depuis l’accueil, clique sur **Quiz illustré** pour jouer uniquement avec des images et des vidéos. L’ordre varie à chaque partie. Tu peux aussi choisir un thème comme les mèmes ou le cinéma dans **Jouer par thème**.

Les quatre photos de Stranger Things proviennent de [Netflix Tudum](https://www.netflix.com/tudum/galleries/millie-bobby-brown-eleven-photos-stranger-things). Le lot du *Voyage dans la Lune* et les images Doge, Grumpy Cat et du hoverboard viennent de Wikimedia Commons. Keyboard Cat et Nyan Cat affichent la vignette de leur vidéo dans le jeu. Les extraits et bandes-annonces sont lus depuis Wikimedia ou YouTube.

### Importer les images originales

Avec Python 3.10 ou plus récent et une connexion à Wikimedia :

```sh
python -m pip install "scrapling[fetchers]==0.4.2"
npm run media:scrape
```

Scrapling récupère les images du catalogue. Il lit le lien de l’original sur Wikimedia et charge les photos Netflix et les vignettes YouTube depuis leurs URL. Il crée les sous-dossiers dans `public/media/` et conserve les fichiers déjà présents. La commande `npm run media:download` propose le même import par URL directe avec Node. Le serveur de développement voit les fichiers immédiatement. Relance `npm run build` pour les inclure dans le site de production.

## Organisation du code

| Emplacement | Contenu |
| --- | --- |
| `src/` | Écrans React et styles Tailwind CSS |
| `shared/game.js` | Règles utilisées par le serveur et la simulation |
| `shared/questions.js` | Assemble les questions et les images par sujet |
| `shared/banque/` | Lots de questions, un fichier par thème ou sujet |
| `shared/web-questions.js` | Questions ajoutées, sources et crédits des médias |
| `shared/mes-questions.js` | Tes questions et images personnalisées |
| `server/index.js` | Salons, sessions et diffusion des états personnalisés par Socket.IO |
| `server/storage.js` | Sauvegarde SQLite facultative |

Le serveur valide les actions, fixe les délais et calcule les scores. Il transmet à chaque joueur ses propres jokers et ses réponses. La bonne réponse est incluse dans l’état partagé à partir du bilan de la question. L’aperçu solo exécute le même moteur dans le navigateur.

Sources de quelques questions récentes : [TwitchCon Europe 2026](https://blog.twitch.tv/en/2026/05/30/everything-we-announced-at-twitchcon-rotterdam-2026/), [YouTube FIFA Creator Cup](https://blog.youtube/news-and-events/youtube-fifa-world-cup-lineup/), [Great Meme Reset](https://knowyourmeme.com/memes/the-great-meme-reset-of-2026), [GP Explorer 3](https://www.lemans.org/fr/actualites/aco/comment-suivre-gp-explorer-the-last-race-60002), [20 ans de YouTube](https://blog.youtube/culture-and-trends/youtube-20-birthday-quiz-trivia/), [Italian brainrot](https://knowyourmeme.com/memes/italian-brainrot-ai-italian-animals), [100 hommes contre un gorille](https://knowyourmeme.com/memes/100-men-vs-1-gorilla).
