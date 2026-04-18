import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  DEFAULT_PROFILE_IMAGE_URL,
  STUDENT_PROFILE_ICONS,
} from '@/constants/profileIcons'
import { signUpStudentWithEmail, signUpVisitorWithEmail } from '@/firebase/auth'

import {
  getSignUpErrorMessage,
  isValidEmail,
  type AccountType,
} from './utils'

export function useSignupForm() {
  const navigate = useNavigate()
  const [accountType, setAccountType] = useState<AccountType>('student')
  const [name, setName] = useState('')
  const [university, setUniversity] = useState('')
  const [department, setDepartment] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState(
    STUDENT_PROFILE_ICONS[0]?.value ?? DEFAULT_PROFILE_IMAGE_URL
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')

    const trimmedName = name.trim()
    const trimmedUniversity = university.trim()
    const trimmedDepartment = department.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) {
      setErrorMessage(
        accountType === 'student'
          ? 'Student name: enter your name.'
          : 'Name: enter your name.'
      )
      return
    }

    if (accountType === 'student' && !trimmedUniversity) {
      setErrorMessage('University: enter your university.')
      return
    }

    if (accountType === 'student' && !trimmedDepartment) {
      setErrorMessage('Department: enter your department.')
      return
    }

    if (!trimmedEmail) {
      setErrorMessage('Email: enter your email address.')
      return
    }

    if (!isValidEmail(trimmedEmail)) {
      setErrorMessage('Email: enter a valid email address.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Password: use at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Confirm password: passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      if (accountType === 'student') {
        await signUpStudentWithEmail({
          name: trimmedName,
          university: trimmedUniversity,
          department: trimmedDepartment,
          email: trimmedEmail,
          emailVerificationRedirectUrl: `${window.location.origin}/login`,
          password,
          profileImageUrl,
        })
      } else {
        await signUpVisitorWithEmail({
          name: trimmedName,
          email: trimmedEmail,
          emailVerificationRedirectUrl: `${window.location.origin}/login`,
          password,
        })
      }

      navigate('/login', {
        state: {
          message: `We sent a verification email to ${trimmedEmail}. Open that email and verify your account before logging in.`,
        },
      })
    } catch (error) {
      setErrorMessage(getSignUpErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    accountType,
    confirmPassword,
    department,
    email,
    errorMessage,
    handleSubmit,
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
  }
}
