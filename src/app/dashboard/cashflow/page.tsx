'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react'
import { format, addMonths, startOfMonth, endOfMonth, differenceInMonths, differenceInDays, isWithinInterval } from 'date-fns'
import { useLoading } from '@/contexts/LoadingContext'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface MonthlyProjection {
  month: string
  monthLabel: string
  projectedIncome: number
  projectedExpenses: number
  netCashFlow: number
  cumulativeBalance: number
  recurringIncome: number
  recurringExpenses: number
  avgHistoricalIncome: number
  avgHistoricalExpenses: number
}

export default function CashFlowPage() {
  const { setLoading, setLoadingText } = useLoading()
  const [projections, setProjections] = useState<MonthlyProjection[]>([])
  const [currentBalance, setCurrentBalance] = useState(0)
  const [months, setMonths] = useState(6)
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')

  useEffect(() => {
    calculateProjections()
  }, [months])

  const calculateProjections = async () => {
    setLoadingText('Calculating cash flow projections...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get current account balances
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('balance')
        .eq('is_active', true)
        .neq('account_type', 'debt')

      const totalBalance = accountsData?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0
      setCurrentBalance(totalBalance)

      // Get historical transactions (last 6 months)
      const sixMonthsAgo = format(addMonths(new Date(), -6), 'yyyy-MM-dd')
      const { data: historicalData } = await supabase
        .from('transactions')
        .select('date, amount, type')
        .gte('date', sixMonthsAgo)
        .in('type', ['income', 'expense'])

      // Calculate monthly averages from historical data
      const monthlyHistorical = new Map<string, { income: number; expense: number; count: number }>()
      historicalData?.forEach(t => {
        const month = format(new Date(t.date), 'yyyy-MM')
        const current = monthlyHistorical.get(month) || { income: 0, expense: 0, count: 0 }

        if (t.type === 'income') {
          current.income += Number(t.amount)
        } else {
          current.expense += Number(t.amount)
        }
        current.count++
        monthlyHistorical.set(month, current)
      })

      const avgIncome = Array.from(monthlyHistorical.values()).reduce((sum, m) => sum + m.income, 0) / Math.max(monthlyHistorical.size, 1)
      const avgExpenses = Array.from(monthlyHistorical.values()).reduce((sum, m) => sum + m.expense, 0) / Math.max(monthlyHistorical.size, 1)

      // Get recurring transactions
      const { data: recurringData } = await supabase
        .from('recurring_transactions')
        .select('amount, type, frequency, next_occurrence, is_active')
        .eq('is_active', true)

      // Project next N months
      const projectionData: MonthlyProjection[] = []
      let cumulativeBalance = totalBalance

      for (let i = 0; i < months; i++) {
        const projectedMonth = addMonths(new Date(), i)
        const monthStart = startOfMonth(projectedMonth)
        const monthEnd = endOfMonth(projectedMonth)
        const monthKey = format(monthStart, 'yyyy-MM')
        const monthLabel = format(monthStart, 'MMM yyyy')

        // Calculate recurring income/expenses for this month
        let recurringIncome = 0
        let recurringExpenses = 0

        recurringData?.forEach(r => {
          // Calculate occurrences for this specific month only
          let occurrences = 0
          let currentDate = new Date(r.next_occurrence)

          // Count occurrences within this month's range
          while (currentDate <= monthEnd) {
            if (currentDate >= monthStart && currentDate <= monthEnd) {
              occurrences++
            }

            // Move to next occurrence based on frequency
            switch (r.frequency) {
              case 'daily':
                currentDate.setDate(currentDate.getDate() + 1)
                break
              case 'weekly':
                currentDate.setDate(currentDate.getDate() + 7)
                break
              case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + 1)
                break
              case 'yearly':
                currentDate.setFullYear(currentDate.getFullYear() + 1)
                break
              default:
                // Exit loop if frequency is unknown
                currentDate = new Date(monthEnd.getTime() + 1)
            }

            // Prevent infinite loop - max 31 occurrences per month
            if (occurrences >= 31) break
          }

          if (occurrences > 0) {
            if (r.type === 'income') {
              recurringIncome += Number(r.amount) * occurrences
            } else {
              recurringExpenses += Number(r.amount) * occurrences
            }
          }
        })

        // Combine recurring + historical average for projection
        const projectedIncome = recurringIncome + (avgIncome * 0.7) // 70% of historical average for non-recurring
        const projectedExpenses = recurringExpenses + (avgExpenses * 0.7)
        const netCashFlow = projectedIncome - projectedExpenses
        cumulativeBalance += netCashFlow

        projectionData.push({
          month: monthKey,
          monthLabel,
          projectedIncome,
          projectedExpenses,
          netCashFlow,
          cumulativeBalance,
          recurringIncome,
          recurringExpenses,
          avgHistoricalIncome: avgIncome,
          avgHistoricalExpenses: avgExpenses,
        })
      }

      setProjections(projectionData)
    } catch (error) {
      console.error('Error calculating projections:', error)
    } finally {
      setLoading(false)
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

  const totalProjectedIncome = projections.reduce((sum, p) => sum + p.projectedIncome, 0)
  const totalProjectedExpenses = projections.reduce((sum, p) => sum + p.projectedExpenses, 0)
  const totalNetCashFlow = totalProjectedIncome - totalProjectedExpenses
  const finalBalance = projections[projections.length - 1]?.cumulativeBalance || currentBalance

  // Chart data
  const chartData = projections.map(p => ({
    name: p.monthLabel,
    Income: p.projectedIncome,
    Expenses: p.projectedExpenses,
    NetFlow: p.netCashFlow,
    Balance: p.cumulativeBalance,
  }))

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cash Flow Projection</h1>
          <p className="text-muted-foreground">Forecast your financial future based on historical data and recurring transactions</p>
        </div>
        <div className="flex gap-2">
          <Select value={chartType} onValueChange={(value: 'line' | 'bar') => setChartType(value)}>
            <SelectTrigger className="w-32 bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">Line Chart</SelectItem>
              <SelectItem value="bar">Bar Chart</SelectItem>
            </SelectContent>
          </Select>
          <Select value={months.toString()} onValueChange={(value) => setMonths(parseInt(value))}>
            <SelectTrigger className="w-40 bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 Months</SelectItem>
              <SelectItem value="6">6 Months</SelectItem>
              <SelectItem value="12">12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(currentBalance)}</p>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Projected Income</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalProjectedIncome)}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Projected Expenses</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalProjectedExpenses)}</p>
            </div>
            <TrendingDown className="h-5 w-5 text-red-600" />
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Projected Balance</p>
              <p className={`text-2xl font-bold ${finalBalance >= currentBalance ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(finalBalance)}
              </p>
            </div>
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
        </Card>
      </div>

      {/* Chart */}
      <Card className="p-6 bg-card border-border">
        <h2 className="text-xl font-semibold text-foreground mb-4">Cash Flow Trend</h2>
        <ResponsiveContainer width="100%" height={400}>
          {chartType === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3b3b3b" />
              <XAxis dataKey="name" stroke="#a3a3a3" />
              <YAxis stroke="#a3a3a3" />
              <Tooltip
                contentStyle={{ backgroundColor: '#191919', border: '1px solid #3b3b3b', borderRadius: '8px' }}
                labelStyle={{ color: '#f2f2f2' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Line type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="Balance" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3b3b3b" />
              <XAxis dataKey="name" stroke="#a3a3a3" />
              <YAxis stroke="#a3a3a3" />
              <Tooltip
                contentStyle={{ backgroundColor: '#191919', border: '1px solid #3b3b3b', borderRadius: '8px' }}
                labelStyle={{ color: '#f2f2f2' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="Income" fill="#10b981" />
              <Bar dataKey="Expenses" fill="#ef4444" />
              <Bar dataKey="NetFlow" fill="#3b82f6" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </Card>

      {/* Monthly Breakdown */}
      <Card className="p-6 bg-card border-border">
        <h2 className="text-xl font-semibold text-foreground mb-4">Monthly Breakdown</h2>
        <div className="space-y-4">
          {projections.map((projection, index) => (
            <div key={projection.month} className="border border-border rounded-lg p-4 bg-secondary/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">{projection.monthLabel}</h3>
                  {index === 0 && <Badge variant="outline">Next Month</Badge>}
                </div>
                <Badge variant={projection.netCashFlow >= 0 ? 'default' : 'destructive'}>
                  {projection.netCashFlow >= 0 ? 'Surplus' : 'Deficit'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Projected Income</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(projection.projectedIncome)}</p>
                  <p className="text-xs text-muted-foreground">
                    Recurring: {formatCurrency(projection.recurringIncome)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Projected Expenses</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(projection.projectedExpenses)}</p>
                  <p className="text-xs text-muted-foreground">
                    Recurring: {formatCurrency(projection.recurringExpenses)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Cash Flow</p>
                  <p className={`text-lg font-bold ${projection.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {projection.netCashFlow >= 0 ? '+' : ''}{formatCurrency(projection.netCashFlow)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cumulative Balance</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(projection.cumulativeBalance)}</p>
                  <p className={`text-xs ${projection.cumulativeBalance > currentBalance ? 'text-green-600' : 'text-red-600'}`}>
                    {projection.cumulativeBalance >= currentBalance ? '+' : ''}
                    {formatCurrency(projection.cumulativeBalance - currentBalance)} vs current
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Disclaimer */}
      <Card className="p-4 bg-yellow-500/10 border-yellow-500/50">
        <p className="text-sm text-foreground">
          <strong>Note:</strong> These projections are estimates based on your historical spending patterns (last 6 months) and active recurring transactions.
          Actual results may vary. For more accurate projections, ensure all recurring transactions are set up and update regularly.
        </p>
      </Card>
    </div>
  )
}
