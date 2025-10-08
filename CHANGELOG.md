# Changelog

All notable changes to this project will be documented in this file.

## [2.3.0] - 2025-01-05

### 📝 Budget Templates & ⚡ Financial Health Score

#### Budget Templates
- **Pre-built Templates** - Quick budget setup with proven strategies
  - 50/30/20 Rule (Needs, Wants, Savings)
  - Zero-Based Budget (Every dollar has a job)
- **Smart Application** - Enter monthly income to auto-calculate budget amounts
- **Category Breakdown** - Visual preview of allocations with percentages
- **One-Click Apply** - Instantly create budgets for any month
- **System Templates** - Professional templates available to all users
- **Custom Templates** - Create and save your own budget strategies (coming soon)

#### Financial Health Score
- **Overall Score (0-100)** - Comprehensive financial wellness rating
- **Component Scores**:
  - 💰 Savings Rate (25% weight) - Target: 20%+ of income
  - 💳 Debt Management (25% weight) - Target: <20% of annual income
  - 🛡️ Emergency Fund (30% weight) - Target: 6+ months expenses
  - 🎯 Budget Adherence (10% weight) - Stay within limits
  - 📈 Net Worth Growth (10% weight) - Positive trend
- **Smart Recommendations** - AI-generated improvement suggestions
  - "Increase your savings rate to at least 20%"
  - "Build emergency fund to 6 months expenses"
  - "High debt level - prioritize debt reduction"
- **Monthly Tracking** - Score history saved to database
- **Visual Dashboard** - Color-coded gauges and progress bars
- **Real-time Calculation** - Based on actual transactions and accounts

#### Scoring Algorithm
- Savings Rate: (Income - Expenses) / Income
  - 30%+ = 100pts, 20-30% = 75pts, 10-20% = 50pts, <10% = 20pts
- Debt Ratio: Total Debt / Annual Income
  - <10% = 100pts, 10-20% = 80pts, 20-30% = 60pts, 40%+ = 20pts
- Emergency Fund: Cash / Monthly Expenses
  - 6+ months = 100pts, 3-6 = 70pts, 1-3 = 40pts, <1 = 20pts

#### Use Cases
- **New Users** - Start with proven 50/30/20 template
- **Zero-Based Budgeters** - Allocate every dollar methodically
- **Financial Health Check** - See overall wellness score monthly
- **Improvement Tracking** - Monitor progress over time
- **Smart Recommendations** - Know exactly what to improve

#### Technical Details
- Tables: `budget_templates`, `budget_template_items`, `financial_health_scores`
- Function: `calculate_financial_health_score(user_id, month)` returns scores + recommendations
- Function: `apply_budget_template(template_id, month, income)` creates budgets
- Page: `/dashboard/budget-templates`
- Component: `FinancialHealthScore.tsx` on dashboard
- RLS: Users can only see/apply their own templates and scores

**Migration**: `migrations/ADD_BUDGET_TEMPLATES_AND_HEALTH_SCORE.sql`

## [2.1.2] - 2025-01-05

### 📊 Account Balance History Log

#### Balance History Tracking
- **Auto-logging** - All balance changes automatically recorded
- **Smart Reason Detection** - Automatically captures category + description from transactions
  - Income: `💰 Salary: Gaji Bulanan`
  - Expense: `💸 Debt Payment: Bayar Cicilan AC`
  - Manual: `✏️ Manual balance adjustment`
- **Database Trigger** - Triggers on every balance update
- **History Table** - Stores old balance, new balance, change amount
- **Change Types**: increase, decrease, manual_adjustment

#### Dedicated Balance History Page
- **New Menu Item** - "Balance History" under Assets & Liabilities
- **Full-page View** - Dedicated page at `/dashboard/balance-history`
- **Statistics Cards**:
  - Total Changes count
  - Total Increases amount
  - Total Decreases amount
- **Advanced Filters**:
  - Filter by Account (all accounts dropdown)
  - Filter by Change Type (increase/decrease/manual)
  - Filter by Date Range (from/to date pickers)
  - Sort Order (newest/oldest first)
  - Clear All Filters button
- **Detailed Table View**:
  - Account name with bank
  - Account type badge
  - Category + Description from transaction
  - Full timestamp (date + time)
  - Previous and new balance
  - Change amount with color coding
- **Export to CSV** - Download complete history log

#### Quick View (Accounts Page)
- **View History Button** - On each account card
- **Modal Interface** - Clean, scrollable popup
- **Visual Indicators**:
  - 🟢 Green up arrow for increases
  - 🔴 Red down arrow for decreases
  - 🔵 History icon for manual adjustments
- **Last 20 Changes** - Recent history per account

#### Use Cases
- **Track Debt Payments** - See all "Bayar Cicilan AC" entries with exact amounts
- **Monitor Account Activity** - View all deposits and withdrawals with reasons
- **Audit Trail** - Complete history with transaction references
- **Manual Adjustments** - Track when you manually update balance
- **Monthly Reports** - Filter by date range and export to CSV
- **Multi-Account Analysis** - See all accounts or filter by specific account

