# Recurring Transactions - Setup Guide

## Overview

The Recurring Transactions feature allows you to automate regular income and expenses like:
- Monthly salary (Gaji Bulanan)
- Monthly mortgage payment (KPR)
- Subscriptions (Netflix, Spotify, etc.)
- Utility bills (Listrik, Air)

## Features

### Manual Generation
- Create recurring transaction templates in `/dashboard/recurring`
- Use "Generate Now" button to manually create transactions
- Pause/Resume recurring transactions
- Set end dates for finite recurring transactions

### Auto-Generation (Background Job)
- Automatically creates transactions when they're due
- Runs daily via cron job or manual trigger
- Only processes transactions with `auto_create = true`

## Setup Instructions

### 1. Database Migration

Run the migration to create the `recurring_transactions` table:

```sql
-- If you have existing database, run:
migrations/ADD_RECURRING_TRANSACTIONS.sql

-- For new installations:
-- The table is already included in migrations/FULL_SCHEMA.sql
```

### 2. Environment Variables

Add to your `.env.local`:

```env
# Supabase credentials (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# For background job (REQUIRED for auto-generation)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your-random-secret-token-here
```

**Where to find Service Role Key:**
1. Go to Supabase Dashboard
2. Settings > API
3. Copy "service_role" key (keep this secret!)

**CRON_SECRET:**
- Generate a random token: `openssl rand -hex 32`
- Or use any secure random string

### 3. Automated Background Job Setup

#### Option A: Vercel Cron Jobs (Recommended)

1. Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/recurring/generate",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs daily at 2 AM UTC (9 AM WIB).

2. Add environment variables in Vercel:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`

3. Deploy to Vercel

#### Option B: External Cron Service (EasyCron, cron-job.org)

1. Register at https://www.easycron.com/ (free tier available)

2. Create a new cron job:
   - URL: `https://your-domain.com/api/recurring/generate`
   - Schedule: `0 2 * * *` (daily at 2 AM)
   - HTTP Method: GET
   - Add Header: `Authorization: Bearer your-cron-secret`

3. Test the cron job

#### Option C: Manual Trigger

You can manually trigger the background job:

```bash
curl -X POST https://your-domain.com/api/recurring/generate \
  -H "Authorization: Bearer your-cron-secret"
```

Or create a button in your admin dashboard.

### 4. Testing

1. Create a test recurring transaction:
   - Template Name: "Test Daily Income"
   - Amount: 1000
   - Frequency: Daily
   - Start Date: Today
   - **Enable "Auto-create"**

2. Manually trigger the API:
   ```bash
   curl -X GET http://localhost:3000/api/recurring/generate \
     -H "Authorization: Bearer your-cron-secret"
   ```

3. Check:
   - Transaction should appear in transactions table
   - `next_occurrence` should be updated to tomorrow
   - `last_generated` should be today

4. Clean up test data

## Usage Guide

### Creating Recurring Transactions

1. Go to `/dashboard/recurring`
2. Click "Add Recurring"
3. Fill in the form:
   - **Template Name**: Friendly name (e.g., "Gaji Bulanan")
   - **Type**: Income or Expense
   - **Amount**: Transaction amount
   - **Category**: Select from existing categories
   - **Account**: Which account this affects
   - **Frequency**: Daily, Weekly, Monthly, Yearly, or Custom
   - **Start Date**: When to start generating
   - **End Date** (optional): When to stop (leave empty for infinite)
   - **Active**: Enable/disable without deleting
   - **Auto-create**: Enable for background job automation

4. Click "Create Recurring Transaction"

### Managing Recurring Transactions

- **Generate Now**: Manually create a transaction immediately
- **Pause/Resume**: Click pause button to temporarily stop
- **Edit**: Update any field (next occurrence will be recalculated)
- **Delete**: Permanently remove template (doesn't affect already-generated transactions)

### Dashboard Widget

The dashboard shows upcoming recurring transactions for the next 7 days, helping you plan your cash flow.

## How It Works

### Next Occurrence Calculation

```
daily:    next_occurrence + 1 day
weekly:   next_occurrence + 7 days
monthly:  next_occurrence + 1 month (same date)
yearly:   next_occurrence + 1 year (same date)
custom:   next_occurrence + custom_interval_days
```

### Auto-Generation Logic

1. Cron job runs daily (e.g., 2 AM)
2. Finds all recurring transactions where:
   - `is_active = true`
   - `auto_create = true`
   - `next_occurrence <= today`
3. For each:
   - Create transaction with today's date
   - Update `next_occurrence` to next date
   - Update `last_generated` to today
4. If `end_date` passed:
   - Set `is_active = false`
   - Stop generating

## Security Notes

1. **Service Role Key**: Never commit to git, only in environment variables
2. **CRON_SECRET**: Required to prevent unauthorized API calls
3. **Authorization**: API checks Bearer token before processing
4. **RLS Policies**: Users can only view/edit their own recurring transactions

## Troubleshooting

### Transactions not auto-generating

1. Check if `auto_create = true` for the recurring transaction
2. Verify `next_occurrence` date is today or earlier
3. Check cron job is running (Vercel > Deployments > Cron Logs)
4. Verify environment variables are set:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`
5. Test API manually:
   ```bash
   curl -X GET https://your-domain.com/api/recurring/generate \
     -H "Authorization: Bearer your-cron-secret"
   ```

### Cron job returns 401 Unauthorized

- Check `CRON_SECRET` matches in:
  - `.env.local` or Vercel env vars
  - Your cron service Authorization header

### Missing Service Role Key

- Go to Supabase Dashboard > Settings > API
- Copy "service_role" key
- Add to Vercel environment variables or `.env.local`

### Transactions generating multiple times

- Check your cron job isn't running too frequently
- Verify `next_occurrence` is being updated correctly
- Check for duplicate cron jobs

## Example Use Cases

### Monthly Salary (Tanggal 25)
```
Template Name: Gaji Bulanan
Type: Income
Amount: 15000000
Category: Gaji
Frequency: Monthly
Start Date: 2024-01-25
Auto-create: Yes
```

### Netflix Subscription (Tanggal 15)
```
Template Name: Netflix Subscription
Type: Expense
Amount: 186000
Category: Subscription
Frequency: Monthly
Start Date: 2024-01-15
Auto-create: Yes
```

### KPR Payment (Tanggal 4)
```
Template Name: KPR CIMB Niaga
Type: Expense
Amount: 28000000
Category: KPR
Frequency: Monthly
Start Date: 2024-01-04
Auto-create: Yes
```

### Electricity Bill (Tanggal 5, estimate)
```
Template Name: PLN Listrik
Type: Expense
Amount: 750000
Category: Housing
Frequency: Monthly
Start Date: 2024-01-05
Auto-create: Yes
Description: Estimated, adjust actual amount manually
```

## Monitoring

### Check Last Generated

```sql
SELECT
  template_name,
  next_occurrence,
  last_generated,
  is_active
FROM recurring_transactions
WHERE auto_create = true
ORDER BY next_occurrence;
```

### View Auto-Generated Transactions

```sql
SELECT
  date,
  description,
  amount,
  type,
  category
FROM transactions
WHERE is_recurring = true
ORDER BY date DESC;
```

## Future Enhancements

- [ ] Email notifications when transactions are generated
- [ ] Variable amounts (based on historical average)
- [ ] Smart scheduling (skip weekends for bank transfers)
- [ ] Bulk enable/disable all recurring transactions
- [ ] Analytics: total projected income/expenses
- [ ] Recurring transaction history log
