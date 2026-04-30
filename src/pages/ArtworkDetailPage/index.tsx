import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { contentContainerSx, contentPageSx } from '@/styles/page'
import type { ProtectedArtworkRecord } from '@/types/blockchain'
import { requestProtectedArtworkStatus } from '@/utils/protection'

const statusChipColor = {
  upload_requested: 'info',
  uploaded: 'warning',
  hashing: 'warning',
  pinned: 'info',
  chain_pending: 'warning',
  registered: 'success',
  failed: 'error',
} as const

function ArtworkDetailPage() {
  const { id = '' } = useParams()
  const [artwork, setArtwork] = useState<ProtectedArtworkRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadArtwork = async () => {
      setIsLoading(true)
      const nextArtwork = await requestProtectedArtworkStatus({ artworkId: id })

      if (isMounted) {
        setArtwork(nextArtwork)
        setIsLoading(false)
      }
    }

    void loadArtwork()

    return () => {
      isMounted = false
    }
  }, [id])

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
            No stored record found for this artwork ID.
          </Alert>
        </Stack>
      </Box>
    )
  }

  const { protection } = artwork

  return (
    <Box component="main" sx={contentPageSx}>
      <Stack spacing={4} sx={contentContainerSx}>
        <Typography variant="h3">Artwork Detail</Typography>

        <Stack spacing={1}>
          <Typography variant="h5">{artwork.title}</Typography>
          <Typography color="text.secondary">ID: {artwork.id}</Typography>
          <Typography color="text.secondary">
            Content ID: {artwork.contentId ?? 'Not assigned yet'}
          </Typography>
          <Typography color="text.secondary">
            Uploaded file: {artwork.imageName}
          </Typography>
          <Typography color="text.secondary">
            Owner: {artwork.ownerUid ?? 'Unknown'}
          </Typography>
        </Stack>

        <Divider />

        <Stack spacing={1.5}>
          <Typography variant="h6">Protection Status</Typography>
          <Chip
            color={statusChipColor[protection.status]}
            label={protection.status.toUpperCase()}
            sx={{ width: 'fit-content' }}
          />
          <Typography>
            Requested at: {protection.requestedAt ?? 'Not assigned yet'}
          </Typography>
          <Typography>
            Uploaded at: {protection.uploadedAt ?? 'Not uploaded yet'}
          </Typography>
          <Typography>
            Approved at: {protection.approvedAt ?? 'Not approved yet'}
          </Typography>
          <Typography>
            Chain: {protection.chainName ?? 'Not assigned yet'}
          </Typography>
          <Typography>
            Blockchain tx hash: {protection.blockchainTxHash ?? 'Not available'}
          </Typography>

          {protection.errorMessage ? (
            <Alert severity="error">{protection.errorMessage}</Alert>
          ) : null}
        </Stack>

        <Divider />

        <Stack spacing={1.5}>
          <Typography variant="h6">Integrity Metadata</Typography>
          <Typography sx={{ wordBreak: 'break-all' }}>
            Image hash (SHA-256): {protection.imageHash ?? 'Not computed yet'}
          </Typography>
          <Typography>
            IPFS CID: {protection.ipfsCid ?? 'Not assigned yet'}
          </Typography>
          <Typography>
            Storage provider: {protection.storage.provider}
          </Typography>
          <Typography>Bucket: {protection.storage.bucketName}</Typography>
          <Typography sx={{ wordBreak: 'break-all' }}>
            Object key: {protection.storage.objectKey}
          </Typography>
          <Typography>Region: {protection.storage.region}</Typography>
          <Typography>
            Verified content length:{' '}
            {protection.verifiedStorage?.contentLength ?? 'Not verified yet'}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  )
}

export default ArtworkDetailPage
