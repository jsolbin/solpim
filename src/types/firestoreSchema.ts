export const FIRESTORE_COLLECTIONS = {
  users: 'users',
  artists: 'artists',
  universities: 'universities',
  departments: 'departments',
  categories: 'categories',
  artworks: 'artworks',
  tags: 'tags',
  artworkTags: 'artworkTags',
  likes: 'likes',
  favoriteArtists: 'favoriteArtists',
  artworkReviews: 'artworkReviews',
  notifications: 'notifications',
} as const

export type FirestoreCollectionName =
  (typeof FIRESTORE_COLLECTIONS)[keyof typeof FIRESTORE_COLLECTIONS]
