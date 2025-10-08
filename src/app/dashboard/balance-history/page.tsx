'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { History, TrendingUp, TrendingDown, Filter, Download, Calendar, ArrowUpDown } from 'lucide-react'
import { useLoading } from '@/contexts/LoadingContext'
import { format } from 'date-fns'

interface BalanceHistoryItem {
  id: string
  account_id: string
  account_name: string
  account_type: string
  bank_name: string
  old_balance: number
  new_balance: number
  change_amount: number
  change_type: 'increase' | 'decrease' | 'manual_adjustment'
  reason: string
  transaction_id: string | null
  created_at: string
}

interface Account {
  id: string
  account_name: string
  bank_name: string
  account_type: string
}

export default function BalanceHistoryPage() {
  const { setLoading, setLoadingText } = useLoading()
  const [history, setHistory] = useState<BalanceHistoryItem[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [filteredHistory, setFilteredHistory] = useState<BalanceHistoryItem[]>([])

  // Filters
  const [filterAccount, setFilterAccount] = useState<string>('all')
  const [filterChangeType, setFilterChangeType] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetchAccounts()
    fetchBalanceHistory()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [history, filterAccount, filterChangeType, filterDateFrom, filterDateTo, sortOrder])

  const fetchAccounts = async () => {
    try {
      const { data } = await supabase
        .from('accounts')
        .select('id, account_name, bank_name, account_type')
        .eq('is_active', true)
        .order('bank_name')

      setAccounts(data || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const fetchBalanceHistory = async () => {
    setLoadingText('Loading balance history...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('account_balance_history')
        .select(`
          id,
          account_id,
          old_balance,
          new_balance,
          change_amount,
          change_type,
          reason,
          transaction_id,
          created_at,
          accounts!inner (
            account_name,
            bank_name,
            account_type
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) {
        console.error('Error fetching balance history:', error)
        return
      }

      const formattedHistory = data?.map((item: any) => ({
        id: item.id,
        account_id: item.account_id,
        account_name: item.accounts.account_name,
        account_type: item.accounts.account_type,
        bank_name: item.accounts.bank_name,
        old_balance: Number(item.old_balance),
        new_balance: Number(item.new_balance),
        change_amount: Number(item.change_amount),
        change_type: item.change_type,
        reason: item.reason,
        transaction_id: item.transaction_id,
        created_at: item.created_at,
      })) || []

      setHistory(formattedHistory)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...history]

    // Filter by account
    if (filterAccount !== 'all') {
      filtered = filtered.filter(item => item.account_id === filterAccount)
    }

    // Filter by change type
    if (filterChangeType !== 'all') {
      filtered = filtered.filter(item => item.change_type === filterChangeType)
    }

    // Filter by date range
    if (filterDateFrom) {
      filtered = filtered.filter(item =>
        new Date(item.created_at) >= new Date(filterDateFrom)
      )
    }
    if (filterDateTo) {
      const endDate = new Date(filterDateTo)
      endDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(item =>
        new Date(item.created_at) <= endDate
      )
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })

    setFilteredHistory(filtered)
  }

  const clearFilters = () => {
    setFilterAccount('all')
    setFilterChangeType('all')
    setFilterDateFrom('')
    setFilterDateTo('')
    setSortOrder('desc')
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Account', 'Bank', 'Type', 'Reason', 'Old Balance', 'New Balance', 'Change Amount']
    const rows = filteredHistory.map(item => [
      format(new Date(item.created_at), 'dd/MM/yyyy HH:mm'),
      item.account_name,
      item.bank_name,
      item.change_type,
      item.reason,
      item.old_balance,
      item.new_balance,
      item.change_amount
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `balance-history-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
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

  const getChangeTypeIcon = (type: string) => {
    if (type === 'increase') return <TrendingUp className="h-4 w-4" />
    if (type === 'decrease') return <TrendingDown className="h-4 w-4" />
    return <History className="h-4 w-4" />
  }

  const getChangeTypeColor = (type: string) => {
    if (type === 'increase') return 'bg-green-100 text-green-600'
    if (type === 'decrease') return 'bg-red-100 text-red-600'
    return 'bg-gray-100 text-gray-600'
  }

  // Calculate statistics
  const totalIncrease = filteredHistory
    .filter(h => h.change_type === 'increase')
    .reduce((sum, h) => sum + h.change_amount, 0)

  const totalDecrease = filteredHistory
    .filter(h => h.change_type === 'decrease')
    .reduce((sum, h) => sum + Math.abs(h.change_amount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <History className="h-8 w-8" />
          Balance History
        </h1>
        <p className="text-muted-foreground">Complete log of all account balance changes</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Changes</p>
              <p className="text-2xl font-bold">{filteredHistory.length}</p>
            </div>
            <History className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Increases</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncrease)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Decreases</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDecrease)}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-400" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Account Filter */}
          <div className="space-y-2">
            <Label>Account</Label>
            <Select value={filterAccount} onValueChange={setFilterAccount}>
              <SelectTrigger>
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.bank_name} - {account.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Change Type Filter */}
          <div className="space-y-2">
            <Label>Change Type</Label>
            <Select value={filterChangeType} onValueChange={setFilterChangeType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="increase">Increase</SelectItem>
                <SelectItem value="decrease">Decrease</SelectItem>
                <SelectItem value="manual_adjustment">Manual Adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div className="space-y-2">
            <Label>From Date</Label>
            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
            />
          </div>

          {/* Date To */}
          <div className="space-y-2">
            <Label>To Date</Label>
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* History Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            History Log ({filteredHistory.length} entries)
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </Button>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No balance history found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${getChangeTypeColor(item.change_type)}`}>
                      {getChangeTypeIcon(item.change_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{item.bank_name} - {item.account_name}</p>
                        <Badge variant="outline" className={getAccountTypeColor(item.account_type)}>
                          {item.account_type}
                        </Badge>
                      </div>
                      <p className="text-sm">{item.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {format(new Date(item.created_at), 'dd MMM yyyy, HH:mm:ss')}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`font-bold text-xl ${
                      item.change_type === 'increase' ? 'text-green-600' :
                      item.change_type === 'decrease' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {item.change_type === 'increase' ? '+' : item.change_type === 'decrease' ? '-' : ''}
                      {formatCurrency(Math.abs(item.change_amount))}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {item.change_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                <div className="pt-3 border-t grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Previous Balance</p>
                    <p className="font-semibold">{formatCurrency(item.old_balance)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">New Balance</p>
                    <p className="font-semibold">{formatCurrency(item.new_balance)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
