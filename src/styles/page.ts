import type { SxProps, Theme } from '@mui/material/styles'

export const centeredPageSx: SxProps<Theme> = {
  minHeight: 'calc(100vh - 91px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  px: 3,
  py: { xs: 5, md: 7 },
}

export const formPageSx: SxProps<Theme> = {
  width: '100%',
  maxWidth: 520,
}

export const formFieldSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'background.paper',
  },
}

export const contentPageSx: SxProps<Theme> = {
  minHeight: '100vh',
  px: { xs: 3, md: 5 },
  py: { xs: 4, md: 6 },
}

export const contentContainerSx: SxProps<Theme> = {
  maxWidth: '1200px',
  mx: 'auto',
}
