export type ArtworkCategoryName =
  | 'Architecture'
  | 'Fine Art'
  | 'Sculpture'
  | 'Design'
  | 'Media Art'

export interface Category {
  id: string
  name: ArtworkCategoryName
}
