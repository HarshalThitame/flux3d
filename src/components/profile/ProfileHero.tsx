'use client'

import { ChangeEvent, useRef, useState } from 'react'
import Image from 'next/image'
import { addToast } from '@/lib/toast/store'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatDate } from './ui'

const avatarBucket = 'avatars'

function getAvatarStoragePath(avatarUrl: string | null, userId: string) {
  if (!avatarUrl) return null

  if (!avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
    return avatarUrl.startsWith(`${userId}/`) ? avatarUrl : null
  }

  try {
    const parsed = new URL(avatarUrl)
    const prefixes = [
      `/storage/v1/object/public/${avatarBucket}/`,
      `/storage/v1/object/sign/${avatarBucket}/`,
    ]
    const prefix = prefixes.find((value) => parsed.pathname.startsWith(value))
    if (!prefix) return null

    const storagePath = decodeURIComponent(parsed.pathname.slice(prefix.length))
    return storagePath.startsWith(`${userId}/`) ? storagePath : null
  } catch {
    return null
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function ProfileHero({
  name,
  email,
  avatarUrl,
  createdAt,
  onAvatarUpdated,
}: {
  name: string
  email: string
  avatarUrl: string | null
  createdAt: string | null
  onAvatarUpdated: (avatarUrl: string) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      addToast({ type: 'error', title: 'Invalid image', description: 'Upload a JPEG, PNG, WebP, or GIF image.' })
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', title: 'Image too large', description: 'Profile photo must be under 5MB.' })
      event.target.value = ''
      return
    }

    setUploading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw new Error(authError.message)
      if (!user) throw new Error('Please sign in again to update your profile photo.')

      const previousAvatarPath = getAvatarStoragePath(avatarUrl, user.id)
      const extension = file.name.split('.').pop() || 'png'
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '-')
      const path = `${user.id}/${Date.now()}-${safeFileName || `avatar.${extension}`}`
      const { error: uploadError } = await supabase.storage.from(avatarBucket).upload(path, file, {
        contentType: file.type,
        upsert: true,
      })

      if (uploadError) throw new Error(uploadError.message)

      const { data: publicUrlData } = supabase.storage.from(avatarBucket).getPublicUrl(path)
      const nextAvatarUrl = publicUrlData.publicUrl

      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: nextAvatarUrl }).eq('id', user.id)
      if (updateError) throw new Error(updateError.message)

      if (previousAvatarPath && previousAvatarPath !== path) {
        const { error: removeError } = await supabase.storage.from(avatarBucket).remove([previousAvatarPath])
        if (removeError) {
          console.error('[profile] Failed to remove previous avatar:', removeError)
        }
      }

      onAvatarUpdated(nextAvatarUrl)
      addToast({ type: 'success', title: 'Profile photo updated' })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Could not upload profile photo',
      })
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return (
    <header className="relative overflow-hidden px-6 pb-8 pt-10 sm:px-10 sm:pb-10 sm:pt-12">
      <div
        aria-hidden
        className="absolute inset-0 opacity-70"
        style={{ background: 'var(--gradient-hero)' }}
      />
      <div aria-hidden className="absolute inset-x-6 top-0 h-24 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(212,175,55,0.10),transparent_70%)]" />
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleAvatarChange}
      />

      <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Change profile photo"
          className="group relative h-24 w-24 shrink-0 rounded-full p-[3px] shadow-[var(--shadow-gold-glow)] transition disabled:cursor-wait sm:h-28 sm:w-28"
          style={{ background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-light))' }}
        >
          <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[var(--fill-brand-soft)] text-2xl font-bold text-[var(--accent-primary)] sm:text-3xl">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={`${name} avatar`}
                width={112}
                height={112}
                className="h-full w-full object-cover"
              />
            ) : (
              getInitials(name || email)
            )}
          </span>
          <span className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line-subtle)] bg-white text-[var(--text-muted)] shadow-sm transition group-hover:border-[var(--accent-gold)] group-hover:text-[var(--accent-gold-deep)]">
            {uploading ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 12a9 9 0 1 1-9-9" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            )}
          </span>
        </button>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent-gold-deep)]">
            Member since · {formatDate(createdAt)}
          </p>
          <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl [font-family:var(--font-display)]">
            {name || 'Your Profile'}
          </h1>
          <p className="mt-2 truncate text-sm text-[var(--text-muted)]">{email}</p>
        </div>
      </div>
    </header>
  )
}
