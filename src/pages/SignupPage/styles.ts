export const accountTypeSx = {
  flex: 1,
  minHeight: 52,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '8px',
  color: 'text.primary',
  backgroundColor: 'background.paper',
  transition: 'background-color 180ms ease, border-color 180ms ease',
  '&:hover': {
    backgroundColor: 'action.hover',
  },
}

export const selectedAccountTypeSx = {
  borderColor: 'primary.main',
  backgroundColor: 'primary.main',
  color: 'common.white',
  '&:hover': {
    backgroundColor: 'primary.dark',
    borderColor: 'primary.dark',
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
