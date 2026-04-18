import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { FirebaseError } from 'firebase/app'

import Button from '@/components/Button'
import {
  EMAIL_NOT_VERIFIED_ERROR,
  loginVisitorWithGoogle,
  loginWithEmail,
  resendVerificationEmail,
} from '@/firebase/auth'

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

function getLoginErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Email: enter a valid email address.'
      case 'auth/missing-password':
        return 'Password: enter your password.'
      case 'auth/invalid-credential':
        return 'Email or password is incorrect.'
      case 'auth/popup-closed-by-user':
        return 'Google sign in was closed before it finished.'
      case 'auth/popup-blocked':
        return 'Google sign in popup was blocked by the browser.'
      case 'auth/account-exists-with-different-credential':
        return 'This email is already registered with another sign in method.'
      case 'auth/operation-not-allowed':
        return 'Firebase Auth: this sign in method is not enabled.'
      case 'auth/network-request-failed':
        return 'Network: check your internet connection and try again.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Wait a few minutes before trying again.'
      case 'permission-denied':
        return 'Firestore: permission denied while saving your visitor profile.'
      default:
        return `${error.code}: ${error.message}`
    }
  }

  if (error instanceof Error && error.message === EMAIL_NOT_VERIFIED_ERROR) {
    return 'Email verification required. Verify your email before logging in.'
  }

  if (
    error instanceof Error &&
    error.message === 'verification-email-password-only'
  ) {
    return 'Verification email can only be resent for email/password accounts.'
  }

  if (error instanceof Error && error.message === 'email-already-verified') {
    return 'This email is already verified. Log in to continue.'
  }

  return 'Unable to log in. Please try again.'
}

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { message?: string } | null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [notificationMessage, setNotificationMessage] = useState(
    locationState?.message ?? ''
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const [showResendVerification, setShowResendVerification] = useState(false)
  const [isResendingVerification, setIsResendingVerification] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setShowResendVerification(false)
    setIsSubmitting(true)

    try {
      await loginWithEmail({
        email: email.trim(),
        password,
      })

      navigate('/gallery')
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error))
      setShowResendVerification(
        error instanceof Error && error.message === EMAIL_NOT_VERIFIED_ERROR
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendVerificationEmail = async () => {
    setErrorMessage('')
    setIsResendingVerification(true)

    try {
      await resendVerificationEmail({
        email: email.trim(),
        password,
      })

      setShowResendVerification(false)
      setNotificationMessage(
        'We sent a new verification email. Use the latest email link to verify your account.'
      )
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error))
    } finally {
      setIsResendingVerification(false)
    }
  }

  const handleGoogleLogin = async () => {
    setErrorMessage('')
    setIsGoogleSubmitting(true)

    try {
      await loginVisitorWithGoogle()
      navigate('/gallery')
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error))
    } finally {
      setIsGoogleSubmitting(false)
    }
  }

  return (
    <>
      <Box component="main" sx={pageSx}>
        <Stack component="form" onSubmit={handleSubmit} spacing={3} sx={formSx}>
          <Box>
            <Typography variant="h3">Log in</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }} variant="body1">
              Access your account to submit work or contact artists.
            </Typography>
          </Box>

          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          {showResendVerification ? (
            <Button
              disabled={
                isSubmitting || isGoogleSubmitting || isResendingVerification
              }
              fullWidth
              onClick={handleResendVerificationEmail}
              type="button"
              variant="white"
            >
              {isResendingVerification
                ? 'Sending email...'
                : 'Resend verification email'}
            </Button>
          ) : null}

          <TextField
            autoComplete="email"
            label="Email"
            onChange={(event) => setEmail(event.target.value)}
            required
            sx={fieldSx}
            type="email"
            value={email}
          />

          <TextField
            autoComplete="current-password"
            label="Password"
            onChange={(event) => setPassword(event.target.value)}
            required
            sx={fieldSx}
            type="password"
            value={password}
          />

          <Button
            disabled={
              isSubmitting || isGoogleSubmitting || isResendingVerification
            }
            fullWidth
            type="submit"
          >
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </Button>

          <Divider>or</Divider>

          <Button
            disabled={
              isSubmitting || isGoogleSubmitting || isResendingVerification
            }
            fullWidth
            onClick={handleGoogleLogin}
            type="button"
            variant="white"
          >
            {isGoogleSubmitting
              ? 'Connecting to Google...'
              : 'Continue as visitor with Google'}
          </Button>

          <Typography color="text.secondary" textAlign="center" variant="body1">
            New to Solpim?{' '}
            <Link component={RouterLink} to="/signup" underline="hover">
              Sign up
            </Link>
          </Typography>
        </Stack>
      </Box>

      <Snackbar
        autoHideDuration={8000}
        onClose={() => setNotificationMessage('')}
        open={Boolean(notificationMessage)}
      >
        <Alert
          onClose={() => setNotificationMessage('')}
          severity="success"
          sx={{ width: '100%' }}
        >
          {notificationMessage}
        </Alert>
      </Snackbar>
    </>
  )
}

export default LoginPage
