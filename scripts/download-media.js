import { mkdir, lstat, link, mkdtemp, unlink, rmdir, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { imageCatalog, questions } from '../shared/questions.js'

const directory = fileURLToPath(new URL('../public/media/', import.meta.url))
const entries = [...Object.values(imageCatalog), ...questions.map(({ media }) => media?.preview ?? media)]
const images = entries.flatMap((media) => media?.type === 'image' ? media.items ?? [media] : [])
const media = [...new Map(images.filter(({ file, url }) => file && url).map((image) => [image.file, image])).values()]
if (process.argv.includes('--scrapling')) {
  const script = fileURLToPath(new URL('./scrape-media.py', import.meta.url))
  const result = spawnSync(process.env.QUIZ_PYTHON || 'python', [script], {
    input: JSON.stringify(media.map(({ file, url, source }) => ({ file, url, source }))),
    stdio: ['pipe', 'inherit', 'inherit'],
  })
  if (result.error) console.error('Impossible de démarrer Python : ' + result.error.message)
  process.exit(result.status ?? 1)
}
await mkdir(directory, { recursive: true })

for (const { file, url } of media) {
  try {
    if (!/^(?:[\w-]+\/)*[\w.-]+\.(?:jpg|png)$/i.test(file)) throw new Error('Nom de fichier inattendu.')
    const destination = join(directory, file)
    const present = await lstat(destination).then(() => true, (error) => {
      if (error.code !== 'ENOENT') throw error
      return false
    })
    if (present) {
      console.log('Conservé : ' + file)
      continue
    }
    const isPng = file.toLowerCase().endsWith('.png')
    const response = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      headers: { 'User-Agent': 'QuizClub/1.2 (educational trivia; image assets)', Accept: isPng ? 'image/png' : 'image/jpeg' },
    })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    const bytes = Buffer.from(await response.arrayBuffer())
    const signature = isPng ? Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) : Buffer.from([255, 216, 255])
    if (!bytes.subarray(0, signature.length).equals(signature)) {
      throw new Error('Le format du fichier reçu ne correspond pas à son extension.')
    }
    await mkdir(dirname(destination), { recursive: true })
    const staging = await mkdtemp(join(dirname(destination), '.import-'))
    const temporary = join(staging, basename(file))
    try {
      await writeFile(temporary, bytes)
      await link(temporary, destination)
      console.log('Téléchargé : ' + file)
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      console.log('Conservé : ' + file)
    } finally {
      await unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error })
      await rmdir(staging)
    }
  } catch (error) {
    console.error(file + ' : ' + error.message)
    process.exitCode = 1
  }
}
