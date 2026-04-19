export interface ArtistProfile {
  id: string
  userId: string
  universityId: string
  departmentId: string
  bio?: string
  portfolioUrl?: string
  graduationYear: number
  backgroundImageUrl?: string
  createdAt?: string
  updatedAt?: string
}

export interface ArtistPreview {
  id: string
  userId?: string
  name: string
  profileImageUrl?: string
  universityId?: string
  universityName?: string
  departmentId?: string
  departmentName?: string
}
