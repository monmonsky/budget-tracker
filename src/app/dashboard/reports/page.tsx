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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Filter, Download, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react'
import { format } from 'date-fns'
import { LoadingSpinner } from '@/components/loading-spinner'

interface Transaction {
  id: string
  date: string
  amount: number
  category: string
  description: string
  type: 'income' | 'expense'
  account_name: string
}

interface Investment {
  id: string
  platform: string
  portfolio_name: string
  asset_type: string
  currency: string
  total_contribution: number
  current_value: number
  unrealized_pnl: number
  return_percentage: number
}

interface Account {
  id: string
  account_name: string
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('transactions')

  // Transaction data
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterAccount, setFilterAccount] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [categories, setCategories] = useState<string[]>([])

  // Investment data
  const [investments, setInvestments] = useState<Investment[]>([])
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [filterAssetType, setFilterAssetType] = useState<string>('all')

  useEffect(() => {
    fetchData()
  }, [filterType, filterCategory, filterAccount, filterDateFrom, filterDateTo, filterPlatform, filterAssetType])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchTransactions(), fetchInvestments(), fetchAccounts()])
    setLoading(false)
  }

  const fetchTransactions = async () => {
    try {
      let query = supabase
        .from('transactions')
        .select(`
          id,
          date,
          amount,
          category,
          description,
          type,
          account:accounts(account_name)
        `)
        .order('date', { ascending: false })

      if (filterType !== 'all') query = query.eq('type', filterType)
      if (filterCategory !== 'all') query = query.eq('category', filterCategory)
      if (filterAccount !== 'all') query = query.eq('account_id', filterAccount)
      if (filterDateFrom) query = query.gte('date', filterDateFrom)
      if (filterDateTo) query = query.lte('date', filterDateTo)

      const { data } = await query

      const formattedTransactions = data?.map(t => ({
        id: t.id,
        date: t.date,
        amount: Number(t.amount),
        category: t.category || 'Uncategorized',
        description: t.description,
        type: t.type as 'income' | 'expense',
        account_name: (t.account as any)?.account_name || 'Unknown',
      })) || []

      setTransactions(formattedTransactions)

      // Get unique categories
      const uniqueCategories = [...new Set(formattedTransactions.map(t => t.category))]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const fetchInvestments = async () => {
    try {
      let query = supabase
        .from('investments')
        .select('*')
        .order('platform', { ascending: true })

      const { data } = await query

      let formattedInvestments = data?.map(inv => ({
        id: inv.id,
        platform: inv.platform,
        portfolio_name: inv.portfolio_name,
        asset_type: inv.asset_type,
        currency: inv.currency || 'IDR',
        total_contribution: Number(inv.total_contribution),
        current_value: Number(inv.current_value),
        unrealized_pnl: Number(inv.unrealized_pnl),
        return_percentage: Number(inv.return_percentage),
      })) || []

      // Apply filters
      if (filterPlatform !== 'all') {
        formattedInvestments = formattedInvestments.filter(inv => inv.platform === filterPlatform)
      }
      if (filterAssetType !== 'all') {
        formattedInvestments = formattedInvestments.filter(inv => inv.asset_type === filterAssetType)
      }

      setInvestments(formattedInvestments)
    } catch (error) {
      console.error('Error fetching investments:', error)
    }
  }

  const fetchAccounts = async () => {
    try {
      const { data } = await supabase
        .from('accounts')
        .select('id, account_name')
        .eq('is_active', true)

      setAccounts(data || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const formatCurrency = (amount: number, currency: 'IDR' | 'USD' = 'IDR') => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
    }
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const exportTransactionsCSV = () => {
    const headers = ['Date', 'Type', 'Category', 'Description', 'Account', 'Amount']
    const rows = transactions.map(t => [
      format(new Date(t.date), 'yyyy-MM-dd'),
      t.type,
      t.category,
      t.description,
      t.account_name,
      t.amount.toString(),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const exportInvestmentsCSV = () => {
    const headers = ['Platform', 'Portfolio', 'Asset Type', 'Currency', 'Total Contribution', 'Current Value', 'Unrealized P&L', 'Return %']
    const rows = investments.map(inv => [
      inv.platform,
      inv.portfolio_name,
      inv.asset_type,
      inv.currency,
      inv.total_contribution.toString(),
      inv.current_value.toString(),
      inv.unrealized_pnl.toString(),
      inv.return_percentage.toString(),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `investments-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  // Calculate transaction stats
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
  const netAmount = totalIncome - totalExpense

  // Calculate investment stats
  const exchangeRate = 16000
  const totalContribution = investments.reduce((sum, inv) => {
    const valueInIDR = inv.currency === 'USD' ? inv.total_contribution * exchangeRate : inv.total_contribution
    return sum + valueInIDR
  }, 0)
  const totalCurrentValue = investments.reduce((sum, inv) => {
    const valueInIDR = inv.currency === 'USD' ? inv.current_value * exchangeRate : inv.current_value
    return sum + valueInIDR
  }, 0)
  const totalPnL = totalCurrentValue - totalContribution
  const totalReturn = totalContribution > 0 ? (totalPnL / totalContribution) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Loading reports..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-gray-600">Analyze your transactions and investments</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="investments" className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4" />
            Investments
          </TabsTrigger>
        </TabsList>

        {/* Transaction Report */}
        <TabsContent value="transactions" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total Income</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total Expense</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-600 mb-1">Net Amount</p>
              <p className={`text-2xl font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netAmount)}
              </p>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Filters</h2>
              <div className="ml-auto">
                <Button onClick={exportTransactionsCSV} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Account</Label>
                <Select value={filterAccount} onValueChange={setFilterAccount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.account_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>
            </div>

            {(filterType !== 'all' || filterCategory !== 'all' || filterAccount !== 'all' || filterDateFrom || filterDateTo) && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterType('all')
                    setFilterCategory('all')
                    setFilterAccount('all')
                    setFilterDateFrom('')
                    setFilterDateTo('')
                  }}
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </Card>

          {/* Transactions Table */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">
              Transactions ({transactions.length})
            </h2>

            {transactions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No transactions found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(transaction.date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>{transaction.account_name}</TableCell>
                        <TableCell className={`text-right font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Investment Report */}
        <TabsContent value="investments" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total Contribution</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalContribution)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-600 mb-1">Current Value</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalCurrentValue)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total P&L</p>
              <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalPnL)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total Return</p>
              <p className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalReturn.toFixed(2)}%
              </p>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Filters</h2>
              <div className="ml-auto">
                <Button onClick={exportInvestmentsCSV} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="bibit">Bibit</SelectItem>
                    <SelectItem value="binance">Binance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Asset Type</Label>
                <Select value={filterAssetType} onValueChange={setFilterAssetType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="stocks">Stocks</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                    <SelectItem value="money_market">Money Market</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(filterPlatform !== 'all' || filterAssetType !== 'all') && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterPlatform('all')
                    setFilterAssetType('all')
                  }}
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </Card>

          {/* Investments Table */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">
              Investments ({investments.length})
            </h2>

            {investments.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No investments found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Platform</TableHead>
                      <TableHead>Portfolio</TableHead>
                      <TableHead>Asset Type</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead className="text-right">Contribution</TableHead>
                      <TableHead className="text-right">Current Value</TableHead>
                      <TableHead className="text-right">P&L</TableHead>
                      <TableHead className="text-right">Return %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investments.map((investment) => (
                      <TableRow key={investment.id}>
                        <TableCell className="font-medium">{investment.platform}</TableCell>
                        <TableCell>{investment.portfolio_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{investment.asset_type}</Badge>
                        </TableCell>
                        <TableCell>{investment.currency}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(investment.total_contribution, investment.currency as 'IDR' | 'USD')}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(investment.current_value, investment.currency as 'IDR' | 'USD')}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${investment.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {investment.unrealized_pnl >= 0 ? '+' : ''}{formatCurrency(investment.unrealized_pnl, investment.currency as 'IDR' | 'USD')}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${investment.return_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {investment.return_percentage >= 0 ? '+' : ''}{investment.return_percentage.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
