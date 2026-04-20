import { HttpError } from './httpError'

export function mustGetEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new HttpError(500, `Missing required environment variable: ${name}`)
  }

  return value
}