#### Technical Details
- Table: `account_balance_history`
- Trigger: `trigger_log_balance_change` (enhanced with transaction context)
- Function: `log_account_balance_change()` (detects transactions in last 5 seconds)
- Helper: `get_account_balance_history(account_id, limit)`
- Page: `/dashboard/balance-history`
- Limit: 200 recent changes (filterable)
- RLS: Users can only see their own history

**Migration**: `migrations/ADD_BALANCE_HISTORY_LOG.sql`

## [2.1.1] - 2025-01-05

### 💳 Credit Card Support

#### Credit Card Account Type
- **New Account Type**: Credit Card added to account types
- **Credit Limit Field** - Track credit limit for each card
- **Credit Utilization Tracking** - Automatic calculation of utilization percentage
- **Color-coded Badges** - Orange badge for credit card accounts

#### Dashboard Integration
- **Credit Card Debt Widget** - Real-time credit card debt monitoring
  - Individual card utilization with progress bars
  - Color-coded alerts (green <50%, orange 50-69%, red 70%+)
  - Outstanding balance and limit for each card
  - Total credit card debt summary
- **Net Worth Calculation** - Credit card debt automatically deducted from net worth
- **Credit Card Debt Stat Card** - Added to main dashboard stats grid

#### Account Management
- **Credit Limit Input** - Shown only for credit card accounts
- **Outstanding Balance** - Enter negative values for debt (e.g., -5000000)
- **Credit Limit Display** - Shows limit in account card
- **Utilization Percentage** - Calculated automatically

#### Database Changes
- Migration: `migrations/ADD_CREDIT_CARD_SUPPORT.sql`
- Added `credit_card` to account_type enum
- Added `credit_limit` column (DECIMAL 15,2)
- Updated RLS policies

#### How Credit Cards Work
- **Balance**: Negative = you owe money (e.g., -5000000 = Rp 5M debt)
- **Credit Limit**: Maximum you can borrow
- **Utilization**: Outstanding / Limit × 100%
- **Healthy Utilization**: Below 30% is recommended

**Supported Cards**: Jenius, BCA, Tokopedia CC, and any other credit cards

## [2.1.0] - 2025-01-05

### 📊 Dashboard Enhancement & Export Features

#### Enhanced Dashboard
- **Quick Action Buttons** - Add Transaction, View Budgets, Recurring (top right)
- **Monthly Overview Card** with Savings Rate calculator
  - Income, Expenses, Net Cash Flow
  - Savings Rate percentage with progress bar
  - Color-coded (green >= 20%, orange < 20%)
  - Target: 20% or more for healthy savings
- **Budget Alerts Widget** - Real-time budget monitoring
  - Shows budgets at 80% or more
  - Color-coded progress bars (orange 80-99%, red 100%+)
  - Quick link to view all alerts
  - "All budgets on track" message when no alerts
- **Better Insights at a Glance**
  - Savings rate visualization
  - At-risk budget summary
  - Improved layout with grid system

#### Export Reports 📥
- **PDF Export** - Professional formatted reports
  - Title and generation timestamp
  - Summary statistics (Income, Expense, Net Amount)
  - Formatted transaction table
  - Striped theme for readability
- **Excel Export** - Analytical reports
  - Summary sheet with metadata
  - Transaction data in formatted columns
  - Auto-sized columns
  - Ready for pivot tables and analysis
- **CSV Export** - Enhanced with toast notifications
  - Simple, lightweight format
  - Universal compatibility
  - Success notification with count

#### UX Improvements
- Export buttons with intuitive icons
- Toast notifications for all exports
- Filename with current date
- Transaction count in success message

**Technical Details**:
- Libraries: jsPDF, jspdf-autotable, xlsx
- File naming: `transactions-YYYY-MM-DD.{pdf,xlsx,csv}`
- Responsive button layout

## [2.0.1] - 2025-01-05

### 🔍 Search & Filters Enhancement

#### Advanced Search
- **Search by Description/Merchant** - Real-time search with 500ms debounce
- Case-insensitive matching across description and merchant fields
- Search icon indicator with clear placeholder text

#### Quick Filters ⚡
- **Today** - Current day transactions
- **Yesterday** - Previous day transactions
- **This Week** - Sunday to today
- **This Month** - Full current month
- **Last 30 Days** - Rolling 30-day window
- **This Year** - Full current year

#### Amount Range Filter
- Filter by minimum amount (greater than or equal)
- Filter by maximum amount (less than or equal)
- Numeric input validation

#### Enhanced UX
- **Clear All Filters** button - Reset all filters with one click
- Filter count indicator in transaction list
- Pagination resets to page 1 when filters change
- Responsive layout (stacks on mobile)

#### Performance
- Search query debouncing to reduce API calls
- Efficient query building with Supabase
- Maintains all existing filter functionality

**See**: `docs/SEARCH_AND_FILTERS.md` for complete documentation

## [2.0.0] - 2025-01-05

### 🎉 Major Features Added

