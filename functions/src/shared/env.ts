import { HttpError } from './httpError'

export const REQUIRED_ENV = {
  awsRegion: 'AWS_REGION',
  s3BucketName: 'S3_BUCKET_NAME',
  pinataJwt: 'PINATA_JWT',
  pinataApiBaseUrl: 'PINATA_API_BASE_URL',
  chainRpcUrl: 'CHAIN_RPC_URL',
  chainPrivateKey: 'CHAIN_PRIVATE_KEY',
} as const

export interface PinataEnvConfig {
  jwt: string
  apiBaseUrl: string
}

export interface BlockchainEnvConfig {
  chainRpcUrl: string
  chainPrivateKey: string
  chainName: string
  chainRegistryAddress?: string
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

export function getBlockchainEnvConfig(): BlockchainEnvConfig {
  const chainRegistryAddress = process.env.CHAIN_REGISTRY_ADDRESS?.trim()
  const rawPrivateKey = mustGetEnv(REQUIRED_ENV.chainPrivateKey).trim()
  const normalizedPrivateKey = rawPrivateKey.startsWith('0x')
    ? rawPrivateKey
    : `0x${rawPrivateKey}`

  if (!/^0x[0-9a-fA-F]{64}$/.test(normalizedPrivateKey)) {
    throw new HttpError(500, 'Invalid CHAIN_PRIVATE_KEY format.')
  }

  return {
    chainRpcUrl: mustGetEnv(REQUIRED_ENV.chainRpcUrl),
    chainPrivateKey: normalizedPrivateKey,
    chainName: process.env.CHAIN_NAME ?? 'polygon-amoy',
    chainRegistryAddress: chainRegistryAddress || undefined,
  }
}
