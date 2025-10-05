# 💰 Monthly Budget Tracker

A comprehensive personal finance management application built with Next.js 15, React 18, TypeScript, and Supabase.

## ✨ Features

### 📊 Core Features
- **Dashboard Overview** - Real-time financial summary with charts
- **Transactions Management** - Track income, expenses, and transfers with pagination
- **Transaction Attachments** - Upload receipts, invoices, and images (PDF, JPG, PNG)
- **Accounts Management** - Multi-account support with sub-accounts (pockets, savers, wallets)
- **Categories** - Customizable income/expense categories with icons and colors
- **Recurring Transactions** - Auto-generate monthly/weekly/yearly transactions
- **Budget Tracking** - Set budgets and track spending vs actual
- **Budget Alerts** - Email notifications when reaching 80% or 100% of budget
- **Cash Flow Projection** - Forecast future balance based on recurring transactions
- **Import CSV** - Bulk import transactions from CSV files

### 📈 Analytics & Reports
- **Category Analytics** - Pie charts and trends for income/expense by category
- **Budget vs Actual** - Visual comparison with progress bars
- **Income Analytics** - Toggle between income and expense analytics
- **Net Worth Tracking** - Track total assets and liabilities
- **Monthly Breakdown** - Detailed month-by-month analysis

### 💼 Investment & Debt Tracking
- **Investment Portfolios** - Track stocks, crypto, mutual funds (Bibit, Binance)
- **KPR/Mortgage Tracker** - Payment schedules with principal/interest breakdown
- **Multi-currency Support** - IDR, USD, EUR, SGD, MYR

### ⚙️ Settings & Customization
- **App Settings** - Customize app title, currency, date format, fiscal year
- **SMTP Configuration** - Configure email notifications per user
- **Theme Support** - Light, Dark, and System auto theme
- **Multi-user Support** - Primary and partner roles (household accounts)

### 🔔 Notifications
- **Real-time Notifications** - Budget alerts with notification bell
- **Email Alerts** - Beautiful HTML email notifications for budget thresholds
- **Toast Messages** - User-friendly feedback for all actions

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router) with Turbopack
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Email**: Nodemailer with SMTP
- **Charts**: Recharts
- **Date Handling**: date-fns
- **Forms**: React Hook Form (optional)
- **State Management**: React Context API

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd monthly-budget/dashboard-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Supabase

#### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy your project URL and anon key

#### Run Database Schema
1. Open Supabase Dashboard → SQL Editor
2. Copy content from `migrations/FULL_SCHEMA.sql`
3. Execute the SQL script
4. Verify all tables were created successfully

#### Setup Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Create new bucket named `transaction-attachments`
3. Set it to **Private** (not public)
4. Go to Policies tab and run the storage policies from `migrations/FULL_SCHEMA.sql` (commented section at bottom)

### 4. Environment Variables

Create `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App Configuration
NEXT_PUBLIC_APP_NAME=Monthly Budget Tracker
NEXT_PUBLIC_APP_VERSION=2.0.0
NEXT_PUBLIC_APP_URL=http://localhost:3000

# SMTP Email Configuration (Optional - can be configured in Settings page)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
SMTP_FROM=Budget Tracker <noreply@example.com>
```

**Getting Supabase Keys:**
- **URL & Anon Key**: Dashboard → Settings → API → Project URL and `anon` `public` key
- **Service Role Key**: Dashboard → Settings → API → `service_role` `secret` key (⚠️ Keep this secret!)

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

Compatible with any platform that supports Next.js:
- Netlify
- Railway
- Render
- AWS Amplify

## 📖 Usage Guide

### First Time Setup

1. **Create Account**
   - Sign up with email/password
   - Complete profile setup (name, role)

2. **Configure Settings**
   - Go to Settings → Customize app title, currency, etc.
   - (Optional) Configure SMTP for email notifications

3. **Add Accounts**
   - Create your bank accounts/wallets
   - Set initial balances

4. **Setup Categories**
   - Default categories are provided
   - Customize or add your own

5. **Start Tracking**
   - Add your first transaction
   - Set up budgets
   - Create recurring transactions (salary, bills)

### Daily Usage

**Adding Transaction:**
1. Go to Transactions page
2. Click "Add Transaction"
3. Fill in details (amount, category, date)
4. (Optional) Upload receipt/invoice
5. Save

**Checking Budget:**
1. Go to Budget page
2. View spending vs budget
3. Check alerts for overspending
4. Adjust budgets as needed

**Viewing Analytics:**
1. Go to Analytics page
2. Toggle between Income/Expense
3. View category breakdown
4. Analyze spending trends

### Email Notifications

