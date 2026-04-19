export type ArtworkReviewStatus = 'pending' | 'approved' | 'rejected'

export interface ArtworkReview {
  id: string
  artworkId: string
  userId: string
  status: ArtworkReviewStatus
  rejectionReason?: string
  reviewedAt?: string
}
