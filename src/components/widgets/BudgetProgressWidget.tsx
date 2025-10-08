'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { WidgetWrapper } from './WidgetWrapper'
import { Target } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { startOfMonth, endOfMonth } from 'date-fns'

interface BudgetData {
  id: string
  category_name: string
  amount: number
  spent: number
  percentage: number
  remaining: number
}

export function BudgetProgressWidget() {
  const [budgets, setBudgets] = useState<BudgetData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBudgetProgress()
  }, [])

  const fetchBudgetProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      const monthStart = startOfMonth(today)
      const monthEnd = endOfMonth(today)

      // Get active budgets for this month
      const { data: budgetsData } = await supabase
        .from('budgets')
        .select(`
          id,
          amount,
          category:categories(id, name)
        `)
        .eq('user_id', user.id)
        .lte('start_date', monthEnd.toISOString().split('T')[0])
        .gte('end_date', monthStart.toISOString().split('T')[0])
        .limit(5)

      if (!budgetsData || budgetsData.length === 0) {
        setLoading(false)
        return
      }

      // Get spending for each category
      const budgetProgress: BudgetData[] = []

      for (const budget of budgetsData) {
        const category = budget.category as any
        if (!category) continue

        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('category_id', category.id)
          .eq('type', 'expense')
          .gte('date', monthStart.toISOString().split('T')[0])
          .lte('date', monthEnd.toISOString().split('T')[0])

        const spent = transactions?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0
        const budgetAmount = Number(budget.amount)
        const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0
        const remaining = budgetAmount - spent

        budgetProgress.push({
          id: budget.id,
          category_name: category.name,
          amount: budgetAmount,
          spent: spent,
          percentage: Math.min(percentage, 100),
          remaining: remaining
        })
      }

      // Sort by percentage (highest first)
      budgetProgress.sort((a, b) => b.percentage - a.percentage)

      setBudgets(budgetProgress)
    } catch (error) {
      console.error('Error fetching budget progress:', error)
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

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 90) return 'bg-orange-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600 bg-red-100'
    if (percentage >= 90) return 'text-orange-600 bg-orange-100'
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  if (loading) {
    return (
      <WidgetWrapper id="budget-progress" title="Budget Progress" icon={Target}>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-2 bg-gray-200 rounded w-full mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-40"></div>
            </div>
          ))}
        </div>
      </WidgetWrapper>
    )
  }

  if (budgets.length === 0) {
    return (
      <WidgetWrapper id="budget-progress" title="Budget Progress" icon={Target}>
        <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
          <Target className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No budgets set</p>
          <p className="text-xs mt-1">Create budgets to track spending</p>
        </div>
      </WidgetWrapper>
    )
  }

  return (
    <WidgetWrapper id="budget-progress" title="Budget Progress" icon={Target}>
      <div className="space-y-4">
        {budgets.map(budget => (
          <div key={budget.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm truncate flex-1">{budget.category_name}</h4>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${getStatusColor(budget.percentage)}`}>
                {budget.percentage.toFixed(0)}%
              </span>
            </div>

            <div className="relative">
              <Progress
                value={budget.percentage}
                className="h-2"
                style={{
                  // @ts-ignore
                  '--progress-background': getProgressColor(budget.percentage)
                }}
              />
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {formatCurrency(budget.spent)} of {formatCurrency(budget.amount)}
              </span>
              <span className={budget.remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                {budget.remaining >= 0 ? formatCurrency(budget.remaining) : `Over ${formatCurrency(Math.abs(budget.remaining))}`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  )
}
