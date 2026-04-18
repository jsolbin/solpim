import { Link as RouterLink } from 'react-router-dom'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import Button from '@/components/Button'
import { centeredPageSx, formFieldSx, formPageSx } from '@/styles/page'

import AccountTypeSelector from './AccountTypeSelector'
import ProfileImageSection from './ProfileImageSection'
import { useSignupForm } from './useSignupForm'

function SignupPage() {
  const {
    accountType,
    confirmPassword,
    department,
    email,
    errorMessage,
    handleGoogleSignUp,
    handleSubmit,
    isGoogleSubmitting,
    isSubmitting,
    name,
    password,
    profileImageUrl,
    setAccountType,
    setConfirmPassword,
    setDepartment,
    setEmail,
    setName,
    setPassword,
    setProfileImageUrl,
    setUniversity,
    university,
  } = useSignupForm()

  return (
    <Box component="main" sx={centeredPageSx}>
      <Stack
        component="form"
        onSubmit={handleSubmit}
        spacing={3}
        sx={formPageSx}
      >
        <Box>
          <Typography variant="h3">Sign up</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }} variant="body1">
            Create an account to submit work or contact emerging artists.
          </Typography>
        </Box>

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <ProfileImageSection
          accountType={accountType}
          onProfileImageChange={setProfileImageUrl}
          profileImageUrl={profileImageUrl}
        />

        <AccountTypeSelector
          accountType={accountType}
          onChange={setAccountType}
        />

        <TextField
          autoComplete="name"
          label={accountType === 'student' ? 'Student name' : 'Name'}
          onChange={(event) => setName(event.target.value)}
          required
          sx={formFieldSx}
          value={name}
        />

        {accountType === 'student' ? (
          <>
            <TextField
              autoComplete="organization"
              label="University"
              onChange={(event) => setUniversity(event.target.value)}
              required
              sx={formFieldSx}
              value={university}
            />

            <TextField
              label="Department"
              onChange={(event) => setDepartment(event.target.value)}
              required
              sx={formFieldSx}
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
          sx={formFieldSx}
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
          sx={formFieldSx}
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
          sx={formFieldSx}
          type="password"
          value={confirmPassword}
        />

        <Button
          disabled={isSubmitting || isGoogleSubmitting}
          fullWidth
          type="submit"
        >
          {isSubmitting ? 'Creating account...' : 'Sign up'}
        </Button>

        {accountType === 'visitor' ? (
          <>
            <Divider>or</Divider>

            <Button
              disabled={isSubmitting || isGoogleSubmitting}
              fullWidth
              onClick={handleGoogleSignUp}
              type="button"
              variant="white"
            >
              {isGoogleSubmitting
                ? 'Connecting to Google...'
                : 'Continue as visitor with Google'}
            </Button>
          </>
        ) : null}

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
