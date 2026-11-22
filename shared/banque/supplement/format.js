export function extraRows(...groups) {
  return groups.flatMap((group) => {
    const rows = group.trim().split('\n').map((line) => line.split('|').map((field) => field.trim()))
    const answers = [...new Set(rows.map(([, answer]) => answer))]
    if (answers.length < 4) throw new Error('Un groupe de quiz doit proposer au moins quatre réponses distinctes.')
    return rows.map(([prompt, answer, media, source], index) => {
      const alternatives = answers.filter((candidate) => candidate !== answer)
      const offset = (index * 7) % alternatives.length
      const distractors = [0, 1, 2].map((step) => alternatives[(offset + step) % alternatives.length])
      return [prompt, answer, ...distractors, source || undefined, media || undefined]
    })
  })
}
