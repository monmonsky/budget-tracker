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
import { Plus, X } from 'lucide-react'
import { format } from 'date-fns'
import { useLoading } from '@/contexts/LoadingContext'

interface Income {
  id: string
  date: string
  amount: number
  category: string
  description: string
  account_id: string
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

export default function IncomePage() {
  const { setLoading, setLoadingText } = useLoading()
  const [incomes, setIncomes] = useState<Income[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    category: 'Gaji',
    description: '',
    account_id: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoadingText('Loading income...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch incomes
      const { data: incomeData } = await supabase
        .from('transactions')
        .select('*, accounts(account_name)')
        .eq('type', 'income')
        .order('date', { ascending: false })
        .limit(50)

      setIncomes(incomeData || [])

      // Fetch accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, account_name')
        .eq('is_active', true)
        .order('account_name')

      setAccounts(accountsData || [])

      // Fetch income categories from database
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('type', 'income')
        .order('name')

      setCategories(categoriesData || [])

      if (accountsData && accountsData.length > 0) {
        setFormData(prev => ({ ...prev, account_id: accountsData[0].id }))
      }

      // Set default category to first income category if available
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
          type: 'income',
          category: formData.category,
          description: formData.description,
          is_internal_transfer: false,
        })

      if (error) throw error

      // Reset form
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        category: categories[0]?.name || '',
        description: '',
        account_id: accounts[0]?.id || '',
      })
      setShowForm(false)

      // Refresh data
      fetchData()
    } catch (error) {
      console.error('Error adding income:', error)
      alert('Failed to add income')
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

  const totalIncome = incomes.reduce((sum, income) => sum + Number(income.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Income Tracking</h1>
          <p className="text-gray-600">Track all your income sources</p>
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
              Add Income
            </>
          )}
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Income (Last 50 transactions)</p>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Transactions</p>
            <p className="text-2xl font-semibold">{incomes.length}</p>
          </div>
        </div>
      </Card>

      {/* Add Income Form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Add New Income</h2>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                type="text"
                placeholder="e.g., Monthly salary, Quarterly bonus"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Add Income
            </Button>
          </form>
        </Card>
      )}

      {/* Income List */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Recent Income</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    No income recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                incomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell>{format(new Date(income.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {income.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{income.description}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {income.accounts.account_name}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(income.amount)}
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
