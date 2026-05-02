import { useEffect, useState } from 'react'
import {
  Link as RouterLink,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'

import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined'
import Masonry from '@mui/lab/Masonry'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { onAuthStateChanged } from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore'

import ContactDialog from '@/components/ContactDialog'
import { DEFAULT_PROFILE_IMAGE_URL } from '@/constants/profileIcons'
import { auth, db } from '@/firebase/config'
import { contentContainerSx, contentPageSx } from '@/styles/page'
import type { Artwork } from '@/types/artwork'
import type {
  ProtectedArtworkRecord,
  S3ObjectReference,
} from '@/types/blockchain'
import type { ContactIntent } from '@/types/notification'
import { createContactNotification } from '@/utils/notifications'
import { requestProtectedArtworkStatus } from '@/utils/protection'

type ArtworkImage = {
  contentId?: string
  imageName?: string
  storage?: S3ObjectReference
}

type ArtworkDoc = {
  artworkId?: string
  ownerUid?: string
  title?: string
  category?: string
  description?: string
  creationProcess?: string
  relatedVideo?: string
  productionStart?: string
  productionEnd?: string
  productionYear?: number
  availableForSale?: boolean
  images?: ArtworkImage[]
  thumbnailContentId?: string | null
  artistName?: string | null
  createdAt?: string
  likeCount?: number
}

type ArtistProfile = {
  id: string
  name: string
  profileImageUrl: string
  backgroundImageUrl?: string
  role?: string
  university?: string
  department?: string
}

const statusChipColor = {
  upload_requested: 'info',
  uploaded: 'warning',
  hashing: 'warning',
  hashed: 'info',
  pinned: 'info',
  chain_pending: 'warning',
  registered: 'success',
  failed: 'error',
} as const

function resolveStorageUrl(storage?: S3ObjectReference): Promise<string> {
  const fallbackUrl = '/primary_default.png'

  if (!storage?.bucketName || !storage.objectKey) {
    return Promise.resolve(fallbackUrl)
  }

  const endpoint = import.meta.env.VITE_PRESIGNED_DOWNLOAD_ENDPOINT

  if (!endpoint) {
    return Promise.resolve(fallbackUrl)
  }

  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bucketName: storage.bucketName,
      objectKey: storage.objectKey,
    }),
  })
    .then(async (response) => {
      if (!response.ok) {
        return fallbackUrl
      }

      const payload = (await response.json()) as { url?: string }
      return payload.url || fallbackUrl
    })
    .catch(() => fallbackUrl)
}

function buildVideoEmbedUrl(videoUrl?: string) {
  if (!videoUrl) {
    return ''
  }

  try {
    const url = new URL(videoUrl)

    if (url.hostname.includes('youtu.be')) {
      const videoId = url.pathname.replace('/', '')
      return videoId ? `https://www.youtube.com/embed/${videoId}` : ''
    }

    if (url.hostname.includes('youtube.com')) {
      const videoId = url.searchParams.get('v')
      return videoId ? `https://www.youtube.com/embed/${videoId}` : ''
    }

    if (url.hostname.includes('vimeo.com')) {
      const videoId = url.pathname.split('/').filter(Boolean).at(-1)
      return videoId ? `https://player.vimeo.com/video/${videoId}` : ''
    }

    return videoUrl
  } catch {
    return ''
  }
}

function formatProductionPeriod(artwork: ArtworkDoc) {
  const start = artwork.productionStart?.trim()
  const end = artwork.productionEnd?.trim()

  if (start && end) {
    return `${start} - ${end}`
  }

  if (start) {
    return start
  }

  if (artwork.productionYear) {
    return String(artwork.productionYear)
  }

  return 'Not specified'
}

function mapArtworkState(artwork: Artwork): ArtworkDoc {
  return {
    artworkId: artwork.id,
    ownerUid: artwork.artistId,
    title: artwork.title,
    category: artwork.categoryId,
    description: artwork.description,
    creationProcess: artwork.creationProcess,
    relatedVideo: artwork.videoUrl,
    productionStart: artwork.productionStartDate,
    productionEnd: artwork.productionEndDate,
    productionYear: artwork.productionYear,
    availableForSale: artwork.isForSale,
    images: artwork.contents
      .filter((content) => content.type === 'image')
      .map((content) => ({
        contentId: content.id,
        imageName: content.alt,
        storage: content.originalStorage,
      })),
    thumbnailContentId: artwork.contents.find(
      (content) => content.thumbnailUrl || content.displayUrl
    )?.id,
    artistName: artwork.artist.name,
    createdAt: artwork.createdAt,
    likeCount: artwork.likeCount,
  }
}

function ArtworkDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const navState = location.state as { artwork?: Artwork } | null

  const [artwork, setArtwork] = useState<ArtworkDoc | null>(null)
  const [artist, setArtist] = useState<ArtistProfile | null>(null)
  const [protection, setProtection] = useState<ProtectedArtworkRecord | null>(
    null
  )
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [likedArtworkIds, setLikedArtworkIds] = useState<string[]>([])
  const [likeCount, setLikeCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingLike, setIsUpdatingLike] = useState(false)
  const [noticeMessage, setNoticeMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUserId(user?.uid ?? null)

      if (!user) {
        setLikedArtworkIds([])
        return
      }

      try {
        const likedSnapshot = await getDocs(
          query(collection(db, 'likes'), where('userId', '==', user.uid))
        )

        setLikedArtworkIds(
          likedSnapshot.docs
            .map((snapshot) => snapshot.data())
            .map((record) => record.artworkId)
            .filter((value): value is string => typeof value === 'string')
        )
      } catch {
        setLikedArtworkIds([])
      }
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadArtwork = async () => {
      setIsLoading(true)
      setErrorMessage('')
      setNoticeMessage('')

      try {
        const snapshot = await getDoc(doc(db, 'artworks', id))
        const stateArtwork = navState?.artwork
          ? mapArtworkState(navState.artwork)
          : null
        const nextArtwork = snapshot.exists()
          ? (snapshot.data() as ArtworkDoc)
          : stateArtwork

        if (!nextArtwork) {
          if (isMounted) {
            setArtwork(null)
            setArtist(null)
            setProtection(null)
            setImageUrls([])
          }
          return
        }

        const normalizedArtwork: ArtworkDoc = {
          ...nextArtwork,
          artworkId: nextArtwork.artworkId ?? id,
        }

        const images = normalizedArtwork.images ?? []
        const thumbnailContentId = normalizedArtwork.thumbnailContentId
        const orderedImages = [...images].sort((left, right) => {
          if (left.contentId === thumbnailContentId) {
            return -1
          }

          if (right.contentId === thumbnailContentId) {
            return 1
          }

          return 0
        })

        const nextImageUrls = await Promise.all(
          orderedImages.map(async (image) => {
            const resolvedUrl = await resolveStorageUrl(image.storage)
            return resolvedUrl
          })
        )

        if (isMounted) {
          setArtwork(normalizedArtwork)
          setLikeCount(normalizedArtwork.likeCount ?? 0)
          setImageUrls(
            nextImageUrls.length > 0
              ? nextImageUrls
              : normalizedArtwork.images?.length
                ? []
                : normalizedArtwork.relatedVideo
                  ? []
                  : [navState?.artwork?.thumbnailUrl ?? '/primary_default.png']
          )
        }

        const ownerUid = normalizedArtwork.ownerUid
        if (ownerUid) {
          try {
            const artistSnapshot = await getDoc(doc(db, 'users', ownerUid))
            const artistData = artistSnapshot.data()

            if (isMounted && artistData) {
              setArtist({
                id: ownerUid,
                name:
                  typeof artistData.name === 'string' && artistData.name.trim()
                    ? artistData.name
                    : normalizedArtwork.artistName || 'Unknown artist',
                profileImageUrl:
                  typeof artistData.profileImageUrl === 'string' &&
                  artistData.profileImageUrl.trim()
                    ? artistData.profileImageUrl
                    : DEFAULT_PROFILE_IMAGE_URL,
                backgroundImageUrl:
                  typeof artistData.backgroundImageUrl === 'string'
                    ? artistData.backgroundImageUrl
                    : undefined,
                role:
                  typeof artistData.role === 'string'
                    ? artistData.role
                    : undefined,
                university:
                  typeof artistData.university === 'string'
                    ? artistData.university
                    : undefined,
                department:
                  typeof artistData.department === 'string'
                    ? artistData.department
                    : undefined,
              })
            }
          } catch {
            if (isMounted) {
              setArtist(
                normalizedArtwork.artistName
                  ? {
                      id: ownerUid,
                      name: normalizedArtwork.artistName,
                      profileImageUrl: DEFAULT_PROFILE_IMAGE_URL,
                    }
                  : null
              )
            }
          }
        }

        try {
          const likeSnapshot = await getDocs(
            query(
              collection(db, 'likes'),
              where('artworkId', '==', normalizedArtwork.artworkId ?? id)
            )
          )

          if (isMounted) {
            setLikeCount(likeSnapshot.size)
          }
        } catch {
          if (isMounted) {
            setLikeCount(normalizedArtwork.likeCount ?? 0)
          }
        }

        try {
          const protectionRecord = await requestProtectedArtworkStatus({
            artworkId: normalizedArtwork.artworkId ?? id,
          })

          if (isMounted) {
            setProtection(protectionRecord)
          }
        } catch (protectionError) {
          if (isMounted) {
            setProtection(null)
            setNoticeMessage(
              protectionError instanceof Error
                ? protectionError.message
                : 'Blockchain protection status is temporarily unavailable.'
            )
          }
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Failed to load artwork detail.'
          )
          setArtwork(null)
          setArtist(null)
          setProtection(null)
          setImageUrls([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadArtwork()

    return () => {
      isMounted = false
    }
  }, [id, navState?.artwork])

  const isLiked = Boolean(id && likedArtworkIds.includes(id))
  const displayImages =
    imageUrls.length > 0
      ? imageUrls
      : navState?.artwork?.thumbnailUrl
        ? [navState.artwork.thumbnailUrl]
        : artwork?.images?.length
          ? ['/primary_default.png']
          : []

  const handleToggleLike = async () => {
    if (!currentUserId) {
      navigate('/login')
      return
    }

    if (!id || isUpdatingLike) {
      return
    }

    setIsUpdatingLike(true)
    setErrorMessage('')

    const nextLiked = isLiked
      ? likedArtworkIds.filter((artworkId) => artworkId !== id)
      : [...likedArtworkIds, id]
    const likeDocId = `${currentUserId}_${id}`

    try {
      if (isLiked) {
        await deleteDoc(doc(db, 'likes', likeDocId))
      } else {
        await setDoc(doc(db, 'likes', likeDocId), {
          userId: currentUserId,
          artworkId: id,
          createdAt: new Date().toISOString(),
        })
      }

      setLikedArtworkIds(nextLiked)
      setLikeCount((currentCount) =>
        Math.max(0, currentCount + (isLiked ? -1 : 1))
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update like.'
      )
    } finally {
      setIsUpdatingLike(false)
    }
  }

  const handleShare = async () => {
    const shareUrl = window.location.href

    try {
      await navigator.clipboard.writeText(shareUrl)
      setNoticeMessage('Link copied to clipboard.')
    } catch {
      setNoticeMessage('Failed to copy link to clipboard.')
    }
  }

  const handleContactArtist = async (contactIntent: ContactIntent) => {
    if (!currentUserId) {
      navigate('/login')
      return
    }

    if (!artist?.id || !artwork?.artworkId) {
      return
    }

    await createContactNotification({
      receiverId: artist.id,
      senderId: currentUserId,
      senderName:
        auth.currentUser?.displayName || auth.currentUser?.email || 'User',
      contextType: 'artwork',
      contactIntent,
      artworkId: artwork.artworkId,
      artworkTitle: artwork.title,
    })

    setNoticeMessage('Contact request sent.')
  }

  const protectionStatus = protection?.protection.status
  const protectionStatusLabel = protectionStatus
    ? protectionStatus.replace(/_/g, ' ').toUpperCase()
    : 'NOT AVAILABLE'

  const protectionSummary = protection?.protection

  if (isLoading) {
    return (
      <Box component="main" sx={contentPageSx}>
        <Stack spacing={4} sx={contentContainerSx}>
          <Typography variant="h3">Artwork Detail</Typography>
          <Typography color="text.secondary">Loading artwork...</Typography>
        </Stack>
      </Box>
    )
  }

  if (!artwork) {
    return (
      <Box component="main" sx={contentPageSx}>
        <Stack spacing={4} sx={contentContainerSx}>
          <Typography variant="h3">Artwork Detail</Typography>
          <Alert severity="info">
            No stored record found for this artwork.
          </Alert>
        </Stack>
      </Box>
    )
  }

  return (
    <Box component="main" sx={contentPageSx}>
      <Stack spacing={4} sx={contentContainerSx}>
        <Stack spacing={1.5}>
          <Typography variant="overline" color="text.secondary">
            Artwork detail
          </Typography>
          <Typography variant="h3">
            {artwork.title ?? 'Untitled artwork'}
          </Typography>
          <Stack direction="row" flexWrap="wrap" spacing={1}>
            {artwork.category ? <Chip label={artwork.category} /> : null}
            <Chip
              label={artwork.availableForSale ? 'For sale' : 'Not for sale'}
              color={artwork.availableForSale ? 'success' : 'default'}
              variant="outlined"
            />
            <Chip label={`Likes ${likeCount}`} variant="outlined" />
          </Stack>
        </Stack>

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        {noticeMessage ? <Alert severity="info">{noticeMessage}</Alert> : null}

        <Stack
          alignItems="flex-start"
          direction={{ xs: 'column', lg: 'row' }}
          spacing={4}
        >
          <Box sx={{ flex: 1.4, minWidth: 0, width: '100%' }}>
            {displayImages.length > 0 ? (
              <Masonry columns={{ xs: 1, sm: 2 }} spacing={2.25}>
                {displayImages.map((imageUrl, index) => (
                  <Box
                    key={`${imageUrl}-${index}`}
                    component="img"
                    src={imageUrl}
                    alt={`${artwork.title ?? 'Artwork'} image ${index + 1}`}
                    onError={(event) => {
                      const imageElement = event.target as HTMLImageElement
                      imageElement.src = '/primary_default.png'
                    }}
                    sx={{
                      width: '100%',
                      display: 'block',
                      borderRadius: 3,
                      overflow: 'hidden',
                      boxShadow: '0 16px 36px rgba(15, 23, 42, 0.12)',
                    }}
                  />
                ))}
              </Masonry>
            ) : (
              <Paper
                variant="outlined"
                sx={{
                  p: 4,
                  borderRadius: 3,
                  textAlign: 'center',
                }}
              >
                <Typography color="text.secondary">
                  No artwork images are available.
                </Typography>
              </Paper>
            )}

            {artwork.relatedVideo ? (
              <Paper
                variant="outlined"
                sx={{ mt: 3, p: { xs: 2, md: 3 }, borderRadius: 3 }}
              >
                <Stack spacing={2}>
                  <Typography variant="h6">Related video</Typography>
                  {buildVideoEmbedUrl(artwork.relatedVideo) ? (
                    <Box
                      sx={{
                        position: 'relative',
                        overflow: 'hidden',
                        borderRadius: 2,
                        pt: '56.25%',
                      }}
                    >
                      <Box
                        component="iframe"
                        src={buildVideoEmbedUrl(artwork.relatedVideo)}
                        title={`${artwork.title ?? 'Artwork'} video`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          border: 0,
                        }}
                      />
                    </Box>
                  ) : (
                    <Link
                      href={artwork.relatedVideo}
                      target="_blank"
                      rel="noreferrer"
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      Open related video
                      <OpenInNewIcon fontSize="small" />
                    </Link>
                  )}
                </Stack>
              </Paper>
            ) : null}
          </Box>

          <Box
            sx={{
              flex: 0.85,
              minWidth: 0,
              width: '100%',
              position: { lg: 'sticky' },
              top: { lg: 24 },
            }}
          >
            <Stack spacing={2.5}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                <Stack spacing={2}>
                  <Stack alignItems="center" direction="row" spacing={1.5}>
                    <Avatar
                      src={artist?.profileImageUrl}
                      alt={artist?.name ?? artwork.artistName ?? 'Artist'}
                      sx={{ width: 56, height: 56 }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="overline" color="text.secondary">
                        Artist
                      </Typography>
                      <Typography
                        component={RouterLink}
                        to={artist?.id ? `/artists/${artist.id}` : '#'}
                        sx={{
                          display: 'block',
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          color: 'text.primary',
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {artist?.name ?? artwork.artistName ?? 'Unknown artist'}
                      </Typography>
                      {artist?.university || artist?.department ? (
                        <Typography variant="body2" color="text.secondary">
                          {[artist.university, artist.department]
                            .filter(Boolean)
                            .join(' · ')}
                        </Typography>
                      ) : null}
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    <Button
                      fullWidth
                      variant={isLiked ? 'contained' : 'outlined'}
                      onClick={handleToggleLike}
                      disabled={isUpdatingLike}
                      startIcon={
                        isLiked ? <FavoriteIcon /> : <FavoriteBorderIcon />
                      }
                    >
                      {currentUserId
                        ? isLiked
                          ? 'Liked'
                          : 'Like'
                        : 'Sign in to like'}
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={handleShare}
                      startIcon={<ShareOutlinedIcon />}
                    >
                      Share
                    </Button>
                  </Stack>

                  {artist?.id && artist.id !== currentUserId ? (
                    <Button
                      fullWidth
                      onClick={() => setIsContactDialogOpen(true)}
                      variant="contained"
                    >
                      Contact artist
                    </Button>
                  ) : null}
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                <Stack spacing={2.25}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Category
                    </Typography>
                    <Typography>
                      {artwork.category ?? 'Not specified'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Artwork description
                    </Typography>
                    <Typography sx={{ whiteSpace: 'pre-line' }}>
                      {artwork.description?.trim() ||
                        'No description provided.'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Creation process
                    </Typography>
                    <Typography sx={{ whiteSpace: 'pre-line' }}>
                      {artwork.creationProcess?.trim() ||
                        'No creation process provided.'}
                    </Typography>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Production period
                    </Typography>
                    <Typography>{formatProductionPeriod(artwork)}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Sale availability
                    </Typography>
                    <Typography>
                      {artwork.availableForSale
                        ? 'Available for sale'
                        : 'Not available for sale'}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                <Stack spacing={1.5}>
                  <Typography variant="h6">
                    Blockchain protection status
                  </Typography>
                  <Chip
                    color={
                      protectionStatus
                        ? statusChipColor[protectionStatus]
                        : 'default'
                    }
                    label={protectionStatusLabel}
                    sx={{ width: 'fit-content' }}
                  />

                  <Typography>
                    Requested at:{' '}
                    {protectionSummary?.requestedAt ?? 'Not assigned yet'}
                  </Typography>
                  <Typography>
                    Uploaded at:{' '}
                    {protectionSummary?.uploadedAt ?? 'Not uploaded yet'}
                  </Typography>
                  <Typography>
                    Approved at:{' '}
                    {protectionSummary?.approvedAt ?? 'Not approved yet'}
                  </Typography>
                  <Typography>
                    Chain: {protectionSummary?.chainName ?? 'Not assigned yet'}
                  </Typography>
                  <Typography sx={{ wordBreak: 'break-all' }}>
                    Blockchain tx hash:{' '}
                    {protectionSummary?.blockchainTxHash ?? 'Not available'}
                  </Typography>

                  {protectionSummary?.imageHash ? (
                    <Typography sx={{ wordBreak: 'break-all' }}>
                      Image hash: {protectionSummary.imageHash}
                    </Typography>
                  ) : null}

                  {protectionSummary?.verifiedStorage?.contentLength ? (
                    <Typography>
                      Verified content length:{' '}
                      {protectionSummary.verifiedStorage.contentLength}
                    </Typography>
                  ) : null}

                  {protectionSummary?.errorMessage ? (
                    <Alert severity="error">
                      {protectionSummary.errorMessage}
                    </Alert>
                  ) : null}
                </Stack>
              </Paper>
            </Stack>
          </Box>
        </Stack>
      </Stack>

      <ContactDialog
        artworkTitle={artwork.title}
        contextType="artwork"
        open={isContactDialogOpen}
        onClose={() => setIsContactDialogOpen(false)}
        onSubmit={handleContactArtist}
        recipientName={artist?.name ?? artwork.artistName ?? 'Artist'}
      />
    </Box>
  )
}

export default ArtworkDetailPage
