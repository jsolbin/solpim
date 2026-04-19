export type NotificationType = 'like' | 'approval' | 'rejection' | 'message'

export interface Notification {
  id: string
  senderId?: string
  receiverId: string
  type: NotificationType
  message: string
  artworkId?: string
  createdAt: string
  isRead: boolean
}
