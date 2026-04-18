import { useNavigate } from 'react-router-dom'

import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Stack from '@mui/material/Stack'

const headerActionSx = {
  minHeight: 42,
  borderRadius: '12px',
  px: 2.25,
  fontSize: '0.95rem',
  lineHeight: 1,
  border: '1px solid',
  transition:
    'background-color 180ms ease, border-color 180ms ease, color 180ms ease',
}

function Header() {
  const navigate = useNavigate()

  const goToGallery = () => navigate('/gallery')
  const goToLogin = () => navigate('/login')
  const goToSubmit = () => navigate('/submit')

  return (
    <Box
      component="header"
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.default',
      }}
    >
      <Box
        sx={{
          maxWidth: '1280px',
          mx: 'auto',
          px: { xs: 3, md: 4 },
          py: 2.25,
        }}
      >
        <Stack
          alignItems="center"
          direction="row"
          justifyContent="space-between"
          spacing={2}
        >
          <ButtonBase
            onClick={goToGallery}
            sx={{
              borderRadius: '10px',
              px: 0.5,
              py: 0.5,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <Box
              component="img"
              src="/solpim_logo.png"
              alt="Solpim"
              sx={{
                width: { xs: 132, md: 156 },
                height: 'auto',
                display: 'block',
              }}
            />
          </ButtonBase>

          <Stack alignItems="center" direction="row" spacing={1.25}>
            <ButtonBase
              onClick={goToLogin}
              sx={{
                ...headerActionSx,
                borderColor: 'transparent',
                color: 'text.primary',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              Login
            </ButtonBase>

            <ButtonBase
              onClick={goToSubmit}
              sx={{
                ...headerActionSx,
                borderColor: 'primary.main',
                backgroundColor: 'primary.main',
                color: 'common.white',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                  borderColor: 'primary.dark',
                },
              }}
            >
              Submit work
            </ButtonBase>
          </Stack>
        </Stack>
      </Box>
    </Box>
  )
}

export default Header
