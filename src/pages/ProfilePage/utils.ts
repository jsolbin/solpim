import { FirebaseError } from 'firebase/app'

import {
  DEFAULT_PROFILE_IMAGE_URL,
  STUDENT_PROFILE_ICONS,
} from '@/constants/profileIcons'

export type ProfileRole = 'student' | 'visitor' | 'admin'

export interface ProfileImageOption {
  label: string
  value: string
}

export function getProfileErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'permission-denied':
        return 'Firestore: permission denied while updating your profile.'
      default:
        return `${error.code}: ${error.message}`
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unable to update your profile. Please try again.'
}

interface ProfileImageStateInput {
  googleProfileImageUrl?: string | null
  savedProfileImageUrl?: string | null
  userRole?: ProfileRole
}

export function getProfileImageState({
  googleProfileImageUrl,
  savedProfileImageUrl,
  userRole,
}: ProfileImageStateInput) {
  const visitorProfileImageOptions = [
    { label: 'Default', value: DEFAULT_PROFILE_IMAGE_URL },
    ...(googleProfileImageUrl
      ? [{ label: 'Google', value: googleProfileImageUrl }]
      : []),
  ]
  const profileImageOptions =
    userRole === 'student'
      ? STUDENT_PROFILE_ICONS
      : userRole === 'visitor'
        ? visitorProfileImageOptions
        : [{ label: 'Default', value: DEFAULT_PROFILE_IMAGE_URL }]
  const profileImageUrl =
    profileImageOptions.find((option) => option.value === savedProfileImageUrl)
      ?.value ??
    profileImageOptions[0]?.value ??
    DEFAULT_PROFILE_IMAGE_URL

  return {
    profileImageOptions,
    profileImageUrl,
  }
}
