import React, { useState } from 'react'
import { Check } from 'lucide-react'

export function ReadyControl({ ready, action, reconnecting, note }) {
  const [sending, setSending] = useState(false)
  if (!ready) return null

  async function toggle() {
    setSending(true)
    try {
      await action({ type: 'ready', key: ready.key, ready: !ready.selected })
    } finally {
      setSending(false)
    }
  }

  return <div className="ready-control">
    <button className={`button ${ready.selected ? 'secondary' : 'primary'}`} type="button" aria-pressed={ready.selected} disabled={sending || reconnecting} onClick={toggle}>
      <Check size={18} aria-hidden="true" /> {ready.selected ? 'Annuler mon « Prêt »' : 'Prêt'}
    </button>
    <p className="field-note" role="status">{ready.count} / {ready.total} prêts{note && ` · ${note}`}</p>
  </div>
}
