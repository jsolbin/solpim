import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

import { HttpError } from './httpError'
import { hasRequiredRole } from './permissions'

export type UserRole = 'visitor' | 'student' | 'artist' | 'admin'

export async function verifyAuthTokenFromHeader(
  authorizationHeader: string | undefined,
  required: boolean
): Promise<string> {
  if (!authorizationHeader) {
    if (required) {
      throw new HttpError(401, 'Missing Authorization header.')
    }
    return ''
  }

  if (!authorizationHeader.startsWith('Bearer ')) {
    throw new HttpError(401, 'Invalid Authorization header format.')
  }

  const idToken = authorizationHeader.slice('Bearer '.length)
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken)
    return decodedToken.uid
  } catch {
    throw new HttpError(401, 'Invalid or expired auth token.')
  }
}

export async function requireRoleFromHeader(
  authorizationHeader: string | undefined,
  allowedRoles: UserRole[]
): Promise<{ uid: string; role: UserRole }> {
  const uid = await verifyAuthTokenFromHeader(authorizationHeader, true)
  const snapshot = await getFirestore().collection('users').doc(uid).get()
  const role = snapshot.data()?.role as UserRole | undefined

  if (!hasRequiredRole(role, allowedRoles)) {
    throw new HttpError(403, 'Insufficient permissions.')
  }

  return { uid, role }
}
