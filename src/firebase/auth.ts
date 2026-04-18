import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'

import { DEFAULT_PROFILE_IMAGE_URL } from '@/constants/profileIcons'
import { auth, db } from '@/firebase/config'
import type { StudentProfile, VisitorProfile } from '@/types/user'

export interface StudentSignUpInput {
  email: string
  password: string
  name: string
  university: string
  department: string
  emailVerificationRedirectUrl: string
  profileImageUrl: string
}

export interface VisitorSignUpInput {
  email: string
  password: string
  name: string
  emailVerificationRedirectUrl: string
}

export interface UpdateUserProfileInput {
  name: string
  profileImageUrl?: string
}

export const AUTH_PROFILE_UPDATED_EVENT = 'auth-profile-updated'
export const AUTH_SESSION_UPDATED_EVENT = 'auth-session-updated'

export async function signUpStudentWithEmail({
  department,
  email,
  emailVerificationRedirectUrl,
  name,
  password,
  profileImageUrl,
  university,
}: StudentSignUpInput) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)

  await updateProfile(user, {
    displayName: name,
    photoURL: profileImageUrl,
  })

  await sendEmailVerification(user, {
    url: emailVerificationRedirectUrl,
  })

  const userProfile: StudentProfile = {
    uid: user.uid,
    email,
    name,
    profileImageUrl,
    university,
    department,
    role: 'student',
    universityVerificationStatus: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(doc(db, 'users', user.uid), userProfile)
  await signOut(auth)
  window.dispatchEvent(new Event(AUTH_SESSION_UPDATED_EVENT))

  return user
}

export async function signUpVisitorWithEmail({
  email,
  emailVerificationRedirectUrl,
  name,
  password,
}: VisitorSignUpInput) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)

  await updateProfile(user, {
    displayName: name,
    photoURL: DEFAULT_PROFILE_IMAGE_URL,
  })

  await sendEmailVerification(user, {
    url: emailVerificationRedirectUrl,
  })

  const userProfile: VisitorProfile = {
    uid: user.uid,
    email,
    name,
    profileImageUrl: DEFAULT_PROFILE_IMAGE_URL,
    role: 'visitor',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(doc(db, 'users', user.uid), userProfile)
  await signOut(auth)
  window.dispatchEvent(new Event(AUTH_SESSION_UPDATED_EVENT))

  return user
}

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
