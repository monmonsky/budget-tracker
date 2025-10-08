'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Target, TrendingUp, Calendar, Loader2, Check, Trash2 } from 'lucide-react'
import { useLoading } from '@/contexts/LoadingContext'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface SavingsGoal {
  id: string
  goal_name: string
  description: string | null
  target_amount: number
  current_amount: number
  target_date: string | null
  category: string
  icon: string
  color: string
  is_completed: boolean
  completed_at: string | null
  created_at: string
}

export default function SavingsGoalsPage() {
  const { setLoading, setLoadingText } = useLoading()
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    goal_name: '',
    description: '',
    target_amount: '',
    current_amount: '0',
    target_date: '',
    category: 'general',
    icon: '🎯',
    color: '#6366f1'
  })

  const categories = [
    { value: 'emergency_fund', label: 'Emergency Fund', icon: '🆘' },
    { value: 'vacation', label: 'Vacation', icon: '🏖️' },
    { value: 'house', label: 'House/Property', icon: '🏠' },
    { value: 'car', label: 'Car/Vehicle', icon: '🚗' },
    { value: 'education', label: 'Education', icon: '🎓' },
    { value: 'wedding', label: 'Wedding', icon: '💒' },
    { value: 'retirement', label: 'Retirement', icon: '👴' },
    { value: 'general', label: 'General Savings', icon: '🎯' },
  ]

  useEffect(() => {
    fetchGoals()
  }, [])

  const fetchGoals = async () => {
    setLoadingText('Loading savings goals...')
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .order('is_completed', { ascending: true })
        .order('target_date', { ascending: true, nullsLast: true })

      if (error) throw error

      setGoals(data || [])
    } catch (error) {
      console.error('Error fetching goals:', error)
      toast.error('Failed to load goals')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be logged in')
        setSubmitting(false)
        return
      }

      const goalData = {
        user_id: user.id,
        goal_name: formData.goal_name,
        description: formData.description || null,
        target_amount: parseFloat(formData.target_amount),
        current_amount: parseFloat(formData.current_amount),
        target_date: formData.target_date || null,
        category: formData.category,
        icon: formData.icon,
        color: formData.color,
      }

      if (editingGoal) {
        // Update existing goal
        const { error } = await supabase
          .from('savings_goals')
          .update(goalData)
          .eq('id', editingGoal.id)

        if (error) throw error

        toast.success('Goal updated successfully!')
      } else {
        // Create new goal
        const { error } = await supabase
          .from('savings_goals')
          .insert(goalData)

        if (error) throw error

        toast.success('Goal created successfully!')
      }

      resetForm()
      fetchGoals()
    } catch (error: any) {
      console.error('Error saving goal:', error)
      toast.error(error.message || 'Failed to save goal')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal)
    setFormData({
      goal_name: goal.goal_name,
      description: goal.description || '',
      target_amount: goal.target_amount.toString(),
      current_amount: goal.current_amount.toString(),
      target_date: goal.target_date || '',
      category: goal.category,
      icon: goal.icon,
      color: goal.color,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    try {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Goal deleted successfully!')
      fetchGoals()
    } catch (error) {
      console.error('Error deleting goal:', error)
      toast.error('Failed to delete goal')
    }
  }

  const handleAddProgress = async (goalId: string, amount: number) => {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return

    const newAmount = goal.current_amount + amount

    try {
      const { error } = await supabase
        .from('savings_goals')
        .update({ current_amount: newAmount })
        .eq('id', goalId)

      if (error) throw error

      toast.success(`Added ${formatCurrency(amount)} to goal!`)
      fetchGoals()
    } catch (error) {
      console.error('Error updating goal progress:', error)
      toast.error('Failed to update progress')
    }
  }

  const resetForm = () => {
    setFormData({
      goal_name: '',
      description: '',
      target_amount: '',
      current_amount: '0',
      target_date: '',
      category: 'general',
      icon: '🎯',
      color: '#6366f1'
    })
    setEditingGoal(null)
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

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  const calculateMonthlyTarget = (goal: SavingsGoal) => {
    if (!goal.target_date) return null

    const today = new Date()
    const targetDate = new Date(goal.target_date)
    const monthsRemaining = Math.max(
      Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)),
      1
    )

    const remaining = goal.target_amount - goal.current_amount
    return remaining / monthsRemaining
  }

  const activeGoals = goals.filter(g => !g.is_completed)
  const completedGoals = goals.filter(g => g.is_completed)
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0)
  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8" />
            Savings Goals
          </h1>
          <p className="text-muted-foreground">Track your savings targets and achieve your financial goals</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Target</p>
              <p className="text-2xl font-bold">{formatCurrency(totalTarget)}</p>
            </div>
            <Target className="h-8 w-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Saved</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSaved)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Goals</p>
              <p className="text-2xl font-bold">{activeGoals.length}</p>
            </div>
            <Check className="h-8 w-8 text-gray-400" />
          </div>
        </Card>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {editingGoal ? 'Edit Goal' : 'Add New Goal'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal_name">Goal Name *</Label>
                <Input
                  id="goal_name"
                  value={formData.goal_name}
                  onChange={(e) => setFormData({ ...formData, goal_name: e.target.value })}
                  placeholder="e.g., Dana Darurat, Liburan Bali"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => {
                  const cat = categories.find(c => c.value === value)
                  setFormData({ ...formData, category: value, icon: cat?.icon || '🎯' })
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_amount">Target Amount (Rp) *</Label>
                <Input
                  id="target_amount"
                  type="number"
                  step="0.01"
                  value={formData.target_amount}
                  onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                  placeholder="50000000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="current_amount">Current Amount (Rp)</Label>
                <Input
                  id="current_amount"
                  type="number"
                  step="0.01"
                  value={formData.current_amount}
                  onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_date">Target Date (Optional)</Label>
                <Input
                  id="target_date"
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details about this goal..."
                  rows={3}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingGoal ? (
                'Update Goal'
              ) : (
                'Create Goal'
              )}
            </Button>
          </form>
        </Card>
      )}

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Active Goals ({activeGoals.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGoals.map((goal) => {
              const progress = calculateProgress(goal.current_amount, goal.target_amount)
              const monthlyTarget = calculateMonthlyTarget(goal)

              return (
                <Card key={goal.id} className="p-6" style={{ borderLeft: `4px solid ${goal.color}` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{goal.icon}</div>
                      <div>
                        <h3 className="font-bold text-lg">{goal.goal_name}</h3>
                        {goal.description && (
                          <p className="text-sm text-muted-foreground">{goal.description}</p>
                        )}
                        <Badge variant="outline" className="mt-1">
                          {categories.find(c => c.value === goal.category)?.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(goal)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(goal.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm font-bold" style={{ color: goal.color }}>
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: goal.color
                        }}
                      />
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Current</p>
                      <p className="font-bold text-green-600">{formatCurrency(goal.current_amount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Target</p>
                      <p className="font-bold">{formatCurrency(goal.target_amount)}</p>
                    </div>
                  </div>

                  {/* Target Date & Monthly Suggestion */}
                  {goal.target_date && (
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Target:</span>
                        </div>
                        <span className="font-medium">
                          {format(new Date(goal.target_date), 'dd MMM yyyy')}
                        </span>
                      </div>
                      {monthlyTarget && monthlyTarget > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Save <strong className="text-foreground">{formatCurrency(monthlyTarget)}/month</strong> to reach goal
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Add Progress */}
                  <div className="pt-3 border-t mt-3">
                    <p className="text-sm font-medium mb-2">Quick Add Progress:</p>
                    <div className="flex gap-2">
                      {[100000, 500000, 1000000].map(amount => (
                        <Button
                          key={amount}
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddProgress(goal.id, amount)}
                        >
                          +{(amount / 1000000).toFixed(amount >= 1000000 ? 0 : 1)}jt
                        </Button>
                      ))}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Check className="h-6 w-6 text-green-600" />
            Completed Goals ({completedGoals.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedGoals.map((goal) => (
              <Card key={goal.id} className="p-6 bg-green-50 dark:bg-green-900/10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{goal.icon}</div>
                    <div>
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        {goal.goal_name}
                        <Check className="h-5 w-5 text-green-600" />
                      </h3>
                      <p className="text-sm text-green-600">
                        Completed {goal.completed_at && format(new Date(goal.completed_at), 'dd MMM yyyy')}
                      </p>
                      <p className="text-sm font-semibold mt-1">
                        {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(goal.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {goals.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <Target className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">No Savings Goals Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by creating your first savings goal to track your progress
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Goal
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