#### Transaction Attachments
- Upload receipts, invoices, and images to transactions
- Support for PDF, JPG, PNG files (max 5MB)
- Files stored in Supabase Storage with RLS
- View, download, and delete attachments
- Attachment count indicator in transaction list

#### Budget Alerts & Email Notifications
- Real-time budget monitoring (80% and 100% thresholds)
- Beautiful HTML email notifications
- Notification bell with unread count badge
- Real-time updates via Supabase subscriptions
- Email notification history

#### SMTP Email Configuration
- Per-user SMTP settings in Settings page
- Test email functionality
- Support for TLS (port 587) and SSL (port 465)
- Fallback to environment variables
- Secure storage in database

#### Income Analytics
- Toggle between Income and Expense analytics
- Separate pie charts for income sources
- Income category breakdown
- Dynamic colors and labels

#### Pagination
- 20 items per page for transactions
- Smart page number display
- First/Previous/Next/Last navigation
- Item counter (X - Y of Z)

#### Loading Skeletons
- Professional loading states
- Skeleton components for cards, tables, charts
- Better UX during data fetch
- Consistent loading experience

### 🔧 Improvements

#### Database
- **FULL_SCHEMA.sql** - Complete database schema in one file
- Auto-update account balance with database triggers
- Fixed transaction delete policy
- Added SMTP columns to app_settings
- Improved RLS policies
- Better indexes for performance

#### UI/UX
- Toast notifications using Sonner
- Custom dark mode styling (#191919 background)
- Better error messages
- Improved form validation
- Responsive design improvements

#### Code Quality
- Migrated from deprecated `@supabase/auth-helpers-nextjs`
- Fixed Next.js 15 cookies compatibility
- Better error handling
- Improved TypeScript types
- Code cleanup and refactoring

### 🐛 Bug Fixes
- Fixed pagination count query
- Fixed delete transaction not working
- Fixed account balance not updating on delete
- Fixed Button import in analytics page
- Fixed unauthorized errors in API routes
- Fixed SMTP connection issues

### 📝 Documentation
- Complete README.md with setup instructions
- Database schema documentation
- Environment variables guide
- Troubleshooting section
- Usage guide with examples

## [1.0.0] - 2025-01-04

### Initial Release

#### Core Features
- Dashboard with financial overview
- Income and expense tracking
- Multi-account support with sub-accounts
- Category management
- Recurring transactions
- Budget vs Actual tracking
- Cash Flow projection
- CSV import
- Investment tracking
- KPR/Mortgage tracking
- Net Worth calculator
- Analytics and charts

#### Settings
- App customization (title, currency, date format)
- Dark/Light/System theme
- Multi-user support (Primary/Partner)

#### Security
- Supabase authentication
- Row Level Security (RLS)
- Secure file uploads

---

## Roadmap

### Version 2.1.0 ✅ COMPLETED
- [x] Search & Filter transactions
- [x] Export to Excel/PDF
- [x] Dashboard quick actions
- [x] Better widgets with insights
- [x] Budget alert summary
- [x] Savings rate calculator

### Version 2.2.0 (Planned)
- [ ] Spending trends (month-to-month comparison)
- [ ] Top categories widget
- [ ] Budget templates (50/30/20 rule)
- [ ] Goals & savings targets
- [ ] Category spending chart on dashboard

### Version 2.3.0 (Planned)
- [ ] Multi-currency with conversion
- [ ] Bill reminders
- [ ] Spending insights with AI
- [ ] Mobile app (React Native)
- [ ] Shared budgets for household

### Version 3.0.0 (Future)
- [ ] Bank API integration
- [ ] Auto-categorization with ML
- [ ] Financial advisor chatbot
- [ ] Investment recommendations
- [ ] Tax calculator

---

## Migration Guide

### Upgrading from 1.0.0 to 2.0.0

1. **Backup your database** before running migrations

2. **Run new migrations**:
   ```sql
   -- Run in Supabase SQL Editor
   -- See: migrations/ADD_ATTACHMENTS_AND_ALERTS.sql
   -- See: migrations/ADD_SMTP_SETTINGS.sql
   -- See: migrations/ADD_TRANSACTION_BALANCE_TRIGGER.sql
   -- See: migrations/FIX_TRANSACTION_DELETE_POLICY.sql
   ```

3. **Update environment variables**:
   ```env
   # Add to .env.local
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SMTP_HOST=your_smtp_host
   SMTP_PORT=587
   SMTP_USER=your_email
   SMTP_PASS=your_password
   SMTP_FROM=Budget Tracker <noreply@example.com>
   ```

4. **Setup Supabase Storage**:
   - Create bucket: `transaction-attachments` (Private)
   - Add storage policies (see FULL_SCHEMA.sql)

5. **Install new dependencies**:
   ```bash
   npm install @supabase/auth-helpers-nextjs @supabase/supabase-js nodemailer @types/nodemailer
   ```

6. **Test the application**:
   - Upload a transaction attachment
   - Send a test email from Settings
   - Create a budget and trigger an alert
   - Verify pagination works

---

**For full changelog history, see Git commits.**
