// Question | bonne réponse | trois autres choix | référence image (facultative) | source (facultative)
export function quizRows(text) {
  return text.trim().split(/\r?\n/).filter((line) => line.trim()).map((line) => {
    const [prompt, correct, second, third, fourth, media, source] = line.split('|').map((part) => part.trim())
    return [prompt, correct, second, third, fourth, source || undefined, media || undefined]
  })
}
