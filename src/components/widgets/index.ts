// Widget Components
export { WidgetWrapper } from './WidgetWrapper'
export { QuickStatsWidget } from './QuickStatsWidget'
export { CreditCardsWidget } from './CreditCardsWidget'
export { CashFlowChartWidget } from './CashFlowChartWidget'
export { BudgetProgressWidget } from './BudgetProgressWidget'
export { UpcomingBillsWidget } from './UpcomingBillsWidget'
export { RecentTransactionsWidget } from './RecentTransactionsWidget'
export { CategoryBreakdownWidget } from './CategoryBreakdownWidget'
export { InvestmentSummaryWidget } from './InvestmentSummaryWidget'

// Re-export existing components as widgets
import FinancialHealthScore from '../FinancialHealthScore'
import { QuickStatsWidget } from './QuickStatsWidget'
import { CreditCardsWidget } from './CreditCardsWidget'
import { CashFlowChartWidget } from './CashFlowChartWidget'
import { BudgetProgressWidget } from './BudgetProgressWidget'
import { UpcomingBillsWidget } from './UpcomingBillsWidget'
import { RecentTransactionsWidget } from './RecentTransactionsWidget'
import { CategoryBreakdownWidget } from './CategoryBreakdownWidget'
import { InvestmentSummaryWidget } from './InvestmentSummaryWidget'

// Widget component map
export const WIDGET_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'quick-stats': QuickStatsWidget as any,
  'health-score': FinancialHealthScore as any,
  'credit-cards': CreditCardsWidget as any,
  'cash-flow-chart': CashFlowChartWidget as any,
  'budget-progress': BudgetProgressWidget as any,
  'upcoming-bills': UpcomingBillsWidget as any,
  'recent-transactions': RecentTransactionsWidget as any,
  'category-breakdown': CategoryBreakdownWidget as any,
  'investment-summary': InvestmentSummaryWidget as any,
}

export function getWidgetComponent(widgetId: string) {
  return WIDGET_COMPONENTS[widgetId]
}
