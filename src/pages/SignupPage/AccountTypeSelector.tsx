import ButtonBase from '@mui/material/ButtonBase'
import Stack from '@mui/material/Stack'

import { accountTypeSx, selectedAccountTypeSx } from './styles'
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
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <ButtonBase
        onClick={() => onChange('student')}
        sx={[accountTypeSx, accountType === 'student' && selectedAccountTypeSx]}
        type="button"
      >
        Student
      </ButtonBase>
      <ButtonBase
        onClick={() => onChange('visitor')}
        sx={[accountTypeSx, accountType === 'visitor' && selectedAccountTypeSx]}
        type="button"
      >
        Visitor
      </ButtonBase>
    </Stack>
  )
}

export default AccountTypeSelector
