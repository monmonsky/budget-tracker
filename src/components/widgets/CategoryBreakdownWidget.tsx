'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { WidgetWrapper } from './WidgetWrapper'
import { PieChart as PieChartIcon } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { startOfMonth, endOfMonth } from 'date-fns'

interface CategoryData {
  name: string
  value: number
  percentage: number
  color: string
}

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
  '#84cc16'  // lime
]

export function CategoryBreakdownWidget() {
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalSpending, setTotalSpending] = useState(0)

  useEffect(() => {
    fetchCategoryBreakdown()
  }, [])

  const fetchCategoryBreakdown = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      const monthStart = startOfMonth(today)
      const monthEnd = endOfMonth(today)

      // Get all expense transactions for this month
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          amount,
          category:categories(name, color)
        `)
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', monthEnd.toISOString().split('T')[0])

      if (!transactions || transactions.length === 0) {
        setLoading(false)
        return
      }

      // Group by category
      const categoryMap = new Map<string, { total: number; color: string }>()

      transactions.forEach(tx => {
        const category = tx.category as any
        const categoryName = category?.name || 'Uncategorized'
        const categoryColor = category?.color || '#6b7280'

        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, { total: 0, color: categoryColor })
        }

        const entry = categoryMap.get(categoryName)!
        entry.total += Number(tx.amount)
      })

      // Calculate total and percentages
      const total = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.total, 0)
      setTotalSpending(total)

      // Convert to array and sort by amount
      const categoryData: CategoryData[] = Array.from(categoryMap.entries())
        .map(([name, data], index) => ({
          name,
          value: data.total,
          percentage: total > 0 ? (data.total / total) * 100 : 0,
          color: data.color || COLORS[index % COLORS.length]
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10) // Top 10 categories

      setCategories(categoryData)
    } catch (error) {
      console.error('Error fetching category breakdown:', error)
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
      notation: 'compact',
      compactDisplay: 'short'
    }).format(amount)
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-2 border rounded shadow-lg text-xs">
          <p className="font-semibold">{data.name}</p>
          <p className="text-muted-foreground">{formatCurrency(data.value)}</p>
          <p className="text-muted-foreground">{data.percentage.toFixed(1)}%</p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <WidgetWrapper id="category-breakdown" title="Category Breakdown" icon={PieChartIcon}>
        <div className="flex items-center justify-center h-48">
          <div className="animate-pulse text-muted-foreground">Loading chart...</div>
        </div>
      </WidgetWrapper>
    )
  }

  if (categories.length === 0) {
    return (
      <WidgetWrapper id="category-breakdown" title="Category Breakdown" icon={PieChartIcon}>
        <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
          <PieChartIcon className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No spending data</p>
          <p className="text-xs mt-1">Add expense transactions to see breakdown</p>
        </div>
      </WidgetWrapper>
    )
  }

  return (
    <WidgetWrapper id="category-breakdown" title="Category Breakdown" icon={PieChartIcon}>
      <div className="space-y-3">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categories}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
              >
                {categories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="text-center border-t pt-2">
          <p className="text-xs text-muted-foreground">Total Spending</p>
          <p className="text-lg font-bold">{formatCurrency(totalSpending)}</p>
        </div>

        <div className="space-y-1.5 max-h-32 overflow-y-auto">
          {categories.map((cat, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="truncate">{cat.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-medium">{cat.percentage.toFixed(0)}%</span>
                <span className="text-muted-foreground">{formatCurrency(cat.value)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </WidgetWrapper>
  )
}
