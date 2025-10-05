# Changelog

All notable changes to this project will be documented in this file.

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

### Version 2.1.0 (Planned)
- [ ] Search & Filter transactions
- [ ] Export to Excel/PDF
- [ ] Spending trends (month-to-month)
- [ ] Budget templates (50/30/20 rule)
- [ ] Goals & savings targets

### Version 2.2.0 (Planned)
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
