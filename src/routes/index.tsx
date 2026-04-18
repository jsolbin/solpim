import { createBrowserRouter } from 'react-router-dom'

import Layout from '@/layouts'
import AdminPage from '@/pages/AdminPage'
import ArtworkDetailPage from '@/pages/ArtworkDetailPage'
import GalleryPage from '@/pages/GalleryPage'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import NotFoundPage from '@/pages/NotFoundPage'
import ProfilePage from '@/pages/ProfilePage'
import SignupPage from '@/pages/SignupPage'
import SubmitArtworkPage from '@/pages/SubmitArtworkPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'gallery', element: <GalleryPage /> },
      { path: 'artworks/:id', element: <ArtworkDetailPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
      { path: 'submit', element: <SubmitArtworkPage /> },
      { path: 'admin', element: <AdminPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