**Setup SMTP:**
1. Go to Settings → Email Configuration
2. Enter your SMTP details:
   - Host: `smtp.gmail.com` (for Gmail)
   - Port: `587` (TLS) or `465` (SSL)
   - Username: Your email
   - Password: App-specific password (recommended)
3. Click "Send Test Email" to verify
4. Save settings

**Enable Budget Alerts:**
1. Create a budget
2. Budget alerts are auto-enabled at 80% and 100%
3. You'll receive email when thresholds are reached

## 📁 Project Structure

```
dashboard-app/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── dashboard/           # Dashboard pages
│   │   │   ├── page.tsx        # Main dashboard
│   │   │   ├── transactions/   # Transactions CRUD
│   │   │   ├── budget/         # Budget tracking
│   │   │   ├── analytics/      # Analytics & charts
│   │   │   ├── accounts/       # Accounts management
│   │   │   ├── categories/     # Categories setup
│   │   │   ├── recurring/      # Recurring transactions
│   │   │   ├── import/         # CSV import
│   │   │   ├── cashflow/       # Cash flow projection
│   │   │   ├── settings/       # App settings
│   │   │   └── ...
│   │   ├── api/                # API routes
│   │   │   ├── test-email/     # Test email endpoint
│   │   │   └── send-budget-alert/  # Budget alert email
│   │   ├── login/              # Authentication
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing page
│   ├── components/             # React components
│   │   ├── ui/                # Shadcn UI components
│   │   ├── skeletons/         # Loading skeletons
│   │   ├── toast-provider.tsx # Toast notifications
│   │   └── ...
│   ├── contexts/              # React contexts
│   │   └── LoadingContext.tsx # Global loading state
│   ├── lib/                   # Utilities
│   │   ├── supabase/         # Supabase client
│   │   ├── email.ts          # Email service
│   │   └── utils.ts          # Helper functions
│   └── types/                # TypeScript types
├── public/                  # Static assets
├── .env.local              # Environment variables (create this)
├── migrations/               # Database migrations
│   └── FULL_SCHEMA.sql         # Complete database schema
├── package.json
├── tsconfig.json
└── README.md
```

## 🔒 Security

- **Row Level Security (RLS)** - All database tables have RLS policies
- **Authentication** - Supabase Auth with JWT tokens
- **SMTP Credentials** - Stored securely in database (encrypted recommended)
- **Service Role Key** - Never expose in client-side code
- **File Upload** - Size limits and type validation
- **XSS Protection** - React automatically escapes content

## 🐛 Troubleshooting

### Common Issues

**"Unauthorized" error when testing email:**
- Make sure you're logged in
- Check if SMTP credentials are correct
- Verify SMTP port (587 for TLS, 465 for SSL)

**Transactions not showing:**
- Check if you selected correct date range
- Verify RLS policies are set up correctly
- Check browser console for errors

**Budget alerts not sending:**
- Verify SMTP is configured (Settings → Email Configuration)
- Check if budget alert is enabled
- Ensure you have `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

**Import CSV failed:**
- Check CSV format matches template
- Verify all required columns exist
- Check for invalid data (negative amounts, wrong dates)

### Getting Help

1. Check browser console for errors (F12)
2. Check terminal/server logs
3. Verify Supabase Dashboard for database errors
4. Review RLS policies in Supabase

## 📝 Database Schema

The complete database schema includes:

**Tables:**
- `profiles` - User profiles
- `app_settings` - Per-user app settings (including SMTP)
- `accounts` - Bank accounts with sub-accounts
- `categories` - Income/expense categories
- `transactions` - All financial transactions
- `transaction_attachments` - File attachments for transactions
- `recurring_transactions` - Templates for recurring transactions
- `budgets` - Budget limits per category
- `budget_alerts` - Alert configurations
- `alert_notifications` - Notification log
- `investments` - Investment portfolios
- `kpr` - Mortgage/KPR tracking
- `kpr_payments` - Payment schedules

**Key Features:**
- Auto-update account balance on transaction changes (triggers)
- Row Level Security on all tables
- Indexes for performance
- Foreign key constraints
- Default categories (Income & Expense)

See `migrations/FULL_SCHEMA.sql` for complete schema.

## 🎨 Customization

### Adding New Category

```sql
INSERT INTO categories (name, type, icon, color)
VALUES ('Subscription', 'expense', '📱', '#f59e0b');
```

### Changing Theme Colors

Edit `tailwind.config.ts` and update color variables in `app/globals.css`.

### Adding New Page

1. Create new folder in `src/app/dashboard/your-page/`
2. Add `page.tsx` with your component
3. Update navigation in `src/app/dashboard/layout.tsx`

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Recharts](https://recharts.org/)
- [shadcn/ui](https://ui.shadcn.com/)

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Made with ❤️ using Next.js and Supabase**
