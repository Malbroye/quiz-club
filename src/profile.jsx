import React, { useId, useState } from 'react'
import { ChevronDown, Upload } from 'lucide-react'
import { avatars, isAvatarPhoto, isCustomNameColor, maxAvatarPhotoLength, maxAvatarPreviewLength, nameColors } from '../shared/game.js'

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
    function encode(sizes, limit) {
      for (const [size, quality] of sizes) {
        const side = Math.min(size, crop)
        canvas.width = canvas.height = side
        context.fillStyle = '#202020'
        context.fillRect(0, 0, side, side)
        context.drawImage(image, left, top, crop, crop, 0, 0, side, side)
        const photo = canvas.toDataURL('image/jpeg', quality)
        if (isAvatarPhoto(photo, limit)) return photo
      }
    }
    const photo = encode([[128, .65], [96, .78], [80, .68], [64, .62], [48, .55]], maxAvatarPhotoLength)
    if (!photo) throw new Error('Cette image est trop détaillée. Essaie une photo plus simple.')
    const photoPreview = crop > 128 ? encode([[384, .84], [384, .68], [320, .67], [256, .6]], maxAvatarPreviewLength) : undefined
    return { photo, photoPreview }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function PlayerAvatar({ player }) {
  return <span className="player-avatar" aria-hidden="true">
    {player.photo ? <img src={player.photo} alt="" /> : player.avatar}
  </span>
}

function luminance(hex) {
  const [red, green, blue] = hex.slice(1).match(/../g).map((part) => {
    const channel = Number.parseInt(part, 16) / 255
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4
  })
  return .2126 * red + .7152 * green + .0722 * blue
}

function colorBackdrop(hex) {
  const light = luminance(hex)
  if (light < .18) return '#fff'
  if (light < .29) return '#000'
}

export function PlayerName({ player }) {
  const custom = isCustomNameColor(player.nameColor)
  let color = custom ? player.nameColor : nameColors.find(({ id }) => id === player.nameColor)?.hex
  const hasBackground = isCustomNameColor(player.nameBackground)
  const backgroundColor = hasBackground ? player.nameBackground : custom ? colorBackdrop(color) : undefined
  if (hasBackground) {
    color ??= nameColors[0].hex
    const backgroundLight = luminance(backgroundColor)
    const textLight = luminance(color)
    if ((Math.max(backgroundLight, textLight) + .05) / (Math.min(backgroundLight, textLight) + .05) < 4.5) {
      color = backgroundLight > .179 ? '#000' : '#fff'
    }
  }
  return <span className={backgroundColor ? 'player-name player-name-backed' : 'player-name'} style={color ? { color, backgroundColor } : undefined}>{player.name}</span>
}

export function ProfileAppearance({ profile, setProfile, photoBusy, setPhotoBusy }) {
  const inputId = useId()
  const colorGroup = useId()
  const [error, setError] = useState('')
  const change = (options) => setProfile((current) => ({ ...current, ...options }))
  const customColor = isCustomNameColor(profile.nameColor)
  const pickerColor = customColor ? profile.nameColor : nameColors.find(({ id }) => id === profile.nameColor)?.hex ?? nameColors[0].hex

  async function pickPhoto(event) {
    const file = event.currentTarget.files[0]
    event.currentTarget.value = ''
    if (!file) return
    setError('')
    setPhotoBusy(true)
    try {
      change(await preparePhoto(file))
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
          {avatars.map((avatar) => <button type="button" aria-label={avatar} aria-pressed={!profile.photo && profile.avatar === avatar} key={avatar} onClick={() => { setError(''); change({ avatar, photo: undefined, photoPreview: undefined }) }}>{avatar}</button>)}
        </div>
        <div className="photo-picker">
          <input className="sr-only" type="file" id={inputId} accept={photoFormats.join(',')} onChange={pickPhoto} />
          <label htmlFor={inputId} className="button secondary small"><Upload size={15} /> {profile.photo ? 'Changer la photo' : 'Importer une photo'}</label>
          {profile.photo && <button className="button secondary small" type="button" onClick={() => change({ photo: undefined, photoPreview: undefined })}>Retirer</button>}
        </div>
        <p className="field-note">La photo est visible par les joueurs du salon.</p>
        {profile.photo && !profile.photoPreview && <p className="field-note">Pour un aperçu plus net, réimporte ta photo originale.</p>}
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
        <label className="custom-name-color" data-selected={customColor}>
          <span>Couleur personnalisée</span>
          <input type="color" value={pickerColor} onChange={(event) => change({ nameColor: event.target.value })} />
        </label>
      </fieldset>
      <fieldset>
        <legend className="field-label">Bande de couleur derrière le pseudo</legend>
        <label className="custom-name-color" data-selected={Boolean(profile.nameBackground)}>
          <span>Couleur du fond</span>
          <input type="color" value={profile.nameBackground ?? '#ffd200'} onChange={(event) => change({ nameBackground: event.target.value })} />
        </label>
        <button className="button secondary small name-background-toggle" type="button" onClick={() => change({ nameBackground: profile.nameBackground ? undefined : '#ffd200' })}>
          {profile.nameBackground ? 'Retirer le fond' : 'Ajouter le fond'}
        </button>
      </fieldset>
    </div>
  </details>
}
