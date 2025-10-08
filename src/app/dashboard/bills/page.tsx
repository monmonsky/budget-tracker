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
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, X, Bell, Calendar, AlertTriangle, Check, Trash2, Loader2, Clock } from 'lucide-react'
import { useLoading } from '@/contexts/LoadingContext'
import { toast } from 'sonner'
import { format, differenceInDays } from 'date-fns'

interface BillReminder {
  id: string
  bill_name: string
  description: string | null
  amount: number
  category: string
  due_day: number
  frequency: string
  account_id: string | null
  reminder_days: number
  is_active: boolean
  is_auto_pay: boolean
  last_paid_date: string | null
  next_due_date: string | null
  created_at: string
}

interface Account {
  id: string
  account_name: string
  bank_name: string
}

export default function BillRemindersPage() {
  const { setLoading, setLoadingText } = useLoading()
  const [bills, setBills] = useState<BillReminder[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingBill, setEditingBill] = useState<BillReminder | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    bill_name: '',
    description: '',
    amount: '',
    category: 'utilities',
    due_day: '1',
    frequency: 'monthly',
    account_id: 'none',
    reminder_days: '3',
    is_active: true,
    is_auto_pay: false,
  })

  const categories = [
    { value: 'utilities', label: 'Utilities (Listrik, Air)', icon: '⚡' },
    { value: 'internet', label: 'Internet & TV', icon: '📡' },
    { value: 'phone', label: 'Phone/Cellular', icon: '📱' },
    { value: 'credit_card', label: 'Credit Card', icon: '💳' },
    { value: 'loan', label: 'Loan/Cicilan', icon: '💰' },
    { value: 'insurance', label: 'Insurance', icon: '🛡️' },
    { value: 'subscription', label: 'Subscription', icon: '📺' },
    { value: 'rent', label: 'Rent/Sewa', icon: '🏠' },
    { value: 'other', label: 'Other', icon: '📋' },
  ]

  useEffect(() => {
    fetchAccounts()
    fetchBills()
  }, [])

  const fetchAccounts = async () => {
    try {
      const { data } = await supabase
        .from('accounts')
        .select('id, account_name, bank_name')
        .eq('is_active', true)
        .order('bank_name')

      setAccounts(data || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const fetchBills = async () => {
    setLoadingText('Loading bill reminders...')
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('bill_reminders')
        .select('*')
        .order('next_due_date', { ascending: true, nullsLast: true })

      if (error) throw error

      setBills(data || [])
    } catch (error) {
      console.error('Error fetching bills:', error)
      toast.error('Failed to load bills')
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

      // Calculate next due date
      const today = new Date()
      const dueDay = parseInt(formData.due_day)
      let nextDueDate = new Date(today.getFullYear(), today.getMonth(), dueDay)

      // If due date already passed this month, move to next month
      if (nextDueDate <= today) {
        nextDueDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDay)
      }

      const billData = {
        user_id: user.id,
        bill_name: formData.bill_name,
        description: formData.description || null,
        amount: parseFloat(formData.amount),
        category: formData.category,
        due_day: parseInt(formData.due_day),
        frequency: formData.frequency,
        account_id: formData.account_id === 'none' ? null : formData.account_id,
        reminder_days: parseInt(formData.reminder_days),
        is_active: formData.is_active,
        is_auto_pay: formData.is_auto_pay,
        next_due_date: nextDueDate.toISOString().split('T')[0],
      }

      if (editingBill) {
        // Update existing bill
        const { error } = await supabase
          .from('bill_reminders')
          .update(billData)
          .eq('id', editingBill.id)

        if (error) throw error

        toast.success('Bill reminder updated!')
      } else {
        // Create new bill
        const { error } = await supabase
          .from('bill_reminders')
          .insert(billData)

        if (error) throw error

        toast.success('Bill reminder created!')
      }

      resetForm()
      fetchBills()
    } catch (error: any) {
      console.error('Error saving bill:', error)
      toast.error(error.message || 'Failed to save bill reminder')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (bill: BillReminder) => {
    setEditingBill(bill)
    setFormData({
      bill_name: bill.bill_name,
      description: bill.description || '',
      amount: bill.amount.toString(),
      category: bill.category,
      due_day: bill.due_day.toString(),
      frequency: bill.frequency,
      account_id: bill.account_id || 'none',
      reminder_days: bill.reminder_days.toString(),
      is_active: bill.is_active,
      is_auto_pay: bill.is_auto_pay,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bill reminder?')) return

    try {
      const { error } = await supabase
        .from('bill_reminders')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Bill reminder deleted!')
      fetchBills()
    } catch (error) {
      console.error('Error deleting bill:', error)
      toast.error('Failed to delete bill reminder')
    }
  }

  const handleMarkAsPaid = async (billId: string, amount: number) => {
    try {
      const { error } = await supabase.rpc('mark_bill_as_paid', {
        p_bill_id: billId,
        p_payment_date: new Date().toISOString().split('T')[0],
        p_amount_paid: amount,
        p_transaction_id: null
      })

      if (error) throw error

      toast.success('Bill marked as paid! Next due date updated.')
      fetchBills()
    } catch (error: any) {
      console.error('Error marking bill as paid:', error)
      toast.error(error.message || 'Failed to mark as paid')
    }
  }

  const resetForm = () => {
    setFormData({
      bill_name: '',
      description: '',
      amount: '',
      category: 'utilities',
      due_day: '1',
      frequency: 'monthly',
      account_id: 'none',
      reminder_days: '3',
      is_active: true,
      is_auto_pay: false,
    })
    setEditingBill(null)
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

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null
    return differenceInDays(new Date(dueDate), new Date())
  }

  const getBillStatus = (daysUntil: number | null) => {
    if (daysUntil === null) return { label: 'No due date', color: 'bg-gray-100 text-gray-800' }
    if (daysUntil < 0) return { label: 'Overdue', color: 'bg-red-100 text-red-800' }
    if (daysUntil === 0) return { label: 'Due Today', color: 'bg-orange-100 text-orange-800' }
    if (daysUntil <= 3) return { label: `${daysUntil} days`, color: 'bg-yellow-100 text-yellow-800' }
    if (daysUntil <= 7) return { label: `${daysUntil} days`, color: 'bg-blue-100 text-blue-800' }
    return { label: `${daysUntil} days`, color: 'bg-gray-100 text-gray-800' }
  }

  const activeBills = bills.filter(b => b.is_active)
  const upcomingBills = activeBills.filter(b => {
    const days = getDaysUntilDue(b.next_due_date)
    return days !== null && days <= 7
  })
  const totalMonthlyAmount = activeBills
    .filter(b => b.frequency === 'monthly')
    .reduce((sum, b) => sum + b.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Bill Reminders
          </h1>
          <p className="text-muted-foreground">Never miss a payment with automated reminders</p>
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
              Add Bill
            </>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Monthly Bills</p>
              <p className="text-2xl font-bold">{formatCurrency(totalMonthlyAmount)}</p>
            </div>
            <Bell className="h-8 w-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Bills</p>
              <p className="text-2xl font-bold">{activeBills.length}</p>
            </div>
            <Check className="h-8 w-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Due Soon (7 days)</p>
              <p className="text-2xl font-bold text-orange-600">{upcomingBills.length}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-400" />
          </div>
        </Card>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {editingBill ? 'Edit Bill Reminder' : 'Add New Bill Reminder'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bill_name">Bill Name *</Label>
                <Input
                  id="bill_name"
                  value={formData.bill_name}
                  onChange={(e) => setFormData({ ...formData, bill_name: e.target.value })}
                  placeholder="e.g., Listrik PLN, Internet Indihome"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
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
                <Label htmlFor="amount">Amount (Rp) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="500000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_day">Due Day (1-31) *</Label>
                <Input
                  id="due_day"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.due_day}
                  onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">Day of month when bill is due</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency *</Label>
                <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="one_time">One Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder_days">Remind Me (days before)</Label>
                <Input
                  id="reminder_days"
                  type="number"
                  min="0"
                  max="30"
                  value={formData.reminder_days}
                  onChange={(e) => setFormData({ ...formData, reminder_days: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_id">Payment Account (Optional)</Label>
                <Select value={formData.account_id} onValueChange={(value) => setFormData({ ...formData, account_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific account</SelectItem>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.bank_name} - {acc.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
                />
                <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_auto_pay"
                  checked={formData.is_auto_pay}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_auto_pay: checked as boolean })}
                />
                <Label htmlFor="is_auto_pay" className="cursor-pointer">Auto-pay enabled</Label>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingBill ? (
                'Update Bill Reminder'
              ) : (
                'Create Bill Reminder'
              )}
            </Button>
          </form>
        </Card>
      )}

      {/* Upcoming Bills (Due Soon) */}
      {upcomingBills.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            Due Soon (Next 7 Days)
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {upcomingBills.map((bill) => {
              const daysUntil = getDaysUntilDue(bill.next_due_date)
              const status = getBillStatus(daysUntil)
              const category = categories.find(c => c.value === bill.category)

              return (
                <Card key={bill.id} className="p-6 border-l-4 border-orange-500">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-3xl">{category?.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{bill.bill_name}</h3>
                          <Badge className={status.color}>{status.label}</Badge>
                          {bill.is_auto_pay && (
                            <Badge variant="outline">Auto-pay</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{bill.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Due: {bill.next_due_date && format(new Date(bill.next_due_date), 'dd MMM yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{bill.frequency}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <p className="text-2xl font-bold">{formatCurrency(bill.amount)}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsPaid(bill.id, bill.amount)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Mark Paid
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(bill)}>
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* All Active Bills */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">All Active Bills ({activeBills.length})</h2>
        <div className="grid grid-cols-1 gap-4">
          {activeBills.map((bill) => {
            const daysUntil = getDaysUntilDue(bill.next_due_date)
            const status = getBillStatus(daysUntil)
            const category = categories.find(c => c.value === bill.category)
            const isDueSoon = daysUntil !== null && daysUntil <= 7

            return (
              <Card key={bill.id} className={`p-6 ${isDueSoon ? 'border-l-4 border-orange-500' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-3xl">{category?.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{bill.bill_name}</h3>
                        <Badge className={status.color}>{status.label}</Badge>
                        <Badge variant="outline">{category?.label}</Badge>
                        {bill.is_auto_pay && (
                          <Badge variant="outline">Auto-pay</Badge>
                        )}
                      </div>
                      {bill.description && (
                        <p className="text-sm text-muted-foreground mb-2">{bill.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Due day: {bill.due_day}</span>
                        </div>
                        {bill.next_due_date && (
                          <span>Next: {format(new Date(bill.next_due_date), 'dd MMM yyyy')}</span>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{bill.frequency}</span>
                        </div>
                        {bill.last_paid_date && (
                          <span>Last paid: {format(new Date(bill.last_paid_date), 'dd MMM yyyy')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="text-2xl font-bold">{formatCurrency(bill.amount)}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={isDueSoon ? 'default' : 'outline'}
                        onClick={() => handleMarkAsPaid(bill.id, bill.amount)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Mark Paid
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(bill)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(bill.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Empty State */}
      {bills.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <Bell className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">No Bill Reminders Yet</h3>
            <p className="text-muted-foreground mb-4">
              Set up bill reminders to never miss a payment
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Bill
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
