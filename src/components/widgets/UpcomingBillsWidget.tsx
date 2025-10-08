'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { WidgetWrapper } from './WidgetWrapper'
import { Calendar, AlertCircle } from 'lucide-react'
import { differenceInDays, format } from 'date-fns'

interface BillData {
  id: string
  bill_name: string
  amount: number
  next_due_date: string | null
  category: string
  is_auto_pay: boolean
  daysUntil: number | null
}

export function UpcomingBillsWidget() {
  const [bills, setBills] = useState<BillData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUpcomingBills()
  }, [])

  const fetchUpcomingBills = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      const sevenDaysLater = new Date()
      sevenDaysLater.setDate(today.getDate() + 7)

      const { data: billsData } = await supabase
        .from('bill_reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .not('next_due_date', 'is', null)
        .lte('next_due_date', sevenDaysLater.toISOString().split('T')[0])
        .order('next_due_date', { ascending: true })
        .limit(10)

      if (billsData) {
        const billsWithDays = billsData.map(bill => {
          const daysUntil = bill.next_due_date
            ? differenceInDays(new Date(bill.next_due_date), today)
            : null

          return {
            id: bill.id,
            bill_name: bill.bill_name,
            amount: Number(bill.amount),
            next_due_date: bill.next_due_date,
            category: bill.category,
            is_auto_pay: bill.is_auto_pay,
            daysUntil
          }
        })

        setBills(billsWithDays)
      }
    } catch (error) {
      console.error('Error fetching upcoming bills:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getBillStatusColor = (daysUntil: number | null) => {
    if (daysUntil === null) return 'text-gray-600 bg-gray-100'
    if (daysUntil < 0) return 'text-red-600 bg-red-100'
    if (daysUntil === 0) return 'text-orange-600 bg-orange-100'
    if (daysUntil <= 3) return 'text-yellow-600 bg-yellow-100'
    return 'text-blue-600 bg-blue-100'
  }

  const getBillStatusText = (daysUntil: number | null) => {
    if (daysUntil === null) return 'No date'
    if (daysUntil < 0) return `${Math.abs(daysUntil)}d overdue`
    if (daysUntil === 0) return 'Today'
    if (daysUntil === 1) return 'Tomorrow'
    return `${daysUntil} days`
  }

  if (loading) {
    return (
      <WidgetWrapper id="upcoming-bills" title="Upcoming Bills" icon={Calendar}>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex justify-between items-center p-2 border rounded">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </WidgetWrapper>
    )
  }

  if (bills.length === 0) {
    return (
      <WidgetWrapper id="upcoming-bills" title="Upcoming Bills" icon={Calendar}>
        <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
          <Calendar className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No upcoming bills</p>
          <p className="text-xs mt-1">All bills are paid or none scheduled</p>
        </div>
      </WidgetWrapper>
    )
  }

  return (
    <WidgetWrapper id="upcoming-bills" title="Upcoming Bills" icon={Calendar}>
      <div className="space-y-2">
        {bills.map(bill => (
          <div
            key={bill.id}
            className="flex justify-between items-center p-2 border rounded hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm truncate">{bill.bill_name}</h4>
                {bill.daysUntil !== null && bill.daysUntil < 0 && (
                  <AlertCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">{bill.category}</p>
                {bill.is_auto_pay && (
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                    Auto
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end flex-shrink-0">
              <span className="font-semibold text-sm">{formatCurrency(bill.amount)}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded mt-1 ${getBillStatusColor(bill.daysUntil)}`}>
                {getBillStatusText(bill.daysUntil)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  )
}
