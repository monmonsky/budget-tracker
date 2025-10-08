'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { WidgetWrapper } from './WidgetWrapper'
import { TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns'

interface ChartDataPoint {
  date: string
  balance: number
  income: number
  expense: number
}

export function CashFlowChartWidget() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCashFlowData()
  }, [])

  const fetchCashFlowData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get current month date range
      const today = new Date()
      const monthStart = startOfMonth(today)
      const monthEnd = endOfMonth(today)

      // Get transactions for the current month
      const { data: transactions } = await supabase
        .from('transactions')
        .select('date, type, amount')
        .eq('user_id', user.id)
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', monthEnd.toISOString().split('T')[0])
        .order('date', { ascending: true })

      // Get current total balance
      const { data: accounts } = await supabase
        .from('accounts')
        .select('balance')
        .eq('user_id', user.id)
        .eq('is_active', true)

      const currentBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0

      // Calculate daily balances for the past 7 days and forecast next 7 days
      const dataPoints: ChartDataPoint[] = []
      const daysToShow = 14 // 7 past + 7 future
      const midPoint = 7 // Current day

      // Group transactions by date
      const txByDate = new Map<string, { income: number; expense: number }>()
      transactions?.forEach(tx => {
        const dateStr = tx.date
        if (!txByDate.has(dateStr)) {
          txByDate.set(dateStr, { income: 0, expense: 0 })
        }
        const entry = txByDate.get(dateStr)!
        if (tx.type === 'income') {
          entry.income += Number(tx.amount)
        } else if (tx.type === 'expense') {
          entry.expense += Number(tx.amount)
        }
      })

      // Calculate average daily income/expense for forecast
      const avgIncome = transactions
        ?.filter(tx => tx.type === 'income')
        ?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0
      const avgExpense = transactions
        ?.filter(tx => tx.type === 'expense')
        ?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0
      const daysInMonth = Math.max((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24), 1)
      const dailyAvgIncome = avgIncome / daysInMonth
      const dailyAvgExpense = avgExpense / daysInMonth

      let runningBalance = currentBalance

      // Build chart data (7 days past + today + 6 days future)
      for (let i = -midPoint; i < daysToShow - midPoint; i++) {
        const date = addDays(today, i)
        const dateStr = date.toISOString().split('T')[0]
        const txData = txByDate.get(dateStr) || { income: 0, expense: 0 }

        if (i < 0) {
          // Past days - use actual data
          runningBalance = runningBalance - txData.income + txData.expense
        } else if (i === 0) {
          // Today - current balance
          runningBalance = currentBalance
        } else {
          // Future days - forecast
          txData.income = dailyAvgIncome
          txData.expense = dailyAvgExpense
          runningBalance = runningBalance + dailyAvgIncome - dailyAvgExpense
        }

        dataPoints.push({
          date: format(date, 'MMM dd'),
          balance: Math.round(runningBalance),
          income: Math.round(txData.income),
          expense: Math.round(txData.expense)
        })
      }

      setChartData(dataPoints)
    } catch (error) {
      console.error('Error fetching cash flow data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: 'compact',
      compactDisplay: 'short'
    }).format(value)
  }

  if (loading) {
    return (
      <WidgetWrapper id="cash-flow-chart" title="Cash Flow Projection" icon={TrendingUp}>
        <div className="h-48 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading chart...</div>
        </div>
      </WidgetWrapper>
    )
  }

  if (chartData.length === 0) {
    return (
      <WidgetWrapper id="cash-flow-chart" title="Cash Flow Projection" icon={TrendingUp}>
        <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
          <TrendingUp className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No cash flow data</p>
          <p className="text-xs mt-1">Add transactions to see projections</p>
        </div>
      </WidgetWrapper>
    )
  }

  return (
    <WidgetWrapper id="cash-flow-chart" title="Cash Flow Projection" icon={TrendingUp}>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              stroke="#6b7280"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              stroke="#6b7280"
              tickFormatter={formatCurrency}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px'
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              iconSize={10}
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Balance"
              dot={{ r: 2 }}
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke="#22c55e"
              strokeWidth={1.5}
              name="Income"
              dot={false}
              strokeDasharray="5 5"
            />
            <Line
              type="monotone"
              dataKey="expense"
              stroke="#ef4444"
              strokeWidth={1.5}
              name="Expense"
              dot={false}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-xs text-muted-foreground text-center">
        Past 7 days • Future 7 days projection
      </div>
    </WidgetWrapper>
  )
}
