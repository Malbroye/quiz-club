import React, { useId, useState } from 'react'
import { ChevronDown, Upload } from 'lucide-react'
import { avatars, isAvatarPhoto, maxAvatarPhotoLength, nameColors } from '../shared/game.js'

const photoFormats = ['image/jpeg', 'image/png', 'image/webp']

async function preparePhoto(file) {
  if (!photoFormats.includes(file.type) || file.size > 12 * 1024 * 1024) {
    throw new Error('Choisis une image JPG, PNG ou WebP de 12 Mo maximum.')
  }
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    const crop = Math.min(image.naturalWidth, image.naturalHeight)
    const left = (image.naturalWidth - crop) / 2
    const top = (image.naturalHeight - crop) / 2
    for (const [size, quality] of [[96, .82], [80, .68], [64, .62], [48, .55]]) {
      canvas.width = canvas.height = size
      context.fillStyle = '#21192c'
      context.fillRect(0, 0, size, size)
      context.drawImage(image, left, top, crop, crop, 0, 0, size, size)
      const photo = canvas.toDataURL('image/jpeg', quality)
      if (photo.length <= maxAvatarPhotoLength && isAvatarPhoto(photo)) return photo
    }
    throw new Error('Cette image est trop détaillée. Essaie une photo plus simple.')
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function PlayerAvatar({ player }) {
  return <span className="player-avatar" aria-hidden="true">
    {player.photo ? <img src={player.photo} alt="" /> : player.avatar}
  </span>
}

export function PlayerName({ player }) {
  const color = nameColors.find(({ id }) => id === player.nameColor)?.hex
  return <span className="player-name" style={color ? { color } : undefined}>{player.name}</span>
}

export function ProfileAppearance({ profile, setProfile, photoBusy, setPhotoBusy }) {
  const inputId = useId()
  const colorGroup = useId()
  const [error, setError] = useState('')
  const change = (options) => setProfile((current) => ({ ...current, ...options }))

  async function pickPhoto(event) {
    const file = event.currentTarget.files[0]
    event.currentTarget.value = ''
    if (!file) return
    setError('')
    setPhotoBusy(true)
    try {
      change({ photo: await preparePhoto(file) })
    } catch (problem) {
      setError(problem instanceof DOMException ? 'Impossible de lire cette image.' : problem.message)
    } finally {
      setPhotoBusy(false)
    }
  }

  return <details className="profile-appearance">
    <summary>
      <PlayerAvatar player={profile} />
      <span className="profile-summary"><span>Personnaliser mon profil</span><PlayerName player={{ ...profile, name: profile.name.trim() || 'Ton pseudo' }} /></span>
      <ChevronDown size={17} className="profile-chevron" />
    </summary>
    <div className="profile-options">
      <fieldset disabled={photoBusy}>
        <legend className="field-label">Avatar</legend>
        <div className="avatar-picker">
          {avatars.map((avatar) => <button type="button" aria-label={avatar} aria-pressed={!profile.photo && profile.avatar === avatar} key={avatar} onClick={() => { setError(''); change({ avatar, photo: undefined }) }}>{avatar}</button>)}
        </div>
        <div className="photo-picker">
          <input className="sr-only" type="file" id={inputId} accept={photoFormats.join(',')} onChange={pickPhoto} />
          <label htmlFor={inputId} className="button secondary small"><Upload size={15} /> {profile.photo ? 'Changer la photo' : 'Importer une photo'}</label>
          {profile.photo && <button className="button secondary small" type="button" onClick={() => change({ photo: undefined })}>Retirer</button>}
        </div>
        <p className="field-note">La photo est visible par les joueurs du salon.</p>
        {error && <p className="error-text" role="alert">{error}</p>}
      </fieldset>
      {photoBusy && <p className="field-note" role="status">Préparation de la photo…</p>}
      <fieldset>
        <legend className="field-label">Couleur du pseudo</legend>
        <div className="name-colors">
          {nameColors.map(({ id, label, hex }) => <label className="name-color" key={id} title={label}>
            <input className="sr-only" type="radio" name={colorGroup} value={id} checked={(profile.nameColor ?? 'default') === id} onChange={() => change({ nameColor: id })} />
            <span className="name-swatch" style={{ '--swatch': hex }} aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </label>)}
        </div>
      </fieldset>
    </div>
  </details>
}
