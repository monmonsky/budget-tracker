'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Calendar, PieChart } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { useLoading } from '@/contexts/LoadingContext'
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, TooltipProps } from 'recharts'
import { useTheme } from 'next-themes'

interface CategorySpending {
  category: string
  amount: number
  percentage: number
  icon: string | null
  color: string
  transactionCount: number
}

interface MonthlyTrend {
  month: string
  [key: string]: string | number
}

export default function AnalyticsPage() {
  const { setLoading, setLoadingText } = useLoading()
  const { theme } = useTheme()
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([])
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([])
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [topCategory, setTopCategory] = useState<CategorySpending | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [selectedMonth])

  const fetchAnalytics = async () => {
    setLoadingText('Loading analytics...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await Promise.all([
        fetchCategorySpending(user.id),
        fetchMonthlyTrends(user.id)
      ])
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategorySpending = async (userId: string) => {
    const monthStart = format(startOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd')

    // Fetch expenses by category
    const { data: transactions } = await supabase
      .from('transactions')
      .select('category, amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .gte('date', monthStart)
      .lte('date', monthEnd)

    // Fetch categories for icons/colors
    const { data: categories } = await supabase
      .from('categories')
      .select('name, icon, color')
      .eq('type', 'expense')

    const categoryMap = new Map(categories?.map(c => [c.name, { icon: c.icon, color: c.color }]) || [])

    // Group by category
    const categoryTotals = new Map<string, { amount: number; count: number }>()
    transactions?.forEach(t => {
      const current = categoryTotals.get(t.category) || { amount: 0, count: 0 }
      current.amount += Number(t.amount)
      current.count++
      categoryTotals.set(t.category, current)
    })

    const total = Array.from(categoryTotals.values()).reduce((sum, c) => sum + c.amount, 0)
    setTotalExpenses(total)

    // Convert to array with percentages
    const spending: CategorySpending[] = Array.from(categoryTotals.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: total > 0 ? (data.amount / total) * 100 : 0,
        icon: categoryMap.get(category)?.icon || '📁',
        color: categoryMap.get(category)?.color || COLORS[Math.floor(Math.random() * COLORS.length)],
        transactionCount: data.count,
      }))
      .sort((a, b) => b.amount - a.amount)

    setCategorySpending(spending)
    setTopCategory(spending[0] || null)
  }

  const fetchMonthlyTrends = async (userId: string) => {
    const trends: MonthlyTrend[] = []

    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(selectedMonth), i)
      const monthStart = format(startOfMonth(date), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(date), 'yyyy-MM-dd')
      const monthLabel = format(date, 'MMM yyyy')

      const { data: transactions } = await supabase
        .from('transactions')
        .select('category, amount')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('date', monthStart)
        .lte('date', monthEnd)

      const monthData: MonthlyTrend = { month: monthLabel }

      // Group by category
      const categoryTotals = new Map<string, number>()
      transactions?.forEach(t => {
        const current = categoryTotals.get(t.category) || 0
        categoryTotals.set(t.category, current + Number(t.amount))
      })

      // Add top categories only (to keep chart readable)
      Array.from(categoryTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([category, amount]) => {
          monthData[category] = amount
        })

      trends.push(monthData)
    }

    setMonthlyTrends(trends)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e']

  // Tooltip styling based on theme
  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#191919' : '#ffffff',
    border: theme === 'dark' ? '1px solid #3b3b3b' : '1px solid #e5e5e5',
    borderRadius: '8px',
    padding: '8px 12px',
  }

  const tooltipLabelStyle = {
    color: theme === 'dark' ? '#f2f2f2' : '#171717',
    fontWeight: 600,
    marginBottom: '4px',
  }

  const tooltipItemStyle = {
    color: theme === 'dark' ? '#f2f2f2' : '#171717',
  }

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={tooltipStyle}>
          <p style={tooltipLabelStyle}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ ...tooltipItemStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '12px',
                height: '12px',
                backgroundColor: entry.color,
                borderRadius: '2px',
                display: 'inline-block'
              }}></span>
              <span>{entry.name}: {formatCurrency(entry.value)}</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Chart data
  const pieData = categorySpending.map((item, index) => ({
    name: item.category,
    value: item.amount,
    color: item.color || COLORS[index % COLORS.length],
  }))

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Category Analytics</h1>
          <p className="text-muted-foreground">Analyze your spending patterns by category</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-md bg-background border border-border text-foreground"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Top Category</p>
            <div className="flex items-center gap-2">
              {topCategory && (
                <>
                  <span className="text-2xl">{topCategory.icon}</span>
                  <div>
                    <p className="text-lg font-bold text-foreground">{topCategory.category}</p>
                    <p className="text-sm text-muted-foreground">{topCategory.percentage.toFixed(1)}%</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Categories</p>
            <p className="text-2xl font-bold text-foreground">{categorySpending.length}</p>
            <p className="text-sm text-muted-foreground">Active this month</p>
          </div>
        </Card>
      </div>

      {/* Pie Chart */}
      <Card className="p-6 bg-card border-border">
        <h2 className="text-xl font-semibold text-foreground mb-4">Spending Distribution</h2>
        {categorySpending.length === 0 ? (
          <div className="text-center py-12">
            <PieChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No expenses recorded for this month</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPie>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value.toLocaleString('id-ID')}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </RechartsPie>
            </ResponsiveContainer>

            <div className="space-y-2">
              {categorySpending.map((item, index) => (
                <div key={item.category} className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                    />
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-medium text-foreground">{item.category}</p>
                      <p className="text-sm text-muted-foreground">{item.transactionCount} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{formatCurrency(item.amount)}</p>
                    <p className="text-sm text-muted-foreground">{item.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Monthly Trend */}
      <Card className="p-6 bg-card border-border">
        <h2 className="text-xl font-semibold text-foreground mb-4">6-Month Trend</h2>
        {monthlyTrends.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Not enough data for trend analysis</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3b3b3b" />
              <XAxis dataKey="month" stroke="#a3a3a3" />
              <YAxis stroke="#a3a3a3" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {categorySpending.slice(0, 5).map((cat, index) => (
                <Bar
                  key={cat.category}
                  dataKey={cat.category}
                  fill={cat.color || COLORS[index % COLORS.length]}
                  stackId="stack"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Insights */}
      <Card className="p-6 bg-card border-border">
        <h2 className="text-xl font-semibold text-foreground mb-4">Insights</h2>
        <div className="space-y-3">
          {topCategory && (
            <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Highest Spending Category</p>
                <p className="text-sm text-muted-foreground">
                  You spent the most on <strong>{topCategory.category}</strong> ({formatCurrency(topCategory.amount)}, {topCategory.percentage.toFixed(1)}% of total expenses)
                </p>
              </div>
            </div>
          )}

          {categorySpending.length >= 3 && (
            <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/50 rounded-lg">
              <PieChart className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Diversified Spending</p>
                <p className="text-sm text-muted-foreground">
                  Your expenses are spread across {categorySpending.length} categories this month
                </p>
              </div>
            </div>
          )}

          {categorySpending.filter(c => c.percentage > 30).length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/50 rounded-lg">
              <TrendingDown className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Concentration Alert</p>
                <p className="text-sm text-muted-foreground">
                  {categorySpending.filter(c => c.percentage > 30).length} category(ies) account for more than 30% of your spending. Consider setting budgets!
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
