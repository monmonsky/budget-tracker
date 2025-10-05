'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { TransactionAttachmentUpload } from '@/components/transaction-attachment-upload'

interface Account {
  id: string
  account_name: string
}

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
}

interface Attachment {
  id: string
  file_name: string
  file_url: string
  file_size: number
  file_type: string
  uploaded_at: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddTransactionModal({ isOpen, onClose, onSuccess }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [createdTransactionId, setCreatedTransactionId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'expense' as 'income' | 'expense',
    category: '',
    amount: '',
    description: '',
    account_id: '',
    merchant: '',
  })

  useEffect(() => {
    if (isOpen) {
      fetchData()
      resetForm()
    }
  }, [isOpen])

  useEffect(() => {
    // Filter categories by type
    setFilteredCategories(categories.filter(c => c.type === formData.type))
    setFormData(prev => ({ ...prev, category: '' }))
  }, [formData.type, categories])

  const fetchData = async () => {
    try {
      // Fetch accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, account_name')
        .eq('is_active', true)
        .order('account_name')

      setAccounts(accountsData || [])
      if (accountsData && accountsData.length > 0) {
        setFormData(prev => ({ ...prev, account_id: accountsData[0].id }))
      }

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, type')
        .order('name')

      setCategories(categoriesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const fetchAttachments = async () => {
    if (!createdTransactionId) return

    try {
      const { data } = await supabase
        .from('transaction_attachments')
        .select('*')
        .eq('transaction_id', createdTransactionId)
        .order('uploaded_at', { ascending: false })

      setAttachments(data || [])
    } catch (error) {
      console.error('Error fetching attachments:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Validation error', {
        description: 'Please enter a valid amount',
      })
      return
    }

    if (!formData.category) {
      toast.error('Validation error', {
        description: 'Please select a category',
      })
      return
    }

    if (!formData.account_id) {
      toast.error('Validation error', {
        description: 'Please select an account',
      })
      return
    }

    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          date: formData.date,
          type: formData.type,
          category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description,
          account_id: formData.account_id,
          merchant: formData.merchant || null,
          is_recurring: false,
        })
        .select()
        .single()

      if (error) throw error

      setCreatedTransactionId(data.id)

      toast.success('Transaction created successfully!', {
        description: 'You can now add attachments or close this form.',
      })

      // Don't close immediately, allow user to add attachments
    } catch (error) {
      console.error('Error creating transaction:', error)
      toast.error('Failed to create transaction', {
        description: (error as any).message || 'An unexpected error occurred',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
    if (createdTransactionId) {
      onSuccess()
    }
  }

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      category: '',
      amount: '',
      description: '',
      account_id: accounts[0]?.id || '',
      merchant: '',
    })
    setCreatedTransactionId(null)
    setAttachments([])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Add New Transaction</h2>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {createdTransactionId ? (
            /* Attachments Section - After transaction created */
            <div className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  ✓ Transaction created successfully!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You can now add attachments (receipts, invoices) or close this form.
                </p>
              </div>

              <TransactionAttachmentUpload
                transactionId={createdTransactionId}
                attachments={attachments}
                onAttachmentsChange={fetchAttachments}
              />

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={resetForm}>
                  Add Another Transaction
                </Button>
                <Button onClick={handleClose}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            /* Transaction Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select value={formData.type} onValueChange={(value: 'income' | 'expense') => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Account */}
              <div className="space-y-2">
                <Label htmlFor="account">Account *</Label>
                <Select value={formData.account_id} onValueChange={(value) => setFormData({ ...formData, account_id: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Merchant (optional) */}
              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant (Optional)</Label>
                <Input
                  id="merchant"
                  type="text"
                  placeholder="e.g., Starbucks, Amazon"
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  type="text"
                  placeholder="Notes about this transaction"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Transaction'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>
    </div>
  )
}
