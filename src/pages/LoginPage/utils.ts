import { FirebaseError } from 'firebase/app'

import { EMAIL_NOT_VERIFIED_ERROR } from '@/firebase/auth'

export function getLoginErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Email: enter a valid email address.'
      case 'auth/missing-password':
        return 'Password: enter your password.'
      case 'auth/invalid-credential':
        return 'Email or password is incorrect.'
      case 'auth/popup-closed-by-user':
        return 'Google sign in was closed before it finished.'
      case 'auth/popup-blocked':
        return 'Google sign in popup was blocked by the browser.'
      case 'auth/account-exists-with-different-credential':
        return 'This email is already registered with another sign in method.'
      case 'auth/operation-not-allowed':
        return 'Firebase Auth: this sign in method is not enabled.'
      case 'auth/network-request-failed':
        return 'Network: check your internet connection and try again.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Wait a few minutes before trying again.'
      case 'permission-denied':
        return 'Firestore: permission denied while saving your visitor profile.'
      default:
        return `${error.code}: ${error.message}`
    }
  }

  if (error instanceof Error && error.message === EMAIL_NOT_VERIFIED_ERROR) {
    return 'Email verification required. Verify your email before logging in.'
  }

  if (
    error instanceof Error &&
    error.message === 'verification-email-password-only'
  ) {
    return 'Verification email can only be resent for email/password accounts.'
  }

  if (error instanceof Error && error.message === 'email-already-verified') {
    return 'This email is already verified. Log in to continue.'
  }

  return 'Unable to log in. Please try again.'
}
