import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

import { auth, db } from '@/firebase/config'
import { contentContainerSx, contentPageSx } from '@/styles/page'
import type { PendingArtworkGroup } from '@/types/blockchain'
import {
  requestApproveArtworkRegistration,
  requestPendingProtectedArtworks,
} from '@/utils/protection'

function AdminPage() {
  const navigate = useNavigate()
  const [pendingArtworks, setPendingArtworks] = useState<PendingArtworkGroup[]>(
    []
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isApprovingArtworkId, setIsApprovingArtworkId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const loadPendingArtworks = async () => {
      setIsLoading(true)

      try {
        const artworks = await requestPendingProtectedArtworks()
        setPendingArtworks(artworks)
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to load artworks.'
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadPendingArtworks()
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdmin(false)
        return
      }

      const snapshot = await getDoc(doc(db, 'users', user.uid))
      setIsAdmin(snapshot.data()?.role === 'admin')
    })

    return unsubscribe
  }, [])

  const handleApprove = async (artworkId: string) => {
    setErrorMessage('')
    setSuccessMessage('')
    setIsApprovingArtworkId(artworkId)

    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('You must be signed in as an admin.')
      }

      const idToken = await currentUser.getIdToken()
      await requestApproveArtworkRegistration({
        artworkId,
        authToken: idToken,
      })

      setSuccessMessage(
        `Artwork "${pendingArtworks.find((a) => a.artworkId === artworkId)?.title}" approved. Chain registration for all ${pendingArtworks.find((a) => a.artworkId === artworkId)?.images.length} images is now running in background.`
      )
      const artworks = await requestPendingProtectedArtworks()
      setPendingArtworks(artworks)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to approve artwork.'
      )
    } finally {
      setIsApprovingArtworkId('')
    }
  }

  return (
    <Box component="main" sx={contentPageSx}>
      <Stack spacing={4} sx={contentContainerSx}>
        <Typography variant="h3">Admin Page</Typography>
        <Typography color="text.secondary">
          Review uploaded artworks and approve them to start the protection
          pipeline.
        </Typography>

        {!isAdmin ? (
          <Alert severity="warning">
            You must sign in with an admin account to approve artworks.
          </Alert>
        ) : null}

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        {successMessage ? (
          <Alert severity="success">{successMessage}</Alert>
        ) : null}

        <Divider />

        {isLoading ? (
          <Typography>Loading pending artworks...</Typography>
        ) : null}

        {!isLoading && pendingArtworks.length === 0 ? (
          <Alert severity="info">No artworks are waiting for approval.</Alert>
        ) : null}

        <Stack spacing={2}>
          {pendingArtworks.map((artwork) => (
            <Stack
              key={artwork.artworkId}
              spacing={1.5}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 3,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {artwork.title || 'Untitled artwork'}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    Submission ID: {artwork.artworkId}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    Owner: {artwork.ownerUid ?? 'Unknown'}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    backgroundColor: '#e3f2fd',
                    px: 2,
                    py: 0.75,
                    borderRadius: 1,
                    fontWeight: 500,
                  }}
                >
                  {artwork.images.length} image
                  {artwork.images.length !== 1 ? 's' : ''}
                </Typography>
              </Box>

              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Images to register:
                </Typography>
                {artwork.images.map((image, idx) => (
                  <Box
                    key={`${artwork.artworkId}-${idx}`}
                    sx={{
                      p: 1.5,
                      backgroundColor: '#f5f5f5',
                      borderRadius: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {image.imageName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {image.contentId}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        backgroundColor:
                          image.status === 'hashed' ? '#fff3cd' : '#d4edda',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        fontWeight: 500,
                      }}
                    >
                      {image.status}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
                <Button
                  disabled={
                    !isAdmin || isApprovingArtworkId === artwork.artworkId
                  }
                  onClick={() => void handleApprove(artwork.artworkId)}
                  variant="contained"
                  sx={{ flex: 1 }}
                >
                  {isApprovingArtworkId === artwork.artworkId
                    ? 'Approving...'
                    : 'Approve all images'}
                </Button>
                <Button
                  onClick={() => navigate(`/artworks/${artwork.artworkId}`)}
                  variant="outlined"
                  sx={{ flex: 1 }}
                >
                  View submission
                </Button>
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Box>
  )
}

export default AdminPage
