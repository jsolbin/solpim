import { addDoc, collection } from 'firebase/firestore'

import { db } from '@/firebase/config'
import type { ContactContextType, ContactIntent } from '@/types/notification'

const contactIntentLabels: Record<ContactIntent, string> = {
  purchase: 'Purchase interest',
  collaboration: 'Collaboration request',
  career: 'Career or recruiting inquiry',
}

const contactContextLabels: Record<ContactContextType, string> = {
  artwork: 'Artwork detail',
  profile: 'Profile',
}

export function getContactIntentLabel(intent: ContactIntent) {
  return contactIntentLabels[intent]
}

export function getContactContextLabel(contextType: ContactContextType) {
  return contactContextLabels[contextType]
}

export function buildContactNotificationMessage(options: {
  senderName: string
  contextType: ContactContextType
  contactIntent: ContactIntent
  artworkTitle?: string
}) {
  const { senderName, contextType, contactIntent, artworkTitle } = options
  const intentLabel = getContactIntentLabel(contactIntent)

  if (contextType === 'artwork') {
    return `${senderName} contacted your artwork "${artworkTitle ?? 'Artwork'}". Intent: ${intentLabel}.`
  }

  return `${senderName} contacted your profile. Intent: ${intentLabel}.`
}

export async function createContactNotification(options: {
  receiverId: string
  senderId?: string
  senderName: string
  contextType: ContactContextType
  contactIntent: ContactIntent
  artworkId?: string
  artworkTitle?: string
}) {
  const { receiverId, senderId, senderName, contextType, contactIntent } =
    options

  await addDoc(collection(db, 'notifications'), {
    receiverId,
    senderId,
    senderName,
    type: 'message',
    contextType,
    contactIntent,
    artworkId: options.artworkId,
    artworkTitle: options.artworkTitle,
    message: buildContactNotificationMessage({
      senderName,
      contextType,
      contactIntent,
      artworkTitle: options.artworkTitle,
    }),
    createdAt: new Date().toISOString(),
    isRead: false,
  })
}
