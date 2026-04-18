import { Outlet } from 'react-router-dom'

import Box from '@mui/material/Box'

import Header from '@/components/Header'

function Layout() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Header />
      <Outlet />
    </Box>
  )
}

export default Layout
