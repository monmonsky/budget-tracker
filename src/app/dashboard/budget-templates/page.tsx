'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { FileText, Plus, Sparkles, Target, TrendingUp, Zap } from 'lucide-react'

interface BudgetTemplate {
  id: string
  template_name: string
  description: string
  template_type: string
  is_system_template: boolean
  user_id: string | null
}

interface BudgetTemplateItem {
  id: string
  template_id: string
  category: string
  percentage: number | null
  suggested_amount: number | null
  notes: string | null
}

export default function BudgetTemplatesPage() {
  const [templates, setTemplates] = useState<BudgetTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<BudgetTemplate | null>(null)
  const [templateItems, setTemplateItems] = useState<BudgetTemplateItem[]>([])
  const [applyMonth, setApplyMonth] = useState(new Date().toISOString().slice(0, 7))
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('budget_templates')
        .select('*')
        .order('is_system_template', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplateItems = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('budget_template_items')
        .select('*')
        .eq('template_id', templateId)
        .order('percentage', { ascending: false })

      if (error) throw error
      setTemplateItems(data || [])
    } catch (error) {
      console.error('Error fetching template items:', error)
      toast.error('Failed to load template details')
    }
  }

  const handleViewTemplate = (template: BudgetTemplate) => {
    setSelectedTemplate(template)
    fetchTemplateItems(template.id)
  }

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !monthlyIncome) {
      toast.error('Please enter your monthly income')
      return
    }

    const income = parseFloat(monthlyIncome)
    if (isNaN(income) || income <= 0) {
      toast.error('Please enter a valid income amount')
      return
    }

    try {
      const { error } = await supabase.rpc('apply_budget_template', {
        p_template_id: selectedTemplate.id,
        p_month: applyMonth,
        p_total_income: income
      })

      if (error) throw error

      toast.success(`Budget template "${selectedTemplate.template_name}" applied successfully!`)
      setIsApplyDialogOpen(false)
      setMonthlyIncome('')
    } catch (error) {
      console.error('Error applying template:', error)
      toast.error('Failed to apply template')
    }
  }

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case '50_30_20':
        return <Target className="h-5 w-5" />
      case 'zero_based':
        return <Zap className="h-5 w-5" />
      case 'envelope':
        return <FileText className="h-5 w-5" />
      default:
        return <Sparkles className="h-5 w-5" />
    }
  }

  const getTemplateColor = (type: string) => {
    switch (type) {
      case '50_30_20':
        return 'bg-blue-50 border-blue-200 hover:border-blue-300'
      case 'zero_based':
        return 'bg-purple-50 border-purple-200 hover:border-purple-300'
      case 'envelope':
        return 'bg-green-50 border-green-200 hover:border-green-300'
      default:
        return 'bg-gray-50 border-gray-200 hover:border-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budget Templates</h1>
          <p className="text-muted-foreground mt-1">
            Quick setup your budget using proven templates
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Custom Template
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all ${getTemplateColor(template.template_type)}`}
                onClick={() => handleViewTemplate(template)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getTemplateIcon(template.template_type)}
                      <CardTitle className="text-lg">{template.template_name}</CardTitle>
                    </div>
                    {template.is_system_template && (
                      <Badge variant="secondary" className="text-xs">System</Badge>
                    )}
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedTemplate(template)
                      fetchTemplateItems(template.id)
                      setIsApplyDialogOpen(true)
                    }}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Apply Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedTemplate && templateItems.length > 0 && !isApplyDialogOpen && (
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {getTemplateIcon(selectedTemplate.template_type)}
                      {selectedTemplate.template_name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {selectedTemplate.description}
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsApplyDialogOpen(true)}>
                    Apply This Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">Category Allocations:</h3>
                  <div className="grid gap-2">
                    {templateItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.category}</p>
                          {item.notes && (
                            <p className="text-sm text-muted-foreground">{item.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          {item.percentage !== null ? (
                            <Badge variant="outline" className="text-base">
                              {item.percentage}%
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              {item.suggested_amount?.toLocaleString('id-ID')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t font-semibold">
                    <span>Total Allocation</span>
                    <span>
                      {templateItems.reduce((sum, item) => sum + (item.percentage || 0), 0)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Apply Template Dialog */}
      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Budget Template</DialogTitle>
            <DialogDescription>
              Enter your monthly income to calculate budget amounts based on{' '}
              <strong>{selectedTemplate?.template_name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="month">Budget Month</Label>
              <Input
                id="month"
                type="month"
                value={applyMonth}
                onChange={(e) => setApplyMonth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="income">Monthly Income (Rp)</Label>
              <Input
                id="income"
                type="number"
                placeholder="e.g., 10000000"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Budget amounts will be calculated as percentages of this income
              </p>
            </div>

            {monthlyIncome && templateItems.length > 0 && (
              <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-sm">Preview:</h4>
                <div className="space-y-1 text-sm">
                  {templateItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.category}</span>
                      <span className="font-medium">
                        Rp {((parseFloat(monthlyIncome) * (item.percentage || 0)) / 100).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                  {templateItems.length > 3 && (
                    <p className="text-muted-foreground italic">
                      + {templateItems.length - 3} more categories...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setIsApplyDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleApplyTemplate}>
              Apply Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
