'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { WidgetWrapper } from './WidgetWrapper'
import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

interface QuickStats {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  netWorth: number
}

export function QuickStatsWidget() {
  const [stats, setStats] = useState<QuickStats>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    netWorth: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get total balance from all active accounts
      const { data: accounts } = await supabase
        .from('accounts')
        .select('balance, account_type')
        .eq('is_active', true)

      const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0

      // Get this month's income and expenses
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: transactions } = await supabase
        .from('transactions')
        .select('type, amount')
        .gte('date', startOfMonth.toISOString())

      const monthlyIncome = transactions
        ?.filter(t => t.type === 'income')
        ?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

      const monthlyExpenses = transactions
        ?.filter(t => t.type === 'expense')
        ?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

      // Calculate net worth (total balance)
      const netWorth = totalBalance

      setStats({
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        netWorth
      })
    } catch (error) {
      console.error('Error fetching quick stats:', error)
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

  if (loading) {
    return (
      <WidgetWrapper id="quick-stats" title="Quick Stats" icon={Wallet}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
      </WidgetWrapper>
    )
  }

  return (
    <WidgetWrapper id="quick-stats" title="Quick Stats" icon={Wallet}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Balance */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Wallet className="h-3 w-3" />
            <span>Balance</span>
          </div>
          <p className="text-lg font-bold text-foreground">{formatCurrency(stats.totalBalance)}</p>
        </div>

        {/* Monthly Income */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <TrendingUp className="h-3 w-3" />
            <span>Income</span>
          </div>
          <p className="text-lg font-bold text-green-600">{formatCurrency(stats.monthlyIncome)}</p>
        </div>

        {/* Monthly Expenses */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <TrendingDown className="h-3 w-3" />
            <span>Expenses</span>
          </div>
          <p className="text-lg font-bold text-red-600">{formatCurrency(stats.monthlyExpenses)}</p>
        </div>

        {/* Net Worth */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <DollarSign className="h-3 w-3" />
            <span>Net Worth</span>
          </div>
          <p className="text-lg font-bold text-blue-600">{formatCurrency(stats.netWorth)}</p>
        </div>
      </div>
    </WidgetWrapper>
  )
}
