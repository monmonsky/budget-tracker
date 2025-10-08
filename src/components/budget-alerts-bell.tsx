'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, X, Check, AlertTriangle, Calendar, DollarSign } from 'lucide-react'
import { format, differenceInDays, addDays } from 'date-fns'
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

interface BillReminder {
  id: string
  bill_name: string
  amount: number
  next_due_date: string | null
  category: string
  is_active: boolean
}

export function BudgetAlertsBell() {
  const [notifications, setNotifications] = useState<AlertNotification[]>([])
  const [upcomingBills, setUpcomingBills] = useState<BillReminder[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchNotifications()
    fetchUpcomingBills()

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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bill_reminders',
        },
        () => {
          fetchUpcomingBills()
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
      const unread = data?.filter(n => !n.is_read).length || 0
      setUnreadCount(unread)
      setTotalCount(unread + upcomingBills.length)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const fetchUpcomingBills = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      const sevenDaysLater = addDays(today, 7)

      const { data } = await supabase
        .from('bill_reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .not('next_due_date', 'is', null)
        .lte('next_due_date', sevenDaysLater.toISOString().split('T')[0])
        .order('next_due_date', { ascending: true })

      setUpcomingBills(data || [])
      setTotalCount((notifications.filter(n => !n.is_read).length || 0) + (data?.length || 0))
    } catch (error) {
      console.error('Error fetching upcoming bills:', error)
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

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null
    return differenceInDays(new Date(dueDate), new Date())
  }

  const getBillColor = (daysUntil: number | null) => {
    if (daysUntil === null) return 'text-gray-600 bg-gray-50'
    if (daysUntil < 0) return 'text-red-600 bg-red-50 dark:bg-red-900/20'
    if (daysUntil === 0) return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
    if (daysUntil <= 3) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
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
        {totalCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {totalCount}
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
          <Card className="absolute right-0 mt-2 w-96 max-h-[600px] overflow-y-auto bg-card border-border shadow-lg z-50">
            <div className="p-4 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Notifications</h3>
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
              {/* Upcoming Bills Section */}
              {upcomingBills.length > 0 && (
                <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10">
                  <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Upcoming Bills (Next 7 Days)
                  </h4>
                  <div className="space-y-2">
                    {upcomingBills.map((bill) => {
                      const daysUntil = getDaysUntilDue(bill.next_due_date)
                      return (
                        <div
                          key={bill.id}
                          className="flex items-start gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg border border-border"
                        >
                          <div className={`p-2 rounded-lg ${getBillColor(daysUntil)}`}>
                            <DollarSign className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {bill.bill_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(bill.amount)}
                            </p>
                            <p className="text-xs font-semibold mt-1">
                              {daysUntil === null ? 'No due date' :
                               daysUntil < 0 ? `Overdue ${Math.abs(daysUntil)} days` :
                               daysUntil === 0 ? 'Due today!' :
                               `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Budget Alerts Section */}
              {notifications.length === 0 && upcomingBills.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No notifications</p>
                  <p className="text-sm mt-1">You'll be notified about budget alerts and upcoming bills</p>
                </div>
              ) : notifications.length > 0 && (
                <div className={upcomingBills.length > 0 ? 'pt-3' : ''}>
                  {upcomingBills.length > 0 && (
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 px-3 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Budget Alerts
                    </h4>
                  )}
                  <div className="divide-y divide-border">
                    {notifications.map((notif) => (
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
                    ))}
                  </div>
                </div>
              )}
            </div>

            {(notifications.length > 0 || upcomingBills.length > 0) && (
              <div className="p-3 border-t border-border bg-muted/30 flex gap-2">
                {upcomingBills.length > 0 && (
                  <Link href="/dashboard/bills" className="flex-1">
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      View All Bills
                    </Button>
                  </Link>
                )}
                {notifications.length > 0 && (
                  <Link href="/dashboard/alerts" className="flex-1">
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      View All Alerts
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
