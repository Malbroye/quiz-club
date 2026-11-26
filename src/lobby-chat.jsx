import React, { useEffect, useId, useRef, useState } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import { chatMessageLimit } from '../shared/lobby-chat.js'
import { PlayerName } from './profile.jsx'

const clock = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

export function LobbyChat({ messages, selfId, players, send, reconnecting, onClose, id }) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const log = useRef(null)
  const followLatest = useRef(true)

  useEffect(() => {
    const list = log.current
    if (followLatest.current) list.scrollTop = list.scrollHeight
  }, [messages])

  async function submit(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || sending || reconnecting) return
    followLatest.current = true
    setError('')
    setSending(true)
    try {
      await send(text)
      setDraft((current) => current === draft ? '' : current)
    } catch (problem) {
      setError(problem.message)
    } finally {
      setSending(false)
    }
  }

  return <section id={id} className="panel lobby-chat" aria-label="Tchat du groupe" onKeyDown={onClose ? (event) => {
    if (event.key === 'Escape') onClose()
  } : undefined}>
    <div className="lobby-chat-heading">
      <h2 className="display"><MessageCircle size={19} aria-hidden="true" /> Tchat du groupe</h2>
      {onClose && <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer le tchat"><X size={17} aria-hidden="true" /></button>}
    </div>
    <div className="lobby-chat-log" ref={log} role="log" aria-label="Messages du groupe" tabIndex={0} onScroll={(event) => {
      const list = event.currentTarget
      followLatest.current = list.scrollHeight - list.scrollTop - list.clientHeight < 24
    }}>
      {!messages.length && <p className="lobby-chat-empty">Aucun message pour l’instant.</p>}
      {messages.map((message) => <article className="lobby-chat-message" data-own={message.playerId === selfId} key={message.id}>
        <div><strong><PlayerName player={players.find(({ id }) => id === message.playerId) ?? message} /></strong><time dateTime={new Date(message.at).toISOString()}>{clock.format(message.at)}</time></div>
        <p>{message.text}</p>
      </article>)}
    </div>
    <form className="lobby-chat-compose" onSubmit={submit}>
      <input aria-label="Ton message" placeholder="Écris un message…" autoFocus={Boolean(onClose)} maxLength={chatMessageLimit} autoComplete="off" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <button className="button primary" type="submit" disabled={!draft.trim() || sending || reconnecting} aria-label="Envoyer le message" title="Envoyer"><Send size={17} aria-hidden="true" /></button>
    </form>
    {error && <p className="error-text" role="alert">{error}</p>}
  </section>
}

export function RoomChatDock(props) {
  const { messages, selfId } = props
  const [open, setOpen] = useState(false)
  const [lastRead, setLastRead] = useState(() => messages.at(-1)?.id)
  const trigger = useRef(null)
  const id = useId()
  const newest = messages.at(-1)?.id
  const unread = open ? 0 : messages.slice(messages.findIndex((message) => message.id === lastRead) + 1)
    .filter((message) => message.playerId !== selfId).length

  useEffect(() => {
    if (open) setLastRead(newest)
  }, [open, newest])

  function close() {
    setOpen(false)
    setLastRead(newest)
    trigger.current?.focus({ preventScroll: true })
  }

  return <div className="room-chat-dock">
    {open && <LobbyChat {...props} id={id} onClose={close} />}
    <button ref={trigger} className="button primary room-chat-trigger" type="button" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => open ? close() : setOpen(true)}>
      <MessageCircle size={19} aria-hidden="true" /> Tchat
      {unread > 0 && <span className="room-chat-unread" aria-label={`${unread} messages non lus`}>{unread}</span>}
    </button>
  </div>
}
