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
  Filter,
  RefreshCw,
  Play,
  Plus,
  Bell,
  CreditCard,
  ArrowRight,
  AlertTriangle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLoading } from '@/contexts/LoadingContext'
import { DashboardSkeleton } from '@/components/skeletons/card-skeleton'
import FinancialHealthScore from '@/components/FinancialHealthScore'

interface DashboardStats {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  investmentValue: number
  kprBalance: number
  creditCardDebt: number
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

interface RecurringTransaction {
  id: string
  template_name: string
  amount: number
  type: 'income' | 'expense'
  category: string
  frequency: string
  next_occurrence: string
  is_active: boolean
}

interface BudgetAtRisk {
  id: string
  category: string
  amount: number
  spent: number
  percentage: number
  month: string
}

interface CreditCardAccount {
  id: string
  account_name: string
  bank_name: string
  balance: number
  credit_limit: number
  utilization: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { setLoading, setLoadingText } = useLoading()
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    investmentValue: 0,
    kprBalance: 0,
    creditCardDebt: 0,
    netWorth: 0,
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [upcomingRecurring, setUpcomingRecurring] = useState<RecurringTransaction[]>([])
  const [budgetsAtRisk, setBudgetsAtRisk] = useState<BudgetAtRisk[]>([])
  const [creditCards, setCreditCards] = useState<CreditCardAccount[]>([])

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        fetchDashboardStats(),
        fetchRecentTransactions(),
        fetchUpcomingRecurring(),
        fetchBudgetsAtRisk(),
        fetchCreditCards()
      ])
      setIsInitialLoading(false)
    }
    loadInitialData()
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

      // Fetch credit card debt (negative balance = debt)
      const { data: creditCardAccounts } = await supabase
        .from('accounts')
        .select('balance')
        .eq('account_type', 'credit_card')
        .eq('is_active', true)

      const creditCardDebt = creditCardAccounts?.reduce((sum, acc) => {
        const balance = Number(acc.balance)
        // Only count negative balances as debt
        return sum + (balance < 0 ? Math.abs(balance) : 0)
      }, 0) || 0

      // Calculate net worth (subtract credit card debt)
      const netWorth = totalBalance + investmentValue - kprBalance - creditCardDebt

      setStats({
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        investmentValue,
        kprBalance,
        creditCardDebt,
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

  const fetchUpcomingRecurring = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get next 7 days of recurring transactions
      const today = new Date()
      const next7Days = new Date()
      next7Days.setDate(today.getDate() + 7)

      const { data } = await supabase
        .from('recurring_transactions')
        .select('id, template_name, amount, type, category, frequency, next_occurrence, is_active')
        .eq('is_active', true)
        .lte('next_occurrence', next7Days.toISOString().split('T')[0])
        .order('next_occurrence', { ascending: true })
        .limit(5)

      setUpcomingRecurring(data || [])
    } catch (error) {
      console.error('Error fetching upcoming recurring:', error)
    }
  }

  const fetchBudgetsAtRisk = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      // Get budgets for current month
      const { data: budgets } = await supabase
        .from('budgets')
        .select('id, category, amount, month')
        .eq('month', currentMonth)

      if (!budgets || budgets.length === 0) {
        setBudgetsAtRisk([])
        return
      }

      // Get spending for each budget category this month
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const budgetsWithSpending = await Promise.all(
        budgets.map(async (budget) => {
          const { data: expenses } = await supabase
            .from('transactions')
            .select('amount')
            .eq('type', 'expense')
            .eq('category', budget.category)
            .gte('date', firstDay.toISOString())
            .lte('date', lastDay.toISOString())

          const spent = expenses?.reduce((sum, t) => sum + Number(t.amount), 0) || 0
          const percentage = (spent / Number(budget.amount)) * 100

          return {
            id: budget.id,
            category: budget.category,
            amount: Number(budget.amount),
            spent,
            percentage,
            month: budget.month
          }
        })
      )

      // Filter budgets at 80% or more
      const atRisk = budgetsWithSpending.filter(b => b.percentage >= 80)
      setBudgetsAtRisk(atRisk.sort((a, b) => b.percentage - a.percentage))
    } catch (error) {
      console.error('Error fetching budgets at risk:', error)
    }
  }

  const fetchCreditCards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: creditCardAccounts } = await supabase
        .from('accounts')
        .select('id, account_name, bank_name, balance, credit_limit')
        .eq('account_type', 'credit_card')
        .eq('is_active', true)
        .order('bank_name')

      if (!creditCardAccounts) {
        setCreditCards([])
        return
      }

      const cardsWithUtilization = creditCardAccounts.map(card => {
        const outstanding = Math.abs(Number(card.balance))
        const limit = Number(card.credit_limit) || 0
        const utilization = limit > 0 ? (outstanding / limit) * 100 : 0

        return {
          id: card.id,
          account_name: card.account_name,
          bank_name: card.bank_name,
          balance: Number(card.balance),
          credit_limit: limit,
          utilization
        }
      })

      setCreditCards(cardsWithUtilization)
    } catch (error) {
      console.error('Error fetching credit cards:', error)
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
      title: 'Credit Card Debt',
      value: stats.creditCardDebt,
      icon: CreditCard,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'KPR Balance',
      value: stats.kprBalance,
      icon: Building2,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Net Worth',
      value: stats.netWorth,
      icon: BarChart3,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ]

  if (isInitialLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600">Overview of your financial status</p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button onClick={() => router.push('/dashboard/transactions')} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
          <Button onClick={() => router.push('/dashboard/budget')} variant="outline" size="sm">
            <CreditCard className="h-4 w-4 mr-2" />
            View Budgets
          </Button>
          <Button onClick={() => router.push('/dashboard/recurring')} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Recurring
          </Button>
        </div>
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

      {/* Monthly Overview with Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Monthly Overview</h2>
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
            {stats.monthlyIncome > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Savings Rate</span>
                  <span className="font-semibold">
                    {(((stats.monthlyIncome - stats.monthlyExpenses) / stats.monthlyIncome) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      ((stats.monthlyIncome - stats.monthlyExpenses) / stats.monthlyIncome) * 100 >= 20
                        ? 'bg-green-600'
                        : 'bg-orange-600'
                    }`}
                    style={{
                      width: `${Math.min(((stats.monthlyIncome - stats.monthlyExpenses) / stats.monthlyIncome) * 100, 100)}%`
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Target: 20% or more for healthy savings
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Budget Alert Summary */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <h2 className="text-xl font-bold">Budget Alerts</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/budget')}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          {budgetsAtRisk.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-green-600 font-semibold mb-1">All budgets on track! 🎉</p>
              <p className="text-sm text-gray-600">No budgets have exceeded 80% yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {budgetsAtRisk.slice(0, 3).map((budget) => (
                <div key={budget.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{budget.category}</span>
                    <Badge variant={budget.percentage >= 100 ? 'destructive' : 'default'}>
                      {budget.percentage.toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="w-full bg-white rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full ${
                        budget.percentage >= 100 ? 'bg-red-600' : 'bg-orange-600'
                      }`}
                      style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{formatCurrency(budget.spent)}</span>
                    <span>of {formatCurrency(budget.amount)}</span>
                  </div>
                </div>
              ))}
              {budgetsAtRisk.length > 3 && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => router.push('/dashboard/budget')}>
                  View {budgetsAtRisk.length - 3} more alert{budgetsAtRisk.length > 4 ? 's' : ''}
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Credit Card Debt Widget */}
      {creditCards.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-600" />
              <h2 className="text-xl font-bold">Credit Card Utilization</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/accounts')}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-3">
            {creditCards.map((card) => (
              <div key={card.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{card.account_name}</p>
                    <p className="text-xs text-gray-600">{card.bank_name}</p>
                  </div>
                  <Badge variant={card.utilization >= 70 ? 'destructive' : card.utilization >= 50 ? 'default' : 'outline'}>
                    {card.utilization.toFixed(0)}%
                  </Badge>
                </div>
                <div className="w-full bg-white rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full ${
                      card.utilization >= 70 ? 'bg-red-600' : card.utilization >= 50 ? 'bg-orange-600' : 'bg-green-600'
                    }`}
                    style={{ width: `${Math.min(card.utilization, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Outstanding: {formatCurrency(Math.abs(card.balance))}</span>
                  <span>Limit: {formatCurrency(card.credit_limit)}</span>
                </div>
              </div>
            ))}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total Credit Card Debt</span>
                <span className="text-lg font-bold text-orange-600">{formatCurrency(stats.creditCardDebt)}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Financial Goals Progress */}
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

      {/* Upcoming Recurring Transactions */}
      {upcomingRecurring.length > 0 && (
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Upcoming Recurring (Next 7 Days)</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard/recurring'}>
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {upcomingRecurring.map((recurring) => (
              <div key={recurring.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{recurring.template_name}</p>
                    <Badge variant={recurring.type === 'income' ? 'default' : 'destructive'}>
                      {recurring.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span>{new Date(recurring.next_occurrence).toLocaleDateString('id-ID')}</span>
                    <span>•</span>
                    <span>{recurring.category}</span>
                    <span>•</span>
                    <span className="capitalize">{recurring.frequency}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${recurring.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {recurring.type === 'income' ? '+' : '-'} {formatCurrency(recurring.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Financial Health Score */}
      <FinancialHealthScore />

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
