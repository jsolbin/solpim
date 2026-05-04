import test from 'node:test'
import assert from 'node:assert/strict'

import { HttpError } from './httpError'
import {
  MAX_IMAGE_FILE_SIZE_BYTES,
  isAllowedImageExtension,
  validateImageUploadInput,
  validateRequiredString,
  validateS3StorageReference,
} from './validation'

test('validateRequiredString trims valid values', () => {
  assert.equal(validateRequiredString('  title  ', 'title'), 'title')
})

test('validateRequiredString rejects empty values', () => {
  assert.throws(
    () => validateRequiredString('   ', 'title'),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 400 &&
      error.message === 'title is required.'
  )
})

test('allows supported image extensions', () => {
  assert.equal(isAllowedImageExtension('poster.jpg'), true)
  assert.equal(isAllowedImageExtension('poster.png'), true)
  assert.equal(isAllowedImageExtension('poster.WEBP'), true)
})

test('rejects unsupported image extensions', () => {
  assert.equal(isAllowedImageExtension('poster.gif'), false)
  assert.throws(
    () => validateImageUploadInput('poster.gif', 1024),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 400 &&
      error.message.includes('Unsupported image extension')
  )
})

test('rejects oversized files', () => {
  assert.throws(
    () =>
      validateImageUploadInput('poster.jpg', MAX_IMAGE_FILE_SIZE_BYTES + 1),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 400 &&
      error.message.includes('File size exceeds')
  )
})

test('validates s3 storage payload shape', () => {
  assert.deepEqual(
    validateS3StorageReference({
      provider: 's3',
      bucketName: 'bucket',
      objectKey: 'artworks/a1/c1-image.jpg',
      region: 'ap-northeast-2',
    }),
    {
      provider: 's3',
      bucketName: 'bucket',
      objectKey: 'artworks/a1/c1-image.jpg',
      region: 'ap-northeast-2',
    }
  )
})

test('rejects non-s3 storage providers', () => {
  assert.throws(
    () =>
      validateS3StorageReference({
        provider: 'gcs',
        bucketName: 'bucket',
        objectKey: 'artworks/a1/c1-image.jpg',
        region: 'ap-northeast-2',
      }),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 400 &&
      error.message === 'storage.provider must be s3.'
  )
})
