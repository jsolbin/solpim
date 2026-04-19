import { useMemo } from 'react'
import { useParams } from 'react-router-dom'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { contentContainerSx, contentPageSx } from '@/styles/page'
import { getProtectedArtworkById } from '@/utils/protection'

const statusChipColor = {
  pending: 'warning',
  registered: 'success',
  failed: 'error',
} as const

function ArtworkDetailPage() {
  const { id = '' } = useParams()

  const artwork = useMemo(() => getProtectedArtworkById(id), [id])

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
            Uploaded file: {artwork.imageName}
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
            Chain: {protection.chainName ?? 'Not assigned yet'}
          </Typography>
          <Typography>
            Protected at: {protection.protectedAt ?? 'Not registered yet'}
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
            Image hash (SHA-256): {protection.imageHash}
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
          <Typography>
            Region: {protection.storage.region ?? 'Unknown'}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  )
}

export default ArtworkDetailPage
