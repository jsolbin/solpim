interface BaseUserProfile {
  uid: string
  email: string
  name: string
  profileImageUrl: string
  role: 'student' | 'visitor' | 'admin'
  createdAt?: unknown
  updatedAt?: unknown
}

export interface StudentProfile extends BaseUserProfile {
  role: 'student'
  university: string
  department: string
  universityVerificationStatus: 'pending' | 'verified'
}

export interface VisitorProfile extends BaseUserProfile {
  role: 'visitor'
}

export interface AdminProfile extends BaseUserProfile {
  role: 'admin'
}

export type UserProfile = StudentProfile | VisitorProfile | AdminProfile
