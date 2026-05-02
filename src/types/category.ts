export type ArtworkCategoryName =
  | 'Architecture'
  | 'Fine Art'
  | 'Sculpture'
  | 'Design'
  | 'Media Art'
  | 'Photography'
  | 'Illustration'
  | 'Animation'
  | 'Fashion'
  | 'Installation'
  | 'Video Art'
  | 'Crafts'
  | 'Digital Art'
  | 'Other'

export interface Category {
  id: string
  name: ArtworkCategoryName
}
