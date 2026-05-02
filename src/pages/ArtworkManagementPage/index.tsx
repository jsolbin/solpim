import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, getDocs, query, where } from 'firebase/firestore'

import { auth, db } from '@/firebase/config'
import { contentContainerSx, contentPageSx } from '@/styles/page'
import type { ArtworkStatus } from '@/types/artwork'

interface UserArtwork {
  artworkId: string
  title: string
  status: ArtworkStatus
  createdAt: string
  category: string
  thumbnailContentId?: string
  rejectionReason?: string
}

function ArtworkManagementPage() {
  const navigate = useNavigate()
  const [artworks, setArtworks] = useState<UserArtwork[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedTab, setSelectedTab] = useState<ArtworkStatus>('pending')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAuthenticated(false)
        navigate('/login')
        return
      }

      setIsAuthenticated(true)
      setIsLoading(true)
      setErrorMessage('')

      try {
        const q = query(
          collection(db, 'artworks'),
          where('ownerUid', '==', user.uid)
        )
        const snapshot = await getDocs(q)
        const loadedArtworks: UserArtwork[] = snapshot.docs
          .map((doc) => ({
            artworkId: doc.data().artworkId,
            title: doc.data().title,
            status: doc.data().status,
            createdAt: doc.data().createdAt,
            category: doc.data().category,
            thumbnailContentId: doc.data().thumbnailContentId,
            rejectionReason: doc.data().rejectionReason,
          }))
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )

        setArtworks(loadedArtworks)
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Failed to load artworks.'
        console.error('Firestore error:', error)

        // Handle permission errors more gracefully
        if (
          errorMsg.includes('permission') ||
          errorMsg.includes('Permission')
        ) {
          setErrorMessage(
            'Firestore permission issue. Please check your Firebase security rules.'
          )
        } else {
          setErrorMessage(errorMsg)
        }
      } finally {
        setIsLoading(false)
      }
    })

    return unsubscribe
  }, [navigate])

  const filteredArtworks = artworks.filter((art) => art.status === selectedTab)

  const getStatusColor = (status: ArtworkStatus) => {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'approved':
        return 'success'
      case 'rejected':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: ArtworkStatus) => {
    switch (status) {
      case 'pending':
        return 'Pending review'
      case 'approved':
        return 'Approved'
      case 'rejected':
        return 'Rejected'
      default:
        return status
    }
  }

  return (
    <Box component="main" sx={contentPageSx}>
      <Stack spacing={4} sx={contentContainerSx}>
        <Typography variant="h3">My Artwork Management</Typography>
        <Typography color="text.secondary">
          Track the status of your submitted artworks and manage them here.
        </Typography>

        {errorMessage && (
          <Alert severity="error">
            {errorMessage}
            <Button
              size="small"
              onClick={() => {
                setErrorMessage('')
                window.location.reload()
              }}
            >
              Retry
            </Button>
          </Alert>
        )}

        {isAuthenticated && (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={selectedTab}
                onChange={(_, newValue) => setSelectedTab(newValue)}
              >
                <Tab label="Pending review" value="pending" />
                <Tab label="Approved" value="approved" />
                <Tab label="Rejected" value="rejected" />
              </Tabs>
            </Box>

            {isLoading ? (
              <Typography color="text.secondary">Loading...</Typography>
            ) : filteredArtworks.length === 0 ? (
              <Box
                sx={{
                  py: 4,
                  textAlign: 'center',
                  backgroundColor: '#f5f5f5',
                  borderRadius: 1,
                }}
              >
                <Typography color="text.secondary" gutterBottom>
                  {selectedTab === 'pending' &&
                    'There are no artworks pending review.'}
                  {selectedTab === 'approved' &&
                    'There are no approved artworks.'}
                  {selectedTab === 'rejected' &&
                    'There are no rejected artworks.'}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/submit')}
                  sx={{ mt: 2 }}
                >
                  Submit Artwork
                </Button>
              </Box>
            ) : (
              <Stack spacing={2}>
                {filteredArtworks.map((artwork) => (
                  <Paper
                    key={artwork.artworkId}
                    sx={{
                      p: 3,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: 3,
                        transform: 'translateY(-2px)',
                      },
                    }}
                    onClick={() => navigate(`/artworks/${artwork.artworkId}`)}
                  >
                    <Stack spacing={2}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" gutterBottom>
                            {artwork.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Category: {artwork.category}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Submitted on:{' '}
                            {new Date(artwork.createdAt).toLocaleDateString(
                              'en-US'
                            )}
                          </Typography>
                        </Box>
                        <Chip
                          label={getStatusLabel(artwork.status)}
                          color={getStatusColor(artwork.status)}
                          variant="outlined"
                        />
                      </Box>

                      {artwork.status === 'rejected' &&
                        artwork.rejectionReason && (
                          <Alert severity="error">
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500 }}
                            >
                              Rejection reason:
                            </Typography>
                            <Typography variant="body2">
                              {artwork.rejectionReason}
                            </Typography>
                          </Alert>
                        )}

                      <Box sx={{ display: 'flex', gap: 1, pt: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/artworks/${artwork.artworkId}`)
                          }}
                        >
                          View details
                        </Button>
                        {artwork.status === 'rejected' && (
                          <Button
                            variant="contained"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate('/submit')
                            }}
                          >
                            Resubmit
                          </Button>
                        )}
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={() => navigate('/gallery')}>
                Back to gallery
              </Button>
              <Button variant="contained" onClick={() => navigate('/submit')}>
                Submit new artwork
              </Button>
            </Box>
          </>
        )}
      </Stack>
    </Box>
  )
}

export default ArtworkManagementPage
