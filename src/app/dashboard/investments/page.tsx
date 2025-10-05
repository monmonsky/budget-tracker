'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, X, TrendingUp, TrendingDown, Edit2, Trash2, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { useLoading } from '@/contexts/LoadingContext'

interface Investment {
  id: string
  platform: 'bibit' | 'binance' | 'other'
  portfolio_name: string
  portfolio_type: 'goals' | 'retirement' | 'emergency' | 'crypto'
  asset_type: 'stocks' | 'mixed' | 'money_market' | 'crypto'
  currency: 'IDR' | 'USD'
  current_value: number
  current_price: number
  average_buy_price: number
  total_units: number
  initial_investment: number
  total_contribution: number
  return_percentage: number
  unrealized_pnl: number
  last_updated: string
}

export default function InvestmentsPage() {
  const { setLoading, setLoadingText } = useLoading()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [exchangeRate, setExchangeRate] = useState(16000) // Default USD to IDR rate

  // Form state
  const [formData, setFormData] = useState({
    platform: 'bibit' as 'bibit' | 'binance' | 'other',
    portfolio_name: '',
    portfolio_type: 'goals' as 'goals' | 'retirement' | 'emergency' | 'crypto',
    asset_type: 'mixed' as 'stocks' | 'mixed' | 'money_market' | 'crypto',
    currency: 'IDR' as 'IDR' | 'USD',
    current_price: '',
    average_buy_price: '',
    total_units: '',
    current_value: '',
    initial_investment: '',
    total_contribution: '',
  })

  // Update currency based on asset_type
  useEffect(() => {
    if (formData.asset_type === 'crypto') {
      setFormData(prev => ({ ...prev, currency: 'USD' }))
    } else {
      setFormData(prev => ({ ...prev, currency: 'IDR' }))
    }
  }, [formData.asset_type])

  useEffect(() => {
    fetchInvestments()
  }, [])

  const fetchInvestments = async () => {
    setLoadingText('Loading investments...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('investments')
        .select('*')
        .order('platform')

      setInvestments(data || [])
    } catch (error) {
      console.error('Error fetching investments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const currentPrice = parseFloat(formData.current_price) || 0
      const avgBuyPrice = parseFloat(formData.average_buy_price) || 0
      const totalUnits = parseFloat(formData.total_units) || 0
      const totalContribution = parseFloat(formData.total_contribution)

      // Calculate current value
      const currentValue = totalUnits > 0 ? currentPrice * totalUnits : parseFloat(formData.current_value || '0')

      // Calculate P&L
      const unrealizedPnL = totalUnits > 0 ? (currentPrice - avgBuyPrice) * totalUnits : currentValue - totalContribution
      const returnPercentage = totalContribution > 0 ? (unrealizedPnL / totalContribution) * 100 : 0

      const investmentData = {
        platform: formData.platform,
        portfolio_name: formData.portfolio_name,
        portfolio_type: formData.portfolio_type,
        asset_type: formData.asset_type,
        currency: formData.currency,
        current_price: currentPrice,
        average_buy_price: avgBuyPrice,
        total_units: totalUnits,
        current_value: currentValue,
        initial_investment: parseFloat(formData.initial_investment) || 0,
        total_contribution: totalContribution,
        return_percentage: returnPercentage,
        unrealized_pnl: unrealizedPnL,
      }

      let error
      if (editingId) {
        // Update existing
        const result = await supabase
          .from('investments')
          .update(investmentData)
          .eq('id', editingId)
        error = result.error
      } else {
        // Insert new
        const result = await supabase
          .from('investments')
          .insert({ ...investmentData, user_id: user.id })
        error = result.error
      }

      if (error) throw error

      // Reset form
      setFormData({
        platform: 'bibit',
        portfolio_name: '',
        portfolio_type: 'goals',
        asset_type: 'mixed',
        currency: 'IDR',
        current_price: '',
        average_buy_price: '',
        total_units: '',
        current_value: '',
        initial_investment: '',
        total_contribution: '',
      })
      setShowForm(false)
      setEditingId(null)

      // Refresh data
      fetchInvestments()
    } catch (error) {
      console.error('Error saving investment:', error)
      alert('Failed to save investment')
    }
  }

  const handleEdit = (investment: Investment) => {
    setEditingId(investment.id)
    setFormData({
      platform: investment.platform,
      portfolio_name: investment.portfolio_name,
      portfolio_type: investment.portfolio_type,
      asset_type: investment.asset_type,
      currency: investment.currency || 'IDR',
      current_price: (investment.current_price ?? 0).toString(),
      average_buy_price: (investment.average_buy_price ?? 0).toString(),
      total_units: (investment.total_units ?? 0).toString(),
      current_value: (investment.current_value ?? 0).toString(),
      initial_investment: (investment.initial_investment ?? 0).toString(),
      total_contribution: (investment.total_contribution ?? 0).toString(),
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this investment?')) return

    try {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', id)

      if (error) throw error

      fetchInvestments()
    } catch (error) {
      console.error('Error deleting investment:', error)
      alert('Failed to delete investment')
    }
  }

  const handleRecalculateAll = async () => {
    if (!confirm('Recalculate all investment values? This will update current_value and P&L for all investments.')) return

    setLoadingText('Recalculating all investments...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch all investments
      const { data: allInvestments, error: fetchError } = await supabase
        .from('investments')
        .select('*')

      if (fetchError) throw fetchError

      let successCount = 0
      let errorCount = 0

      // Recalculate each investment
      for (const inv of allInvestments || []) {
        try {
          const currentPrice = inv.current_price || 0
          const avgBuyPrice = inv.average_buy_price || 0
          const totalUnits = inv.total_units || 0
          const totalContribution = inv.total_contribution || 0

          // Recalculate current value
          const currentValue = totalUnits > 0 ? currentPrice * totalUnits : inv.current_value

          // Recalculate P&L
          const unrealizedPnL = totalUnits > 0
            ? (currentPrice - avgBuyPrice) * totalUnits
            : currentValue - totalContribution
          const returnPercentage = totalContribution > 0 ? (unrealizedPnL / totalContribution) * 100 : 0

          // Update investment
          const { error: updateError } = await supabase
            .from('investments')
            .update({
              current_value: currentValue,
              unrealized_pnl: unrealizedPnL,
              return_percentage: returnPercentage,
            })
            .eq('id', inv.id)

          if (updateError) {
            console.error(`Error updating ${inv.portfolio_name}:`, updateError)
            errorCount++
          } else {
            successCount++
          }
        } catch (err) {
          console.error(`Error processing ${inv.portfolio_name}:`, err)
          errorCount++
        }
      }

      alert(`Recalculation complete!\n✅ Success: ${successCount}\n❌ Errors: ${errorCount}`)
      fetchInvestments()
    } catch (error) {
      console.error('Error recalculating investments:', error)
      alert('Failed to recalculate investments')
    } finally {
      setLoading(false)
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

  const formatNumber = (num: number, decimals: number = 6) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(num)
  }

  const convertToIDR = (amount: number, currency: 'IDR' | 'USD') => {
    if (currency === 'USD') {
      return amount * exchangeRate
    }
    return amount
  }

  const formatWithIDREquivalent = (amount: number, currency: 'IDR' | 'USD') => {
    const formatted = formatCurrency(amount, currency)
    if (currency === 'USD') {
      const idrValue = convertToIDR(amount, currency)
      return `${formatted} (≈ ${formatCurrency(idrValue, 'IDR')})`
    }
    return formatted
  }

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      'bibit': 'bg-green-100 text-green-800',
      'binance': 'bg-yellow-100 text-yellow-800',
      'other': 'bg-gray-100 text-gray-800',
    }
    return colors[platform] || 'bg-gray-100 text-gray-800'
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'goals': 'bg-blue-100 text-blue-800',
      'retirement': 'bg-purple-100 text-purple-800',
      'emergency': 'bg-red-100 text-red-800',
      'crypto': 'bg-orange-100 text-orange-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  // Calculate total in IDR (convert USD to IDR)
  const totalValue = investments.reduce((sum, inv) => {
    const valueInIDR = convertToIDR(inv.current_value, inv.currency)
    return sum + valueInIDR
  }, 0)

  const totalContribution = investments.reduce((sum, inv) => {
    const contributionInIDR = convertToIDR(inv.total_contribution, inv.currency)
    return sum + contributionInIDR
  }, 0)

  const totalReturn = totalValue - totalContribution
  const totalReturnPercentage = totalContribution > 0 ? (totalReturn / totalContribution) * 100 : 0

  // Group by platform
  const bibitInvestments = investments.filter(inv => inv.platform === 'bibit')
  const binanceInvestments = investments.filter(inv => inv.platform === 'binance')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Investment Portfolio</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your investments across platforms</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border dark:border-gray-700">
            <Label htmlFor="exchange-rate" className="text-sm whitespace-nowrap">USD Rate:</Label>
            <Input
              id="exchange-rate"
              type="number"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 16000)}
              className="w-24 h-8"
              step="100"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleRecalculateAll}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Recalculate All
          </Button>
          <Button onClick={() => {
            setShowForm(!showForm)
            setEditingId(null)
            setFormData({
              platform: 'bibit',
              portfolio_name: '',
              portfolio_type: 'goals',
              asset_type: 'mixed',
              currency: 'IDR',
              current_price: '',
              average_buy_price: '',
              total_units: '',
              current_value: '',
              initial_investment: '',
              total_contribution: '',
            })
          }}>
            {showForm ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Investment
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <p className="text-sm text-gray-600">Total Portfolio Value</p>
          <p className="text-3xl font-bold text-purple-600">{formatCurrency(totalValue)}</p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-gray-600">Total Contribution</p>
          <p className="text-2xl font-semibold">{formatCurrency(totalContribution)}</p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-gray-600">Total Return</p>
          <div className="flex items-center gap-2">
            <p className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalReturn)}
            </p>
            {totalReturn >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
          </div>
          <p className={`text-sm ${totalReturnPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalReturnPercentage >= 0 ? '+' : ''}{totalReturnPercentage.toFixed(2)}%
          </p>
        </Card>
      </div>

      {/* Add Investment Form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Investment' : 'Add New Investment'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(value: 'bibit' | 'binance' | 'other') => setFormData({ ...formData, platform: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bibit">Bibit</SelectItem>
                    <SelectItem value="binance">Binance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="portfolio_name">Portfolio Name</Label>
                <Input
                  id="portfolio_name"
                  type="text"
                  placeholder="e.g., Tabungan Anak, BTC/USDT"
                  value={formData.portfolio_name}
                  onChange={(e) => setFormData({ ...formData, portfolio_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="portfolio_type">Portfolio Type</Label>
                <Select
                  value={formData.portfolio_type}
                  onValueChange={(value: 'goals' | 'retirement' | 'emergency' | 'crypto') => setFormData({ ...formData, portfolio_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="goals">Goals</SelectItem>
                    <SelectItem value="retirement">Retirement</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="asset_type">Asset Type</Label>
                <Select
                  value={formData.asset_type}
                  onValueChange={(value: 'stocks' | 'mixed' | 'money_market' | 'crypto') => setFormData({ ...formData, asset_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stocks">Stocks</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                    <SelectItem value="money_market">Money Market</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Show crypto-specific fields */}
              {formData.asset_type === 'crypto' && (
                <>
                  <div className="space-y-2 md:col-span-2">
                    <Badge className="mb-2 bg-blue-100 text-blue-800">Currency: {formData.currency}</Badge>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="current_price">Current Price ({formData.currency})</Label>
                    <Input
                      id="current_price"
                      type="number"
                      step="0.01"
                      placeholder="Harga sekarang per koin"
                      value={formData.current_price}
                      onChange={(e) => setFormData({ ...formData, current_price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="average_buy_price">Average Buy Price ({formData.currency})</Label>
                    <Input
                      id="average_buy_price"
                      type="number"
                      step="0.01"
                      placeholder="Harga beli rata-rata"
                      value={formData.average_buy_price}
                      onChange={(e) => setFormData({ ...formData, average_buy_price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="total_units">Total Units/Coins</Label>
                    <Input
                      id="total_units"
                      type="number"
                      step="0.000001"
                      placeholder="Jumlah koin yang dimiliki"
                      value={formData.total_units}
                      onChange={(e) => setFormData({ ...formData, total_units: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="total_contribution">Total Investment ({formData.currency})</Label>
                    <Input
                      id="total_contribution"
                      type="number"
                      step="0.01"
                      placeholder="Total modal yang sudah diinvestasikan"
                      value={formData.total_contribution}
                      onChange={(e) => setFormData({ ...formData, total_contribution: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}

              {/* Show fields for Stocks/Bibit */}
              {formData.asset_type !== 'crypto' && (
                <>
                  <div className="space-y-2 md:col-span-2">
                    <Badge className="mb-2 bg-green-100 text-green-800">Currency: {formData.currency}</Badge>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="current_price">NAV/Price Sekarang (Rp)</Label>
                    <Input
                      id="current_price"
                      type="number"
                      step="0.01"
                      placeholder="Harga per unit sekarang"
                      value={formData.current_price}
                      onChange={(e) => setFormData({ ...formData, current_price: e.target.value })}
                      required
                    />
                    <p className="text-xs text-gray-500">NAV/harga saham per unit saat ini</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="average_buy_price">Harga Beli Rata-rata (Rp)</Label>
                    <Input
                      id="average_buy_price"
                      type="number"
                      step="0.01"
                      placeholder="Harga beli rata-rata"
                      value={formData.average_buy_price}
                      onChange={(e) => setFormData({ ...formData, average_buy_price: e.target.value })}
                      required
                    />
                    <p className="text-xs text-gray-500">Average cost per unit</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="total_units">Total Unit</Label>
                    <Input
                      id="total_units"
                      type="number"
                      step="0.0001"
                      placeholder="Jumlah unit yang dimiliki"
                      value={formData.total_units}
                      onChange={(e) => setFormData({ ...formData, total_units: e.target.value })}
                      required
                    />
                    <p className="text-xs text-gray-500">Total unit reksadana/saham</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="total_contribution">Total Modal (Rp)</Label>
                    <Input
                      id="total_contribution"
                      type="number"
                      step="0.01"
                      placeholder="Total uang yang diinvestasikan"
                      value={formData.total_contribution}
                      onChange={(e) => setFormData({ ...formData, total_contribution: e.target.value })}
                      required
                    />
                    <p className="text-xs text-gray-500">Total setoran dari pertama sampai sekarang</p>
                  </div>
                </>
              )}
            </div>

            <Button type="submit" className="w-full">
              {editingId ? 'Update Investment' : 'Add Investment'}
            </Button>
          </form>
        </Card>
      )}

      {/* Bibit Investments */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Bibit Portfolios</h2>
          <Badge className={getPlatformColor('bibit')}>Bibit</Badge>
        </div>

        {bibitInvestments.length === 0 ? (
          <p className="text-gray-500">No Bibit investments yet</p>
        ) : (
          <div className="space-y-4">
            {bibitInvestments.map((inv) => (
              <div key={inv.id} className="border dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg dark:text-white">{inv.portfolio_name}</h3>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className={getTypeColor(inv.portfolio_type)}>
                        {inv.portfolio_type}
                      </Badge>
                      <Badge variant="outline">{inv.asset_type}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="mb-1" variant="outline">{inv.currency}</Badge>
                    <p className="text-2xl font-bold dark:text-white">{formatCurrency(inv.current_value, inv.currency)}</p>
                    {inv.currency === 'USD' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        ≈ {formatCurrency(convertToIDR(inv.current_value, inv.currency), 'IDR')}
                      </p>
                    )}
                    <p className={`text-sm ${inv.return_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {inv.return_percentage >= 0 ? '+' : ''}{inv.return_percentage.toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Crypto-specific details */}
                {inv.asset_type === 'crypto' && inv.total_units > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Units</p>
                        <p className="font-semibold">{formatNumber(inv.total_units, 8)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Avg Buy</p>
                        <p className="font-semibold">{formatCurrency(inv.average_buy_price, inv.currency)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Current</p>
                        <p className="font-semibold">{formatCurrency(inv.current_price, inv.currency)}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t dark:border-gray-700 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Total Contribution</p>
                    <p className="font-semibold">{formatCurrency(inv.total_contribution, inv.currency)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Unrealized P&L</p>
                    <p className={`font-semibold text-lg ${inv.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {inv.unrealized_pnl >= 0 ? '+' : ''}{formatCurrency(inv.unrealized_pnl, inv.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">ROI</p>
                    <p className={`font-semibold ${inv.return_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {inv.return_percentage >= 0 ? '+' : ''}{inv.return_percentage.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Last Updated</p>
                    <p className="font-semibold">{format(new Date(inv.last_updated), 'dd MMM yyyy')}</p>
                  </div>
                </div>

                {/* Edit/Delete Actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t dark:border-gray-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(inv)}
                    className="flex-1"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(inv.id)}
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Binance Investments */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Binance Crypto</h2>
          <Badge className={getPlatformColor('binance')}>Binance</Badge>
        </div>

        {binanceInvestments.length === 0 ? (
          <p className="text-gray-500">No Binance investments yet</p>
        ) : (
          <div className="space-y-4">
            {binanceInvestments.map((inv) => (
              <div key={inv.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{inv.portfolio_name}</h3>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className={getTypeColor(inv.portfolio_type)}>
                        {inv.portfolio_type}
                      </Badge>
                      <Badge variant="outline">{inv.asset_type}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="mb-1" variant="outline">{inv.currency}</Badge>
                    <p className="text-2xl font-bold">{formatCurrency(inv.current_value, inv.currency)}</p>
                    <p className={`text-sm ${inv.return_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {inv.return_percentage >= 0 ? '+' : ''}{inv.return_percentage.toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Crypto-specific details */}
                {inv.asset_type === 'crypto' && inv.total_units > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Units</p>
                        <p className="font-semibold">{formatNumber(inv.total_units, 8)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Avg Buy</p>
                        <p className="font-semibold">{formatCurrency(inv.average_buy_price, inv.currency)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Current</p>
                        <p className="font-semibold">{formatCurrency(inv.current_price, inv.currency)}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t dark:border-gray-700 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Total Contribution</p>
                    <p className="font-semibold">{formatCurrency(inv.total_contribution, inv.currency)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Unrealized P&L</p>
                    <p className={`font-semibold text-lg ${inv.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {inv.unrealized_pnl >= 0 ? '+' : ''}{formatCurrency(inv.unrealized_pnl, inv.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">ROI</p>
                    <p className={`font-semibold ${inv.return_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {inv.return_percentage >= 0 ? '+' : ''}{inv.return_percentage.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Last Updated</p>
                    <p className="font-semibold">{format(new Date(inv.last_updated), 'dd MMM yyyy')}</p>
                  </div>
                </div>

                {/* Edit/Delete Actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t dark:border-gray-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(inv)}
                    className="flex-1"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(inv.id)}
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
