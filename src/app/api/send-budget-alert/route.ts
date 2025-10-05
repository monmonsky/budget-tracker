import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendBudgetAlertEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    // Get userId from request body (will be passed from client)
    const body = await request.json()
    const { budgetId, categoryName, budgetAmount, spentAmount, percentage, month, userId } = body

    console.log('[Budget Alert] Received request for budget:', budgetId)

    // Validate required fields
    if (!budgetId || !categoryName || !budgetAmount || !spentAmount || !percentage || !month || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create Supabase client with service role (for server-side operations)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get user email
    const { data: profile } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    const userEmail = profile?.email

    if (!userEmail) {
      console.error('[Budget Alert] User email not found for userId:', userId)
      return NextResponse.json({ error: 'User email not found' }, { status: 400 })
    }

    console.log('[Budget Alert] Sending alert to:', userEmail)

    // Check if alert already exists for this budget/threshold
    const alertType = percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'info'

    const { data: existingAlert } = await supabase
      .from('alert_notifications')
      .select('id')
      .eq('budget_id', budgetId)
      .eq('alert_type', alertType)
      .eq('is_read', false)
      .single()

    // Don't send duplicate alerts
    if (existingAlert) {
      console.log('[Budget Alert] Alert already exists, skipping')
      return NextResponse.json({ message: 'Alert already exists', skipped: true }, { status: 200 })
    }

    // Send email
    try {
      const emailResult = await sendBudgetAlertEmail({
        to: userEmail,
        budgetName: categoryName,
        categoryName,
        budgetAmount,
        spentAmount,
        percentage,
        month,
        userName: profile?.full_name,
        userId: userId,
      })

      console.log('[Budget Alert] Email sent successfully:', emailResult.messageId)
    } catch (emailError) {
      console.error('[Budget Alert] Failed to send email:', emailError)
      // Continue to create notification even if email fails
    }

    // Create notification record
    const { data: notification, error: notificationError } = await supabase
      .from('alert_notifications')
      .insert({
        budget_id: budgetId,
        alert_type: alertType,
        message: `Your ${categoryName} budget has reached ${percentage.toFixed(0)}% (Rp ${spentAmount.toLocaleString('id-ID')} of Rp ${budgetAmount.toLocaleString('id-ID')})`,
        is_read: false,
      })
      .select()
      .single()

    if (notificationError) {
      console.error('[Budget Alert] Error creating notification:', notificationError)
      return NextResponse.json(
        { error: 'Failed to create notification', details: notificationError },
        { status: 500 }
      )
    }

    console.log('[Budget Alert] Notification created successfully')

    return NextResponse.json({
      success: true,
      message: 'Budget alert sent successfully',
      notification,
    })
  } catch (error) {
    console.error('[Budget Alert] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send budget alert', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
