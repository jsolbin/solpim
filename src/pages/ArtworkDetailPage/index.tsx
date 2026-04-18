import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { contentContainerSx, contentPageSx } from '@/styles/page'

function ArtworkDetailPage() {
  return (
    <Box component="main" sx={contentPageSx}>
      <Stack spacing={4} sx={contentContainerSx}>
        <Typography variant="h3">Artwork Detail Page</Typography>
      </Stack>
    </Box>
  )
}

export default ArtworkDetailPage
