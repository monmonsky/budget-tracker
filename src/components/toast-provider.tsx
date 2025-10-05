'use client'

import { Toaster } from 'sonner'
import { useTheme } from 'next-themes'

export function ToastProvider() {
  const { theme } = useTheme()

  return (
    <Toaster
      position="top-center"
      expand={true}
      richColors
      closeButton
      duration={5000}
      toastOptions={{
        style: {
          background: theme === 'dark' ? '#191919' : '#ffffff',
          border: theme === 'dark' ? '1px solid #3b3b3b' : '1px solid #e5e5e5',
          color: theme === 'dark' ? '#f2f2f2' : '#171717',
        },
        className: 'sonner-toast',
      }}
    />
  )
}
