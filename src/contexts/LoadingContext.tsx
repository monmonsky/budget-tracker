'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { LoadingSpinner } from '@/components/loading-spinner'

interface LoadingContextType {
  isLoading: boolean
  setLoading: (loading: boolean) => void
  loadingText: string
  setLoadingText: (text: string) => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('Loading...')

  const setLoading = (loading: boolean) => {
    setIsLoading(loading)
  }

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        setLoading,
        loadingText,
        setLoadingText,
      }}
    >
      {children}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-xl">
            <LoadingSpinner size="lg" text={loadingText} />
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}
