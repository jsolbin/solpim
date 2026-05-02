import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { onAuthStateChanged } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore'

import { auth, db } from '@/firebase/config'
import { contentContainerSx, contentPageSx } from '@/styles/page'
import type { ArtworkStatus } from '@/types/artwork'
import type { NotificationType } from '@/types/notification'
import { requestApproveArtworkRegistration } from '@/utils/protection'

const ROWS_PER_PAGE = 5

interface AdminArtworkImage {
  contentId?: string
  imageName?: string
}

interface AdminArtwork {
  artworkId: string
  title: string
  ownerUid?: string
  status: ArtworkStatus
  category: string
  createdAt: string
  updatedAt?: string
  description?: string
  creationProcess?: string
  rejectionReason?: string
  images: AdminArtworkImage[]
}

function AdminPage() {
  const navigate = useNavigate()
  const [artworks, setArtworks] = useState<AdminArtwork[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<ArtworkStatus>('pending')
  const [pageByCategory, setPageByCategory] = useState<Record<string, number>>(
    {}
  )
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedArtwork, setSelectedArtwork] = useState<AdminArtwork | null>(
    null
  )
  const [isApprovingArtworkId, setIsApprovingArtworkId] = useState('')
  const [isRejectingArtworkId, setIsRejectingArtworkId] = useState('')
  const [rejectTarget, setRejectTarget] = useState<AdminArtwork | null>(null)
  const [rejectReasonInput, setRejectReasonInput] = useState('')
  const [rejectReasonError, setRejectReasonError] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  const loadArtworks = async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const snapshot = await getDocs(collection(db, 'artworks'))
      const loadedArtworks: AdminArtwork[] = snapshot.docs
        .map((docSnapshot) => {
          const data = docSnapshot.data()
          return {
            artworkId: data.artworkId ?? docSnapshot.id,
            title: data.title ?? 'Untitled artwork',
            ownerUid: data.ownerUid,
            status: (data.status ?? 'pending') as ArtworkStatus,
            category: data.category ?? 'Uncategorized',
            createdAt: data.createdAt ?? new Date(0).toISOString(),
            updatedAt: data.updatedAt,
            description: data.description,
            creationProcess: data.creationProcess,
            rejectionReason: data.rejectionReason,
            images: Array.isArray(data.images) ? data.images : [],
          }
        })
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

      setArtworks(loadedArtworks)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load artworks.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadArtworks()
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

  useEffect(() => {
    setPageByCategory({})
  }, [selectedStatus])

  useEffect(() => {
    setPageByCategory({})
  }, [selectedCategory])

  const createAdminNotification = async (options: {
    receiverId?: string
    type: NotificationType
    artworkId: string
    message: string
  }) => {
    const { receiverId, type, artworkId, message } = options
    if (!receiverId) {
      return
    }

    await addDoc(collection(db, 'notifications'), {
      receiverId,
      type,
      message,
      artworkId,
      createdAt: new Date().toISOString(),
      isRead: false,
    })
  }

  const handleApprove = async (artwork: AdminArtwork) => {
    setErrorMessage('')
    setSuccessMessage('')
    setIsApprovingArtworkId(artwork.artworkId)

    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('You must be signed in as an admin.')
      }

      const idToken = await currentUser.getIdToken()
      await requestApproveArtworkRegistration({
        artworkId: artwork.artworkId,
        authToken: idToken,
      })

      await updateDoc(doc(db, 'artworks', artwork.artworkId), {
        status: 'approved',
        rejectionReason: deleteField(),
        updatedAt: new Date().toISOString(),
      })

      await createAdminNotification({
        receiverId: artwork.ownerUid,
        type: 'approval',
        artworkId: artwork.artworkId,
        message: `Your artwork "${artwork.title}" has been approved.`,
      })

      setSuccessMessage(`Artwork "${artwork.title}" approved successfully.`)
      await loadArtworks()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to approve artwork.'
      )
    } finally {
      setIsApprovingArtworkId('')
    }
  }

  const openRejectDialog = (artwork: AdminArtwork) => {
    setRejectTarget(artwork)
    setRejectReasonInput('')
    setRejectReasonError('')
  }

  const closeRejectDialog = () => {
    setRejectTarget(null)
    setRejectReasonInput('')
    setRejectReasonError('')
  }

  const handleReject = async () => {
    if (!rejectTarget) {
      return
    }

    const trimmedReason = rejectReasonInput.trim()
    if (!trimmedReason) {
      setRejectReasonError('Rejection reason is required.')
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setRejectReasonError('')
    setIsRejectingArtworkId(rejectTarget.artworkId)

    try {
      await updateDoc(doc(db, 'artworks', rejectTarget.artworkId), {
        status: 'rejected',
        rejectionReason: trimmedReason,
        updatedAt: new Date().toISOString(),
      })

      await createAdminNotification({
        receiverId: rejectTarget.ownerUid,
        type: 'rejection',
        artworkId: rejectTarget.artworkId,
        message: `Your artwork "${rejectTarget.title}" was rejected. Reason: ${trimmedReason}`,
      })

      setSuccessMessage(`Artwork "${rejectTarget.title}" rejected.`)
      closeRejectDialog()
      await loadArtworks()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to reject artwork.'
      )
    } finally {
      setIsRejectingArtworkId('')
    }
  }

  const filteredArtworks = artworks.filter(
    (artwork) => artwork.status === selectedStatus
  )

  const groupedArtworks = filteredArtworks.reduce<
    Record<string, AdminArtwork[]>
  >((acc, artwork) => {
    const categoryKey = artwork.category || 'Uncategorized'
    acc[categoryKey] = [...(acc[categoryKey] ?? []), artwork]
    return acc
  }, {})

  const orderedCategories = Object.keys(groupedArtworks).sort((a, b) =>
    a.localeCompare(b)
  )

  const categoriesToRender =
    selectedCategory === 'all'
      ? orderedCategories
      : orderedCategories.includes(selectedCategory)
        ? [selectedCategory]
        : []

  const getStatusChipColor = (status: ArtworkStatus) => {
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

  return (
    <Box component="main" sx={contentPageSx}>
      <Stack spacing={4} sx={contentContainerSx}>
        <Typography variant="h3">Admin Page</Typography>
        <Typography color="text.secondary">
          Review submitted artworks by status and category. You can approve or
          reject pending submissions with a required rejection reason.
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

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={selectedStatus}
            onChange={(_, nextValue) =>
              setSelectedStatus(nextValue as ArtworkStatus)
            }
          >
            <Tab label="Pending" value="pending" />
            <Tab label="Approved" value="approved" />
            <Tab label="Rejected" value="rejected" />
          </Tabs>
        </Box>

        {isLoading ? <Typography>Loading artworks...</Typography> : null}

        {!isLoading && filteredArtworks.length === 0 ? (
          <Alert severity="info">
            No artworks found for the selected status.
          </Alert>
        ) : null}

        <Stack spacing={2}>
          {!isLoading && (
            <Paper
              sx={{
                px: 2,
                py: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="h6">Category</Typography>
              <FormControl sx={{ minWidth: 260 }} size="small">
                <InputLabel id="admin-category-select-label">
                  Category
                </InputLabel>
                <Select
                  labelId="admin-category-select-label"
                  value={selectedCategory}
                  label="Category"
                  onChange={(e) =>
                    setSelectedCategory(e.target.value as string)
                  }
                >
                  <MenuItem value="all">
                    All ({filteredArtworks.length})
                  </MenuItem>
                  {orderedCategories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat} ({groupedArtworks[cat]?.length ?? 0})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>
          )}
          {!isLoading &&
            categoriesToRender.map((category) => {
              const categoryArtworks = groupedArtworks[category]
              const page = pageByCategory[category] ?? 0
              const pagedRows = categoryArtworks.slice(
                page * ROWS_PER_PAGE,
                page * ROWS_PER_PAGE + ROWS_PER_PAGE
              )

              return (
                <Paper key={category} sx={{ overflow: 'hidden' }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ px: 2.5, py: 2 }}
                  >
                    <Typography variant="h6">{category}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {categoryArtworks.length} item
                      {categoryArtworks.length > 1 ? 's' : ''}
                    </Typography>
                  </Stack>

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Title</TableCell>
                          <TableCell>Owner</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Submitted</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pagedRows.map((artwork) => (
                          <TableRow
                            key={artwork.artworkId}
                            hover
                            onClick={() => setSelectedArtwork(artwork)}
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell>
                              <Typography sx={{ fontWeight: 500 }}>
                                {artwork.title}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                ID: {artwork.artworkId}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {artwork.ownerUid ?? 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={artwork.status}
                                color={getStatusChipColor(artwork.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {new Date(artwork.createdAt).toLocaleString(
                                'en-US'
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Stack
                                direction="row"
                                spacing={1}
                                justifyContent="flex-end"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => setSelectedArtwork(artwork)}
                                >
                                  Detail
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() =>
                                    navigate(`/artworks/${artwork.artworkId}`)
                                  }
                                >
                                  Open page
                                </Button>
                                {artwork.status === 'pending' ? (
                                  <>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      disabled={
                                        !isAdmin ||
                                        isApprovingArtworkId ===
                                          artwork.artworkId
                                      }
                                      onClick={() =>
                                        void handleApprove(artwork)
                                      }
                                    >
                                      {isApprovingArtworkId ===
                                      artwork.artworkId
                                        ? 'Approving...'
                                        : 'Approve'}
                                    </Button>
                                    <Button
                                      size="small"
                                      color="error"
                                      variant="outlined"
                                      disabled={
                                        !isAdmin ||
                                        isRejectingArtworkId ===
                                          artwork.artworkId
                                      }
                                      onClick={() => openRejectDialog(artwork)}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                ) : null}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    component="div"
                    count={categoryArtworks.length}
                    page={Math.min(
                      page,
                      Math.max(
                        Math.ceil(categoryArtworks.length / ROWS_PER_PAGE) - 1,
                        0
                      )
                    )}
                    onPageChange={(_, nextPage) =>
                      setPageByCategory((prev) => ({
                        ...prev,
                        [category]: nextPage,
                      }))
                    }
                    rowsPerPage={ROWS_PER_PAGE}
                    rowsPerPageOptions={[ROWS_PER_PAGE]}
                  />
                </Paper>
              )
            })}
        </Stack>

        <Dialog
          open={Boolean(selectedArtwork)}
          onClose={() => setSelectedArtwork(null)}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>Artwork detail</DialogTitle>
          <DialogContent>
            {selectedArtwork ? (
              <Stack spacing={2} sx={{ pt: 1 }}>
                <Typography variant="h6">{selectedArtwork.title}</Typography>
                <Typography color="text.secondary">
                  ID: {selectedArtwork.artworkId}
                </Typography>
                <Typography color="text.secondary">
                  Category: {selectedArtwork.category}
                </Typography>
                <Typography color="text.secondary">
                  Owner: {selectedArtwork.ownerUid ?? 'Unknown'}
                </Typography>
                <Typography color="text.secondary">
                  Submitted:{' '}
                  {new Date(selectedArtwork.createdAt).toLocaleString('en-US')}
                </Typography>
                <Typography>
                  Description: {selectedArtwork.description || 'No description'}
                </Typography>
                <Typography>
                  Creation process:{' '}
                  {selectedArtwork.creationProcess || 'No creation process'}
                </Typography>
                {selectedArtwork.rejectionReason ? (
                  <Alert severity="error">
                    Rejection reason: {selectedArtwork.rejectionReason}
                  </Alert>
                ) : null}

                <Divider />

                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Uploaded images ({selectedArtwork.images.length})
                </Typography>
                {selectedArtwork.images.length === 0 ? (
                  <Typography color="text.secondary">
                    No image metadata
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {selectedArtwork.images.map((image, index) => (
                      <Box
                        key={`${selectedArtwork.artworkId}-${index}`}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          p: 1.5,
                        }}
                      >
                        <Typography sx={{ fontWeight: 500 }}>
                          {image.imageName || `Image ${index + 1}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Content ID: {image.contentId ?? 'N/A'}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Stack>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedArtwork(null)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={Boolean(rejectTarget)}
          onClose={closeRejectDialog}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Reject artwork</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography color="text.secondary">
                Artwork: {rejectTarget?.title}
              </Typography>
              <TextField
                label="Rejection reason"
                value={rejectReasonInput}
                onChange={(event) => setRejectReasonInput(event.target.value)}
                error={Boolean(rejectReasonError)}
                helperText={
                  rejectReasonError || 'This reason will be sent to the artist.'
                }
                required
                multiline
                minRows={3}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={closeRejectDialog}
              disabled={Boolean(isRejectingArtworkId)}
            >
              Cancel
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => void handleReject()}
              disabled={Boolean(isRejectingArtworkId)}
            >
              {isRejectingArtworkId ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  )
}

export default AdminPage
