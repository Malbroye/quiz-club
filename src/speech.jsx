import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Square, Volume2 } from 'lucide-react'

const defaultPreferences = { enabled: false, volume: 80, rate: 1, voice: '' }
const minRate = .75
const maxRate = 1.5

function bounded(value, min, max, fallback) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

export function speechPreferences(value) {
  return {
    enabled: value?.enabled === true,
    volume: bounded(value?.volume, 0, 100, defaultPreferences.volume),
    rate: bounded(value?.rate, minRate, maxRate, defaultPreferences.rate),
    voice: typeof value?.voice === 'string' ? value.voice : '',
  }
}

function frenchVoices(engine) {
  return engine.getVoices().filter(({ lang }) => /^fr(?:[-_]|$)/i.test(lang))
}

function makeUtterance(text, preferences, voices) {
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = voices.find(({ voiceURI }) => voiceURI === preferences.voice)
    ?? voices.find(({ lang, localService }) => lang.toLowerCase() === 'fr-fr' && localService)
    ?? voices.find(({ localService }) => localService)
    ?? voices[0]
  if (voice) utterance.voice = voice
  utterance.lang = voice?.lang ?? 'fr-FR'
  utterance.volume = preferences.volume / 100
  utterance.rate = preferences.rate
  return utterance
}

export function useQuestionSpeech(questionText, roundKey, loadPreferences, savePreferences) {
  const engine = typeof window.SpeechSynthesisUtterance === 'function' ? window.speechSynthesis : null
  const [preferences, setPreferences] = useState(() => speechPreferences(loadPreferences()))
  const [voices, setVoices] = useState([])
  const [playing, setPlaying] = useState(null)
  const [error, setError] = useState('')
  const settings = useRef(preferences)
  const current = useRef(null)

  const stop = useCallback((kind) => {
    if (!current.current || (kind && current.current.kind !== kind)) return
    current.current = null
    engine.cancel()
    setPlaying(null)
  }, [engine])

  const play = useCallback((text, kind) => {
    if (!engine || !text) return
    stop()
    setError('')
    const utterance = makeUtterance(text, settings.current, frenchVoices(engine))
    current.current = { utterance, kind }
    setPlaying(kind)
    const finish = (event) => {
      if (current.current?.utterance !== utterance) return
      current.current = null
      setPlaying(null)
      if (event.type === 'error') setError(event.error === 'not-allowed'
        ? 'Clique sur Lire pour autoriser la lecture vocale.'
        : 'La voix est indisponible. Essaie une autre voix dans les réglages.')
    }
    utterance.onend = finish
    utterance.onerror = finish
    engine.speak(utterance)
  }, [engine, stop])

  useEffect(() => {
    if (!engine) return
    const updateVoices = () => setVoices(frenchVoices(engine))
    updateVoices()
    engine.addEventListener('voiceschanged', updateVoices)
    return () => engine.removeEventListener('voiceschanged', updateVoices)
  }, [engine])

  useEffect(() => {
    setError('')
    if (settings.current.enabled && questionText) play(questionText, 'question')
    return () => stop('question')
  }, [questionText, roundKey, play, stop])

  useEffect(() => () => stop(), [stop])

  function change(options) {
    const next = speechPreferences({ ...settings.current, ...options })
    settings.current = next
    setPreferences(next)
    savePreferences(next)
    if (options.enabled === false || options.volume === 0) stop()
    if (options.enabled === true) play(questionText, 'question')
  }

  return {
    supported: Boolean(engine), preferences, voices, playing, error, change, stop,
    read: () => play(questionText, 'question'),
    preview: () => play('Bienvenue dans La Bande de Quiz. Prêt pour la prochaine question ?', 'preview'),
  }
}

const speedFormat = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })

export function SpeechSettings({ speech }) {
  if (!speech.supported) return <p className="modal-message">La lecture vocale est indisponible sur ce navigateur.</p>
  const { preferences, voices, change, playing, stop, preview, error } = speech
  const speedLabel = `×${speedFormat.format(preferences.rate)}`
  return <div className="speech-settings">
    <label className="speech-toggle">
      <input type="checkbox" checked={preferences.enabled} onChange={(event) => change({ enabled: event.target.checked })} />
      Lire les questions automatiquement
    </label>
    <label className="speech-slider">
      <span>Volume <span aria-hidden="true">{preferences.volume} %</span></span>
      <input type="range" min="0" max="100" value={preferences.volume} aria-valuetext={`${preferences.volume} pour cent`} onChange={(event) => change({ volume: Number(event.target.value) })} />
    </label>
    <label className="speech-slider">
      <span>Vitesse <span aria-hidden="true">{speedLabel}</span></span>
      <input type="range" min={minRate} max={maxRate} step="0.05" value={preferences.rate} aria-valuetext={`${speedFormat.format(preferences.rate)} fois la vitesse normale`} onChange={(event) => change({ rate: Number(event.target.value) })} />
    </label>
    {voices.length > 0 && <label className="speech-voice">Voix
      <select value={voices.some(({ voiceURI }) => voiceURI === preferences.voice) ? preferences.voice : ''} onChange={(event) => change({ voice: event.target.value })}>
        <option value="">Français (automatique)</option>
        {voices.map(({ voiceURI, name, lang }) => <option key={voiceURI} value={voiceURI}>{name} · {lang}</option>)}
      </select>
    </label>}
    <p className="field-note">Ces réglages s’appliquent à ta prochaine lecture.</p>
    {error && <p className="error-text" role="status">{error}</p>}
    <button className="button secondary" type="button" onClick={playing === 'preview' ? () => stop('preview') : preview}>
      {playing === 'preview' ? <><Square size={16} /> Arrêter le test</> : <><Volume2 size={17} /> Tester la voix</>}
    </button>
  </div>
}
