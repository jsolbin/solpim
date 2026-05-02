import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import type { ContactContextType, ContactIntent } from '@/types/notification'
import {
  getContactContextLabel,
  getContactIntentLabel,
} from '@/utils/notifications'

const contactIntentOptions: Record<ContactContextType, ContactIntent[]> = {
  artwork: ['purchase', 'collaboration'],
  profile: ['collaboration', 'career'],
}

interface ContactDialogProps {
  open: boolean
  contextType: ContactContextType
  recipientName: string
  artworkTitle?: string
  onClose: () => void
  onSubmit: (contactIntent: ContactIntent) => Promise<void> | void
}

function ContactDialog({
  artworkTitle,
  contextType,
  onClose,
  onSubmit,
  open,
  recipientName,
}: ContactDialogProps) {
  const [selectedIntent, setSelectedIntent] = useState<ContactIntent>(
    contactIntentOptions[contextType][0]
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setSelectedIntent(contactIntentOptions[contextType][0])
    }
  }, [contextType, open])

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      await onSubmit(selectedIntent)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <DialogTitle>
        Contact via {getContactContextLabel(contextType)}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography color="text.secondary">
            {recipientName}
            {contextType === 'artwork' && artworkTitle
              ? `"${artworkTitle}"`
              : 'Choose the intent for this contact request.'}
          </Typography>

          <ToggleButtonGroup
            exclusive
            fullWidth
            onChange={(_, value: ContactIntent | null) => {
              if (value) {
                setSelectedIntent(value)
              }
            }}
            value={selectedIntent}
          >
            {contactIntentOptions[contextType].map((intent) => (
              <ToggleButton key={intent} value={intent}>
                {getContactIntentLabel(intent)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button disabled={isSubmitting} onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button
          disabled={isSubmitting}
          onClick={handleSubmit}
          variant="contained"
        >
          {isSubmitting ? 'Sending...' : 'Send request'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ContactDialog
