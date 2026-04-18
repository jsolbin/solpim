import { FirebaseError } from 'firebase/app'

export type AccountType = 'student' | 'visitor'

export function getSignUpErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'Email: this email is already registered.'
      case 'auth/invalid-email':
        return 'Email: enter a valid email address.'
      case 'auth/missing-email':
        return 'Email: enter your email address.'
      case 'auth/weak-password':
        return 'Password: use at least 6 characters.'
      case 'auth/popup-closed-by-user':
        return 'Google sign up was closed before it finished.'
      case 'auth/popup-blocked':
        return 'Google sign up popup was blocked by the browser.'
      case 'auth/account-exists-with-different-credential':
        return 'This email is already registered with another sign in method.'
      case 'auth/operation-not-allowed':
        return 'Firebase Auth: this sign up method is not enabled.'
      case 'auth/network-request-failed':
        return 'Network: check your internet connection and try again.'
      case 'auth/configuration-not-found':
        return 'Firebase Auth: project authentication is not configured.'
      case 'permission-denied':
        return 'Firestore: permission denied while saving your profile.'
      case 'unavailable':
        return 'Firestore: service is unavailable. Please try again.'
      default:
        return `${error.code}: ${error.message}`
    }
  }

  return 'Unable to create your account. Please try again.'
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
