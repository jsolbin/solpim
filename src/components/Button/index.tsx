import MuiButton, { type ButtonProps as MuiButtonProps } from '@mui/material/Button'
import type { SxProps, Theme } from '@mui/material/styles'

type ButtonVariant = 'primary' | 'white'

interface ButtonProps extends Omit<MuiButtonProps, 'color' | 'variant'> {
  variant?: ButtonVariant
}

const baseButtonSx = {
  borderRadius: '12px',
  border: '1px solid',
  fontFamily: 'inherit',
  lineHeight: 1.15,
  letterSpacing: '-0.02em',
  textTransform: 'none',
  whiteSpace: 'nowrap',
  '&:focus-visible': {
    outline: 'none',
  },
  '&.Mui-focusVisible': {
    boxShadow: (theme: Theme) => `0 0 0 3px ${theme.palette.secondary.main}33`,
  },
  '&.Mui-disabled': {
    borderColor: 'action.disabledBackground',
    backgroundColor: 'action.disabledBackground',
    color: 'action.disabled',
  },
}

const buttonSizeSx = {
  default: {
    minHeight: {
      xs: 64,
      sm: 54,
    },
    px: {
      xs: 4,
      sm: 5,
    },
    py: 1.25,
    fontSize: {
      xs: '1.5rem',
      sm: '1.125rem',
      md: '1.25rem',
    },
    fontWeight: 400,
  },
  fullWidth: {
    minHeight: 58,
    px: 3,
    py: 1.75,
    fontSize: {
      xs: '1rem',
      sm: '1.125rem',
    },
    fontWeight: 400,
  },
}

const buttonVariantSx = {
  primary: {
    borderColor: 'primary.main',
    backgroundColor: 'primary.main',
    color: 'common.white',
    '&:hover': {
      borderColor: 'primary.dark',
      backgroundColor: 'primary.dark',
    },
  },
  white: {
    borderColor: 'text.primary',
    backgroundColor: 'background.paper',
    color: 'text.primary',
    '&:hover': {
      borderColor: 'text.primary',
      backgroundColor: 'background.default',
    },
  },
}

function Button({ children, fullWidth = false, sx, variant = 'primary', ...props }: ButtonProps) {
  const buttonSize = fullWidth ? buttonSizeSx.fullWidth : buttonSizeSx.default
  const combinedSx = [baseButtonSx, buttonSize, buttonVariantSx[variant], sx] as SxProps<Theme>

  return (
    <MuiButton
      disableElevation
      fullWidth={fullWidth}
      sx={combinedSx}
      {...props}
    >
      {children}
    </MuiButton>
  )
}

export default Button
export type { ButtonProps, ButtonVariant }
