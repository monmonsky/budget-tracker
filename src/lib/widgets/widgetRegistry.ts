import { LucideIcon, Wallet, Activity, CreditCard, TrendingUp, Target, Calendar, Receipt, PieChart, Briefcase } from 'lucide-react'

export interface WidgetConfig {
  id: string
  title: string
  description: string
  icon: LucideIcon
  defaultSize: {
    w: number // width in grid columns
    h: number // height in grid rows
  }
  minSize: {
    w: number
    h: number
  }
  category: 'overview' | 'financial' | 'planning' | 'analytics'
}

export const WIDGET_REGISTRY: Record<string, WidgetConfig> = {
  'quick-stats': {
    id: 'quick-stats',
    title: 'Quick Stats',
    description: 'Balance, Income, Expense, Net Worth overview',
    icon: Wallet,
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 2, h: 2 },
    category: 'overview'
  },
  'health-score': {
    id: 'health-score',
    title: 'Financial Health Score',
    description: 'Overall financial wellness rating (0-100)',
    icon: Activity,
    defaultSize: { w: 2, h: 3 },
    minSize: { w: 2, h: 2 },
    category: 'financial'
  },
  'credit-cards': {
    id: 'credit-cards',
    title: 'Credit Card Utilization',
    description: 'Credit card usage and limits',
    icon: CreditCard,
    defaultSize: { w: 2, h: 3 },
    minSize: { w: 2, h: 2 },
    category: 'financial'
  },
  'cash-flow-chart': {
    id: 'cash-flow-chart',
    title: 'Cash Flow Projection',
    description: 'Future balance forecast chart',
    icon: TrendingUp,
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 2, h: 2 },
    category: 'analytics'
  },
  'budget-progress': {
    id: 'budget-progress',
    title: 'Budget Progress',
    description: 'Budget vs actual spending',
    icon: Target,
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    category: 'planning'
  },
  'upcoming-bills': {
    id: 'upcoming-bills',
    title: 'Upcoming Bills',
    description: 'Bills due in next 7 days',
    icon: Calendar,
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    category: 'planning'
  },
  'recent-transactions': {
    id: 'recent-transactions',
    title: 'Recent Transactions',
    description: 'Latest income and expenses',
    icon: Receipt,
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 2, h: 2 },
    category: 'overview'
  },
  'category-breakdown': {
    id: 'category-breakdown',
    title: 'Category Breakdown',
    description: 'Spending by category (pie chart)',
    icon: PieChart,
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    category: 'analytics'
  },
  'investment-summary': {
    id: 'investment-summary',
    title: 'Investment Summary',
    description: 'Portfolio value and performance',
    icon: Briefcase,
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    category: 'financial'
  }
}

export const WIDGET_CATEGORIES = {
  overview: { label: 'Overview', color: 'blue' },
  financial: { label: 'Financial', color: 'green' },
  planning: { label: 'Planning', color: 'purple' },
  analytics: { label: 'Analytics', color: 'orange' }
} as const

export function getWidgetConfig(widgetId: string): WidgetConfig | undefined {
  return WIDGET_REGISTRY[widgetId]
}

export function getAllWidgets(): WidgetConfig[] {
  return Object.values(WIDGET_REGISTRY)
}

export function getWidgetsByCategory(category: string): WidgetConfig[] {
  return Object.values(WIDGET_REGISTRY).filter(w => w.category === category)
}
