export interface ArtistPreview {
  id: string
  name: string
}

export interface Artwork {
  id: string
  artistId: string
  categoryId: string
  title: string
  description: string
  thumbnailUrl: string
  createdAt: string
  status: 'pending' | 'approved' | 'rejected'
  artist: ArtistPreview
  thumbnailAlt: string
}
