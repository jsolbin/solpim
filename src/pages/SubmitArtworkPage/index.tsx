import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { auth } from '@/firebase/config'
import {
  generateImageHash,
  requestPresignedUpload,
  saveProtectedArtwork,
  uploadFileToPresignedUrl,
} from '@/utils/protection'

function SubmitArtworkPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    setFile(selected)
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!title.trim() || !file) {
      setErrorMessage('Title and image file are required.')
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    const artworkId = crypto.randomUUID()
    const contentId = crypto.randomUUID()
    try {
      const idToken = auth.currentUser
        ? await auth.currentUser.getIdToken()
        : undefined

      const { storage, uploadUrl } = await requestPresignedUpload({
        payload: {
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          artworkId,
          contentId,
        },
        authToken: idToken,
      })

      await uploadFileToPresignedUrl({ uploadUrl, file })

      const imageHash = await generateImageHash(file)
      const mockIpfsCid = `bafy${imageHash.slice(0, 40)}`

      const now = new Date().toISOString()
      const txSuffix = imageHash.slice(0, 8)
      const cidSuffix = mockIpfsCid.slice(0, 6)

      const protectedRecord = {
        id: artworkId,
        title: title.trim(),
        imageName: file.name,
        createdAt: now,
        protection: {
          imageHash,
          storage,
          ipfsCid: mockIpfsCid,
          status: 'registered' as const,
          blockchainTxHash: `0xmock${txSuffix}${cidSuffix}${Date.now().toString(16)}`,
          chainName: 'polygon-amoy',
          protectedAt: now,
        },
      }

      saveProtectedArtwork(protectedRecord)

      navigate(`/artworks/${artworkId}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to submit artwork.'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box
      component="main"
      sx={{ minHeight: '100vh', px: { xs: 3, md: 5 }, py: 6 }}
    >
      <Stack spacing={3} sx={{ maxWidth: 680, mx: 'auto' }}>
        <Typography variant="h4">Submit Artwork</Typography>
        <Typography color="text.secondary">
          Upload to S3 via presigned URL, generate image hash, and register
          artwork protection.
        </Typography>

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2.5}>
            <TextField
              fullWidth
              label="Artwork title"
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
            <Button component="label" variant="outlined">
              {file ? `Selected: ${file.name}` : 'Select image file'}
              <input
                accept="image/*"
                hidden
                onChange={onFileChange}
                type="file"
              />
            </Button>

            {errorMessage ? (
              <Alert severity="error">{errorMessage}</Alert>
            ) : null}

            <Button disabled={isSubmitting} type="submit" variant="contained">
              {isSubmitting ? 'Submitting...' : 'Submit artwork'}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  )
}

export default SubmitArtworkPage
