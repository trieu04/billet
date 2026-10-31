import { Image, type ImageSourcePropType } from 'react-native'
import { placeholderCatalog } from './placeholder-catalog.generated'
import { pickVariantPerMotif } from './placeholder-selection'

export type PlaceholderPhoto = {
  id: string
  // Identifies the content; variants of one motif only differ in colour.
  motifId: string
  // Matches `Category.code` so the review screen can preselect the category.
  categoryCode: string
  label: string
  source: ImageSourcePropType
  thumbnail: ImageSourcePropType
}

// Sample photos for people who would rather not take one. Regenerate the files and the
// catalog with `pnpm generate:placeholders`.
export const placeholderPhotos: PlaceholderPhoto[] = placeholderCatalog

export function pickPlaceholderPhotos() {
  return pickVariantPerMotif(placeholderPhotos)
}

export function placeholderPhotoUri(photo: PlaceholderPhoto) {
  return Image.resolveAssetSource(photo.source)?.uri
}
