import type { ArtistPreview } from './artist'
import type { BlockchainProtection, S3ObjectReference } from './blockchain'

export type ArtworkStatus = 'pending' | 'approved' | 'rejected'

export type ArtworkContentType = 'image' | 'text' | 'video'

export interface ArtworkContent {
  id: string
  artworkId: string
  type: ArtworkContentType
  section: string
  content: string
  orderIndex: number
  alt?: string
  originalStorage?: S3ObjectReference
  displayUrl?: string
  thumbnailUrl?: string
  blockchainProtection?: BlockchainProtection
}

export interface Artwork {
  id: string
  artistId: string
  categoryId: string
  artist: ArtistPreview

  title: string
  description: string
  creationProcess?: string

  thumbnailUrl: string
  thumbnailAlt: string
  videoUrl?: string

  productionStartDate: string
  productionEndDate?: string
  productionYear: number
  isForSale: boolean

  viewCount: number
  likeCount: number
  status: ArtworkStatus
  rejectionReason?: string

  contents: ArtworkContent[]

  createdAt: string
  updatedAt?: string
}
