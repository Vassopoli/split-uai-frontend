import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

interface AvatarProps {
  name: string
  initials: string
  color: string
  picture?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const SIZES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
}

export function Avatar({ name, initials, color, picture, size = 'md' }: AvatarProps) {
  // Google photo URLs can 403/404 for reasons outside our control (referrer
  // policy, a since-deleted photo, ...). Track load failures per-URL so a
  // broken picture falls back to initials instead of showing a blank image.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showPicture = !!picture && picture !== failedUrl

  return (
    <div
      title={name}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ${SIZES[size]}`}
      style={showPicture ? undefined : { backgroundColor: color }}
    >
      {showPicture ? (
        <img
          src={picture}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(picture ?? null)}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  )
}

export function MeAvatar({ size = 'md' }: { size?: AvatarProps['size'] }) {
  const { user } = useAuth0()
  return <Avatar name="Você" initials="EU" color="#12876c" picture={user?.picture} size={size} />
}
