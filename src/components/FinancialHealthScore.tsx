'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Activity, AlertCircle, TrendingUp, TrendingDown, Target, Shield, PiggyBank, CreditCard, Wallet } from 'lucide-react'
import { format } from 'date-fns'

interface HealthScore {
  total_score: number
  savings_rate_score: number
  debt_ratio_score: number
  emergency_fund_score: number
  budget_adherence_score: number
  net_worth_growth_score: number
  recommendations: Array<{
    type: string
    message: string
  }>
}

export default function FinancialHealthScore() {
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    fetchHealthScore()
  }, [])

  const fetchHealthScore = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Calculate health score for current month
      const { data, error } = await supabase.rpc('calculate_financial_health_score', {
        p_user_id: user.id,
        p_month: month
      })

      if (error) throw error

      if (data && data.length > 0) {
        setHealthScore(data[0])

        // Save to database for history tracking
        await supabase
          .from('financial_health_scores')
          .upsert({
            user_id: user.id,
            month: month,
            total_score: data[0].total_score,
            savings_rate_score: data[0].savings_rate_score,
            debt_ratio_score: data[0].debt_ratio_score,
            emergency_fund_score: data[0].emergency_fund_score,
            budget_adherence_score: data[0].budget_adherence_score,
            net_worth_growth_score: data[0].net_worth_growth_score,
            recommendations: data[0].recommendations
          }, {
            onConflict: 'user_id,month'
          })
      }
    } catch (error) {
      console.error('Error fetching health score:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { label: 'Excellent', variant: 'default' as const, color: 'bg-green-100 text-green-800 border-green-300' }
    if (score >= 60) return { label: 'Good', variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800 border-blue-300' }
    if (score >= 40) return { label: 'Fair', variant: 'secondary' as const, color: 'bg-orange-100 text-orange-800 border-orange-300' }
    return { label: 'Needs Improvement', variant: 'destructive' as const, color: 'bg-red-100 text-red-800 border-red-300' }
  }

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-600'
    if (score >= 60) return 'bg-blue-600'
    if (score >= 40) return 'bg-orange-600'
    return 'bg-red-600'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mt-2 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!healthScore) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Financial Health Score
          </CardTitle>
          <CardDescription>No data available for this month</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const badge = getScoreBadge(healthScore.total_score)

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Financial Health Score
          </CardTitle>
          <Badge className={badge.color}>{badge.label}</Badge>
        </div>
        <CardDescription>
          Overall financial wellness for {format(new Date(month), 'MMMM yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
          <p className="text-sm font-medium text-muted-foreground mb-2">Overall Score</p>
          <div className={`text-6xl font-bold ${getScoreColor(healthScore.total_score)}`}>
            {healthScore.total_score}
          </div>
          <p className="text-muted-foreground text-sm mt-1">out of 100</p>
        </div>

        {/* Component Scores */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground">Component Breakdown:</h3>

          {/* Savings Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-green-600" />
                <span className="font-medium">Savings Rate</span>
              </div>
              <span className={`font-bold ${getScoreColor(healthScore.savings_rate_score)}`}>
                {healthScore.savings_rate_score}/100
              </span>
            </div>
            <div className="relative w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(healthScore.savings_rate_score)}`}
                style={{ width: `${healthScore.savings_rate_score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Target: Save 20%+ of income</p>
          </div>

          {/* Debt Ratio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-purple-600" />
                <span className="font-medium">Debt Management</span>
              </div>
              <span className={`font-bold ${getScoreColor(healthScore.debt_ratio_score)}`}>
                {healthScore.debt_ratio_score}/100
              </span>
            </div>
            <div className="relative w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(healthScore.debt_ratio_score)}`}
                style={{ width: `${healthScore.debt_ratio_score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Target: Keep debt below 20% of annual income</p>
          </div>

          {/* Emergency Fund */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Emergency Fund</span>
              </div>
              <span className={`font-bold ${getScoreColor(healthScore.emergency_fund_score)}`}>
                {healthScore.emergency_fund_score}/100
              </span>
            </div>
            <div className="relative w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(healthScore.emergency_fund_score)}`}
                style={{ width: `${healthScore.emergency_fund_score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Target: 6 months of expenses saved</p>
          </div>

          {/* Budget Adherence */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-600" />
                <span className="font-medium">Budget Adherence</span>
              </div>
              <span className={`font-bold ${getScoreColor(healthScore.budget_adherence_score)}`}>
                {healthScore.budget_adherence_score}/100
              </span>
            </div>
            <div className="relative w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(healthScore.budget_adherence_score)}`}
                style={{ width: `${healthScore.budget_adherence_score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Stay within budget limits</p>
          </div>

          {/* Net Worth Growth */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
                <span className="font-medium">Net Worth Growth</span>
              </div>
              <span className={`font-bold ${getScoreColor(healthScore.net_worth_growth_score)}`}>
                {healthScore.net_worth_growth_score}/100
              </span>
            </div>
            <div className="relative w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(healthScore.net_worth_growth_score)}`}
                style={{ width: `${healthScore.net_worth_growth_score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Positive net worth trend</p>
          </div>
        </div>

        {/* Recommendations */}
        {healthScore.recommendations && healthScore.recommendations.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Recommendations:
            </h3>
            <div className="space-y-2">
              {healthScore.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    rec.type === 'savings'
                      ? 'bg-green-50 border-green-200'
                      : rec.type === 'debt'
                      ? 'bg-red-50 border-red-200'
                      : rec.type === 'emergency'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <p className="text-sm font-medium">{rec.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
