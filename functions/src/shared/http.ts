import * as logger from 'firebase-functions/logger'

import { HttpError } from './httpError'

export interface HttpRequest {
  method: string
  body: unknown
  header: (name: string) => string | undefined
}

export interface HttpResponse {
  set: (name: string, value: string) => void
  status: (code: number) => {
    send: (body: string) => void
    json: (payload: object) => void
  }
}

export function handleCommonHttpRequest(
  request: HttpRequest,
  response: HttpResponse,
  allowedMethod: string
): boolean {
  response.set('Cache-Control', 'no-store')

  if (request.method === 'OPTIONS') {
    response.status(204).send('')
    return true
  }

  if (request.method !== allowedMethod) {
    response.status(405).json({ error: 'Method not allowed.' })
    return true
  }

  return false
}

export function handleHttpError(
  response: HttpResponse,
  error: unknown,
  logMessage: string
): void {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({ error: error.message })
    return
  }

  const message = error instanceof Error ? error.message : 'Unknown error.'
  logger.error(logMessage, error)
  response.status(500).json({ error: message })
}
