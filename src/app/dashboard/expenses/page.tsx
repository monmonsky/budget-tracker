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
import { Plus, X, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { useLoading } from '@/contexts/LoadingContext'

interface Expense {
  id: string
  date: string
  amount: number
  category: string
  subcategory: string | null
  description: string
  merchant: string | null
  account_id: string
  is_recurring: boolean
  accounts: { account_name: string }
}

interface Account {
  id: string
  account_name: string
}

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  icon: string | null
  color: string | null
}

export default function ExpensesPage() {
  const { setLoading, setLoadingText } = useLoading()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // Form state
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    category: 'Other Expense',
    subcategory: '',
    description: '',
    merchant: '',
    account_id: '',
    is_recurring: false,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoadingText('Loading expenses...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch expenses (excluding internal transfers)
      const { data: expenseData } = await supabase
        .from('transactions')
        .select('*, accounts(account_name)')
        .eq('type', 'expense')
        .eq('is_internal_transfer', false)
        .order('date', { ascending: false })
        .limit(100)

      setExpenses(expenseData || [])

      // Fetch accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, account_name')
        .eq('is_active', true)
        .order('account_name')

      setAccounts(accountsData || [])

      // Fetch expense categories from database
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('type', 'expense')
        .order('name')

      setCategories(categoriesData || [])

      if (accountsData && accountsData.length > 0) {
        setFormData(prev => ({ ...prev, account_id: accountsData[0].id }))
      }

      // Set default category to first expense category if available
      if (categoriesData && categoriesData.length > 0) {
        setFormData(prev => ({ ...prev, category: categoriesData[0].name }))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Insert transaction
      // Note: Account balance is auto-updated by database trigger (update_account_balance_on_insert)
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          account_id: formData.account_id,
          date: formData.date,
          amount: parseFloat(formData.amount),
          type: 'expense',
          category: formData.category,
          subcategory: formData.subcategory || null,
          description: formData.description,
          merchant: formData.merchant || null,
          is_recurring: formData.is_recurring,
          is_internal_transfer: false,
        })

      if (error) throw error

      // Reset form
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        category: categories[0]?.name || '',
        subcategory: '',
        description: '',
        merchant: '',
        account_id: accounts[0]?.id || '',
        is_recurring: false,
      })
      setShowForm(false)

      // Refresh data
      fetchData()
    } catch (error) {
      console.error('Error adding expense:', error)
      alert('Failed to add expense')
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

  const getCategoryColor = (categoryName: string) => {
    // Find category from database
    const category = categories.find(c => c.name === categoryName)
    if (category?.color) {
      // Use color from database with light background
      return `text-gray-800 dark:text-gray-200`
    }
    return 'bg-gray-50 text-gray-700'
  }

  const filteredExpenses = filterCategory === 'all'
    ? expenses
    : expenses.filter(e => e.category === filterCategory)

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0)

  // Category breakdown
  const categoryBreakdown = expenses.reduce((acc, expense) => {
    const cat = expense.category
    if (!acc[cat]) acc[cat] = 0
    acc[cat] += Number(expense.amount)
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expense Tracking</h1>
          <p className="text-gray-600">Track and categorize your expenses</p>
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
              Add Expense
            </>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-3xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-2xl font-semibold">{filteredExpenses.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-gray-600 mb-2">Top Category</p>
          {Object.keys(categoryBreakdown).length > 0 ? (
            <div>
              <p className="text-xl font-bold">
                {Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0][0]}
              </p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0][1])}
              </p>
            </div>
          ) : (
            <p className="text-gray-500">No data</p>
          )}
        </Card>
      </div>

      {/* Add Expense Form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Add New Expense</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (Rp)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        <div className="flex items-center gap-2">
                          {cat.icon && <span>{cat.icon}</span>}
                          <span>{cat.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory (Optional)</Label>
                <Input
                  id="subcategory"
                  type="text"
                  placeholder="e.g., Electricity, Water"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account">Account</Label>
                <Select
                  value={formData.account_id}
                  onValueChange={(value) => setFormData({ ...formData, account_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant (Optional)</Label>
                <Input
                  id="merchant"
                  type="text"
                  placeholder="e.g., Indomaret, Alfamart"
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                type="text"
                placeholder="e.g., Monthly groceries, Gas"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_recurring"
                checked={formData.is_recurring}
                onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="is_recurring" className="cursor-pointer">
                Recurring expense
              </Label>
            </div>

            <Button type="submit" className="w-full">
              Add Expense
            </Button>
          </form>
        </Card>
      )}

      {/* Filter */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>
                  <div className="flex items-center gap-2">
                    {cat.icon && <span>{cat.icon}</span>}
                    <span>{cat.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Expense List */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Recent Expenses</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No expenses recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className={getCategoryColor(expense.category)}>
                          {expense.category}
                        </Badge>
                        {expense.subcategory && (
                          <span className="text-xs text-gray-500">{expense.subcategory}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{expense.description}</span>
                        {expense.is_recurring && (
                          <Badge variant="outline" className="w-fit text-xs">Recurring</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {expense.merchant || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {expense.accounts.account_name}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
