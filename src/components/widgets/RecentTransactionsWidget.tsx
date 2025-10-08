'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { WidgetWrapper } from './WidgetWrapper'
import { Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { format } from 'date-fns'

interface TransactionData {
  id: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  description: string
  category_name: string | null
  account_name: string | null
  date: string
}

export function RecentTransactionsWidget() {
  const [transactions, setTransactions] = useState<TransactionData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentTransactions()
  }, [])

  const fetchRecentTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: txData } = await supabase
        .from('transactions')
        .select(`
          id,
          type,
          amount,
          description,
          date,
          category:categories(name),
          account:accounts(account_name)
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10)

      if (txData) {
        const formattedTransactions = txData.map(tx => ({
          id: tx.id,
          type: tx.type as 'income' | 'expense' | 'transfer',
          amount: Number(tx.amount),
          description: tx.description,
          category_name: (tx.category as any)?.name || null,
          account_name: (tx.account as any)?.account_name || null,
          date: tx.date
        }))

        setTransactions(formattedTransactions)
      }
    } catch (error) {
      console.error('Error fetching recent transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getTransactionIcon = (type: string) => {
    if (type === 'income') {
      return <ArrowDownRight className="h-4 w-4 text-green-600" />
    }
    return <ArrowUpRight className="h-4 w-4 text-red-600" />
  }

  const getTransactionColor = (type: string) => {
    if (type === 'income') return 'text-green-600'
    return 'text-red-600'
  }

  const getTransactionSign = (type: string) => {
    if (type === 'income') return '+'
    return '-'
  }

  if (loading) {
    return (
      <WidgetWrapper id="recent-transactions" title="Recent Transactions" icon={Receipt}>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="animate-pulse flex justify-between items-center p-2 border rounded">
              <div className="flex items-center gap-2 flex-1">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
              <div className="h-5 bg-gray-200 rounded w-20"></div>
            </div>
          ))}
        </div>
      </WidgetWrapper>
    )
  }

  if (transactions.length === 0) {
    return (
      <WidgetWrapper id="recent-transactions" title="Recent Transactions" icon={Receipt}>
        <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
          <Receipt className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No transactions yet</p>
          <p className="text-xs mt-1">Add your first transaction to get started</p>
        </div>
      </WidgetWrapper>
    )
  }

  return (
    <WidgetWrapper id="recent-transactions" title="Recent Transactions" icon={Receipt}>
      <div className="space-y-2">
        {transactions.map(tx => (
          <div
            key={tx.id}
            className="flex justify-between items-center p-2 border rounded hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex-shrink-0">
                {getTransactionIcon(tx.type)}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{tx.description}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  {tx.category_name && (
                    <span className="text-xs text-muted-foreground truncate">
                      {tx.category_name}
                    </span>
                  )}
                  {tx.account_name && (
                    <span className="text-xs text-muted-foreground truncate">
                      • {tx.account_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end flex-shrink-0 ml-2">
              <span className={`font-semibold text-sm ${getTransactionColor(tx.type)}`}>
                {getTransactionSign(tx.type)}{formatCurrency(tx.amount)}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(tx.date), 'MMM dd')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  )
}
