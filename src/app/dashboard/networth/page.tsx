'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Wallet, PiggyBank, Building2 } from 'lucide-react'
import { useLoading } from '@/contexts/LoadingContext'

interface NetWorthData {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  cashBalance: number
  investmentValue: number
  kprBalance: number
}

export default function NetWorthPage() {
  const { setLoading, setLoadingText } = useLoading()
  const [currentNetWorth, setCurrentNetWorth] = useState<NetWorthData>({
    totalAssets: 0,
    totalLiabilities: 0,
    netWorth: 0,
    cashBalance: 0,
    investmentValue: 0,
    kprBalance: 0,
  })

  useEffect(() => {
    fetchNetWorthData()
  }, [])

  const fetchNetWorthData = async () => {
    setLoadingText('Loading net worth data...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch cash balance from accounts
      const { data: accounts } = await supabase
        .from('accounts')
        .select('balance')
        .eq('is_active', true)

      const cashBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0

      // Fetch investment value
      const { data: investments } = await supabase
        .from('investments')
        .select('current_value')

      const investmentValue = investments?.reduce((sum, inv) => sum + Number(inv.current_value), 0) || 0

      // Fetch KPR balance
      const { data: kpr } = await supabase
        .from('kpr_tracking')
        .select('current_balance')
        .single()

      const kprBalance = kpr ? Number(kpr.current_balance) : 0

      const totalAssets = cashBalance + investmentValue
      const totalLiabilities = kprBalance
      const netWorth = totalAssets - totalLiabilities

      setCurrentNetWorth({
        totalAssets,
        totalLiabilities,
        netWorth,
        cashBalance,
        investmentValue,
        kprBalance,
      })
    } catch (error) {
      console.error('Error fetching net worth:', error)
    } finally {
      setLoading(false)
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

  const formatCurrencyShort = (amount: number) => {
    if (amount >= 1000000000) {
      return `Rp ${(amount / 1000000000).toFixed(1)}M`
    } else if (amount >= 1000000) {
      return `Rp ${(amount / 1000000).toFixed(1)}jt`
    }
    return formatCurrency(amount)
  }

  // Generate 17-year projection data
  const generateProjection = () => {
    const projection = []
    const currentYear = new Date().getFullYear()

    // Assumptions based on financial plan
    const annualInvestment = 112000000 // Rp 112 juta/year (Year 1-6)
    const kprBombing = 500000000 // Rp 500 juta/year
    const kprPenalty = 0.04
    const investmentReturn = 0.10 // 10% CAGR conservative
    const initialKPR = 3000000000 // Rp 3 miliar
    const kprInterestRate = 0.035 // 3.5%

    let cash = currentNetWorth.cashBalance
    let investment = currentNetWorth.investmentValue
    let kprBalance = currentNetWorth.kprBalance || initialKPR

    for (let year = 0; year <= 17; year++) {
      const targetYear = currentYear + year

      if (year > 0) {
        // Investment growth
        investment = investment * (1 + investmentReturn)

        // Year 1-6: Active bombing + investment
        if (year <= 6) {
          // Add investment contribution
          investment += annualInvestment

          // KPR bombing with penalty
          if (kprBalance > 0) {
            const netBombing = kprBombing * (1 - kprPenalty)
            kprBalance = Math.max(0, kprBalance - netBombing)
          }
        }

        // Year 7+: Redirect bombing to investment (no more KPR)
        if (year > 6) {
          // All cash flow goes to investment
          investment += annualInvestment + kprBombing
        }
      }

      const assets = cash + investment
      const liabilities = kprBalance
      const netWorth = assets - liabilities

      projection.push({
        year: `Y${year}`,
        fullYear: targetYear,
        assets: Math.round(assets),
        liabilities: Math.round(liabilities),
        netWorth: Math.round(netWorth),
        cash: Math.round(cash),
        investment: Math.round(investment),
      })
    }

    return projection
  }

  const projectionData = generateProjection()
  const year17NetWorth = projectionData[17]?.netWorth || 0
  const targetMin = 20000000000 // Rp 20 miliar
  const targetMax = 35000000000 // Rp 35 miliar
  const isOnTrack = year17NetWorth >= targetMin

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Net Worth Tracker</h1>
        <p className="text-muted-foreground">17-year financial journey to Rp 20-35 miliar</p>
      </div>

      {/* Current Net Worth */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Current Net Worth</p>
              <p className="text-3xl font-bold text-indigo-600">{formatCurrency(currentNetWorth.netWorth)}</p>
            </div>
            <div className="bg-indigo-100 text-indigo-600 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Cash Balance</p>
              <p className="text-2xl font-bold">{formatCurrency(currentNetWorth.cashBalance)}</p>
            </div>
            <div className="bg-blue-50 text-blue-600 p-3 rounded-lg">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Investment Value</p>
              <p className="text-2xl font-bold">{formatCurrency(currentNetWorth.investmentValue)}</p>
            </div>
            <div className="bg-purple-50 text-purple-600 p-3 rounded-lg">
              <PiggyBank className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">KPR Balance</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(currentNetWorth.kprBalance)}</p>
            </div>
            <div className="bg-red-50 text-red-600 p-3 rounded-lg">
              <Building2 className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Target Progress */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-indigo-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Year 17 Target Progress</h2>
            <p className="text-sm text-muted-foreground">Dana pendidikan anak fully funded!</p>
          </div>
          <Badge variant={isOnTrack ? "default" : "outline"} className={isOnTrack ? "bg-green-600" : "bg-orange-600"}>
            {isOnTrack ? "On Track" : "Monitoring"}
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Projected Year 17 Net Worth</span>
              <span className="text-2xl font-bold text-indigo-600">{formatCurrency(year17NetWorth)}</span>
            </div>
            <div className="w-full bg-secondary/30 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all"
                style={{ width: `${Math.min((year17NetWorth / targetMax) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-muted-foreground">Target Min: {formatCurrencyShort(targetMin)}</span>
              <span className="text-muted-foreground">Target Max: {formatCurrencyShort(targetMax)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Current Progress</p>
              <p className="text-lg font-semibold">
                {((currentNetWorth.netWorth / targetMin) * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Years Remaining</p>
              <p className="text-lg font-semibold">17 years</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Year 17 Projection</p>
              <p className="text-lg font-semibold">
                {((year17NetWorth / targetMin) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Net Worth Projection Chart */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">17-Year Net Worth Projection</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => formatCurrencyShort(value)} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => {
                  const data = projectionData.find(d => d.year === label)
                  return data ? `Year ${label} (${data.fullYear})` : label
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="netWorth" stroke="#6366f1" strokeWidth={3} name="Net Worth" />
              <Line type="monotone" dataKey="investment" stroke="#8b5cf6" strokeWidth={2} name="Investment" />
              <Line type="monotone" dataKey="liabilities" stroke="#ef4444" strokeWidth={2} name="KPR Balance" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Asset Breakdown Chart */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Asset Growth Projection</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(value) => formatCurrencyShort(value)} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => {
                  const data = projectionData.find(d => d.year === label)
                  return data ? `Year ${label} (${data.fullYear})` : label
                }}
              />
              <Legend />
              <Bar dataKey="cash" stackId="a" fill="#3b82f6" name="Cash" />
              <Bar dataKey="investment" stackId="a" fill="#8b5cf6" name="Investment" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Key Milestones */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Key Milestones</h2>
        <div className="space-y-4">
          <div className="border-l-4 border-green-500 pl-4">
            <p className="font-semibold">Year 6 ({projectionData[6]?.fullYear})</p>
            <p className="text-sm text-muted-foreground">KPR Fully Paid Off</p>
            <p className="text-lg font-bold text-green-600">
              Net Worth: {formatCurrency(projectionData[6]?.netWorth || 0)}
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <p className="font-semibold">Year 10 ({projectionData[10]?.fullYear})</p>
            <p className="text-sm text-muted-foreground">Halfway Point</p>
            <p className="text-lg font-bold text-blue-600">
              Net Worth: {formatCurrency(projectionData[10]?.netWorth || 0)}
            </p>
          </div>

          <div className="border-l-4 border-purple-500 pl-4">
            <p className="font-semibold">Year 17 ({projectionData[17]?.fullYear})</p>
            <p className="text-sm text-muted-foreground">Target: Dana Pendidikan Anak</p>
            <p className="text-lg font-bold text-purple-600">
              Net Worth: {formatCurrency(projectionData[17]?.netWorth || 0)}
            </p>
          </div>
        </div>
      </Card>

      {/* Assumptions */}
      <Card className="p-6 bg-yellow-50 border-yellow-200">
        <h3 className="font-bold text-yellow-900 mb-2">📊 Projection Assumptions</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Investment return: 10% CAGR (conservative)</li>
          <li>• Annual investment: Rp 112 juta (Year 1-6)</li>
          <li>• KPR bombing: Rp 500 juta/year with 4% penalty (Year 1-6)</li>
          <li>• Post-KPR: All cash flow redirected to investment (Year 7+)</li>
          <li>• KPR fully paid off by Year 6</li>
          <li>• No major lifestyle inflation assumed</li>
        </ul>
      </Card>
    </div>
  )
}
