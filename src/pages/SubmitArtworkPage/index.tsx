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
import { requestFinalizeUpload, uploadFileDirectly } from '@/utils/protection'

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
      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) {
        throw new Error('You must be signed in to submit artwork.')
      }

      const { storage } = await uploadFileDirectly({
        file,
        artworkId,
        contentId,
        authToken: idToken,
      })

      await requestFinalizeUpload({
        payload: {
          artworkId,
          contentId,
          title: title.trim(),
          imageName: file.name,
          storage,
        },
        authToken: idToken,
      })

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
          Upload file to backend, generate image hash, and register artwork
          protection.
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
