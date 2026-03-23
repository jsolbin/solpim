import { createTheme } from '@mui/material/styles'

import { fonts, fontWeights } from '@/styles/font'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#5E5549',
      dark: '#4d463c',
    },
    secondary: {
      main: '#778984',
    },
    background: {
      default: '#FDFCF8',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
    },
    action: {
      disabled: '#64748b',
      disabledBackground: '#e2e8f0',
    },
  },
  typography: {
    fontFamily: fonts.body,
    h1: {
      fontFamily: fonts.heading,
      fontWeight: fontWeights.bold,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: fonts.heading,
      fontWeight: fontWeights.bold,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontFamily: fonts.heading,
      fontWeight: fontWeights.semibold,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontFamily: fonts.heading,
      fontWeight: fontWeights.semibold,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontFamily: fonts.heading,
      fontWeight: fontWeights.semibold,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontFamily: fonts.heading,
      fontWeight: fontWeights.semibold,
      letterSpacing: '-0.02em',
    },
    body1: {
      fontFamily: fonts.body,
      fontSize: '1.125rem',
      fontWeight: fontWeights.regular,
      lineHeight: 1.4,
      letterSpacing: '-0.015em',
    },
    button: {
      fontWeight: fontWeights.semibold,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 14,
  },
})
