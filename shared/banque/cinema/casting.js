export default [
  ['Quelle actrice joue Eleven dans Stranger Things ?', 'Millie Bobby Brown', 'Sadie Sink', 'Maya Hawke', 'Natalia Dyer'],
  ['Quelle actrice incarne Mercredi Addams dans la série Mercredi ?', 'Jenna Ortega', 'Emma Myers', 'Hunter Doohan', 'Joy Sunday'],
  ['Quel acteur joue Walter White dans Breaking Bad ?', 'Bryan Cranston', 'Aaron Paul', 'Bob Odenkirk', 'Giancarlo Esposito'],
  ['Quel acteur joue Michael Scott dans la version américaine de The Office ?', 'Steve Carell', 'John Krasinski', 'Rainn Wilson', 'Ed Helms'],
  ['Quel acteur joue Joel dans la série The Last of Us ?', 'Pedro Pascal', 'Gabriel Luna', 'Nick Offerman', 'Murray Bartlett'],
  ['Quelle actrice joue Buffy Summers dans Buffy contre les vampires ?', 'Sarah Michelle Gellar', 'Alyson Hannigan', 'Charisma Carpenter', 'Emma Caulfield'],
  ['Quelle actrice joue Rue dans Euphoria ?', 'Zendaya', 'Hunter Schafer', 'Sydney Sweeney', 'Maude Apatow'],
  ['Quelle actrice incarne Rachel Green dans Friends ?', 'Jennifer Aniston', 'Courteney Cox', 'Lisa Kudrow', 'Christina Applegate'],
  ['Quel acteur joue le coach Ted Lasso ?', 'Jason Sudeikis', 'Brett Goldstein', 'Phil Dunster', 'Nick Mohammed'],
  ['Quelle actrice joue Eleanor Shellstrop dans The Good Place ?', 'Kristen Bell', 'Jameela Jamil', 'D’Arcy Carden', 'Maya Rudolph'],
]

export const castingQuestionIds = new Set([
  'cinema-2', 'cinema-pack-2',
  ...[11, 19, 21, 23, 27, 28, 30, 62, 63, 68].map((index) => `cinema-extension-${index}`),
  ...Array.from({ length: 20 }, (_, index) => `cinema-supplement-${81 + index}`),
])
