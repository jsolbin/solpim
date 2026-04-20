import { HttpError } from './httpError'

export function validateRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${fieldName} is required.`)
  }

  return value.trim()
}
