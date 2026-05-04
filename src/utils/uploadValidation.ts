export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const
export const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024

function getFileExtension(fileName: string): string {
  const trimmedFileName = fileName.trim().toLowerCase()
  const lastDotIndex = trimmedFileName.lastIndexOf('.')

  if (lastDotIndex === -1 || lastDotIndex === trimmedFileName.length - 1) {
    return ''
  }

  return trimmedFileName.slice(lastDotIndex + 1)
}

export function isAllowedImageFile(file: File): boolean {
  return ALLOWED_IMAGE_EXTENSIONS.includes(
    getFileExtension(file.name) as (typeof ALLOWED_IMAGE_EXTENSIONS)[number]
  )
}

export function isAllowedImageFileSize(file: File): boolean {
  return file.size <= MAX_IMAGE_FILE_SIZE_BYTES
}
