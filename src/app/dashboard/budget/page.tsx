'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Plus, X, AlertTriangle, TrendingUp, Calendar } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { useLoading } from '@/contexts/LoadingContext'
import { toast } from 'sonner'

interface Budget {
  id: string
  category_id: string
  amount: number
  period: 'monthly' | 'yearly'
  start_date: string
  end_date: string | null
  category_name: string
  category_icon: string | null
  category_color: string | null
}

interface BudgetActual {
  category_id: string
  category_name: string
  category_icon: string | null
  category_color: string | null
  budget_amount: number
  actual_amount: number
  difference: number
  percentage: number
  status: 'under' | 'near' | 'over'
}

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  icon: string | null
  color: string | null
}

export default function BudgetPage() {
  const { setLoading, setLoadingText } = useLoading()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [budgetActuals, setBudgetActuals] = useState<BudgetActual[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))

  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    period: 'monthly' as 'monthly' | 'yearly',
    start_date: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end_date: '',
  })

  useEffect(() => {
    fetchData()
  }, [selectedMonth])

  const fetchData = async () => {
    setLoadingText('Loading budget data...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch categories (expense only)
      const { data: categoryData } = await supabase
        .from('categories')
        .select('*')
        .eq('type', 'expense')
        .order('name')

      setCategories(categoryData || [])

      // Fetch budgets
      const { data: budgetData } = await supabase
        .from('budgets')
        .select(`
          *,
          categories (
            name,
            icon,
            color
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const formattedBudgets = budgetData?.map(b => ({
        id: b.id,
        category_id: b.category_id,
        amount: Number(b.amount),
        period: b.period,
        start_date: b.start_date,
        end_date: b.end_date,
        category_name: (b.categories as any)?.name || 'Unknown',
        category_icon: (b.categories as any)?.icon || '📁',
        category_color: (b.categories as any)?.color || '#gray',
      })) || []

      setBudgets(formattedBudgets)

      // Calculate budget vs actual for selected month
      await calculateBudgetActuals(user.id, formattedBudgets)
    } catch (error) {
      console.error('Error fetching budget data:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkAndSendAlert = async (budgetActual: BudgetActual, budgetList: Budget[], userId: string) => {
    try {
      const budget = budgetList.find(b => b.category_id === budgetActual.category_id)
      if (!budget) return

      // Check if alert is enabled for this budget
      const { data: alertConfig } = await supabase
        .from('budget_alerts')
        .select('*')
        .eq('budget_id', budget.id)
        .eq('is_enabled', true)
        .single()

      if (!alertConfig) return

      // Determine if we should send an alert
      const shouldAlert =
        (budgetActual.percentage >= 100 && alertConfig.threshold_percentage <= 100) ||
        (budgetActual.percentage >= 80 && budgetActual.percentage < 100 && alertConfig.threshold_percentage <= 80)

      if (!shouldAlert) return

      // Call API to send alert email
      const response = await fetch('/api/send-budget-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetId: budget.id,
          categoryName: budgetActual.category_name,
          budgetAmount: budgetActual.budget_amount,
          spentAmount: budgetActual.actual_amount,
          percentage: budgetActual.percentage,
          month: format(new Date(selectedMonth), 'MMMM yyyy'),
          userId: userId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Error sending alert:', error)
      }
    } catch (error) {
      console.error('Error checking/sending alert:', error)
    }
  }

  const calculateBudgetActuals = async (userId: string, budgetList: Budget[]) => {
    try {
      const monthStart = format(startOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd')

      // Fetch actual expenses for the selected month
      const { data: transactions } = await supabase
        .from('transactions')
        .select('category, amount')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('date', monthStart)
        .lte('date', monthEnd)

      // Fetch categories to map name to id
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name')
        .eq('type', 'expense')

      const categoryNameToId = new Map(categoriesData?.map(c => [c.name, c.id]) || [])

      // Group expenses by category ID
      const expensesByCategory = new Map<string, number>()
      transactions?.forEach(t => {
        const categoryId = categoryNameToId.get(t.category) || 'uncategorized'
        const current = expensesByCategory.get(categoryId) || 0
        expensesByCategory.set(categoryId, current + Number(t.amount))
      })

      // Create budget vs actual comparison
      const comparisons: BudgetActual[] = budgetList
        .filter(b => b.period === 'monthly') // Only show monthly budgets for now
        .map(budget => {
          const actualAmount = expensesByCategory.get(budget.category_id) || 0
          const difference = budget.amount - actualAmount
          const percentage = budget.amount > 0 ? (actualAmount / budget.amount) * 100 : 0

          let status: 'under' | 'near' | 'over' = 'under'
          if (percentage >= 100) status = 'over'
          else if (percentage >= 80) status = 'near'

          return {
            category_id: budget.category_id,
            category_name: budget.category_name,
            category_icon: budget.category_icon,
            category_color: budget.category_color,
            budget_amount: budget.amount,
            actual_amount: actualAmount,
            difference,
            percentage,
            status,
          }
        })

      // Sort by status (over first, then near, then under)
      comparisons.sort((a, b) => {
        const statusOrder = { over: 0, near: 1, under: 2 }
        return statusOrder[a.status] - statusOrder[b.status]
      })

      setBudgetActuals(comparisons)

      // Check for budget alerts (80% and 100%)
      for (const comparison of comparisons) {
        if (comparison.percentage >= 80) {
          await checkAndSendAlert(comparison, budgetList, userId)
        }
      }
    } catch (error) {
      console.error('Error calculating budget actuals:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingText(editingId ? 'Updating budget...' : 'Creating budget...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const payload = {
        user_id: user.id,
        category_id: formData.category_id,
        amount: parseFloat(formData.amount),
        period: formData.period,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
      }

      if (editingId) {
        const { error } = await supabase
          .from('budgets')
          .update(payload)
          .eq('id', editingId)

        if (error) throw error

        toast.success('Budget updated successfully!', {
          description: 'Your budget has been updated.',
        })
      } else {
        const { error } = await supabase
          .from('budgets')
          .insert([payload])

        if (error) throw error

        toast.success('Budget created successfully!', {
          description: 'Your new budget has been added.',
        })
      }

      resetForm()
      fetchData()
    } catch (error) {
      console.error('Error saving budget:', error)
      toast.error('Failed to save budget', {
        description: (error as any).message || 'An unexpected error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (budget: Budget) => {
    setEditingId(budget.id)
    setFormData({
      category_id: budget.category_id,
      amount: budget.amount.toString(),
      period: budget.period,
      start_date: budget.start_date,
      end_date: budget.end_date || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return

    setLoadingText('Deleting budget...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Authentication required', {
          description: 'You must be logged in to delete budgets',
        })
        return
      }

      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Delete error:', error)
        throw error
      }

      toast.success('Budget deleted successfully!', {
        description: 'Your budget has been removed.',
      })
      fetchData()
    } catch (error) {
      console.error('Error deleting budget:', error)
      toast.error('Failed to delete budget', {
        description: (error as any).message || 'An unexpected error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      category_id: '',
      amount: '',
      period: 'monthly',
      start_date: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      end_date: '',
    })
    setEditingId(null)
    setShowForm(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getProgressColor = (status: 'under' | 'near' | 'over') => {
    switch (status) {
      case 'under': return 'bg-green-500'
      case 'near': return 'bg-yellow-500'
      case 'over': return 'bg-red-500'
    }
  }

  const totalBudget = budgetActuals.reduce((sum, b) => sum + b.budget_amount, 0)
  const totalActual = budgetActuals.reduce((sum, b) => sum + b.actual_amount, 0)
  const totalDifference = totalBudget - totalActual
  const overBudgetCount = budgetActuals.filter(b => b.status === 'over').length

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Budget vs Actual</h1>
          <p className="text-muted-foreground">Track your spending against budget</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-40 bg-background border-border"
            />
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'Add Budget'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Budget</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalBudget)}</p>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalActual)}</p>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Remaining</p>
            <p className={`text-2xl font-bold ${totalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(totalDifference))}
            </p>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Over Budget</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-red-600">{overBudgetCount}</p>
              {overBudgetCount > 0 && <AlertTriangle className="h-5 w-5 text-red-600" />}
            </div>
          </div>
        </Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="p-6 bg-card border-border">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category_id">Category *</Label>
                <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Budget Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="period">Period *</Label>
                <Select value={formData.period} onValueChange={(value: 'monthly' | 'yearly') => setFormData({ ...formData, period: value })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date (optional)</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit">
                {editingId ? 'Update' : 'Create'} Budget
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Budget vs Actual Comparison */}
      <Card className="p-6 bg-card border-border">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Budget Comparison - {format(new Date(selectedMonth), 'MMMM yyyy')}
        </h2>

        {budgetActuals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No budgets set for this month</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Budget
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {budgetActuals.map((item) => (
              <div key={item.category_id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{item.category_icon}</span>
                    <div>
                      <p className="font-medium text-foreground">{item.category_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.actual_amount)} / {formatCurrency(item.budget_amount)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={item.status === 'over' ? 'destructive' : item.status === 'near' ? 'default' : 'secondary'}>
                      {item.percentage.toFixed(0)}%
                    </Badge>
                    <p className={`text-sm ${item.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.difference >= 0 ? 'Remaining' : 'Over'}: {formatCurrency(Math.abs(item.difference))}
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <Progress value={Math.min(item.percentage, 100)} className="h-3" />
                  <div
                    className={`absolute top-0 left-0 h-3 rounded-full transition-all ${getProgressColor(item.status)}`}
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </div>
                {item.status === 'over' && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>You've exceeded your budget by {formatCurrency(Math.abs(item.difference))}</span>
                  </div>
                )}
                {item.status === 'near' && (
                  <div className="flex items-center gap-2 text-sm text-yellow-600">
                    <TrendingUp className="h-4 w-4" />
                    <span>Approaching budget limit - {formatCurrency(item.difference)} remaining</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* All Budgets List */}
      <Card className="p-6 bg-card border-border">
        <h2 className="text-xl font-semibold text-foreground mb-4">All Budgets</h2>
        <div className="space-y-3">
          {budgets.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No budgets created yet</p>
          ) : (
            budgets.map((budget) => (
              <div key={budget.id} className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{budget.category_icon}</span>
                  <div>
                    <p className="font-medium text-foreground">{budget.category_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {budget.period === 'monthly' ? 'Monthly' : 'Yearly'} •
                      Starts: {format(new Date(budget.start_date), 'dd MMM yyyy')}
                      {budget.end_date && ` • Ends: ${format(new Date(budget.end_date), 'dd MMM yyyy')}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold text-foreground">{formatCurrency(budget.amount)}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(budget)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(budget.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
