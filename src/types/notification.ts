export type NotificationType = 'like' | 'approval' | 'rejection' | 'message'

export type ContactContextType = 'artwork' | 'profile'

export type ContactIntent = 'purchase' | 'collaboration' | 'career'

export interface Notification {
  id: string
  senderId?: string
  senderName?: string
  receiverId: string
  type: NotificationType
  message: string
  artworkId?: string
  artworkTitle?: string
  contextType?: ContactContextType
  contactIntent?: ContactIntent
  createdAt: string
  isRead: boolean
}
