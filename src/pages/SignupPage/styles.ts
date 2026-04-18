export const accountTypeToggleGroupSx = {
  display: 'flex',
  width: '100%',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '8px',
  backgroundColor: 'background.paper',
  overflow: 'hidden',
  p: 0.5,
  '& .MuiToggleButtonGroup-grouped': {
    flex: 1,
    border: 0,
    borderRadius: '6px',
    margin: 0,
    '&:not(:first-of-type)': {
      borderLeft: 0,
    },
  },
}

export const accountTypeToggleSx = {
  minHeight: 68,
  color: 'text.primary',
  backgroundColor: 'transparent',
  fontSize: '0.95rem',
  fontWeight: 600,
  textTransform: 'none',
  transition:
    'background-color 180ms ease, border-color 180ms ease, color 180ms ease',
  '&:hover': {
    backgroundColor: 'action.hover',
  },
  '&.Mui-selected': {
    backgroundColor: 'primary.main',
    color: 'common.white',
    '&:hover': {
      backgroundColor: 'primary.dark',
    },
  },
}

export const profileImageButtonSx = {
  width: 84,
  minHeight: 102,
  flexDirection: 'column',
  gap: 1,
  borderRadius: '8px',
  color: 'text.primary',
  border: '1px solid',
  borderColor: 'divider',
  p: 1,
  '&:hover': {
    backgroundColor: 'action.hover',
  },
}

export const selectedProfileImageButtonSx = {
  borderColor: 'primary.main',
  backgroundColor: 'background.paper',
}
