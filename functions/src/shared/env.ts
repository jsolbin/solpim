import { HttpError } from './httpError'

export const REQUIRED_ENV = {
  awsRegion: 'AWS_REGION',
  s3BucketName: 'S3_BUCKET_NAME',
  pinataJwt: 'PINATA_JWT',
  pinataApiBaseUrl: 'PINATA_API_BASE_URL',
} as const

export interface PinataEnvConfig {
  jwt: string
  apiBaseUrl: string
}

export function mustGetEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new HttpError(500, `Missing required environment variable: ${name}`)
  }

  return value
}

export function getPinataEnvConfig(): PinataEnvConfig {
  return {
    jwt: mustGetEnv(REQUIRED_ENV.pinataJwt),
    apiBaseUrl: mustGetEnv(REQUIRED_ENV.pinataApiBaseUrl),
  }
}
