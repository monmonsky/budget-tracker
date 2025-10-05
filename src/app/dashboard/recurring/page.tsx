'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, X, RefreshCw, Play, Pause, Trash2 } from 'lucide-react'
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns'
import { useLoading } from '@/contexts/LoadingContext'
import { toast } from 'sonner'

interface RecurringTransaction {
  id: string
  template_name: string
  account_id: string
  amount: number
  type: 'income' | 'expense'
  category: string
  subcategory: string | null
  description: string | null
  merchant: string | null
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  custom_interval_days: number | null
  start_date: string
  end_date: string | null
  next_occurrence: string
  last_generated: string | null
  is_active: boolean
  auto_create: boolean
  accounts: { account_name: string }
}

interface Account {
  id: string
  account_name: string
  bank_name: string
}

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  icon: string | null
  color: string | null
}

export default function RecurringPage() {
  const { setLoading, setLoadingText } = useLoading()
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    template_name: '',
    account_id: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    category: '',
    subcategory: '',
    description: '',
    merchant: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom',
    custom_interval_days: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    is_active: true,
    auto_create: false,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoadingText('Loading recurring transactions...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch recurring transactions
      const { data: recurringData } = await supabase
        .from('recurring_transactions')
        .select('*, accounts(account_name)')
        .order('next_occurrence', { ascending: true })

      setRecurring(recurringData || [])

      // Fetch accounts
      const { data: accountData } = await supabase
        .from('accounts')
        .select('id, account_name, bank_name')
        .eq('is_active', true)
        .order('account_name')

      setAccounts(accountData || [])

      // Fetch categories
      const { data: categoryData } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      setCategories(categoryData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateNextOccurrence = (startDate: string, frequency: string, customDays?: number): string => {
    const date = new Date(startDate)

    switch (frequency) {
      case 'daily':
        return format(addDays(date, 1), 'yyyy-MM-dd')
      case 'weekly':
        return format(addWeeks(date, 1), 'yyyy-MM-dd')
      case 'monthly':
        return format(addMonths(date, 1), 'yyyy-MM-dd')
      case 'yearly':
        return format(addYears(date, 1), 'yyyy-MM-dd')
      case 'custom':
        return format(addDays(date, customDays || 1), 'yyyy-MM-dd')
      default:
        return startDate
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingText(editingId ? 'Updating recurring transaction...' : 'Creating recurring transaction...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const nextOccurrence = calculateNextOccurrence(
        formData.start_date,
        formData.frequency,
        formData.custom_interval_days ? parseInt(formData.custom_interval_days) : undefined
      )

      const payload = {
        user_id: user.id,
        template_name: formData.template_name,
        account_id: formData.account_id,
        amount: parseFloat(formData.amount),
        type: formData.type,
        category: formData.category,
        subcategory: formData.subcategory || null,
        description: formData.description || null,
        merchant: formData.merchant || null,
        frequency: formData.frequency,
        custom_interval_days: formData.custom_interval_days ? parseInt(formData.custom_interval_days) : null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        next_occurrence: nextOccurrence,
        is_active: formData.is_active,
        auto_create: formData.auto_create,
      }

      if (editingId) {
        const { error } = await supabase
          .from('recurring_transactions')
          .update(payload)
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('recurring_transactions')
          .insert([payload])

        if (error) throw error
      }

      toast.success(editingId ? 'Recurring transaction updated!' : 'Recurring transaction created!', {
        description: editingId ? 'Your recurring transaction has been updated.' : 'Your new recurring transaction has been added.',
      })

      resetForm()
      fetchData()
    } catch (error) {
      console.error('Error saving recurring transaction:', error)
      toast.error('Failed to save recurring transaction', {
        description: (error as any).message || 'An unexpected error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (item: RecurringTransaction) => {
    setEditingId(item.id)
    setFormData({
      template_name: item.template_name,
      account_id: item.account_id,
      amount: item.amount.toString(),
      type: item.type,
      category: item.category,
      subcategory: item.subcategory || '',
      description: item.description || '',
      merchant: item.merchant || '',
      frequency: item.frequency,
      custom_interval_days: item.custom_interval_days?.toString() || '',
      start_date: item.start_date,
      end_date: item.end_date || '',
      is_active: item.is_active,
      auto_create: item.auto_create,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring transaction?')) return

    setLoadingText('Deleting recurring transaction...')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Recurring transaction deleted!', {
        description: 'The recurring transaction has been removed.',
      })

      fetchData()
    } catch (error) {
      console.error('Error deleting recurring transaction:', error)
      toast.error('Failed to delete recurring transaction', {
        description: (error as any).message || 'An unexpected error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (id: string, currentState: boolean) => {
    setLoadingText(currentState ? 'Pausing recurring transaction...' : 'Activating recurring transaction...')
    setLoading(true)

    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .update({ is_active: !currentState })
        .eq('id', id)

      if (error) throw error

      toast.success(currentState ? 'Recurring transaction paused!' : 'Recurring transaction activated!', {
        description: currentState ? 'The transaction has been paused.' : 'The transaction is now active.',
      })

      fetchData()
    } catch (error) {
      console.error('Error toggling recurring transaction:', error)
      toast.error('Failed to update recurring transaction', {
        description: (error as any).message || 'An unexpected error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateNow = async (item: RecurringTransaction) => {
    if (!confirm(`Generate transaction for "${item.template_name}" now?`)) return

    setLoadingText('Generating transaction...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Create transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          account_id: item.account_id,
          date: format(new Date(), 'yyyy-MM-dd'),
          amount: item.amount,
          type: item.type,
          category: item.category,
          subcategory: item.subcategory,
          description: item.description,
          merchant: item.merchant,
          is_recurring: true,
        }])

      if (transactionError) throw transactionError

      // Update next_occurrence and last_generated
      const nextOccurrence = calculateNextOccurrence(
        item.next_occurrence,
        item.frequency,
        item.custom_interval_days || undefined
      )

      const { error: updateError } = await supabase
        .from('recurring_transactions')
        .update({
          next_occurrence: nextOccurrence,
          last_generated: format(new Date(), 'yyyy-MM-dd'),
        })
        .eq('id', item.id)

      if (updateError) throw updateError

      toast.success('Transaction generated successfully!', {
        description: `Transaction created for "${item.template_name}".`,
      })

      fetchData()
    } catch (error) {
      console.error('Error generating transaction:', error)
      toast.error('Failed to generate transaction', {
        description: (error as any).message || 'An unexpected error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      template_name: '',
      account_id: '',
      amount: '',
      type: 'expense',
      category: '',
      subcategory: '',
      description: '',
      merchant: '',
      frequency: 'monthly',
      custom_interval_days: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      is_active: true,
      auto_create: false,
    })
    setEditingId(null)
    setShowForm(false)
  }

  const filteredCategories = categories.filter(cat => cat.type === formData.type)

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recurring Transactions</h1>
          <p className="text-muted-foreground">Automate your regular income and expenses</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Add Recurring'}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="p-6 bg-card border-border">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template_name">Template Name *</Label>
                <Input
                  id="template_name"
                  placeholder="e.g., Gaji Bulanan, Netflix Subscription"
                  value={formData.template_name}
                  onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                  required
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={formData.type} onValueChange={(value: 'income' | 'expense') => setFormData({ ...formData, type: value, category: '' })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
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
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account">Account *</Label>
                <Select value={formData.account_id} onValueChange={(value) => setFormData({ ...formData, account_id: value })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.bank_name} - {acc.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency *</Label>
                <Select value={formData.frequency} onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="custom">Custom (days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.frequency === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="custom_interval_days">Interval (days) *</Label>
                  <Input
                    id="custom_interval_days"
                    type="number"
                    placeholder="e.g., 30"
                    value={formData.custom_interval_days}
                    onChange={(e) => setFormData({ ...formData, custom_interval_days: e.target.value })}
                    required={formData.frequency === 'custom'}
                    className="bg-background border-border"
                  />
                </div>
              )}

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

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Additional notes"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant/Source</Label>
                <Input
                  id="merchant"
                  placeholder="e.g., Netflix, Employer"
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                <Input
                  id="subcategory"
                  placeholder="Optional subcategory"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-border"
                />
                <span className="text-sm text-foreground">Active</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.auto_create}
                  onChange={(e) => setFormData({ ...formData, auto_create: e.target.checked })}
                  className="rounded border-border"
                />
                <span className="text-sm text-foreground">Auto-create (requires background job)</span>
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit">
                {editingId ? 'Update' : 'Create'} Recurring Transaction
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* List */}
      <Card className="bg-card border-border">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Recurring Transactions ({recurring.length})
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">Template</TableHead>
                  <TableHead className="text-foreground">Type</TableHead>
                  <TableHead className="text-foreground">Amount</TableHead>
                  <TableHead className="text-foreground">Category</TableHead>
                  <TableHead className="text-foreground">Frequency</TableHead>
                  <TableHead className="text-foreground">Next</TableHead>
                  <TableHead className="text-foreground">Account</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurring.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No recurring transactions yet. Create one to automate your finances!
                    </TableCell>
                  </TableRow>
                ) : (
                  recurring.map((item) => (
                    <TableRow key={item.id} className="border-border">
                      <TableCell className="font-medium text-foreground">
                        {item.template_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.type === 'income' ? 'default' : 'destructive'}>
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">
                        Rp {item.amount.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-foreground">{item.category}</TableCell>
                      <TableCell className="text-foreground">
                        {item.frequency === 'custom'
                          ? `Every ${item.custom_interval_days} days`
                          : item.frequency}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {format(new Date(item.next_occurrence), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.accounts.account_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_active ? 'default' : 'secondary'}>
                          {item.is_active ? 'Active' : 'Paused'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateNow(item)}
                            className="gap-1"
                            disabled={!item.is_active}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(item.id, item.is_active)}
                            className="gap-1"
                          >
                            {item.is_active ? <Pause className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(item)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(item.id)}
                            className="gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  )
}
