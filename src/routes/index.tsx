import { createBrowserRouter } from 'react-router-dom'
import Layout from '@/layouts'
import HomePage from '@/pages/HomePage'
import GalleryPage from '@/pages/GalleryPage'
import ArtworkDetailPage from '@/pages/ArtworkDetailPage'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import SubmitArtworkPage from '@/pages/SubmitArtworkPage'
import AdminPage from '@/pages/AdminPage'
import NotFoundPage from '@/pages/NotFoundPage'

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
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
