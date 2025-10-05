'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Building2, Target, TrendingDown, Calendar, Plus, X, Edit2, Check, Table as TableIcon } from 'lucide-react'
import { format, differenceInMonths, differenceInDays, addMonths } from 'date-fns'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLoading } from '@/contexts/LoadingContext'

interface KPRData {
  id: string
  principal_amount: number
  current_balance: number
  monthly_payment: number
  interest_rate: number
  tenor_years: number
  start_date: string
  expected_payoff_date: string
  bombing_history: Array<{
    date: string
    amount: number
    balance_before: number
    balance_after: number
    penalty: number
  }>
  total_interest_saved: number
}

export default function KPRPage() {
  const { setLoading, setLoadingText } = useLoading()
  const [kpr, setKpr] = useState<KPRData | null>(null)
  const [showBombingForm, setShowBombingForm] = useState(false)
  const [bombingAmount, setBombingAmount] = useState('')
  const [showSetupForm, setShowSetupForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)

  const [setupData, setSetupData] = useState({
    principal_amount: '',
    monthly_payment: '',
    interest_rate: '',
    tenor_years: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
  })

  useEffect(() => {
    fetchKPRData()
  }, [])

  const fetchKPRData = async () => {
    setLoadingText('Loading KPR data...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('kpr_tracking')
        .select('*')
        .single()

      setKpr(data)
    } catch (error) {
      console.error('Error fetching KPR data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBombing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kpr) return

    try {
      const amount = parseFloat(bombingAmount)
      const penalty = amount * 0.04 // 4% penalty
      const netAmount = amount - penalty
      const newBalance = kpr.current_balance - netAmount

      // Calculate interest saved (simplified calculation)
      const monthsRemaining = differenceInMonths(new Date(kpr.expected_payoff_date), new Date())
      const monthlyInterestRate = kpr.interest_rate / 100 / 12
      const interestSaved = netAmount * monthlyInterestRate * monthsRemaining

      // Update bombing history
      const newBombingRecord = {
        date: new Date().toISOString(),
        amount,
        balance_before: kpr.current_balance,
        balance_after: newBalance,
        penalty,
      }

      const updatedHistory = [...(kpr.bombing_history || []), newBombingRecord]

      // Update KPR record
      const { error } = await supabase
        .from('kpr_tracking')
        .update({
          current_balance: newBalance,
          bombing_history: updatedHistory,
          total_interest_saved: kpr.total_interest_saved + interestSaved,
        })
        .eq('id', kpr.id)

      if (error) throw error

      setBombingAmount('')
      setShowBombingForm(false)
      fetchKPRData()
    } catch (error) {
      console.error('Error recording bombing:', error)
      alert('Failed to record bombing')
    }
  }

  const handleSetupKPR = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const principalAmount = parseFloat(setupData.principal_amount)
      const tenorYears = parseInt(setupData.tenor_years)
      const startDate = new Date(setupData.start_date)
      const expectedPayoffDate = addMonths(startDate, tenorYears * 12)

      const { error } = await supabase
        .from('kpr_tracking')
        .insert({
          user_id: user.id,
          principal_amount: principalAmount,
          current_balance: principalAmount,
          monthly_payment: parseFloat(setupData.monthly_payment),
          interest_rate: parseFloat(setupData.interest_rate),
          tenor_years: tenorYears,
          start_date: setupData.start_date,
          expected_payoff_date: format(expectedPayoffDate, 'yyyy-MM-dd'),
          bombing_history: [],
          total_interest_saved: 0,
        })

      if (error) throw error

      setShowSetupForm(false)
      fetchKPRData()
    } catch (error) {
      console.error('Error setting up KPR:', error)
      alert('Failed to setup KPR')
    }
  }

  const handleUpdateKPR = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kpr) return

    try {
      const tenorYears = parseInt(setupData.tenor_years)
      const startDate = new Date(setupData.start_date)
      const expectedPayoffDate = addMonths(startDate, tenorYears * 12)

      const { error } = await supabase
        .from('kpr_tracking')
        .update({
          principal_amount: parseFloat(setupData.principal_amount),
          monthly_payment: parseFloat(setupData.monthly_payment),
          interest_rate: parseFloat(setupData.interest_rate),
          tenor_years: tenorYears,
          start_date: setupData.start_date,
          expected_payoff_date: format(expectedPayoffDate, 'yyyy-MM-dd'),
        })
        .eq('id', kpr.id)

      if (error) throw error

      setShowEditForm(false)
      fetchKPRData()
    } catch (error) {
      console.error('Error updating KPR:', error)
      alert('Failed to update KPR')
    }
  }

  const generatePaymentSchedule = () => {
    if (!kpr) return []

    const schedule = []
    const monthlyRate = kpr.interest_rate / 100 / 12
    let balance = kpr.current_balance
    const monthlyPayment = kpr.monthly_payment

    for (let month = 1; month <= 12 && balance > 0; month++) {
      const interestPayment = balance * monthlyRate
      const principalPayment = monthlyPayment - interestPayment
      balance = Math.max(0, balance - principalPayment)

      schedule.push({
        month,
        date: addMonths(new Date(), month - 1),
        payment: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance,
      })
    }

    return schedule
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (!kpr) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">KPR Tracker</h1>
            <p className="text-gray-600">Set up your KPR tracking to monitor payments and bombing strategy</p>
          </div>
          <Button onClick={() => setShowSetupForm(!showSetupForm)}>
            {showSetupForm ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Setup KPR
              </>
            )}
          </Button>
        </div>

        {showSetupForm && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Setup KPR Tracking</h2>
            <form onSubmit={handleSetupKPR} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="principal">Principal Amount (Rp)</Label>
                  <Input
                    id="principal"
                    type="number"
                    placeholder="3000000000"
                    value={setupData.principal_amount}
                    onChange={(e) => setSetupData({ ...setupData, principal_amount: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly_payment">Monthly Payment (Rp)</Label>
                  <Input
                    id="monthly_payment"
                    type="number"
                    placeholder="30000000"
                    value={setupData.monthly_payment}
                    onChange={(e) => setSetupData({ ...setupData, monthly_payment: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interest_rate">Interest Rate (%)</Label>
                  <Input
                    id="interest_rate"
                    type="number"
                    step="0.01"
                    placeholder="4.99"
                    value={setupData.interest_rate}
                    onChange={(e) => setSetupData({ ...setupData, interest_rate: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenor">Tenor (Years)</Label>
                  <Input
                    id="tenor"
                    type="number"
                    placeholder="17"
                    value={setupData.tenor_years}
                    onChange={(e) => setSetupData({ ...setupData, tenor_years: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={setupData.start_date}
                    onChange={(e) => setSetupData({ ...setupData, start_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">
                Create KPR Tracking
              </Button>
            </form>
          </Card>
        )}

        {!showSetupForm && (
          <Card className="p-12 text-center">
            <Building2 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No KPR Data Yet</h3>
            <p className="text-gray-600 mb-4">Click "Setup KPR" to start tracking your mortgage payments</p>
          </Card>
        )}
      </div>
    )
  }

  const progressPercentage = ((kpr.principal_amount - kpr.current_balance) / kpr.principal_amount) * 100
  const daysUntilPayoff = differenceInDays(new Date(kpr.expected_payoff_date), new Date())
  const monthsUntilPayoff = Math.ceil(daysUntilPayoff / 30)

  const paymentSchedule = generatePaymentSchedule()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">KPR Bombing Tracker</h1>
          <p className="text-gray-600">Track your KPR payment progress and bombing strategy</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSchedule(!showSchedule)}>
            <TableIcon className="h-4 w-4 mr-2" />
            {showSchedule ? 'Hide' : 'View'} Schedule
          </Button>
          <Button variant="outline" onClick={() => {
            setSetupData({
              principal_amount: kpr.principal_amount.toString(),
              monthly_payment: kpr.monthly_payment.toString(),
              interest_rate: kpr.interest_rate.toString(),
              tenor_years: kpr.tenor_years.toString(),
              start_date: kpr.start_date,
            })
            setShowEditForm(!showEditForm)
          }}>
            {showEditForm ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit KPR
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Edit Form */}
      {showEditForm && (
        <Card className="p-6 border-blue-200 bg-blue-50">
          <h2 className="text-xl font-bold mb-4">Edit KPR Data</h2>
          <form onSubmit={handleUpdateKPR} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_principal">Principal Amount (Rp)</Label>
                <Input
                  id="edit_principal"
                  type="number"
                  value={setupData.principal_amount}
                  onChange={(e) => setSetupData({ ...setupData, principal_amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_monthly">Monthly Payment (Rp)</Label>
                <Input
                  id="edit_monthly"
                  type="number"
                  value={setupData.monthly_payment}
                  onChange={(e) => setSetupData({ ...setupData, monthly_payment: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_rate">Interest Rate (%)</Label>
                <Input
                  id="edit_rate"
                  type="number"
                  step="0.01"
                  value={setupData.interest_rate}
                  onChange={(e) => setSetupData({ ...setupData, interest_rate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_tenor">Tenor (Years)</Label>
                <Input
                  id="edit_tenor"
                  type="number"
                  value={setupData.tenor_years}
                  onChange={(e) => setSetupData({ ...setupData, tenor_years: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit_start">Start Date</Label>
                <Input
                  id="edit_start"
                  type="date"
                  value={setupData.start_date}
                  onChange={(e) => setSetupData({ ...setupData, start_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full">
              <Check className="h-4 w-4 mr-2" />
              Update KPR Data
            </Button>
          </form>
        </Card>
      )}

      {/* Payment Schedule */}
      {showSchedule && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Next 12 Months Payment Schedule</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Payment</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentSchedule.map((item) => (
                  <TableRow key={item.month}>
                    <TableCell className="font-medium">#{item.month}</TableCell>
                    <TableCell>{format(item.date, 'MMM yyyy')}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.payment)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(item.principal)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(item.interest)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(item.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Total Payment (12 months)</p>
                <p className="font-semibold">{formatCurrency(paymentSchedule.reduce((sum, item) => sum + item.payment, 0))}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Principal Reduction</p>
                <p className="font-semibold text-green-600">{formatCurrency(paymentSchedule.reduce((sum, item) => sum + item.principal, 0))}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Interest Paid</p>
                <p className="font-semibold text-red-600">{formatCurrency(paymentSchedule.reduce((sum, item) => sum + item.interest, 0))}</p>
              </div>
              <div>
                <p className="text-gray-600">Balance After 12 Months</p>
                <p className="font-semibold">{formatCurrency(paymentSchedule[paymentSchedule.length - 1]?.balance || 0)}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Principal Amount</p>
              <p className="text-2xl font-bold">{formatCurrency(kpr.principal_amount)}</p>
            </div>
            <div className="bg-orange-50 text-orange-600 p-3 rounded-lg">
              <Building2 className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Current Balance</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(kpr.current_balance)}</p>
            </div>
            <div className="bg-red-50 text-red-600 p-3 rounded-lg">
              <Target className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Interest Saved</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(kpr.total_interest_saved)}</p>
            </div>
            <div className="bg-green-50 text-green-600 p-3 rounded-lg">
              <TrendingDown className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Time to Payoff</p>
              <p className="text-2xl font-bold">{monthsUntilPayoff} months</p>
              <p className="text-xs text-gray-500">{daysUntilPayoff} days</p>
            </div>
            <div className="bg-blue-50 text-blue-600 p-3 rounded-lg">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Progress Card */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Payoff Progress</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Progress to Full Payoff</span>
              <span className="font-semibold">{progressPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-orange-500 to-green-500 h-4 rounded-full transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-gray-600">Monthly Payment</p>
              <p className="text-lg font-semibold">{formatCurrency(kpr.monthly_payment)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Interest Rate</p>
              <p className="text-lg font-semibold">{kpr.interest_rate}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Start Date</p>
              <p className="text-lg font-semibold">{format(new Date(kpr.start_date), 'dd MMM yyyy')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Expected Payoff</p>
              <p className="text-lg font-semibold">{format(new Date(kpr.expected_payoff_date), 'dd MMM yyyy')}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Bombing Action */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Record KPR Bombing</h2>
            <p className="text-sm text-gray-600">Target: Rp 500 juta/year (with 4% penalty during fix rate period)</p>
          </div>
          <Button onClick={() => setShowBombingForm(!showBombingForm)}>
            {showBombingForm ? 'Cancel' : 'New Bombing'}
          </Button>
        </div>

        {showBombingForm && (
          <form onSubmit={handleBombing} className="space-y-4 mt-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="amount">Bombing Amount (Rp)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="500000000"
                value={bombingAmount}
                onChange={(e) => setBombingAmount(e.target.value)}
                required
              />
            </div>

            {bombingAmount && (
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-blue-900">Calculation Preview:</p>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Bombing Amount:</span>
                    <span className="font-semibold">{formatCurrency(parseFloat(bombingAmount))}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Penalty (4%):</span>
                    <span className="font-semibold">- {formatCurrency(parseFloat(bombingAmount) * 0.04)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="font-semibold">Net Principal Reduction:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(parseFloat(bombingAmount) * 0.96)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">New Balance:</span>
                    <span className="font-semibold">
                      {formatCurrency(kpr.current_balance - (parseFloat(bombingAmount) * 0.96))}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full">
              Record Bombing
            </Button>
          </form>
        )}
      </Card>

      {/* Bombing History */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Bombing History</h2>
        {!kpr.bombing_history || kpr.bombing_history.length === 0 ? (
          <p className="text-gray-500">No bombing records yet</p>
        ) : (
          <div className="space-y-4">
            {[...(kpr.bombing_history || [])].reverse().map((record, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{format(new Date(record.date), 'dd MMM yyyy')}</p>
                    <Badge variant="outline" className="mt-1">
                      Bombing #{kpr.bombing_history.length - index}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(record.amount)}</p>
                    <p className="text-sm text-red-600">Penalty: {formatCurrency(record.penalty)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t text-sm">
                  <div>
                    <p className="text-gray-600">Balance Before</p>
                    <p className="font-semibold">{formatCurrency(record.balance_before)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Balance After</p>
                    <p className="font-semibold text-green-600">{formatCurrency(record.balance_after)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Net Reduction</p>
                    <p className="font-semibold">{formatCurrency(record.amount - record.penalty)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Reduced</p>
                    <p className="font-semibold">{formatCurrency(record.balance_before - record.balance_after)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Strategy Info */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-bold text-blue-900 mb-2">💡 KPR Bombing Strategy (Opsi C)</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Target: Rp 500 juta per year</li>
          <li>• Penalty: 4% during fix rate period (Years 1-5)</li>
          <li>• Net benefit: Rp 800-900 juta total interest saved</li>
          <li>• Target payoff: Year 6 (fully paid off)</li>
          <li>• Must visit Danamon branch for each bombing</li>
          <li>• Reduces principal, not tenor</li>
        </ul>
      </Card>
    </div>
  )
}
