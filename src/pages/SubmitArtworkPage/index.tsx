import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import {
  createMockIpfsCid,
  createMockStorageReference,
  generateImageHash,
  registerArtworkProtectionMock,
  saveProtectedArtwork,
} from '@/utils/protection'

function SubmitArtworkPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [simulateFailure, setSimulateFailure] = useState(false)
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

    try {
      const imageHash = await generateImageHash(file)
      const storage = createMockStorageReference(artworkId, file.name)
      const ipfsCid = createMockIpfsCid(imageHash)

      const pendingRecord = {
        id: artworkId,
        title: title.trim(),
        imageName: file.name,
        createdAt: new Date().toISOString(),
        protection: {
          imageHash,
          storage,
          ipfsCid,
          status: 'pending' as const,
        },
      }

      saveProtectedArtwork(pendingRecord)

      try {
        const registered = await registerArtworkProtectionMock({
          imageHash,
          ipfsCid,
          shouldFail: simulateFailure,
        })

        saveProtectedArtwork({
          ...pendingRecord,
          protection: {
            ...pendingRecord.protection,
            ...registered,
          },
        })
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown protection registration error.'

        saveProtectedArtwork({
          ...pendingRecord,
          protection: {
            ...pendingRecord.protection,
            status: 'failed',
            chainName: 'polygon-amoy',
            errorMessage: message,
          },
        })
      }

      navigate(`/artworks/${artworkId}`)
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
          MVP flow: generate image hash, attach S3/IPFS metadata, and run mock
          blockchain registration.
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

            <FormControlLabel
              control={
                <Checkbox
                  checked={simulateFailure}
                  onChange={(event) => setSimulateFailure(event.target.checked)}
                />
              }
              label="Simulate blockchain registration failure"
            />

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
