import { createTheme } from '@mui/material/styles'

import { fonts, fontWeights } from '@/styles/font'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#5E5549',
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
    button: {
      fontWeight: fontWeights.semibold,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 14,
  },
})
