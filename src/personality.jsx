import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BarChart3, Check, HeartHandshake, Sparkles, Square, Users, Volume2 } from 'lucide-react'
import { getPersonalityQuestion, getPersonalityTest, personalityTests } from '../shared/personality.js'
import { PlayerAvatar, PlayerName } from './profile.jsx'

const letters = 'ABCD'

export function PersonalitySetup({ testId, setTestId, mode, setMode }) {
  return <>
    <fieldset className="personality-setup">
      <legend className="field-label">Choisis ton test</legend>
      {Object.entries(personalityTests).map(([id, test]) => <label className="personality-test-option" key={id}>
        <input type="radio" name="personality-test" value={id} checked={testId === id} onChange={() => setTestId(id)} />
        <span><strong>{test.title}</strong><small>{test.description}</small></span>
      </label>)}
    </fieldset>
    <fieldset className="personality-formats">
      <legend className="field-label">Avec qui ?</legend>
      <label><input type="radio" name="personality-mode" checked={mode === 'create'} onChange={() => setMode('create')} /> Entre amis</label>
      <label><input type="radio" name="personality-mode" checked={mode === 'local'} onChange={() => setMode('local')} /> En solo</label>
    </fieldset>
  </>
}

export function PersonalityIntro({ testId }) {
  const test = getPersonalityTest(testId)
  return <section className="panel personality-intro">
    <HeartHandshake size={26} />
    <h2 className="display">{test.title}</h2>
    <p>{test.description}</p>
    <p className="field-note">{test.questions.length} questions, à ton rythme. Vous pourrez comparer vos profils et vos votes à la fin.</p>
  </section>
}

export function PersonalityRound({ state, action, error, reconnecting, speech }) {
  const { testId, step, total, complete, canFinish, run } = state.personality
  const question = getPersonalityQuestion(testId, step, state.personality)
  const heading = useRef(null)
  const [sending, setSending] = useState(false)
  useEffect(() => {
    window.scrollTo(0, 0)
    heading.current?.focus({ preventScroll: true })
  }, [step])

  async function answer(choice) {
    setSending(true)
    try { await action({ type: 'answer', step, choice, run }) } finally { setSending(false) }
  }

  return <main className="page-width game-page personality-page">
    <div className="question-top"><span className="category-tag"><HeartHandshake size={15} /> Test de personnalité</span><span className="eyebrow" aria-live="polite">{question ? `Question ${step + 1} sur ${total}` : `${total} réponses envoyées`}</span></div>
    <div className="progress-strip" aria-hidden="true">{Array.from({ length: total }, (_, index) => <i key={index} className={index < step ? 'done' : ''} />)}</div>
    {question ? <>
      <div className="question-panel"><div className="question-heading">
        <h1 ref={heading} tabIndex={-1}>{question[0]}</h1>
        {speech.supported && <button className="button secondary small read-question" type="button" onClick={speech.playing === 'question' ? () => speech.stop('question') : speech.read}>
          {speech.playing === 'question' ? <><Square size={14} /> Arrêter la lecture</> : <><Volume2 size={16} /> Lire la question</>}
        </button>}
      </div></div>
      <div className="answer-grid">
        {letters.split('').map((letter, index) => {
          const choice = (step + index) % letters.length
          return <button className="answer" type="button" key={`${step}-${choice}`} disabled={sending || reconnecting} onClick={() => answer(choice)}><span>{letter}</span><strong>{question[choice + 1]}</strong></button>
        })}
      </div>
    </> : <section className="panel personality-waiting">
      <Check size={26} /><h1 className="display" ref={heading} tabIndex={-1}>T’as fini le test.</h1>
      {canFinish ? <><p>Tu peux attendre les joueurs déconnectés ou afficher les profils déjà terminés.</p><button className="button primary" type="button" disabled={reconnecting} onClick={() => action({ type: 'finish-personality' })}>Voir les profils <ArrowRight size={17} /></button></> : <p>Les profils apparaîtront quand tes potes auront fini.</p>}
    </section>}
    {!state.local && <p className="personality-progress" role="status"><Users size={16} /> {complete} / {state.players.length} ont terminé le test</p>}
    {(error || speech.error) && <p className="error-text" role="alert">{error || speech.error}</p>}
  </main>
}

export function PersonalityResults({ state, action, leave, error }) {
  const { testId, profiles, votes, legacy } = state.personality
  const test = getPersonalityTest(testId, legacy)
  const ownProfile = profiles.find(({ id }) => id === state.selfId)
  return <main className="page-width game-page personality-page">
    <div className="game-heading"><div className="eyebrow">{test.title}</div><h1 className="display">{ownProfile ? 'Ton profil' : 'Les profils du groupe'}</h1></div>
    {ownProfile && <section className="panel personality-verdict">
      <Sparkles size={24} /><h2 className="display">{ownProfile.title}</h2><p>{ownProfile.detail}</p><blockquote>{ownProfile.line}</blockquote>
    </section>}
    {!state.local && <>
      <section className="panel personality-group">
        <div className="section-head"><h2 className="display">Les profils de la bande</h2><Users size={21} /></div>
        <ul className="player-list">{profiles.map((profile) => {
          const player = state.players.find(({ id }) => id === profile.id)
          return <li key={profile.id}><PlayerAvatar player={player} /><div><strong><PlayerName player={player} />{player.id === state.selfId && <small> (toi)</small>}</strong><p>{profile.title}</p></div></li>
        })}</ul>
      </section>
      <details className="panel personality-votes">
        <summary><BarChart3 size={21} /> Voir les votes du groupe</summary>
        {votes.map((counts, index) => <section key={index} className="personality-poll">
          <h3>{getPersonalityQuestion(testId, index, state.personality)[0]}</h3>
          <ul>{counts.map((count, choice) => <li key={choice}>
            <span>{test.questions[index][choice + 1]}</span><strong>{count} {count === 1 ? 'vote' : 'votes'}</strong>
            <div className="vote-track" aria-hidden="true"><i style={{ width: `${count / profiles.length * 100}%` }} /></div>
          </li>)}</ul>
        </section>)}
      </details>
    </>}
    {error && <p className="error-text" role="alert">{error}</p>}
    <div className="personality-actions">
      {state.selfId === state.hostId && <button className="button primary" type="button" onClick={() => action({ type: 'rematch' })}>Rejouer <ArrowRight size={18} /></button>}
      <button className="button secondary" type="button" onClick={leave}><ArrowLeft size={17} /> Accueil</button>
    </div>
  </main>
}
