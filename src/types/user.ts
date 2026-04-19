export type UserRole = 'visitor' | 'student' | 'artist' | 'admin'

interface BaseUserProfile {
  uid: string
  email: string
  name: string
  profileImageUrl: string
  backgroundImageUrl?: string
  role: UserRole
  country?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export interface StudentProfile extends BaseUserProfile {
  role: 'student'
  university: string
  universityId?: string
  department: string
  departmentId?: string
  major?: string
  expectedGraduationDate?: string
  graduationYear?: number
  universityVerificationStatus: 'pending' | 'verified'
  favoriteArtistIds?: string[]
  likedArtworkIds?: string[]
}

export interface ArtistUserProfile extends BaseUserProfile {
  role: 'artist'
  favoriteArtistIds?: string[]
  likedArtworkIds?: string[]
}

export interface VisitorProfile extends BaseUserProfile {
  role: 'visitor'
  favoriteArtistIds?: string[]
  likedArtworkIds?: string[]
}

export interface AdminProfile extends BaseUserProfile {
  role: 'admin'
}

export type UserProfile =
  | StudentProfile
  | ArtistUserProfile
  | VisitorProfile
  | AdminProfile
