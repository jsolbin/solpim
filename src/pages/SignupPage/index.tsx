import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { FirebaseError } from 'firebase/app'

import Button from '@/components/Button'
import {
  DEFAULT_PROFILE_IMAGE_URL,
  STUDENT_PROFILE_ICONS,
} from '@/constants/profileIcons'
import { signUpStudentWithEmail, signUpVisitorWithEmail } from '@/firebase/auth'

type AccountType = 'student' | 'visitor'

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

const accountTypeSx = {
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

const selectedAccountTypeSx = {
  borderColor: 'primary.main',
  backgroundColor: 'primary.main',
  color: 'common.white',
  '&:hover': {
    backgroundColor: 'primary.dark',
    borderColor: 'primary.dark',
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

function getSignUpErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'Email: this email is already registered.'
      case 'auth/invalid-email':
        return 'Email: enter a valid email address.'
      case 'auth/missing-email':
        return 'Email: enter your email address.'
      case 'auth/weak-password':
        return 'Password: use at least 6 characters.'
      case 'auth/operation-not-allowed':
        return 'Firebase Auth: email/password sign up is not enabled.'
      case 'auth/network-request-failed':
        return 'Network: check your internet connection and try again.'
      case 'auth/configuration-not-found':
        return 'Firebase Auth: project authentication is not configured.'
      case 'permission-denied':
        return 'Firestore: permission denied while saving your profile.'
      case 'unavailable':
        return 'Firestore: service is unavailable. Please try again.'
      default:
        return `${error.code}: ${error.message}`
    }
  }

  return 'Unable to create your account. Please try again.'
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function SignupPage() {
  const navigate = useNavigate()
  const [accountType, setAccountType] = useState<AccountType>('student')
  const [name, setName] = useState('')
  const [university, setUniversity] = useState('')
  const [department, setDepartment] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState(
    STUDENT_PROFILE_ICONS[0]?.value ?? DEFAULT_PROFILE_IMAGE_URL
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')

    const trimmedName = name.trim()
    const trimmedUniversity = university.trim()
    const trimmedDepartment = department.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) {
      setErrorMessage(
        accountType === 'student'
          ? 'Student name: enter your name.'
          : 'Name: enter your name.'
      )
      return
    }

    if (accountType === 'student' && !trimmedUniversity) {
      setErrorMessage('University: enter your university.')
      return
    }

    if (accountType === 'student' && !trimmedDepartment) {
      setErrorMessage('Department: enter your department.')
      return
    }

    if (!trimmedEmail) {
      setErrorMessage('Email: enter your email address.')
      return
    }

    if (!isValidEmail(trimmedEmail)) {
      setErrorMessage('Email: enter a valid email address.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Password: use at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Confirm password: passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      if (accountType === 'student') {
        await signUpStudentWithEmail({
          name: trimmedName,
          university: trimmedUniversity,
          department: trimmedDepartment,
          email: trimmedEmail,
          emailVerificationRedirectUrl: `${window.location.origin}/login`,
          password,
          profileImageUrl,
        })

        navigate('/login', {
          state: {
            message: `We sent a verification email to ${trimmedEmail}. Open that email and verify your account before logging in.`,
          },
        })
      } else {
        await signUpVisitorWithEmail({
          name: trimmedName,
          email: trimmedEmail,
          emailVerificationRedirectUrl: `${window.location.origin}/login`,
          password,
        })

        navigate('/login', {
          state: {
            message: `We sent a verification email to ${trimmedEmail}. Open that email and verify your account before logging in.`,
          },
        })
      }
    } catch (error) {
      setErrorMessage(getSignUpErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box component="main" sx={pageSx}>
      <Stack component="form" onSubmit={handleSubmit} spacing={3} sx={formSx}>
        <Box>
          <Typography variant="h3">Sign up</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }} variant="body1">
            Create an account to submit work or contact emerging artists.
          </Typography>
        </Box>

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        {accountType === 'student' ? (
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
                  onClick={() => setProfileImageUrl(icon.value)}
                  sx={[
                    profileImageButtonSx,
                    profileImageUrl === icon.value &&
                      selectedProfileImageButtonSx,
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
        ) : (
          <Stack alignItems="center" direction="row" spacing={1.5}>
            <Avatar
              src={DEFAULT_PROFILE_IMAGE_URL}
              sx={{ width: 56, height: 56 }}
            />
            <Typography color="text.secondary" sx={{ fontSize: '0.95rem' }}>
              Visitors use the default icon, or Google profile image when
              signing in with Google.
            </Typography>
          </Stack>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <ButtonBase
            onClick={() => setAccountType('student')}
            sx={[
              accountTypeSx,
              accountType === 'student' && selectedAccountTypeSx,
            ]}
            type="button"
          >
            Student
          </ButtonBase>
          <ButtonBase
            onClick={() => setAccountType('visitor')}
            sx={[
              accountTypeSx,
              accountType === 'visitor' && selectedAccountTypeSx,
            ]}
            type="button"
          >
            Visitor
          </ButtonBase>
        </Stack>

        <TextField
          autoComplete="name"
          label={accountType === 'student' ? 'Student name' : 'Name'}
          onChange={(event) => setName(event.target.value)}
          required
          sx={fieldSx}
          value={name}
        />

        {accountType === 'student' ? (
          <>
            <TextField
              autoComplete="organization"
              label="University"
              onChange={(event) => setUniversity(event.target.value)}
              required
              sx={fieldSx}
              value={university}
            />

            <TextField
              label="Department"
              onChange={(event) => setDepartment(event.target.value)}
              required
              sx={fieldSx}
              value={department}
            />
          </>
        ) : null}

        <TextField
          autoComplete="email"
          helperText={
            accountType === 'student'
              ? 'Use your university email address for verification.'
              : undefined
          }
          label={accountType === 'student' ? 'University email' : 'Email'}
          onChange={(event) => setEmail(event.target.value)}
          required
          sx={fieldSx}
          type="email"
          value={email}
        />

        <TextField
          autoComplete="new-password"
          label="Password"
          onChange={(event) => setPassword(event.target.value)}
          required
          slotProps={{
            htmlInput: {
              minLength: 6,
            },
          }}
          sx={fieldSx}
          type="password"
          value={password}
        />

        <TextField
          autoComplete="new-password"
          label="Confirm password"
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          slotProps={{
            htmlInput: {
              minLength: 6,
            },
          }}
          sx={fieldSx}
          type="password"
          value={confirmPassword}
        />

        <Button disabled={isSubmitting} fullWidth type="submit">
          {isSubmitting ? 'Creating account...' : 'Sign up'}
        </Button>

        <Typography color="text.secondary" textAlign="center" variant="body1">
          Already have an account?{' '}
          <Link component={RouterLink} to="/login" underline="hover">
            Log in
          </Link>
        </Typography>
      </Stack>
    </Box>
  )
}

export default SignupPage
