'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { WidgetWrapper } from './WidgetWrapper'
import { CreditCard } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface CreditCardData {
  id: string
  account_name: string
  credit_limit: number
  current_balance: number
  utilization: number
  available_credit: number
}

export function CreditCardsWidget() {
  const [cards, setCards] = useState<CreditCardData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCreditCards()
  }, [])

  const fetchCreditCards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, account_name, balance, credit_limit')
        .eq('account_type', 'credit_card')
        .eq('is_active', true)
        .order('account_name')

      if (accounts) {
        const creditCards = accounts.map(acc => {
          const creditLimit = Number(acc.credit_limit) || 0
          const currentBalance = Math.abs(Number(acc.balance)) // Credit card balance is typically negative
          const utilization = creditLimit > 0 ? (currentBalance / creditLimit) * 100 : 0
          const availableCredit = creditLimit - currentBalance

          return {
            id: acc.id,
            account_name: acc.account_name,
            credit_limit: creditLimit,
            current_balance: currentBalance,
            utilization: Math.min(utilization, 100), // Cap at 100%
            available_credit: Math.max(availableCredit, 0)
          }
        })

        setCards(creditCards)
      }
    } catch (error) {
      console.error('Error fetching credit cards:', error)
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

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-600 bg-red-100'
    if (utilization >= 70) return 'text-orange-600 bg-orange-100'
    if (utilization >= 50) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getProgressColor = (utilization: number) => {
    if (utilization >= 90) return 'bg-red-500'
    if (utilization >= 70) return 'bg-orange-500'
    if (utilization >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (loading) {
    return (
      <WidgetWrapper id="credit-cards" title="Credit Card Utilization" icon={CreditCard}>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-2 bg-gray-200 rounded w-full mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
      </WidgetWrapper>
    )
  }

  if (cards.length === 0) {
    return (
      <WidgetWrapper id="credit-cards" title="Credit Card Utilization" icon={CreditCard}>
        <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
          <CreditCard className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No credit cards found</p>
          <p className="text-xs mt-1">Add a credit card account to see utilization</p>
        </div>
      </WidgetWrapper>
    )
  }

  return (
    <WidgetWrapper id="credit-cards" title="Credit Card Utilization" icon={CreditCard}>
      <div className="space-y-4">
        {cards.map(card => (
          <div key={card.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm truncate flex-1">{card.account_name}</h4>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${getUtilizationColor(card.utilization)}`}>
                {card.utilization.toFixed(0)}%
              </span>
            </div>

            <div className="relative">
              <Progress
                value={card.utilization}
                className="h-2"
                style={{
                  // @ts-ignore
                  '--progress-background': getProgressColor(card.utilization)
                }}
              />
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(card.current_balance)} used</span>
              <span>{formatCurrency(card.available_credit)} available</span>
            </div>

            <div className="text-xs text-muted-foreground border-t pt-1">
              Limit: {formatCurrency(card.credit_limit)}
            </div>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  )
}
