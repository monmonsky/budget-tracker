'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, X, Check, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface AlertNotification {
  id: string
  alert_message: string
  current_spending: number
  budget_amount: number
  percentage_used: number
  is_read: boolean
  created_at: string
}

export function BudgetAlertsBell() {
  const [notifications, setNotifications] = useState<AlertNotification[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchNotifications()

    // Subscribe to real-time notifications
    const channel = supabase
      .channel('alert_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alert_notifications',
        },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('alert_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.is_read).length || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('alert_notifications')
        .update({ is_read: true })
        .eq('id', id)

      fetchNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getAlertColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600 bg-red-50 dark:bg-red-900/20'
    if (percentage >= 80) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
    return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown */}
          <Card className="absolute right-0 mt-2 w-96 max-h-[500px] overflow-y-auto bg-card border-border shadow-lg z-50">
            <div className="p-4 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Budget Alerts</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDropdown(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="divide-y divide-border">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No budget alerts</p>
                  <p className="text-sm mt-1">You'll be notified when you approach budget limits</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 hover:bg-muted/50 transition-colors ${
                      !notif.is_read ? 'bg-muted/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${getAlertColor(notif.percentage_used)}`}>
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground mb-1">
                          {notif.alert_message.split(':')[0]}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {formatCurrency(notif.current_spending)} of {formatCurrency(notif.budget_amount)}
                          <span className="ml-2 font-semibold">
                            ({notif.percentage_used.toFixed(1)}%)
                          </span>
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(notif.created_at), 'dd MMM, HH:mm')}
                          </p>
                          {!notif.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notif.id)}
                              className="h-6 px-2 text-xs"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Mark read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-border bg-muted/30">
                <Link href="/dashboard/alerts">
                  <Button variant="ghost" size="sm" className="w-full">
                    View All Alerts
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
