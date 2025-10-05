'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Settings, Save, RotateCcw, Mail, Send } from 'lucide-react'
import { useLoading } from '@/contexts/LoadingContext'
import { toast } from 'sonner'

interface AppSettings {
  id?: string
  app_title: string
  app_description: string
  default_currency: string
  date_format: string
  number_format: string
  fiscal_year_start: number
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  smtp_pass?: string
  smtp_from?: string
}

export default function SettingsPage() {
  const { setLoading, setLoadingText } = useLoading()
  const [settings, setSettings] = useState<AppSettings>({
    app_title: 'Monthly Budget Tracker',
    app_description: 'Track your personal finances and achieve your financial goals',
    default_currency: 'IDR',
    date_format: 'dd/MM/yyyy',
    number_format: 'id-ID',
    fiscal_year_start: 1,
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
  })
  const [hasChanges, setHasChanges] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoadingText('Loading settings...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('[Settings] No user logged in')
        return
      }

      console.log('[Settings] Fetching settings for user:', user.id)

      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      console.log('[Settings] Fetched data:', data)
      console.log('[Settings] Fetch error:', error)

      if (data) {
        setSettings(data)
      }
    } catch (error) {
      console.error('[Settings] Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setLoadingText('Saving settings...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const settingsData = {
        user_id: user.id,
        app_title: settings.app_title,
        app_description: settings.app_description,
        default_currency: settings.default_currency,
        date_format: settings.date_format,
        number_format: settings.number_format,
        fiscal_year_start: settings.fiscal_year_start,
        smtp_host: settings.smtp_host || null,
        smtp_port: settings.smtp_port || 587,
        smtp_user: settings.smtp_user || null,
        smtp_pass: settings.smtp_pass || null,
        smtp_from: settings.smtp_from || null,
        updated_at: new Date().toISOString(),
      }

      console.log('[Settings] Saving settings:', settingsData)

      if (settings.id) {
        // Update existing
        console.log('[Settings] Updating existing settings with id:', settings.id)
        const { error } = await supabase
          .from('app_settings')
          .update(settingsData)
          .eq('id', settings.id)

        if (error) {
          console.error('[Settings] Update error:', error)
          throw error
        }
        console.log('[Settings] Update successful')
      } else {
        // Insert new
        console.log('[Settings] Inserting new settings')
        const { data, error } = await supabase
          .from('app_settings')
          .insert(settingsData)
          .select()
          .single()

        if (error) {
          console.error('[Settings] Insert error:', error)
          throw error
        }
        console.log('[Settings] Insert successful:', data)
        if (data) setSettings(data)
      }

      setHasChanges(false)

      // Dispatch event to update title across the app
      console.log('[Settings] Dispatching settings-updated event')
      window.dispatchEvent(new Event('settings-updated'))

      toast.success('Settings saved successfully!', {
        description: 'Your preferences have been updated.',
      })
    } catch (error: any) {
      console.error('[Settings] Error saving settings:', error)
      toast.error('Failed to save settings', {
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTestEmail = async () => {
    if (!settings.smtp_host || !settings.smtp_user) {
      toast.error('SMTP Configuration Required', {
        description: 'Please fill in SMTP host and user before testing.',
      })
      return
    }

    setTestingEmail(true)

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp_host: settings.smtp_host,
          smtp_port: settings.smtp_port || 587,
          smtp_user: settings.smtp_user,
          smtp_pass: settings.smtp_pass,
          smtp_from: settings.smtp_from || settings.smtp_user,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Test email sent successfully!', {
          description: `Check your inbox at ${settings.smtp_user}`,
        })
      } else {
        toast.error('Email test failed', {
          description: result.error || 'Unable to send test email',
        })
      }
    } catch (error: any) {
      toast.error('Email test failed', {
        description: error.message,
      })
    } finally {
      setTestingEmail(false)
    }
  }

  const handleReset = () => {
    if (!confirm('Reset to default settings?')) return

    setSettings({
      ...settings,
      app_title: 'Monthly Budget Tracker',
      app_description: 'Track your personal finances and achieve your financial goals',
      default_currency: 'IDR',
      date_format: 'dd/MM/yyyy',
      number_format: 'id-ID',
      fiscal_year_start: 1,
    })
    setHasChanges(true)
  }

  const handleChange = (field: keyof AppSettings, value: any) => {
    setSettings({ ...settings, [field]: value })
    setHasChanges(true)
  }

  const currencies = [
    { code: 'IDR', name: 'Indonesian Rupiah (Rp)', symbol: 'Rp' },
    { code: 'USD', name: 'US Dollar ($)', symbol: '$' },
    { code: 'EUR', name: 'Euro (€)', symbol: '€' },
    { code: 'SGD', name: 'Singapore Dollar (S$)', symbol: 'S$' },
    { code: 'MYR', name: 'Malaysian Ringgit (RM)', symbol: 'RM' },
  ]

  const dateFormats = [
    { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY (31/12/2024)' },
    { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY (12/31/2024)' },
    { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (2024-12-31)' },
  ]

  const numberFormats = [
    { value: 'id-ID', label: 'Indonesia (1.000.000,00)' },
    { value: 'en-US', label: 'United States (1,000,000.00)' },
    { value: 'en-GB', label: 'United Kingdom (1,000,000.00)' },
  ]

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-600">Customize your application preferences</p>
        </div>
        {hasChanges && (
          <Badge variant="default">Unsaved Changes</Badge>
        )}
      </div>

      {/* App Information */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5" />
          <h2 className="text-xl font-bold">Application Information</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="app_title">App Title</Label>
            <Input
              id="app_title"
              value={settings.app_title}
              onChange={(e) => handleChange('app_title', e.target.value)}
              placeholder="Monthly Budget Tracker"
            />
            <p className="text-sm text-gray-500">This will be shown in the sidebar and browser tab</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="app_description">App Description</Label>
            <Textarea
              id="app_description"
              value={settings.app_description}
              onChange={(e) => handleChange('app_description', e.target.value)}
              placeholder="Track your personal finances..."
              rows={3}
            />
            <p className="text-sm text-gray-500">Brief description of your budget tracker</p>
          </div>
        </div>
      </Card>

      {/* Email/SMTP Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-5 w-5" />
          <h2 className="text-xl font-bold">Email Configuration (SMTP)</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Configure SMTP settings for budget alert notifications
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtp_host">SMTP Host</Label>
            <Input
              id="smtp_host"
              value={settings.smtp_host || ''}
              onChange={(e) => handleChange('smtp_host', e.target.value)}
              placeholder="smtp.gmail.com"
            />
            <p className="text-sm text-gray-500">Your email provider's SMTP server</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp_port">SMTP Port</Label>
            <Input
              id="smtp_port"
              type="number"
              value={settings.smtp_port || 587}
              onChange={(e) => handleChange('smtp_port', parseInt(e.target.value))}
              placeholder="587"
            />
            <p className="text-sm text-gray-500">Usually 587 (TLS) or 465 (SSL)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp_user">SMTP Username</Label>
            <Input
              id="smtp_user"
              value={settings.smtp_user || ''}
              onChange={(e) => handleChange('smtp_user', e.target.value)}
              placeholder="your-email@example.com"
            />
            <p className="text-sm text-gray-500">Email address for authentication</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp_pass">SMTP Password</Label>
            <Input
              id="smtp_pass"
              type="password"
              value={settings.smtp_pass || ''}
              onChange={(e) => handleChange('smtp_pass', e.target.value)}
              placeholder="••••••••"
            />
            <p className="text-sm text-gray-500">App password or account password</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="smtp_from">From Address</Label>
            <Input
              id="smtp_from"
              value={settings.smtp_from || ''}
              onChange={(e) => handleChange('smtp_from', e.target.value)}
              placeholder="Budget Tracker <noreply@example.com>"
            />
            <p className="text-sm text-gray-500">Name and email to show in "From" field</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ <strong>Security Note:</strong> SMTP credentials are stored in the database.
            For better security, use app-specific passwords instead of your main account password.
          </p>
        </div>

        <div className="mt-4">
          <Button
            onClick={handleTestEmail}
            disabled={testingEmail || !settings.smtp_host || !settings.smtp_user}
            variant="outline"
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {testingEmail ? 'Sending Test Email...' : 'Send Test Email'}
          </Button>
        </div>
      </Card>

      {/* Regional Settings */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Regional & Format Settings</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Default Currency</Label>
            <Select
              value={settings.default_currency}
              onValueChange={(value) => handleChange('default_currency', value)}
            >
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    {curr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">Default currency for transactions</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_format">Date Format</Label>
            <Select
              value={settings.date_format}
              onValueChange={(value) => handleChange('date_format', value)}
            >
              <SelectTrigger id="date_format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateFormats.map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="number_format">Number Format</Label>
            <Select
              value={settings.number_format}
              onValueChange={(value) => handleChange('number_format', value)}
            >
              <SelectTrigger id="number_format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {numberFormats.map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fiscal_year">Fiscal Year Start Month</Label>
            <Select
              value={settings.fiscal_year_start.toString()}
              onValueChange={(value) => handleChange('fiscal_year_start', parseInt(value))}
            >
              <SelectTrigger id="fiscal_year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, index) => (
                  <SelectItem key={index + 1} value={(index + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">When does your financial year start?</p>
          </div>
        </div>
      </Card>

      {/* Preview */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200">
        <h3 className="font-bold mb-3">Preview</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">App Title:</span>
            <span className="font-semibold">{settings.app_title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Currency:</span>
            <span className="font-semibold">
              {currencies.find(c => c.code === settings.default_currency)?.symbol}
              {' '}{settings.default_currency}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date Format:</span>
            <span className="font-semibold">{settings.date_format}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Number Format:</span>
            <span className="font-semibold">{settings.number_format}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Fiscal Year Starts:</span>
            <span className="font-semibold">{months[settings.fiscal_year_start - 1]}</span>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={!hasChanges} className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
        <Button onClick={handleReset} variant="outline">
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Default
        </Button>
      </div>
    </div>
  )
}
