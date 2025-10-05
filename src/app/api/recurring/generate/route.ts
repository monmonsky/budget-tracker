import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addDays, addWeeks, addMonths, addYears, format } from 'date-fns'

// Initialize Supabase client with service role key for background jobs
// Note: This should use service role key from env for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function calculateNextOccurrence(currentDate: string, frequency: string, customDays?: number): string {
  const date = new Date(currentDate)

  switch (frequency) {
    case 'daily':
      return format(addDays(date, 1), 'yyyy-MM-dd')
    case 'weekly':
      return format(addWeeks(date, 1), 'yyyy-MM-dd')
    case 'monthly':
      return format(addMonths(date, 1), 'yyyy-MM-dd')
    case 'yearly':
      return format(addYears(date, 1), 'yyyy-MM-dd')
    case 'custom':
      return format(addDays(date, customDays || 1), 'yyyy-MM-dd')
    default:
      return currentDate
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authorization (you can add a secret token here)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET || 'your-secret-token'

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = format(new Date(), 'yyyy-MM-dd')

    // Get all active recurring transactions that are due
    const { data: recurringTransactions, error: fetchError } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .eq('auto_create', true)
      .lte('next_occurrence', today)

    if (fetchError) {
      console.error('Error fetching recurring transactions:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!recurringTransactions || recurringTransactions.length === 0) {
      return NextResponse.json({
        message: 'No recurring transactions due',
        processed: 0
      })
    }

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Process each recurring transaction
    for (const recurring of recurringTransactions) {
      try {
        // Check if end_date has passed
        if (recurring.end_date && recurring.end_date < today) {
          // Deactivate if past end date
          await supabase
            .from('recurring_transactions')
            .update({ is_active: false })
            .eq('id', recurring.id)
          continue
        }

        // Create the transaction
        const { error: insertError } = await supabase
          .from('transactions')
          .insert([{
            user_id: recurring.user_id,
            account_id: recurring.account_id,
            date: today,
            amount: recurring.amount,
            type: recurring.type,
            category: recurring.category,
            subcategory: recurring.subcategory,
            description: recurring.description,
            merchant: recurring.merchant,
            is_recurring: true,
            is_internal_transfer: false,
          }])

        if (insertError) {
          console.error(`Error creating transaction for ${recurring.template_name}:`, insertError)
          errorCount++
          errors.push(`${recurring.template_name}: ${insertError.message}`)
          continue
        }

        // Calculate next occurrence
        const nextOccurrence = calculateNextOccurrence(
          recurring.next_occurrence,
          recurring.frequency,
          recurring.custom_interval_days || undefined
        )

        // Update recurring transaction
        const { error: updateError } = await supabase
          .from('recurring_transactions')
          .update({
            next_occurrence: nextOccurrence,
            last_generated: today,
          })
          .eq('id', recurring.id)

        if (updateError) {
          console.error(`Error updating recurring transaction ${recurring.template_name}:`, updateError)
          errorCount++
          errors.push(`Update ${recurring.template_name}: ${updateError.message}`)
          continue
        }

        successCount++
      } catch (error) {
        console.error(`Error processing recurring transaction ${recurring.template_name}:`, error)
        errorCount++
        errors.push(`${recurring.template_name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      message: `Processed ${recurringTransactions.length} recurring transactions`,
      success: successCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error in recurring transaction generator:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST endpoint for manual trigger
export async function POST(request: NextRequest) {
  return GET(request)
}
