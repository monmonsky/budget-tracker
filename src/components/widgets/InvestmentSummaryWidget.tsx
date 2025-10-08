'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { WidgetWrapper } from './WidgetWrapper'
import { Briefcase, TrendingUp, TrendingDown } from 'lucide-react'

interface InvestmentData {
  id: string
  account_name: string
  balance: number
  initial_balance: number
  returns: number
  returnPercentage: number
}

export function InvestmentSummaryWidget() {
  const [investments, setInvestments] = useState<InvestmentData[]>([])
  const [totalValue, setTotalValue] = useState(0)
  const [totalReturns, setTotalReturns] = useState(0)
  const [totalReturnPercentage, setTotalReturnPercentage] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInvestments()
  }, [])

  const fetchInvestments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get investment accounts
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, account_name, balance, initial_balance')
        .eq('account_type', 'investment')
        .eq('is_active', true)
        .order('balance', { ascending: false })

      if (accounts && accounts.length > 0) {
        const investmentData: InvestmentData[] = accounts.map(acc => {
          const currentBalance = Number(acc.balance)
          const initialBalance = Number(acc.initial_balance) || currentBalance
          const returns = currentBalance - initialBalance
          const returnPercentage = initialBalance > 0 ? (returns / initialBalance) * 100 : 0

          return {
            id: acc.id,
            account_name: acc.account_name,
            balance: currentBalance,
            initial_balance: initialBalance,
            returns: returns,
            returnPercentage: returnPercentage
          }
        })

        setInvestments(investmentData)

        // Calculate totals
        const total = investmentData.reduce((sum, inv) => sum + inv.balance, 0)
        const totalInitial = investmentData.reduce((sum, inv) => sum + inv.initial_balance, 0)
        const totalRet = total - totalInitial
        const totalRetPct = totalInitial > 0 ? (totalRet / totalInitial) * 100 : 0

        setTotalValue(total)
        setTotalReturns(totalRet)
        setTotalReturnPercentage(totalRetPct)
      }
    } catch (error) {
      console.error('Error fetching investments:', error)
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

  if (loading) {
    return (
      <WidgetWrapper id="investment-summary" title="Investment Summary" icon={Briefcase}>
        <div className="space-y-3">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse border-t pt-2">
              <div className="h-4 bg-gray-200 rounded w-28 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </div>
          ))}
        </div>
      </WidgetWrapper>
    )
  }

  if (investments.length === 0) {
    return (
      <WidgetWrapper id="investment-summary" title="Investment Summary" icon={Briefcase}>
        <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
          <Briefcase className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No investments</p>
          <p className="text-xs mt-1">Add investment accounts to track portfolio</p>
        </div>
      </WidgetWrapper>
    )
  }

  return (
    <WidgetWrapper id="investment-summary" title="Investment Summary" icon={Briefcase}>
      <div className="space-y-3">
        {/* Total Value */}
        <div className="pb-3 border-b">
          <p className="text-xs text-muted-foreground mb-1">Total Portfolio Value</p>
          <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
          <div className="flex items-center gap-1 mt-1">
            {totalReturns >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span className={`text-xs font-medium ${totalReturns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalReturns >= 0 ? '+' : ''}{formatCurrency(totalReturns)}
            </span>
            <span className={`text-xs font-medium ${totalReturns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ({totalReturnPercentage >= 0 ? '+' : ''}{totalReturnPercentage.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Individual Investments */}
        <div className="space-y-2">
          {investments.map(inv => (
            <div key={inv.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm truncate flex-1">{inv.account_name}</h4>
                <span className="text-sm font-semibold">{formatCurrency(inv.balance)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Initial: {formatCurrency(inv.initial_balance)}
                </span>
                <div className="flex items-center gap-1">
                  {inv.returns >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={inv.returns >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {inv.returns >= 0 ? '+' : ''}{formatCurrency(inv.returns)}
                  </span>
                  <span className={inv.returns >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ({inv.returnPercentage >= 0 ? '+' : ''}{inv.returnPercentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </WidgetWrapper>
  )
}
