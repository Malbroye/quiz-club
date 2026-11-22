import { readFileSync, writeFileSync } from 'node:fs'

const dist = new URL('../dist/', import.meta.url)
const read = (filename) => readFileSync(new URL(filename.replace(/^\//, ''), dist), 'utf8')
const html = read('index.html')
  .replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_tag, file) => `<style>${read(file)}</style>`)
  .replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (_tag, file) => `<script type="module">${read(file).replace(/<\/script/gi, '<\\/script')}</script>`)

writeFileSync(new URL('Jouer-en-solo.html', dist), html)
