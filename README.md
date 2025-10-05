# 💰 Budget Trackers - Personal Finance Dashboard

A comprehensive personal finance management application built with Next.js 15, Supabase, and TypeScript. Track your income, expenses, investments, and net worth with real-time updates and beautiful dark mode.

**Financial Goal:** Rp 20-35 miliar di Year 17 (Dana pendidikan anak fully funded!)

## 🌟 Features

### Core Features
- **📊 Dashboard** - Overview of financial status with key metrics
- **💰 Income & Expense Tracking** - Manage all transactions with categories
- **🏦 Bank Accounts** - Track multiple accounts with sub-account support (Jago Pockets, Jenius Flexy Saver)
- **📈 Investment Tracking** - Monitor stocks, crypto, and mutual funds with P&L calculation
- **🏠 KPR Tracker** - Mortgage tracking with bombing strategy calculator
- **📑 Reports** - Transaction and investment reports with filters and CSV export
- **🎯 Net Worth Tracker** - 17-year financial goal tracking with projections
- **🏷️ Categories** - Customizable income/expense categories with icons and colors

### UI/UX Features
- **🌙 Dark Mode** - Beautiful dark theme (#191919 cards, #3b3b3b borders)
- **⚡ Real-time Updates** - Instant UI updates with optimistic rendering
- **📱 Responsive Design** - Mobile-first design with adaptive layouts
- **🔄 Global Loading** - Unified loading states across all pages
- **⚙️ Settings** - Customize app title, currency, date format, and more

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS v4, Shadcn UI components
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Charts**: Recharts
- **Date Utils**: date-fns
- **Icons**: Lucide React

## 📁 Project Structure

```
dashboard-app/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # Main dashboard
│   │   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   │   ├── income/               # Income management
│   │   │   ├── expenses/             # Expense management
│   │   │   ├── accounts/             # Bank accounts with sub-accounts
│   │   │   ├── investments/          # Investment tracking
│   │   │   ├── kpr/                  # KPR/Mortgage tracker
│   │   │   ├── categories/           # Category management
│   │   │   ├── transactions/         # All transactions view
│   │   │   ├── reports/              # Reports & analytics
│   │   │   ├── networth/             # Net worth tracker
│   │   │   └── settings/             # App settings
│   │   ├── login/                    # Authentication
│   │   ├── layout.tsx                # Root layout
│   │   └── globals.css               # Global styles & theme
│   ├── components/
│   │   ├── ui/                       # Shadcn UI components
│   │   ├── loading-spinner.tsx       # Loading components
│   │   ├── dark-mode-toggle.tsx      # Theme toggle
│   │   └── dynamic-title.tsx         # Dynamic page title
│   ├── contexts/
│   │   └── LoadingContext.tsx        # Global loading state
│   └── lib/
│       └── supabase/
│           └── client.ts             # Supabase client config
├── migrations/
│   └── FULL_SCHEMA.sql               # Complete database schema
└── public/
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dashboard-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**

   Create `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run database migrations**

   - Go to Supabase Dashboard > SQL Editor
   - Copy content from `migrations/FULL_SCHEMA.sql`
   - Paste and Execute
   - Verify all tables are created

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open browser**
   ```
   http://localhost:3000
   ```

## 🗄️ Database Schema

### Core Tables

- **profiles** - User profiles and settings
- **accounts** - Bank accounts with sub-account support
- **transactions** - Income and expense records
- **categories** - Customizable transaction categories
- **investments** - Investment portfolio tracking
- **kpr_tracking** - Mortgage/KPR tracking with bombing history
- **app_settings** - User-specific app configuration

### Key Features

- **Row Level Security (RLS)** - All tables secured per user
- **Foreign Keys** - Referential integrity maintained
- **Soft Delete** - Account deactivation instead of deletion
- **JSONB Support** - Flexible data structures (bombing_history)

## ⚙️ Configuration

### App Settings (via UI)

Navigate to **Settings** page to configure:

- **App Title** - Custom application name
- **App Description** - Subtitle/description
- **Default Currency** - IDR, USD, EUR, SGD, MYR
- **Date Format** - DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
- **Number Format** - Indonesia, US, UK
- **Fiscal Year Start** - Month when fiscal year begins

### Dark Mode Theme

Dark mode uses a sophisticated color scheme:
- Background: `#0a0a0a`
- Cards/Sidebar: `#191919`
- Borders: `#3b3b3b`
- Text: `#f2f2f2`
- Muted: `#a3a3a3`

Edit `src/app/globals.css` to customize colors.

## 📊 Key Features Explained

### Sub-Accounts (Wallets)

Create virtual accounts under main bank accounts:
- **Jago Pockets** - For Bank Jago users
- **Jenius Flexy Saver** - For Jenius users
- **Wallets** - General purpose
- **Virtual Accounts** - For e-wallets

### KPR Bombing Strategy

Track mortgage with bombing (pelunasan dipercepat):
- Monthly payment schedule (12-month projection)
- Bombing calculator with 4% penalty
- Interest saved calculation
- Historical bombing records

### Investment P&L

Automatic profit/loss calculation:
- Real-time P&L tracking
- Multi-currency support (auto-convert to IDR)
- Recalculate all investments feature
- Filter by platform (Bibit, Binance, etc.)

### Dynamic Categories

Fully customizable categories:
- 60+ icon options (emoji)
- 8 color choices
- Separate Income/Expense categories
- Icons displayed in dropdowns

### Global Loading

Unified loading experience:
- Full-screen overlay with backdrop blur
- Custom loading text per page
- Context-based state management
- No flickering between routes

## 🎨 Styling Guide

### Using Semantic Colors

Always use CSS variables instead of hardcoded colors:

```tsx
// ✅ Good
<div className="bg-card text-card-foreground border border-border">

// ❌ Bad
<div className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
```

### Available CSS Variables

```css
--background      /* Page background */
--foreground      /* Primary text */
--card           /* Card background */
--card-foreground /* Card text */
--border         /* Border color */
--input          /* Input border */
--muted          /* Muted backgrounds */
--muted-foreground /* Secondary text */
--accent         /* Accent backgrounds */
--primary        /* Primary color */
--destructive    /* Error/delete color */
```

## 🔐 Security

- **Row Level Security (RLS)** - Enabled on all tables
- **User Isolation** - Each user only sees their own data
- **Auth Policies** - Supabase Auth integration
- **SQL Injection Protection** - Parameterized queries
- **XSS Protection** - React built-in sanitization

## 📱 Responsive Design

- **Mobile First** - Optimized for small screens
- **Sidebar** - Collapsible on mobile
- **Tables** - Horizontal scroll on mobile
- **Forms** - Full-width on mobile
- **Charts** - Responsive sizing

## 🐛 Troubleshooting

### Dark Mode Not Working

1. Hard refresh browser: `Ctrl + Shift + R`
2. Check browser console for errors
3. Verify theme toggle is working
4. Clear browser cache

### Database Errors

1. Check RLS policies are created
2. Verify user is authenticated
3. Check Supabase logs in dashboard
4. Run migrations again if needed

### Title Not Updating

1. Check `app_settings` table exists
2. Verify settings saved in Settings page
3. Hard refresh browser
4. Check console for DynamicTitle logs

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

Ensure environment variables are set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## 🔄 Migrations Guide

All database migrations are in `migrations/FULL_SCHEMA.sql`.

To apply:
1. Open Supabase SQL Editor
2. Copy entire file content
3. Execute
4. Verify tables created

## 📄 License

MIT License - Feel free to use for personal or commercial projects.

## 🤝 Support

For issues or questions:
1. Check this README
2. Review code comments
3. Check Supabase logs
4. Create GitHub issue

## 🎯 Roadmap

- [ ] Budget planning & forecasting
- [ ] Recurring transactions
- [ ] Multi-currency support improvements
- [ ] Advanced charts & analytics
- [ ] Mobile app (React Native)
- [ ] Export to PDF
- [ ] Email notifications
- [ ] Shared accounts (family mode)

---

**Built with ❤️ for family financial freedom 🚀**
