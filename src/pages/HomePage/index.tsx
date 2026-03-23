import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'

import Button from '@/components/Button'

const heroCopy = 'A curated archive of exceptional graduation works by emerging artists around the world'

const heroLayoutSx: SxProps<Theme> = {
  width: '100%',
  maxWidth: '1080px',
  alignItems: 'center',
  textAlign: 'center',
}

const heroLogoSx: SxProps<Theme> = {
  width: '100%',
  maxWidth: {
    xs: '240px',
    sm: '320px',
    md: '420px',
  },
  height: 'auto',
}

const heroCopySx: SxProps<Theme> = {
  maxWidth: '760px',
  color: 'text.primary',
  fontSize: {
    xs: '1.125rem',
    sm: '1.375rem',
    md: '1.5rem',
  },
}

const heroActionsSx: SxProps<Theme> = {
  width: '100%',
  maxWidth: '700px',
  justifyContent: 'center',
}

function HomePage() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
      }}
    >
      <Stack spacing={{ xs: 4, md: 5.5 }} sx={heroLayoutSx}>
        <Box component="img" src="/solpim_logo.png" alt="Solpim" sx={heroLogoSx} />

        <Typography variant="body1" sx={heroCopySx}>
          {heroCopy}
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, sm: 3 }} sx={heroActionsSx}>
          <Button sx={{ flex: 1 }}>
            Explore Works
          </Button>
          <Button sx={{ flex: 1 }} variant="white">
            Submit Your Work
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

export default HomePage
