'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DarkModeToggle } from '@/components/dark-mode-toggle'
import { FullPageLoader } from '@/components/loading-spinner'
import {
  Home,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Building2,
  BarChart3,
  LogOut,
  Menu,
  X,
  Receipt,
  Tag,
  FileText,
  Settings,
  RefreshCw,
  Target,
  LineChart,
  Upload,
  PieChart
} from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [appSettings, setAppSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    // Listen for settings updates
    const handleSettingsUpdate = () => {
      if (user?.id) {
        fetchAppSettings(user.id)
      }
    }

    window.addEventListener('settings-updated', handleSettingsUpdate)

    return () => {
      window.removeEventListener('settings-updated', handleSettingsUpdate)
    }
  }, [user?.id])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)

    // Get profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profileData) {
      // Profile doesn't exist, redirect to setup
      router.push('/setup-profile')
      return
    }

    setProfile(profileData)

    // Get app settings
    await fetchAppSettings(user.id)
    setLoading(false)
  }

  const fetchAppSettings = async (userId: string) => {
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    setAppSettings(settingsData)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return <FullPageLoader text="Loading dashboard..." />
  }

  const navigationGroups = [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'Analytics', href: '/dashboard/analytics', icon: PieChart },
        { name: 'Reports', href: '/dashboard/reports', icon: FileText },
        { name: 'Net Worth', href: '/dashboard/networth', icon: BarChart3 },
      ]
    },
    {
      title: 'Transactions',
      items: [
        { name: 'All Transactions', href: '/dashboard/transactions', icon: Receipt },
        { name: 'Income', href: '/dashboard/income', icon: TrendingUp },
        { name: 'Expenses', href: '/dashboard/expenses', icon: TrendingDown },
        { name: 'Recurring', href: '/dashboard/recurring', icon: RefreshCw },
        { name: 'Import CSV', href: '/dashboard/import', icon: Upload },
        { name: 'Categories', href: '/dashboard/categories', icon: Tag },
      ]
    },
    {
      title: 'Planning',
      items: [
        { name: 'Budget', href: '/dashboard/budget', icon: Target },
        { name: 'Cash Flow', href: '/dashboard/cashflow', icon: LineChart },
      ]
    },
    {
      title: 'Assets & Liabilities',
      items: [
        { name: 'Accounts', href: '/dashboard/accounts', icon: Wallet },
        { name: 'Investments', href: '/dashboard/investments', icon: PiggyBank },
        { name: 'KPR Tracker', href: '/dashboard/kpr', icon: Building2 },
      ]
    },
    {
      title: 'System',
      items: [
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
      ]
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar-border
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-sidebar-foreground">
                {appSettings?.app_title || '💰 Budget'}
              </h1>
              <p className="text-sm text-muted-foreground">{profile?.full_name}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
            {navigationGroups.map((group) => (
              <div key={group.title}>
                <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                        {isActive && (
                          <div className="ml-auto w-1 h-6 bg-primary rounded-full" />
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User Info, Dark Mode & Logout */}
          <div className="p-4 border-t border-sidebar-border space-y-3">
            {/* User Info */}
            <div className="px-3 py-2 bg-sidebar-accent rounded-lg">
              <p className="text-xs text-muted-foreground">Logged in as</p>
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || user?.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-muted-foreground">Theme</span>
              <DarkModeToggle />
            </div>

            {/* Logout Button */}
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="lg:hidden bg-background border-b border-border p-4 flex items-center justify-between sticky top-0 z-30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">
            {appSettings?.app_title || '💰 Budget'}
          </h1>
          <DarkModeToggle />
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
