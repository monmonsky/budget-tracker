'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export function DynamicTitle() {
  const [appTitle, setAppTitle] = useState('Monthly Budget Tracker')
  const pathname = usePathname()

  useEffect(() => {
    fetchAppTitle()

    // Listen for settings updates
    const handleSettingsUpdate = () => {
      fetchAppTitle()
    }

    window.addEventListener('settings-updated', handleSettingsUpdate)

    return () => {
      window.removeEventListener('settings-updated', handleSettingsUpdate)
    }
  }, [])

  // Refetch when route changes
  useEffect(() => {
    console.log('[DynamicTitle] Route changed to:', pathname)
    fetchAppTitle()
  }, [pathname])

  const fetchAppTitle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('[DynamicTitle] No user logged in')
        return
      }

      console.log('[DynamicTitle] Fetching app title for user:', user.id)

      const { data, error } = await supabase
        .from('app_settings')
        .select('app_title')
        .eq('user_id', user.id)
        .single()

      console.log('[DynamicTitle] Settings data:', data)
      console.log('[DynamicTitle] Settings error:', error)

      if (data?.app_title) {
        console.log('[DynamicTitle] Setting title to:', data.app_title)
        setAppTitle(data.app_title)
        // Also update immediately without waiting for state
        document.title = data.app_title
        console.log('[DynamicTitle] document.title immediately set to:', document.title)
      } else {
        console.log('[DynamicTitle] No app_title found, using default')
      }
    } catch (error) {
      console.error('[DynamicTitle] Error fetching app title:', error)
    }
  }

  useEffect(() => {
    // Update document title
    console.log('[DynamicTitle] Updating document.title to:', appTitle)
    document.title = appTitle
    console.log('[DynamicTitle] document.title is now:', document.title)
  }, [appTitle])

  return null
}
