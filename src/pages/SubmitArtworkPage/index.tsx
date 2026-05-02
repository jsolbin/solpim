import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import type { SelectChangeEvent } from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

import { auth, db } from '@/firebase/config'
import { requestFinalizeUpload, uploadFileDirectly } from '@/utils/protection'

function SubmitArtworkPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [relatedVideo, setRelatedVideo] = useState('')
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [description, setDescription] = useState('')
  const [creationProcess, setCreationProcess] = useState('')
  const [productionStart, setProductionStart] = useState('')
  const [productionEnd, setProductionEnd] = useState('')
  const [availableForSale, setAvailableForSale] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [thumbnailIndex, setThumbnailIndex] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if user is a student
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login')
        return
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        const role = userDoc.data()?.role

        if (role !== 'student') {
          navigate('/login')
        }
      } catch (error) {
        console.error('Failed to check user role:', error)
        navigate('/login')
      }
    })

    return unsubscribe
  }, [navigate])

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files ? Array.from(event.target.files) : []
    setFiles((prev) => [...prev, ...selected])
  }

  const handleRemoveImage = (idx: number) => {
    const newFiles = files.filter((_, i) => i !== idx)
    setFiles(newFiles)
    if (thumbnailIndex >= newFiles.length && thumbnailIndex > 0) {
      setThumbnailIndex(thumbnailIndex - 1)
    }
  }

  const handleMoveImage = (idx: number, direction: 'up' | 'down') => {
    const newFiles = [...files]
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx >= 0 && targetIdx < newFiles.length) {
      ;[newFiles[idx], newFiles[targetIdx]] = [
        newFiles[targetIdx],
        newFiles[idx],
      ]
      setFiles(newFiles)
      if (thumbnailIndex === idx) {
        setThumbnailIndex(targetIdx)
      } else if (thumbnailIndex === targetIdx) {
        setThumbnailIndex(idx)
      }
    }
  }

  const handleSetThumbnail = (idx: number) => {
    setThumbnailIndex(idx)
  }

  const resetForm = () => {
    setTitle('')
    setFiles([])
    setThumbnailIndex(0)
    setRelatedVideo('')
    setCategory('')
    setCustomCategory('')
    setDescription('')
    setCreationProcess('')
    setProductionStart('')
    setProductionEnd('')
    setAvailableForSale(false)
    setTermsAgreed(false)
    setErrorMessage(null)
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    // Clear previous error message
    setErrorMessage(null)

    if (!title.trim()) {
      setErrorMessage('Artwork title is required.')
      return
    }

    if (files.length === 0) {
      setErrorMessage('At least one artwork image is required.')
      return
    }

    if (!category) {
      setErrorMessage('Please select a category.')
      return
    }

    if (category === 'Other' && !customCategory.trim()) {
      setErrorMessage('Please specify your custom category.')
      return
    }

    if (!termsAgreed) {
      setErrorMessage('You must agree to the terms and copyright agreement.')
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    // Prevent double-submission
    if (isSubmitting) {
      setIsSubmitting(false)
      return
    }

    const artworkId = crypto.randomUUID()
    try {
      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) {
        throw new Error('You must be signed in to submit artwork.')
      }

      // Upload all images and collect storage metadata
      const images: Array<{
        contentId: string
        imageName: string
        storage: unknown
      }> = []

      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        const contentId = crypto.randomUUID()
        const resp = await uploadFileDirectly({
          file: f,
          artworkId,
          contentId,
          authToken: idToken,
        })
        images.push({ contentId, imageName: f.name, storage: resp.storage })

        await requestFinalizeUpload({
          payload: {
            artworkId,
            contentId,
            title: title.trim(),
            imageName: f.name,
            storage: resp.storage,
          },
          authToken: idToken,
        })
      }

      const thumbnail = images[thumbnailIndex]
      const finalCategory =
        category === 'Other' ? customCategory.trim() : category
      const artworkDoc = {
        artworkId,
        title: title.trim(),
        images,
        thumbnailContentId: thumbnail?.contentId ?? null,
        relatedVideo: relatedVideo.trim() || null,
        category: finalCategory,
        description: description.trim() || null,
        creationProcess: creationProcess.trim() || null,
        artistName: auth.currentUser?.displayName ?? null,
        productionStart: productionStart || null,
        productionEnd: productionEnd || null,
        availableForSale,
        termsAgreed: true,
        ownerUid: auth.currentUser?.uid ?? null,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }

      await setDoc(doc(db, 'artworks', artworkId), artworkDoc)

      resetForm()
      navigate('/artwork-management')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to submit artwork.'

      if (message.includes('Different contentId')) {
        setErrorMessage(
          'Upload conflict: Please refresh the page and try again with new images.'
        )
      } else {
        setErrorMessage(message)
      }

      setFiles([])
      setThumbnailIndex(0)
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

            <FormControl required error={files.length === 0} fullWidth>
              <Typography sx={{ mb: 1 }}>Artwork images</Typography>
              <Button component="label" variant="outlined" sx={{ py: 2 }}>
                {files.length > 0
                  ? `Add more: ${files.length} file(s) selected`
                  : 'Select image files'}
                <input
                  accept="image/*"
                  hidden
                  multiple
                  onChange={onFileChange}
                  type="file"
                />
              </Button>
              <FormHelperText>
                Click to add more images. Protection runs for every image.
              </FormHelperText>

              {files.length > 0 && (
                <Box
                  sx={{
                    mt: 2,
                    border: '1px solid #ddd',
                    p: 2,
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Images ({files.length})
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 2, display: 'block' }}
                  >
                    Select one image as the thumbnail for gallery display
                  </Typography>
                  <Stack spacing={2}>
                    {files.map((f, idx) => (
                      <Box
                        key={`${f.name}-${idx}`}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          p: 1.5,
                          bgcolor:
                            thumbnailIndex === idx
                              ? 'action.hover'
                              : 'transparent',
                          borderRadius: 1,
                          border:
                            thumbnailIndex === idx
                              ? '2px solid'
                              : '1px solid #ddd',
                          borderColor:
                            thumbnailIndex === idx ? 'primary.main' : undefined,
                        }}
                      >
                        <Avatar
                          variant="rounded"
                          src={URL.createObjectURL(f)}
                          sx={{
                            width: 60,
                            height: 60,
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {f.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(f.size / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                        </Box>

                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="This image will be displayed as gallery thumbnail">
                            <Button
                              variant={
                                thumbnailIndex === idx
                                  ? 'contained'
                                  : 'outlined'
                              }
                              size="small"
                              onClick={() => handleSetThumbnail(idx)}
                              sx={{
                                minWidth: 'auto',
                                px: 1.5,
                              }}
                            >
                              {thumbnailIndex === idx ? '✓ Thumbnail' : 'Set'}
                            </Button>
                          </Tooltip>

                          <Tooltip title="Move up">
                            <Button
                              variant="text"
                              size="small"
                              onClick={() => handleMoveImage(idx, 'up')}
                              disabled={idx === 0}
                              sx={{ minWidth: 32 }}
                            >
                              ↑
                            </Button>
                          </Tooltip>

                          <Tooltip title="Move down">
                            <Button
                              variant="text"
                              size="small"
                              onClick={() => handleMoveImage(idx, 'down')}
                              disabled={idx === files.length - 1}
                              sx={{ minWidth: 32 }}
                            >
                              ↓
                            </Button>
                          </Tooltip>

                          <Tooltip title="Delete image">
                            <Button
                              variant="text"
                              size="small"
                              onClick={() => handleRemoveImage(idx)}
                              sx={{ minWidth: 32, color: 'error.main' }}
                            >
                              ✕
                            </Button>
                          </Tooltip>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </FormControl>

            <TextField
              fullWidth
              label="Related video (URL)"
              onChange={(e) => setRelatedVideo(e.target.value)}
              value={relatedVideo}
            />

            <FormControl fullWidth required>
              <InputLabel id="category-label">Category</InputLabel>
              <Select
                labelId="category-label"
                label="Category"
                value={category}
                onChange={(e: SelectChangeEvent) => {
                  setCategory(e.target.value as string)
                  if (e.target.value !== 'Other') {
                    setCustomCategory('')
                  }
                }}
              >
                <MenuItem value="Architecture">Architecture</MenuItem>
                <MenuItem value="Fine Art">Fine Art</MenuItem>
                <MenuItem value="Sculpture">Sculpture</MenuItem>
                <MenuItem value="Design">Design</MenuItem>
                <MenuItem value="Media Art">Media Art</MenuItem>
                <MenuItem value="Photography">Photography</MenuItem>
                <MenuItem value="Illustration">Illustration</MenuItem>
                <MenuItem value="Animation">Animation</MenuItem>
                <MenuItem value="Fashion">Fashion</MenuItem>
                <MenuItem value="Installation">Installation</MenuItem>
                <MenuItem value="Video Art">Video Art</MenuItem>
                <MenuItem value="Crafts">Crafts</MenuItem>
                <MenuItem value="Digital Art">Digital Art</MenuItem>
                <MenuItem value="Other">Other (specify below)</MenuItem>
              </Select>
            </FormControl>

            {category === 'Other' && (
              <TextField
                fullWidth
                label="Specify your category"
                placeholder="e.g., Textile Art, Ceramics, Jewelry..."
                onChange={(e) => setCustomCategory(e.target.value)}
                value={customCategory}
                required
              />
            )}

            <TextField
              fullWidth
              label="Artwork description"
              multiline
              minRows={3}
              onChange={(e) => setDescription(e.target.value)}
              value={description}
            />

            <TextField
              fullWidth
              label="Creation process"
              multiline
              minRows={2}
              onChange={(e) => setCreationProcess(e.target.value)}
              value={creationProcess}
            />

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 240px' }}>
                <TextField
                  fullWidth
                  label="Production start"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={productionStart}
                  onChange={(e) => setProductionStart(e.target.value)}
                />
              </Box>
              <Box sx={{ flex: '1 1 240px' }}>
                <TextField
                  fullWidth
                  label="Production end"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={productionEnd}
                  onChange={(e) => setProductionEnd(e.target.value)}
                />
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={availableForSale}
                  onChange={(e) => setAvailableForSale(e.target.checked)}
                />
              }
              label="Available for sale"
            />

            <Box>
              <Typography variant="subtitle2">Copyright & Terms</Typography>
              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                - Copyright remains with the artist.
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                - By submitting, you grant the platform a non-exclusive license
                to display and promote your work.
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                - We provide protection against unauthorized reproduction by
                generating image protection metadata on submission.
              </Typography>
            </Box>

            <FormControl required error={!termsAgreed}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                  />
                }
                label="I agree to the Terms of Service & Copyright Agreement"
              />
            </FormControl>

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
