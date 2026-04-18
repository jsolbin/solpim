import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import { accountTypeToggleGroupSx, accountTypeToggleSx } from './styles'
import type { AccountType } from './utils'

interface AccountTypeSelectorProps {
  accountType: AccountType
  onChange: (accountType: AccountType) => void
}

function AccountTypeSelector({
  accountType,
  onChange,
}: AccountTypeSelectorProps) {
  return (
    <Stack spacing={1.25}>
      <Box>
        <Typography sx={{ fontSize: '1rem' }}>I am signing up as</Typography>
        <Typography color="text.secondary" sx={{ fontSize: '0.9rem', mt: 0.5 }}>
          Students can submit graduation work. Visitors can browse and contact
          artists.
        </Typography>
      </Box>
      <ToggleButtonGroup
        exclusive
        fullWidth
        onChange={(_, nextAccountType: AccountType | null) => {
          if (nextAccountType) {
            onChange(nextAccountType)
          }
        }}
        sx={accountTypeToggleGroupSx}
        value={accountType}
      >
        <ToggleButton
          aria-label="Student account"
          sx={accountTypeToggleSx}
          value="student"
        >
          <Stack spacing={0.25}>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
              Student
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
              Submit work
            </Typography>
          </Stack>
        </ToggleButton>
        <ToggleButton
          aria-label="Visitor account"
          sx={accountTypeToggleSx}
          value="visitor"
        >
          <Stack spacing={0.25}>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
              Visitor
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
              Browse artists
            </Typography>
          </Stack>
        </ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  )
}

export default AccountTypeSelector
