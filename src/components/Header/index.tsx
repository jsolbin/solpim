import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

import { DEFAULT_PROFILE_IMAGE_URL } from '@/constants/profileIcons'
import {
  AUTH_PROFILE_UPDATED_EVENT,
  AUTH_SESSION_UPDATED_EVENT,
  logout,
} from '@/firebase/auth'
import { auth, db } from '@/firebase/config'

const headerActionSx = {
  minHeight: 42,
  borderRadius: '12px',
  px: 2.25,
  fontSize: '0.95rem',
  lineHeight: 1,
  border: '1px solid',
  transition:
    'background-color 180ms ease, border-color 180ms ease, color 180ms ease',
}

function Header() {
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [username, setUsername] = useState('User')
  const [profileImageUrl, setProfileImageUrl] = useState(
    DEFAULT_PROFILE_IMAGE_URL
  )
  const [profileMenuAnchor, setProfileMenuAnchor] =
    useState<HTMLElement | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  const goToGallery = () => navigate('/gallery')
  const goToLogin = () => navigate('/login')
  const goToSubmit = () => navigate('/submit')
  const isProfileMenuOpen = Boolean(profileMenuAnchor)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoggedIn(Boolean(user))
      setCurrentUserId(user?.uid ?? '')
      setUsername(user?.displayName || user?.email || 'User')
      setProfileImageUrl(user?.photoURL || DEFAULT_PROFILE_IMAGE_URL)

      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          setUserRole(userDoc.data()?.role ?? null)
        } catch (error) {
          console.error('Failed to fetch user role:', error)
          setUserRole(null)
        }
      } else {
        setUserRole(null)
      }
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    const refreshCurrentUser = async () => {
      if (!auth.currentUser) {
        setIsLoggedIn(false)
        setCurrentUserId('')
        setUsername('User')
        setProfileImageUrl(DEFAULT_PROFILE_IMAGE_URL)
        return
      }

      await auth.currentUser.reload()
      setIsLoggedIn(true)
      setUsername(
        auth.currentUser.displayName || auth.currentUser.email || 'User'
      )
      setProfileImageUrl(auth.currentUser.photoURL || DEFAULT_PROFILE_IMAGE_URL)
    }

    window.addEventListener(AUTH_PROFILE_UPDATED_EVENT, refreshCurrentUser)
    window.addEventListener(AUTH_SESSION_UPDATED_EVENT, refreshCurrentUser)

    return () => {
      window.removeEventListener(AUTH_PROFILE_UPDATED_EVENT, refreshCurrentUser)
      window.removeEventListener(AUTH_SESSION_UPDATED_EVENT, refreshCurrentUser)
    }
  }, [])

  const openProfileMenu = (event: MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget)
  }

  const closeProfileMenu = () => {
    setProfileMenuAnchor(null)
  }

  const goToProfile = () => {
    closeProfileMenu()
    navigate(currentUserId ? `/profile/${currentUserId}` : '/profile')
  }

  const goToMessages = () => {
    closeProfileMenu()
    navigate('/messages')
  }

  const handleLogout = async () => {
    closeProfileMenu()
    await logout()
    navigate('/gallery')
  }

  return (
    <Box
      component="header"
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.default',
      }}
    >
      <Box
        sx={{
          maxWidth: '1280px',
          mx: 'auto',
          px: { xs: 3, md: 4 },
          py: 2.25,
        }}
      >
        <Stack
          alignItems="center"
          direction="row"
          justifyContent="space-between"
          spacing={2}
        >
          <ButtonBase
            onClick={goToGallery}
            sx={{
              borderRadius: '10px',
              px: 0.5,
              py: 0.5,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <Box
              component="img"
              src="/solpim_logo.png"
              alt="Solpim"
              sx={{
                width: { xs: 132, md: 156 },
                height: 'auto',
                display: 'block',
              }}
            />
          </ButtonBase>

          <Stack alignItems="center" direction="row" spacing={2}>
            {isLoggedIn ? (
              <>
                <ButtonBase
                  onClick={openProfileMenu}
                  sx={{
                    minHeight: 42,
                    borderRadius: '8px',
                    borderColor: 'transparent',
                    color: 'text.primary',
                    gap: 1.25,
                    px: 1.25,
                    py: 0.5,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <Avatar
                    src={profileImageUrl}
                    sx={{ width: 34, height: 34 }}
                  />
                  <Typography
                    sx={{
                      color: 'text.primary',
                      display: { xs: 'none', sm: 'block' },
                      fontSize: '0.95rem',
                      maxWidth: 180,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {username}
                  </Typography>
                </ButtonBase>

                <Menu
                  anchorEl={profileMenuAnchor}
                  anchorOrigin={{
                    horizontal: 'right',
                    vertical: 'bottom',
                  }}
                  onClose={closeProfileMenu}
                  open={isProfileMenuOpen}
                  slotProps={{
                    paper: {
                      sx: {
                        mt: 1,
                        minWidth: 156,
                      },
                    },
                  }}
                  transformOrigin={{
                    horizontal: 'right',
                    vertical: 'top',
                  }}
                >
                  <MenuItem
                    onClick={goToProfile}
                    sx={{ fontSize: '0.95rem', minHeight: 42, px: 2 }}
                  >
                    My profile
                  </MenuItem>
                  <MenuItem
                    onClick={goToMessages}
                    sx={{ fontSize: '0.95rem', minHeight: 42, px: 2 }}
                  >
                    Message box
                  </MenuItem>
                  {userRole === 'student' ? (
                    <MenuItem
                      onClick={() => {
                        closeProfileMenu()
                        navigate('/artwork-management')
                      }}
                      sx={{ fontSize: '0.95rem', minHeight: 42, px: 2 }}
                    >
                      My artwork management
                    </MenuItem>
                  ) : null}
                  <MenuItem
                    onClick={handleLogout}
                    sx={{ fontSize: '0.95rem', minHeight: 42, px: 2 }}
                  >
                    Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <ButtonBase
                onClick={goToLogin}
                sx={{
                  ...headerActionSx,
                  borderColor: 'transparent',
                  color: 'text.primary',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                Login
              </ButtonBase>
            )}

            {isLoggedIn && userRole === 'student' ? (
              <ButtonBase
                onClick={goToSubmit}
                sx={{
                  ...headerActionSx,
                  borderColor: 'primary.main',
                  backgroundColor: 'primary.main',
                  color: 'common.white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                    borderColor: 'primary.dark',
                  },
                }}
              >
                Submit work
              </ButtonBase>
            ) : null}
          </Stack>
        </Stack>
      </Box>
    </Box>
  )
}

export default Header
