import { hexlify, JsonRpcProvider, toUtf8Bytes, Wallet } from 'ethers'

import { BlockchainEnvConfig } from './env'

export interface RegisterProtectionOnChainParams {
  artworkId: string
  imageHash: string
  ipfsCid: string
  env: BlockchainEnvConfig
}

export interface RegisterProtectionOnChainResult {
  txHash: string
  chainName: string
  protectedAt: string
}

export class BlockchainRegistrationError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
  }
}

export async function registerProtectionOnChain(
  params: RegisterProtectionOnChainParams
): Promise<RegisterProtectionOnChainResult> {
  const provider = new JsonRpcProvider(params.env.chainRpcUrl)
  const signer = new Wallet(params.env.chainPrivateKey, provider)

  const toAddress = params.env.chainRegistryAddress ?? signer.address
  const txData = buildRegistrationPayloadData({
    artworkId: params.artworkId,
    imageHash: params.imageHash,
    ipfsCid: params.ipfsCid,
  })

  try {
    const txResponse = await signer.sendTransaction({
      to: toAddress,
      data: txData,
      value: 0,
    })

    const receipt = await txResponse.wait(1)
    if (!receipt || receipt.status !== 1) {
      throw new BlockchainRegistrationError(
        'CHAIN_TX_REVERTED',
        'Blockchain transaction was not confirmed successfully.'
      )
    }

    return {
      txHash: txResponse.hash,
      chainName: params.env.chainName,
      protectedAt: new Date().toISOString(),
    }
  } catch (error) {
    throw toBlockchainRegistrationError(error)
  }
}

function buildRegistrationPayloadData(payload: {
  artworkId: string
  imageHash: string
  ipfsCid: string
}): string {
  const message = JSON.stringify({
    app: 'solpim',
    type: 'artwork_protection',
    version: 1,
    artworkId: payload.artworkId,
    imageHash: payload.imageHash,
    ipfsCid: payload.ipfsCid,
  })

  return hexlify(toUtf8Bytes(message))
}

function toBlockchainRegistrationError(error: unknown): BlockchainRegistrationError {
  if (error instanceof BlockchainRegistrationError) {
    return error
  }

  const parsed = error as {
    code?: string
    shortMessage?: string
    message?: string
  }

  const errorCode = mapBlockchainErrorCode(parsed.code)
  const message =
    parsed.shortMessage ?? parsed.message ?? 'Unknown blockchain error.'

  return new BlockchainRegistrationError(errorCode, message)
}

function mapBlockchainErrorCode(code?: string): string {
  if (!code) {
    return 'CHAIN_TX_UNKNOWN'
  }

  if (code === 'INSUFFICIENT_FUNDS') {
    return 'CHAIN_TX_INSUFFICIENT_FUNDS'
  }

  if (code === 'NETWORK_ERROR' || code === 'TIMEOUT') {
    return 'CHAIN_TX_NETWORK_ERROR'
  }

  if (code === 'CALL_EXCEPTION') {
    return 'CHAIN_TX_CALL_EXCEPTION'
  }

  return `CHAIN_TX_${code}`
}
