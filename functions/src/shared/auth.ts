import { getAuth } from 'firebase-admin/auth'

import { HttpError } from './httpError'

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
