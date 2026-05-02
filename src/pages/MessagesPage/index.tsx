import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, getDocs, query, where } from 'firebase/firestore'

import { auth, db } from '@/firebase/config'
import { contentContainerSx, contentPageSx } from '@/styles/page'
import type { Notification } from '@/types/notification'
import {
  getContactContextLabel,
  getContactIntentLabel,
} from '@/utils/notifications'

type NotificationRecord = Notification & { id: string }

type OwnedArtworkSummary = {
  id: string
  title: string
  likeCount: number
  status: string
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-US')
}

function MessagesPage() {
  const navigate = useNavigate()
  const [currentUserId, setCurrentUserId] = useState('')
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [artworks, setArtworks] = useState<OwnedArtworkSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login')
        return
      }

      setCurrentUserId(user.uid)
    })

    return unsubscribe
  }, [navigate])

  useEffect(() => {
    let isMounted = true

    const loadMessages = async () => {
      if (!currentUserId) {
        return
      }

      setIsLoading(true)
      setErrorMessage('')

      try {
        const notificationSnapshot = await getDocs(
          query(
            collection(db, 'notifications'),
            where('receiverId', '==', currentUserId)
          )
        )

        const loadedNotifications = notificationSnapshot.docs
          .map((snapshot) => ({
            ...(snapshot.data() as Notification),
            id: snapshot.id,
          }))
          .sort(
            (left, right) =>
              new Date(right.createdAt).getTime() -
              new Date(left.createdAt).getTime()
          )

        const artworkSnapshot = await getDocs(
          query(
            collection(db, 'artworks'),
            where('ownerUid', '==', currentUserId)
          )
        )

        const loadedArtworks = (
          await Promise.all(
            artworkSnapshot.docs.map(async (snapshot) => {
              const data = snapshot.data()
              const likesSnapshot = await getDocs(
                query(
                  collection(db, 'likes'),
                  where('artworkId', '==', data.artworkId ?? snapshot.id)
                )
              )

              return {
                id: data.artworkId ?? snapshot.id,
                title: data.title ?? 'Untitled artwork',
                likeCount: likesSnapshot.size,
                status: data.status ?? 'pending',
              }
            })
          )
        ).sort((left, right) => right.likeCount - left.likeCount)

        if (isMounted) {
          setNotifications(loadedNotifications)
          setArtworks(loadedArtworks)
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Failed to load messages.'
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadMessages()

    return () => {
      isMounted = false
    }
  }, [currentUserId])

  const contactNotifications = notifications.filter(
    (notification) => notification.type === 'message'
  )
  const otherNotifications = notifications.filter(
    (notification) => notification.type !== 'message'
  )
  const totalLikeCount = artworks.reduce(
    (sum, artwork) => sum + artwork.likeCount,
    0
  )

  return (
    <Box component="main" sx={contentPageSx}>
      <Stack spacing={4} sx={contentContainerSx}>
        <Stack spacing={1}>
          <Typography variant="overline" color="text.secondary">
            Message box
          </Typography>
          <Typography variant="h3">Contact inbox</Typography>
          <Typography color="text.secondary">
            Contact requests and profile notifications arrive here.
          </Typography>
        </Stack>

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, flex: 1 }}>
            <Typography variant="overline" color="text.secondary">
              My artworks
            </Typography>
            <Typography variant="h4">{artworks.length}</Typography>
            <Typography color="text.secondary">Tracked artworks</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, flex: 1 }}>
            <Typography variant="overline" color="text.secondary">
              Total likes
            </Typography>
            <Typography variant="h4">{totalLikeCount}</Typography>
            <Typography color="text.secondary">
              Likes across all of your artworks
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, flex: 1 }}>
            <Typography variant="overline" color="text.secondary">
              Contact requests
            </Typography>
            <Typography variant="h4">{contactNotifications.length}</Typography>
            <Typography color="text.secondary">Received messages</Typography>
          </Paper>
        </Stack>

        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                spacing={2}
              >
                <Box>
                  <Typography variant="h5">Contact inbox</Typography>
                  <Typography color="text.secondary">
                    Messages from artwork and profile contacts.
                  </Typography>
                </Box>
                <Chip label={`${contactNotifications.length} items`} />
              </Stack>

              {contactNotifications.length > 0 ? (
                <Stack spacing={1.5}>
                  {contactNotifications.map((notification) => (
                    <Paper
                      key={notification.id}
                      variant="outlined"
                      sx={{ p: 2, borderRadius: 2 }}
                    >
                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip
                            label={
                              notification.contextType
                                ? getContactContextLabel(
                                    notification.contextType
                                  )
                                : 'Contact'
                            }
                            size="small"
                            variant="outlined"
                          />
                          {notification.contactIntent ? (
                            <Chip
                              label={getContactIntentLabel(
                                notification.contactIntent
                              )}
                              size="small"
                            />
                          ) : null}
                          <Typography color="text.secondary" variant="caption">
                            {formatDate(notification.createdAt)}
                          </Typography>
                        </Stack>

                        <Typography>{notification.message}</Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : isLoading ? (
                <Typography color="text.secondary">Loading...</Typography>
              ) : (
                <Alert severity="info">No contact messages yet.</Alert>
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                spacing={2}
              >
                <Box>
                  <Typography variant="h5">Notification inbox</Typography>
                  <Typography color="text.secondary">
                    Approval, rejection, and like notifications.
                  </Typography>
                </Box>
                <Chip label={`${otherNotifications.length} items`} />
              </Stack>

              {otherNotifications.length > 0 ? (
                <Stack spacing={1.5}>
                  {otherNotifications.map((notification) => (
                    <Paper
                      key={notification.id}
                      variant="outlined"
                      sx={{ p: 2, borderRadius: 2 }}
                    >
                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip label={notification.type} size="small" />
                          <Typography color="text.secondary" variant="caption">
                            {formatDate(notification.createdAt)}
                          </Typography>
                        </Stack>
                        <Typography>{notification.message}</Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : isLoading ? (
                <Typography color="text.secondary">Loading...</Typography>
              ) : (
                <Alert severity="info">No notifications yet.</Alert>
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h5">My artworks and likes</Typography>
              {artworks.length > 0 ? (
                <Stack spacing={1.5}>
                  {artworks.map((artwork) => (
                    <Paper
                      key={artwork.id}
                      variant="outlined"
                      sx={{ p: 2, borderRadius: 2 }}
                    >
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        justifyContent="space-between"
                        spacing={2}
                      >
                        <Box>
                          <Typography variant="subtitle1">
                            {artwork.title}
                          </Typography>
                          <Typography color="text.secondary" variant="body2">
                            {artwork.status}
                          </Typography>
                        </Box>
                        <Chip label={`Likes ${artwork.likeCount}`} />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : isLoading ? (
                <Typography color="text.secondary">Loading...</Typography>
              ) : (
                <Alert severity="info">
                  You have not uploaded any artworks yet.
                </Alert>
              )}
            </Stack>
          </Paper>
        </Stack>

        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button
            component={RouterLink}
            to={`/profile/${currentUserId}`}
            variant="outlined"
          >
            Back to profile
          </Button>
          <Button component={RouterLink} to="/gallery" variant="outlined">
            Back to gallery
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

export default MessagesPage
