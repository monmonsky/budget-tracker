'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Building2,
  BarChart3,
  Trash2,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLoading } from '@/contexts/LoadingContext'

interface DashboardStats {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  investmentValue: number
  kprBalance: number
  netWorth: number
}

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  account_name: string
}

export default function DashboardPage() {
  const { setLoading, setLoadingText } = useLoading()
  const [stats, setStats] = useState<DashboardStats>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    investmentValue: 0,
    kprBalance: 0,
    netWorth: 0,
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'income' | 'expense'>('all')

  useEffect(() => {
    fetchDashboardStats()
    fetchRecentTransactions()
  }, [])

  useEffect(() => {
    fetchRecentTransactions()
  }, [transactionFilter])

  const fetchDashboardStats = async () => {
    setLoadingText('Loading dashboard...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get current month
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      // Fetch accounts total balance
      const { data: accounts } = await supabase
        .from('accounts')
        .select('balance')
        .eq('is_active', true)

      const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0

      // Fetch monthly income
      const { data: incomeData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'income')
        .gte('date', firstDay.toISOString())
        .lte('date', lastDay.toISOString())

      const monthlyIncome = incomeData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

      // Fetch monthly expenses (excluding internal transfers)
      const { data: expenseData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'expense')
        .eq('is_internal_transfer', false)
        .gte('date', firstDay.toISOString())
        .lte('date', lastDay.toISOString())

      const monthlyExpenses = expenseData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

      // Fetch investments total value (convert USD to IDR)
      const exchangeRate = 16000 // Default USD to IDR rate
      const { data: investments } = await supabase
        .from('investments')
        .select('current_value, currency')

      const investmentValue = investments?.reduce((sum, inv) => {
        const value = Number(inv.current_value)
        // Convert USD to IDR
        const valueInIDR = inv.currency === 'USD' ? value * exchangeRate : value
        return sum + valueInIDR
      }, 0) || 0

      // Fetch KPR balance
      const { data: kpr } = await supabase
        .from('kpr_tracking')
        .select('current_balance')
        .single()

      const kprBalance = kpr ? Number(kpr.current_balance) : 0

      // Calculate net worth
      const netWorth = totalBalance + investmentValue - kprBalance

      setStats({
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        investmentValue,
        kprBalance,
        netWorth,
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('transactions')
        .select(`
          id,
          date,
          description,
          amount,
          type,
          category,
          account:accounts(name)
        `)
        .order('date', { ascending: false })
        .limit(10)

      if (transactionFilter !== 'all') {
        query = query.eq('type', transactionFilter)
      }

      const { data } = await query

      const formattedTransactions = data?.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        type: t.type as 'income' | 'expense',
        category: t.category || 'Uncategorized',
        account_name: (t.account as any)?.name || 'Unknown',
      })) || []

      setTransactions(formattedTransactions)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error deleting transaction')
      return
    }

    fetchRecentTransactions()
    fetchDashboardStats()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const cards = [
    {
      title: 'Total Cash Balance',
      value: stats.totalBalance,
      icon: Wallet,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Monthly Income',
      value: stats.monthlyIncome,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Monthly Expenses',
      value: stats.monthlyExpenses,
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Investment Value',
      value: stats.investmentValue,
      icon: PiggyBank,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'KPR Balance',
      value: stats.kprBalance,
      icon: Building2,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Net Worth',
      value: stats.netWorth,
      icon: BarChart3,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Overview of your financial status</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <Card key={card.title} className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold">{formatCurrency(card.value)}</p>
              </div>
              <div className={`${card.bgColor} ${card.color} p-3 rounded-lg`}>
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Monthly Summary */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Monthly Summary</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Income</span>
            <span className="font-semibold text-green-600">
              {formatCurrency(stats.monthlyIncome)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Expenses</span>
            <span className="font-semibold text-red-600">
              {formatCurrency(stats.monthlyExpenses)}
            </span>
          </div>
          <div className="border-t pt-4 flex items-center justify-between">
            <span className="font-semibold">Net Cash Flow</span>
            <span className={`font-bold text-lg ${stats.monthlyIncome - stats.monthlyExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats.monthlyIncome - stats.monthlyExpenses)}
            </span>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Financial Goals Progress</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Target Net Worth (Year 17)</span>
              <Badge variant="outline">Rp 20-35 M</Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full"
                style={{ width: `${Math.min((stats.netWorth / 20000000000) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Current: {formatCurrency(stats.netWorth)} ({((stats.netWorth / 20000000000) * 100).toFixed(1)}%)
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">KPR Payoff Progress</span>
              <Badge variant="outline">Target: 6 Years</Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full"
                style={{ width: stats.kprBalance > 0 ? `${100 - ((stats.kprBalance / 3000000000) * 100)}%` : '0%' }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Remaining: {formatCurrency(stats.kprBalance)}
            </p>
          </div>
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recent Transactions</h2>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={transactionFilter} onValueChange={(value: any) => setTransactionFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          {transactions.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No transactions found</p>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{transaction.description}</p>
                    <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                      {transaction.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                    <span>{new Date(transaction.date).toLocaleDateString('id-ID')}</span>
                    <span>•</span>
                    <span>{transaction.category}</span>
                    <span>•</span>
                    <span>{transaction.account_name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTransaction(transaction.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
