import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import {
  DEFAULT_PROFILE_IMAGE_URL,
  STUDENT_PROFILE_ICONS,
} from '@/constants/profileIcons'

import { profileImageButtonSx, selectedProfileImageButtonSx } from './styles'
import type { AccountType } from './utils'

interface ProfileImageSectionProps {
  accountType: AccountType
  profileImageUrl: string
  onProfileImageChange: (profileImageUrl: string) => void
}

function ProfileImageSection({
  accountType,
  profileImageUrl,
  onProfileImageChange,
}: ProfileImageSectionProps) {
  if (accountType === 'visitor') {
    return (
      <Stack alignItems="center" direction="row" spacing={1.5}>
        <Avatar
          src={DEFAULT_PROFILE_IMAGE_URL}
          sx={{ width: 56, height: 56 }}
        />
        <Typography color="text.secondary" sx={{ fontSize: '0.95rem' }}>
          Visitors use the default icon, or Google profile image when signing in
          with Google.
        </Typography>
      </Stack>
    )
  }

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography sx={{ fontSize: '1rem' }}>Profile icon</Typography>
        <Typography color="text.secondary" sx={{ fontSize: '0.9rem' }}>
          Choose an icon that fits your department.
        </Typography>
      </Box>
      <Stack direction="row" flexWrap="wrap" gap={1.25}>
        {STUDENT_PROFILE_ICONS.map((icon) => (
          <ButtonBase
            key={icon.value}
            onClick={() => onProfileImageChange(icon.value)}
            sx={[
              profileImageButtonSx,
              profileImageUrl === icon.value && selectedProfileImageButtonSx,
            ]}
            type="button"
          >
            <Avatar src={icon.value} sx={{ width: 48, height: 48 }} />
            <Typography sx={{ fontSize: '0.8rem', lineHeight: 1.2 }}>
              {icon.label}
            </Typography>
          </ButtonBase>
        ))}
      </Stack>
    </Stack>
  )
}

export default ProfileImageSection
