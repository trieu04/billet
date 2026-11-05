import { CategoryIcon, type Category } from '@/components/category'
import { useMediaUrl } from '@/lib/queries'

/** Photo of an expense, or its category badge on a tinted tile when it has none. */
export function MediaThumb({
  mediaId,
  category,
  className = 'size-14 rounded-2xl',
  alt = '',
}: {
  mediaId: string | null | undefined
  category?: Category
  className?: string
  alt?: string
}) {
  const url = useMediaUrl(mediaId)
  if (mediaId && url)
    return (
      <img src={url} alt={alt} loading="lazy" className={`${className} shrink-0 object-cover`} />
    )
  return (
    <span
      aria-hidden
      className={`${className} grid shrink-0 place-items-center ${mediaId ? 'animate-pulse bg-sunken' : ''}`}
      style={mediaId ? undefined : { backgroundColor: `${category?.color ?? '#cfc3b6'}55` }}
    >
      {mediaId ? null : <CategoryIcon category={category} />}
    </span>
  )
}
