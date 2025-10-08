# 🚀 Quick Start Guide

## Monthly Budget Tracker v2.3.0

### 📦 Prerequisites
- Node.js 18+
- Supabase account
- Git (optional)

---

## ⚡ Quick Setup (5 Minutes)

### 1. Clone & Install
```bash
git clone <your-repo>
cd monthly-budget/dashboard-app
npm install
```

### 2. Setup Supabase

#### Create Project
1. Go to https://supabase.com
2. Create new project
3. Copy URL & Anon Key

#### Run Migrations (IN ORDER!)
Open Supabase Dashboard → SQL Editor, then run:

```sql
-- Step 1: Base Schema (REQUIRED)
-- Copy & paste: migrations/FULL_SCHEMA.sql

-- Step 2: Credit Cards (v2.1.0)
-- Copy & paste: migrations/ADD_CREDIT_CARD_SUPPORT.sql

-- Step 3: Balance History (v2.1.2)
-- Copy & paste: migrations/ADD_BALANCE_HISTORY_LOG.sql

-- Step 4: Goals & Bills (v2.2.0)
-- Copy & paste: migrations/ADD_GOALS_AND_BILLS.sql

-- Step 5: Templates & Health Score (v2.3.0)
-- Copy & paste: migrations/ADD_BUDGET_TEMPLATES_AND_HEALTH_SCORE.sql
```

#### Create Storage Bucket
1. Go to Storage tab
2. Create bucket: `transaction-attachments`
3. Set to **Private**

### 3. Configure Environment

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_VERSION=2.3.0
```

### 4. Run Development Server
```bash
npm run dev
```

Open http://localhost:3000

---

## 🎯 First Steps in App

### 1. Create Account
- Sign up with email/password
- Complete profile setup

### 2. Add Bank Account
- Go to **Accounts** → Add Account
- Set initial balance

### 3. Setup Budget (Optional)
- Go to **Budget Templates**
- Apply "50/30/20 Rule" or "Zero-Based"
- Enter your monthly income

### 4. Add Transactions
- Go to **Transactions** → Add Transaction
- Start tracking your spending!

### 5. Setup Bills (Optional)
- Go to **Bill Reminders**
- Add recurring bills (electricity, internet, etc.)
- Never miss a payment!

### 6. Create Goals (Optional)
- Go to **Savings Goals**
- Set target amount & deadline
- Track progress!

---

## 🎨 Key Features Available

### ✅ v2.3.0 (Current)
- 📝 Budget Templates (50/30/20, Zero-Based)
- ⚡ Financial Health Score (0-100)
- 🔔 Bill Reminders in Notifications

### ✅ v2.2.0
- 🎯 Savings Goals
- 📅 Bill Reminders with Payment History
- 📜 Balance History Page

### ✅ v2.1.0
- 💳 Credit Card Support
- 📊 Dashboard Widgets
- 📤 Export to PDF/Excel
- 🔍 Advanced Search & Filters

### ✅ v2.0.0
- 📈 Analytics Dashboard
- 💰 Cash Flow Projections
- 📊 Investment Tracking
- 🏠 KPR/Mortgage Tracker
- 🔄 Recurring Transactions
- 🚨 Budget Alerts (Email)
- 📥 CSV Import

### ✅ v1.0.0 (Core)
- 💵 Transactions (Income/Expense)
- 🏦 Multiple Accounts
- 🗂️ Categories
- 💼 Budgets
- 📎 Receipt Attachments

---

## 📚 Documentation

- **Full README**: [README.md](README.md)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)
- **Migration Notes**: [migrations/MIGRATION_NOTES.md](migrations/MIGRATION_NOTES.md)

---

## 🆘 Troubleshooting

### Build Errors?
```bash
rm -rf .next node_modules
npm install
npm run dev
```

### Database Issues?
- Check all 5 migrations ran successfully
- Verify RLS policies are enabled
- Check Supabase logs for errors

### Can't Login?
- Check Supabase Auth is enabled
- Verify email confirmation settings
- Check browser console for errors

---

## 🎉 You're Ready!

Start tracking your finances like a pro! 🚀

**Need help?** Open an issue on GitHub or check the full documentation.
