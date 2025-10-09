'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Wallet, Loader2, FolderPlus, History, TrendingUp, TrendingDown } from 'lucide-react'
import { useLoading } from '@/contexts/LoadingContext'
import { toast } from 'sonner'

interface Account {
  id: string
  account_name: string
  account_type: 'checking' | 'savings' | 'investment' | 'crypto' | 'debt' | 'credit_card'
  bank_name: string
  balance: number
  currency: string
  credit_limit?: number | null
  owner: 'husband' | 'wife' | 'joint'
  is_active: boolean
  parent_account_id: string | null
  is_sub_account: boolean
  sub_account_type: 'pocket' | 'saver' | 'wallet' | 'virtual' | null
}

interface BalanceHistory {
  id: string
  old_balance: number
  new_balance: number
  change_amount: number
  change_type: 'increase' | 'decrease' | 'manual_adjustment'
  reason: string
  created_at: string
}

export default function AccountsPage() {
  // Note: LoadingContext was removed due to infinite re-render issues
  // Using local isLoading state instead
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showSubAccountForm, setShowSubAccountForm] = useState(false)
  const [selectedParentAccount, setSelectedParentAccount] = useState<string | null>(null)
  const [showBalanceHistory, setShowBalanceHistory] = useState(false)
  const [balanceHistory, setBalanceHistory] = useState<BalanceHistory[]>([])

  // Form state
  const [formData, setFormData] = useState({
    account_name: '',
    account_type: 'checking' as 'checking' | 'savings' | 'investment' | 'crypto' | 'debt' | 'credit_card',
    bank_name: '',
    balance: '',
    credit_limit: '',
    owner: 'husband' as 'husband' | 'wife' | 'joint',
    is_sub_account: false,
    parent_account_id: '',
    sub_account_type: '' as 'pocket' | 'saver' | 'wallet' | 'virtual' | '',
  })

  // Create a stable fetchAccounts function
  const fetchAccountsRef = useRef<() => Promise<void>>()

  fetchAccountsRef.current = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('bank_name')

      if (error) {
        console.error('Error fetching accounts:', error)
        toast.error('Failed to load accounts', {
          description: error.message
        })
      } else {
        setAccounts(data || [])
      }
    } catch (error) {
      console.error('Unexpected error fetching accounts:', error)
      toast.error('Failed to load accounts')
    }
  }

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      try {
        setIsLoading(true)

        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .order('bank_name')

        if (cancelled) return

        if (error) {
          console.error('Error fetching accounts:', error)
          toast.error('Failed to load accounts', {
            description: error.message
          })
        } else {
          setAccounts(data || [])
        }
      } catch (error) {
        if (cancelled) return
        console.error('Unexpected error fetching accounts:', error)
        toast.error('Failed to load accounts')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Authentication required', {
          description: 'You must be logged in to add an account',
        })
        setSubmitting(false)
        return
      }

      const insertData: Record<string, unknown> = {
        user_id: user.id,
        account_name: formData.account_name,
        account_type: formData.account_type,
        bank_name: formData.bank_name,
        balance: parseFloat(formData.balance),
        currency: 'IDR',
        owner: formData.owner,
        is_active: true,
        is_sub_account: formData.is_sub_account,
        parent_account_id: formData.parent_account_id || null,
        sub_account_type: formData.sub_account_type || null,
      }

      // Add credit_limit only for credit card accounts
      if (formData.account_type === 'credit_card' && formData.credit_limit) {
        insertData.credit_limit = parseFloat(formData.credit_limit)
      }

      const { data, error} = await supabase
        .from('accounts')
        .insert(insertData)
        .select()

      if (error) {
        console.error('Supabase error:', error)
        toast.error('Failed to add account', {
          description: error.message || 'An unexpected error occurred',
        })
        setSubmitting(false)
        return
      }

      console.log('Account added successfully:', data)

      toast.success('Account created successfully!', {
        description: 'Your new account has been added.',
      })

      // Reset form
      setFormData({
        account_name: '',
        account_type: 'checking',
        bank_name: '',
        balance: '',
        credit_limit: '',
        owner: 'husband',
        is_sub_account: false,
        parent_account_id: '',
        sub_account_type: '',
      })
      setShowForm(false)
      setShowSubAccountForm(false)
      setSelectedParentAccount(null)
      setSubmitting(false)

      // Refresh data
      fetchAccountsRef.current?.()
    } catch (error: unknown) {
      console.error('Error adding account:', error)
      toast.error('Failed to add account', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
      setSubmitting(false)
    }
  }

  const handleAddSubAccount = (parentAccountId: string) => {
    const parentAccount = accounts.find(acc => acc.id === parentAccountId)
    if (!parentAccount) return

    setSelectedParentAccount(parentAccountId)
    setFormData({
      ...formData,
      is_sub_account: true,
      parent_account_id: parentAccountId,
      bank_name: parentAccount.bank_name,
      owner: parentAccount.owner,
    })
    setShowSubAccountForm(true)
    setShowForm(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getAccountTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'checking': 'bg-blue-100 text-blue-800',
      'savings': 'bg-green-100 text-green-800',
      'credit_card': 'bg-orange-100 text-orange-800',
      'investment': 'bg-purple-100 text-purple-800',
      'crypto': 'bg-yellow-100 text-yellow-800',
      'debt': 'bg-red-100 text-red-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const getOwnerColor = (owner: string) => {
    const colors: Record<string, string> = {
      'husband': 'bg-indigo-100 text-indigo-800',
      'wife': 'bg-pink-100 text-pink-800',
      'joint': 'bg-gray-100 text-gray-800',
    }
    return colors[owner] || 'bg-gray-100 text-gray-800'
  }

  const fetchBalanceHistory = async (accountId: string) => {
    try {
      const { data, error } = await supabase
        .from('account_balance_history')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Error fetching balance history:', error)
        toast.error('Failed to load balance history')
        return
      }

      setBalanceHistory(data || [])
      setShowBalanceHistory(true)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load balance history')
    }
  }

  const activeAccounts = accounts.filter(acc => acc.is_active)
  const totalBalance = activeAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0)

  // Separate main accounts and sub-accounts
  const mainAccounts = activeAccounts.filter(acc => !acc.is_sub_account)
  const subAccounts = activeAccounts.filter(acc => acc.is_sub_account)

  // Group main accounts by bank
  const accountsByBank = mainAccounts.reduce((acc, account) => {
    if (!acc[account.bank_name]) {
      acc[account.bank_name] = []
    }
    acc[account.bank_name].push(account)
    return acc
  }, {} as Record<string, Account[]>)

  // Get sub-accounts for a parent
  const getSubAccounts = (parentId: string) => {
    return subAccounts.filter(sub => sub.parent_account_id === parentId)
  }

  if (isLoading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading accounts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bank Accounts</h1>
          <p className="text-muted-foreground">Manage all your bank accounts</p>
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
              Add Account
            </>
          )}
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-indigo-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Balance (All Active Accounts)</p>
            <p className="text-4xl font-bold text-indigo-600">{formatCurrency(totalBalance)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Active Accounts</p>
            <p className="text-3xl font-semibold">{activeAccounts.length}</p>
          </div>
        </div>
      </Card>

      {/* Add Account Form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {showSubAccountForm ? 'Add Sub-Account / Wallet' : 'Add New Account'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  type="text"
                  placeholder="e.g., BCA, Jenius, Bank Jago"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  required
                  disabled={showSubAccountForm}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_name">
                  {showSubAccountForm ? 'Sub-Account / Wallet Name' : 'Account Name'}
                </Label>
                <Input
                  id="account_name"
                  type="text"
                  placeholder={showSubAccountForm ? 'e.g., Flexy Saver, Pocket Goals' : 'e.g., BCA Anda, Jenius Istri'}
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  required
                />
              </div>

              {/* Sub-Account Type (only for sub-accounts) */}
              {showSubAccountForm && (
                <div className="space-y-2">
                  <Label htmlFor="sub_account_type">Sub-Account Type</Label>
                  <Select
                    value={formData.sub_account_type}
                    onValueChange={(value: 'pocket' | 'saver' | 'wallet' | 'virtual') => setFormData({ ...formData, sub_account_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pocket">Pocket (Jago)</SelectItem>
                      <SelectItem value="saver">Saver (Jenius Flexy)</SelectItem>
                      <SelectItem value="wallet">Wallet / Tabungan</SelectItem>
                      <SelectItem value="virtual">Virtual Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="account_type">Account Type</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value: 'checking' | 'savings' | 'investment' | 'crypto' | 'debt' | 'credit_card') => setFormData({ ...formData, account_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="debt">Debt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner">Owner</Label>
                <Select
                  value={formData.owner}
                  onValueChange={(value: 'husband' | 'wife' | 'joint') => setFormData({ ...formData, owner: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="husband">Husband</SelectItem>
                    <SelectItem value="wife">Wife</SelectItem>
                    <SelectItem value="joint">Joint</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="balance">
                  {formData.account_type === 'credit_card' ? 'Current Outstanding (Rp)' : 'Current Balance (Rp)'}
                </Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                  required
                />
                {formData.account_type === 'credit_card' && (
                  <p className="text-xs text-muted-foreground">Enter negative value for outstanding balance (e.g., -5000000)</p>
                )}
              </div>

              {formData.account_type === 'credit_card' && (
                <div className="space-y-2">
                  <Label htmlFor="credit_limit">Credit Limit (Rp)</Label>
                  <Input
                    id="credit_limit"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 50000000"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Maximum credit limit for this card</p>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding account...
                </>
              ) : (
                'Add Account'
              )}
            </Button>
          </form>
        </Card>
      )}

      {/* Accounts by Bank */}
      {Object.keys(accountsByBank).length === 0 ? (
        <Card className="p-6">
          <p className="text-muted-foreground text-center">No accounts yet. Add your first account to get started.</p>
        </Card>
      ) : (
        Object.entries(accountsByBank).map(([bankName, bankAccounts]) => (
          <Card key={bankName} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{bankName}</h2>
              <Badge variant="outline">
                {bankAccounts.length} account{bankAccounts.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="space-y-4">
              {bankAccounts.map((account) => {
                const accountSubAccounts = getSubAccounts(account.id)
                const totalWithSubAccounts = Number(account.balance) + accountSubAccounts.reduce((sum, sub) => sum + Number(sub.balance), 0)

                return (
                  <div key={account.id} className="border border-border rounded-lg overflow-hidden">
                    {/* Main Account */}
                    <div className="p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                            <Wallet className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{account.account_name}</h3>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className={getAccountTypeColor(account.account_type)}>
                                {account.account_type}
                              </Badge>
                              <Badge variant="outline" className={getOwnerColor(account.owner)}>
                                {account.owner}
                              </Badge>
                              {accountSubAccounts.length > 0 && (
                                <Badge variant="secondary">
                                  {accountSubAccounts.length} sub-account(s)
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{formatCurrency(account.balance)}</p>
                          {accountSubAccounts.length > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Total: {formatCurrency(totalWithSubAccounts)}
                            </p>
                          )}
                          {account.account_type === 'credit_card' && account.credit_limit && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Limit: {formatCurrency(account.credit_limit)}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">{account.currency}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-3 pt-3 border-t flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddSubAccount(account.id)}
                        >
                          <FolderPlus className="h-4 w-4 mr-2" />
                          Add Sub-Account
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchBalanceHistory(account.id)}
                        >
                          <History className="h-4 w-4 mr-2" />
                          Balance History
                        </Button>
                      </div>
                    </div>

                    {/* Sub-Accounts */}
                    {accountSubAccounts.length > 0 && (
                      <div className="bg-secondary/10 p-4 space-y-2">
                        <p className="text-sm font-semibold text-muted-foreground mb-2">
                          Sub-Accounts / Wallets:
                        </p>
                        {accountSubAccounts.map((subAccount) => (
                          <div key={subAccount.id} className="flex items-center justify-between p-3 bg-card rounded-lg border-l-4 border-blue-500">
                            <div className="flex items-center gap-2">
                              <div className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                {subAccount.sub_account_type || 'wallet'}
                              </div>
                              <span className="font-medium">{subAccount.account_name}</span>
                            </div>
                            <span className="font-semibold">{formatCurrency(subAccount.balance)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        ))
      )}

      {/* Account Summary by Type */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Balance by Account Type</h2>
        <div className="space-y-3">
          {['checking', 'savings', 'investment', 'crypto', 'debt'].map((type) => {
            const typeAccounts = activeAccounts.filter(acc => acc.account_type === type)
            const typeBalance = typeAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0)

            if (typeAccounts.length === 0) return null

            return (
              <div key={type} className="flex items-center justify-between p-3 bg-secondary/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className={getAccountTypeColor(type)}>
                    {type}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{typeAccounts.length} account(s)</span>
                </div>
                <span className="font-semibold">{formatCurrency(typeBalance)}</span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Balance History Modal */}
      {showBalanceHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                <h2 className="text-xl font-bold">Balance History</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowBalanceHistory(false)
                  setBalanceHistory([])
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {balanceHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No balance history yet</p>
                  <p className="text-sm text-gray-500 mt-1">Balance changes will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {balanceHistory.map((history) => {
                    const isIncrease = history.change_type === 'increase'
                    const isDecrease = history.change_type === 'decrease'

                    return (
                      <div key={history.id} className="p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              isIncrease ? 'bg-green-100 text-green-600' :
                              isDecrease ? 'bg-red-100 text-red-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {isIncrease ? <TrendingUp className="h-4 w-4" /> :
                               isDecrease ? <TrendingDown className="h-4 w-4" /> :
                               <History className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="font-medium">{history.reason || 'Balance change'}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(history.created_at).toLocaleString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-lg ${
                              isIncrease ? 'text-green-600' :
                              isDecrease ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              {isIncrease ? '+' : isDecrease ? '-' : ''}
                              {formatCurrency(Math.abs(history.change_amount))}
                            </p>
                            <Badge variant="outline" className="mt-1">
                              {history.change_type.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Previous Balance</p>
                            <p className="font-semibold">{formatCurrency(history.old_balance)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-muted-foreground">New Balance</p>
                            <p className="font-semibold">{formatCurrency(history.new_balance)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
