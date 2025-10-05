'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'

export default function SetupProfilePage() {
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'primary' | 'partner'>('primary')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setCurrentUser(user)

    // Check if profile already exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      // Profile exists, redirect to dashboard
      router.push('/dashboard')
    }
  }

  const handleSetupProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!currentUser) {
      setError('No user found. Please log in again.')
      setLoading(false)
      return
    }

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: currentUser.id,
          email: currentUser.email,
          full_name: fullName,
          role,
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        setError(`Failed to create profile: ${profileError.message}`)
        setLoading(false)
        return
      }

      alert('Profile created successfully!')
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">💰 Complete Your Profile</h1>
          <p className="text-gray-600">Your profile is missing. Let's set it up!</p>
          <p className="text-sm text-gray-500">Email: {currentUser.email}</p>
        </div>

        <form onSubmit={handleSetupProfile} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: 'primary' | 'partner') => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary (Husband)</SelectItem>
                <SelectItem value="partner">Partner (Wife)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Setting up...' : 'Complete Setup'}
          </Button>
        </form>

        <div className="text-center text-sm">
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="text-gray-600 hover:underline"
          >
            Sign out and try again
          </button>
        </div>
      </Card>
    </div>
  )
}
