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
import { Filter, Download, Trash2, Edit2, Calendar, Plus, Eye, Paperclip } from 'lucide-react'
import { format } from 'date-fns'
import { useLoading } from '@/contexts/LoadingContext'
import { toast } from 'sonner'
import { AddTransactionModal } from '@/components/add-transaction-modal'
import { TransactionDetailModal } from '@/components/transaction-detail-modal'

interface Transaction {
  id: string
  date: string
  amount: number
  category: string
  description: string
  type: 'income' | 'expense'
  account_id: string
  account_name: string
  attachment_count?: number
}

interface Account {
  id: string
  account_name: string
}

export default function TransactionsPage() {
  const { setLoading, setLoadingText } = useLoading()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)

  // Filters
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterAccount, setFilterAccount] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [categories, setCategories] = useState<string[]>([])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 20

  useEffect(() => {
    fetchData()
  }, [filterType, filterCategory, filterAccount, filterDateFrom, filterDateTo, currentPage])

  const fetchData = async () => {
    setLoadingText('Loading transactions...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, account_name')
        .eq('is_active', true)

      setAccounts(accountsData || [])

      // Build base query
      let baseQuery = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .order('date', { ascending: false })

      // Apply filters
      if (filterType !== 'all') {
        baseQuery = baseQuery.eq('type', filterType)
      }

      if (filterCategory !== 'all') {
        baseQuery = baseQuery.eq('category', filterCategory)
      }

      if (filterAccount !== 'all') {
        baseQuery = baseQuery.eq('account_id', filterAccount)
      }

      if (filterDateFrom) {
        baseQuery = baseQuery.gte('date', filterDateFrom)
      }

      if (filterDateTo) {
        baseQuery = baseQuery.lte('date', filterDateTo)
      }

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, count } = await baseQuery.range(from, to)

      setTotalCount(count || 0)

      // Map account IDs to names
      const accountMap = new Map(accountsData?.map(a => [a.id, a.account_name]) || [])

      // Get attachment counts for all transactions
      const transactionIds = data?.map(t => t.id) || []
      const { data: attachmentCounts } = await supabase
        .from('transaction_attachments')
        .select('transaction_id')
        .in('transaction_id', transactionIds)

      const attachmentCountMap = new Map<string, number>()
      attachmentCounts?.forEach(a => {
        attachmentCountMap.set(a.transaction_id, (attachmentCountMap.get(a.transaction_id) || 0) + 1)
      })

      const formattedTransactions = data?.map(t => ({
        id: t.id,
        date: t.date,
        amount: Number(t.amount),
        category: t.category || 'Uncategorized',
        description: t.description,
        type: t.type as 'income' | 'expense',
        account_id: t.account_id,
        account_name: accountMap.get(t.account_id) || 'Unknown',
        attachment_count: attachmentCountMap.get(t.id) || 0,
      })) || []

      setTransactions(formattedTransactions)

      // Get unique categories
      const uniqueCategories = [...new Set(formattedTransactions.map(t => t.category))]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return

    setLoadingText('Deleting transaction...')
    setLoading(true)

    try {
      // First delete attachments
      const { error: attachmentError } = await supabase
        .from('transaction_attachments')
        .delete()
        .eq('transaction_id', id)

      if (attachmentError) {
        console.error('Error deleting attachments:', attachmentError)
        // Continue even if attachment delete fails
      }

      // Then delete transaction
      const { error, data } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .select()

      if (error) {
        console.error('Delete error:', error)
        throw error
      }

      console.log('Deleted transaction:', data)

      toast.success('Transaction deleted successfully!', {
        description: 'The transaction has been removed and balance updated.',
      })

      fetchData()
    } catch (error) {
      console.error('Failed to delete transaction:', error)
      toast.error('Failed to delete transaction', {
        description: (error as any).message || 'An unexpected error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
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
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`
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

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const netAmount = totalIncome - totalExpense

  return (
    <div className="space-y-6">
      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false)
          fetchData()
        }}
      />

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transactionId={selectedTransactionId}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedTransactionId(null)
          fetchData() // Refresh to update attachment counts
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transaction Report</h1>
          <p className="text-gray-600">Track and analyze all your transactions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Type Filter */}
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

          {/* Category Filter */}
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

          {/* Account Filter */}
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

        {/* Clear Filters */}
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            Transactions ({totalCount})
          </h2>
          <div className="text-sm text-muted-foreground">
            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)} - {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
          </div>
        </div>

        {transactions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No transactions found</p>
        ) : (
          <>
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
                    <TableHead className="text-right">Actions</TableHead>
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="truncate">{transaction.description}</span>
                          {transaction.attachment_count && transaction.attachment_count > 0 && (
                            <Badge variant="outline" className="gap-1">
                              <Paperclip className="h-3 w-3" />
                              {transaction.attachment_count}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{transaction.account_name}</TableCell>
                      <TableCell className={`text-right font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTransactionId(transaction.id)
                              setShowDetailModal(true)
                            }}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(transaction.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalCount > itemsPerPage && (
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, Math.ceil(totalCount / itemsPerPage)) }, (_, i) => {
                    const totalPages = Math.ceil(totalCount / itemsPerPage)
                    let pageNum

                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <Button
                        key={i}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / itemsPerPage), prev + 1))}
                    disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.ceil(totalCount / itemsPerPage))}
                    disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}
                  >
                    Last
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
