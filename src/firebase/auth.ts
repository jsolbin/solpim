import { signOut, updateProfile } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'

import { DEFAULT_PROFILE_IMAGE_URL } from '@/constants/profileIcons'
import { auth, db } from '@/firebase/config'

export interface UpdateUserProfileInput {
  name: string
  profileImageUrl?: string
}

export const AUTH_PROFILE_UPDATED_EVENT = 'auth-profile-updated'
export const AUTH_SESSION_UPDATED_EVENT = 'auth-session-updated'

export async function logout() {
  await signOut(auth)
  window.dispatchEvent(new Event(AUTH_SESSION_UPDATED_EVENT))
}

export async function updateCurrentUserProfile({
  name,
  profileImageUrl,
}: UpdateUserProfileInput) {
  const user = auth.currentUser

  if (!user) {
    throw new Error('No authenticated user.')
  }

  const nextProfileImageUrl =
    profileImageUrl || user.photoURL || DEFAULT_PROFILE_IMAGE_URL

  await updateProfile(user, {
    displayName: name,
    photoURL: nextProfileImageUrl,
  })

  await setDoc(
    doc(db, 'users', user.uid),
    {
      name,
      profileImageUrl: nextProfileImageUrl,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  window.dispatchEvent(new Event(AUTH_PROFILE_UPDATED_EVENT))

  return user
}
