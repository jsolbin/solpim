import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { FirebaseError } from 'firebase/app'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

import Button from '@/components/Button'
import {
  DEFAULT_PROFILE_IMAGE_URL,
  STUDENT_PROFILE_ICONS,
} from '@/constants/profileIcons'
import { updateCurrentUserProfile } from '@/firebase/auth'
import { auth, db } from '@/firebase/config'

type ProfileRole = 'student' | 'visitor' | 'admin'

interface ProfileImageOption {
  label: string
  value: string
}

const pageSx = {
  minHeight: 'calc(100vh - 91px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  px: 3,
  py: { xs: 5, md: 7 },
}

const formSx = {
  width: '100%',
  maxWidth: 520,
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'background.paper',
  },
}

const profileImageButtonSx = {
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

const selectedProfileImageButtonSx = {
  borderColor: 'primary.main',
  backgroundColor: 'background.paper',
}

function getProfileErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'permission-denied':
        return 'Firestore: permission denied while updating your profile.'
      default:
        return `${error.code}: ${error.message}`
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unable to update your profile. Please try again.'
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState(
    DEFAULT_PROFILE_IMAGE_URL
  )
  const [profileImageOptions, setProfileImageOptions] = useState<
    ProfileImageOption[]
  >([{ label: 'Default', value: DEFAULT_PROFILE_IMAGE_URL }])
  const [profileRole, setProfileRole] = useState<ProfileRole | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login')
        return
      }

      const googleProfileImageUrl = user.providerData.find(
        (provider) => provider.providerId === 'google.com'
      )?.photoURL
      const userSnapshot = await getDoc(doc(db, 'users', user.uid))
      const userProfile = userSnapshot.data()
      const userRole = userProfile?.role as ProfileRole | undefined
      const savedProfileImageUrl =
        typeof userProfile?.profileImageUrl === 'string'
          ? userProfile.profileImageUrl
          : user.photoURL
      const visitorProfileImageOptions = [
        { label: 'Default', value: DEFAULT_PROFILE_IMAGE_URL },
        ...(googleProfileImageUrl
          ? [{ label: 'Google', value: googleProfileImageUrl }]
          : []),
      ]
      const nextProfileImageOptions =
        userRole === 'student'
          ? STUDENT_PROFILE_ICONS
          : userRole === 'visitor'
            ? visitorProfileImageOptions
            : [{ label: 'Default', value: DEFAULT_PROFILE_IMAGE_URL }]
      const nextProfileImageUrl =
        nextProfileImageOptions.find(
          (option) => option.value === savedProfileImageUrl
        )?.value ??
        nextProfileImageOptions[0]?.value ??
        DEFAULT_PROFILE_IMAGE_URL

      setProfileRole(userRole ?? null)
      setName(user.displayName || '')
      setProfileImageOptions(nextProfileImageOptions)
      setProfileImageUrl(nextProfileImageUrl)
    })

    return unsubscribe
  }, [navigate])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const trimmedName = name.trim()

    if (!trimmedName) {
      setErrorMessage('Name: enter your name.')
      return
    }

    setIsSubmitting(true)

    try {
      await updateCurrentUserProfile({
        name: trimmedName,
        profileImageUrl,
      })

      setSuccessMessage('Profile updated.')
    } catch (error) {
      setErrorMessage(getProfileErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box component="main" sx={pageSx}>
      <Stack component="form" onSubmit={handleSubmit} spacing={3} sx={formSx}>
        <Box>
          <Typography variant="h3">Edit profile</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }} variant="body1">
            Update your name and profile image.
          </Typography>
        </Box>

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        {successMessage ? (
          <Alert severity="success">{successMessage}</Alert>
        ) : null}

        <Stack alignItems="center" direction="row" spacing={1.5}>
          <Avatar src={profileImageUrl} sx={{ width: 72, height: 72 }} />
          <Box>
            <Typography sx={{ fontSize: '1rem' }}>Profile image</Typography>
            <Typography color="text.secondary" sx={{ fontSize: '0.9rem' }}>
              {profileRole === 'student'
                ? 'Choose a department icon.'
                : 'Choose the default icon or your Google profile image.'}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" flexWrap="wrap" gap={1.25}>
          {profileImageOptions.map((icon) => (
            <ButtonBase
              key={icon.value}
              onClick={() => setProfileImageUrl(icon.value)}
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

        <TextField
          autoComplete="name"
          label="Name"
          onChange={(event) => setName(event.target.value)}
          required
          sx={fieldSx}
          value={name}
        />

        <Button disabled={isSubmitting} fullWidth type="submit">
          {isSubmitting ? 'Saving...' : 'Save changes'}
        </Button>
      </Stack>
    </Box>
  )
}
