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
import { listPendingProtectedArtworks } from '@/firebase/firestore'
import { contentContainerSx, contentPageSx } from '@/styles/page'
import type { ProtectedArtworkRecord } from '@/types/blockchain'
import { requestApproveArtworkRegistration } from '@/utils/protection'

function AdminPage() {
  const navigate = useNavigate()
  const [pendingArtworks, setPendingArtworks] = useState<
    ProtectedArtworkRecord[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [isApprovingArtworkId, setIsApprovingArtworkId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const loadPendingArtworks = async () => {
      setIsLoading(true)

      try {
        const artworks = await listPendingProtectedArtworks()
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
      await requestApproveArtworkRegistration({ artworkId, authToken: idToken })

      setSuccessMessage(
        `Artwork ${artworkId} approved. Chain registration is now running in background.`
      )
      const artworks = await listPendingProtectedArtworks()
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
              key={artwork.id}
              spacing={1.25}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 2,
              }}
            >
              <Typography variant="h6">
                {artwork.title || 'Untitled artwork'}
              </Typography>
              <Typography color="text.secondary">
                Artwork ID: {artwork.id}
              </Typography>
              <Typography color="text.secondary">
                Owner: {artwork.ownerUid ?? 'Unknown'}
              </Typography>
              <Typography color="text.secondary">
                Status: {artwork.protection.status}
              </Typography>
              <Typography color="text.secondary">
                Requested at: {artwork.protection.requestedAt ?? 'Unknown'}
              </Typography>
              <Button
                disabled={!isAdmin || isApprovingArtworkId === artwork.id}
                onClick={() => void handleApprove(artwork.id)}
                variant="contained"
              >
                {isApprovingArtworkId === artwork.id
                  ? 'Approving...'
                  : 'Approve'}
              </Button>
              <Button
                onClick={() => navigate(`/artworks/${artwork.id}`)}
                variant="outlined"
              >
                View detail
              </Button>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Box>
  )
}

export default AdminPage
