import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

// Function to get SMTP settings from database or environment
async function getSmtpSettings(userId?: string) {
  // If userId provided and service role key available, try to get from database first
  if (userId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )

      const { data } = await supabase
        .from('app_settings')
        .select('smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from')
        .eq('user_id', userId)
        .single()

      if (data?.smtp_host && data?.smtp_user) {
        return {
          host: data.smtp_host,
          port: data.smtp_port || 587,
          user: data.smtp_user,
          pass: data.smtp_pass,
          from: data.smtp_from || data.smtp_user,
        }
      }
    } catch (error) {
      console.error('Error fetching SMTP settings from database:', error)
      // Continue to fallback
    }
  }

  // Fallback to environment variables
  return {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  }
}

// Create transporter with settings
async function createTransporter(userId?: string) {
  const settings = await getSmtpSettings(userId)

  if (!settings.host || !settings.user) {
    throw new Error('SMTP configuration not found. Please configure email settings.')
  }

  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.port === 465,
    auth: {
      user: settings.user,
      pass: settings.pass,
    },
  })
}

export interface BudgetAlertEmailData {
  to: string
  budgetName: string
  categoryName: string
  budgetAmount: number
  spentAmount: number
  percentage: number
  month: string
  userName?: string
  userId?: string
}

export async function sendBudgetAlertEmail(data: BudgetAlertEmailData) {
  const {
    to,
    budgetName,
    categoryName,
    budgetAmount,
    spentAmount,
    percentage,
    month,
    userName,
  } = data

  const subject = `Budget Alert: ${categoryName} - ${percentage.toFixed(0)}% Used`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #171717;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: ${percentage >= 100 ? '#dc2626' : '#f59e0b'};
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px;
    }
    .alert-box {
      background-color: ${percentage >= 100 ? '#fef2f2' : '#fffbeb'};
      border-left: 4px solid ${percentage >= 100 ? '#dc2626' : '#f59e0b'};
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .alert-title {
      font-size: 18px;
      font-weight: 600;
      color: ${percentage >= 100 ? '#dc2626' : '#f59e0b'};
      margin: 0 0 10px 0;
    }
    .alert-message {
      margin: 0;
      color: #525252;
    }
    .stats {
      margin: 25px 0;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e5e5e5;
    }
    .stat-row:last-child {
      border-bottom: none;
    }
    .stat-label {
      color: #737373;
      font-weight: 500;
    }
    .stat-value {
      color: #171717;
      font-weight: 600;
    }
    .progress-bar {
      width: 100%;
      height: 24px;
      background-color: #e5e5e5;
      border-radius: 12px;
      overflow: hidden;
      margin: 20px 0;
    }
    .progress-fill {
      height: 100%;
      background-color: ${percentage >= 100 ? '#dc2626' : percentage >= 80 ? '#f59e0b' : '#10b981'};
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 600;
      font-size: 12px;
      transition: width 0.3s ease;
    }
    .footer {
      background-color: #fafafa;
      padding: 20px 30px;
      text-align: center;
      color: #737373;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #171717;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Budget Alert</h1>
    </div>
    <div class="content">
      ${userName ? `<p>Hi ${userName},</p>` : '<p>Hello,</p>'}

      <div class="alert-box">
        <p class="alert-title">
          ${percentage >= 100 ? '⚠️ Budget Exceeded!' : '⚡ Budget Warning'}
        </p>
        <p class="alert-message">
          Your <strong>${categoryName}</strong> budget has reached <strong>${percentage.toFixed(1)}%</strong>
          ${percentage >= 100 ? 'and has been exceeded' : 'of the allocated amount'}.
        </p>
      </div>

      <div class="stats">
        <div class="stat-row">
          <span class="stat-label">Budget Period</span>
          <span class="stat-value">${month}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Category</span>
          <span class="stat-value">${categoryName}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Budget Amount</span>
          <span class="stat-value">Rp ${budgetAmount.toLocaleString('id-ID')}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Spent Amount</span>
          <span class="stat-value" style="color: ${percentage >= 100 ? '#dc2626' : '#f59e0b'}">
            Rp ${spentAmount.toLocaleString('id-ID')}
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Remaining</span>
          <span class="stat-value" style="color: ${budgetAmount - spentAmount < 0 ? '#dc2626' : '#10b981'}">
            Rp ${Math.abs(budgetAmount - spentAmount).toLocaleString('id-ID')}
            ${budgetAmount - spentAmount < 0 ? 'over budget' : 'remaining'}
          </span>
        </div>
      </div>

      <div class="progress-bar">
        <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%">
          ${percentage.toFixed(0)}%
        </div>
      </div>

      ${percentage >= 100
        ? '<p>Consider reviewing your expenses in this category or adjusting your budget to better match your spending patterns.</p>'
        : '<p>You\'re approaching your budget limit. Consider monitoring your spending in this category more closely.</p>'
      }

      <center>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/budget" class="button">
          View Budget Details
        </a>
      </center>
    </div>
    <div class="footer">
      <p>
        This is an automated alert from ${process.env.NEXT_PUBLIC_APP_NAME || 'Monthly Budget Tracker'}.<br>
        You're receiving this because you have budget alerts enabled.
      </p>
    </div>
  </div>
</body>
</html>
  `

  const text = `
Budget Alert: ${categoryName}

${userName ? `Hi ${userName},` : 'Hello,'}

Your ${categoryName} budget has reached ${percentage.toFixed(1)}% ${percentage >= 100 ? 'and has been exceeded' : 'of the allocated amount'}.

Budget Period: ${month}
Category: ${categoryName}
Budget Amount: Rp ${budgetAmount.toLocaleString('id-ID')}
Spent Amount: Rp ${spentAmount.toLocaleString('id-ID')}
Remaining: Rp ${Math.abs(budgetAmount - spentAmount).toLocaleString('id-ID')} ${budgetAmount - spentAmount < 0 ? 'over budget' : 'remaining'}

${percentage >= 100
  ? 'Consider reviewing your expenses in this category or adjusting your budget to better match your spending patterns.'
  : 'You\'re approaching your budget limit. Consider monitoring your spending in this category more closely.'
}

View your budget details: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/budget

---
This is an automated alert from ${process.env.NEXT_PUBLIC_APP_NAME || 'Monthly Budget Tracker'}.
  `

  try {
    const transporter = await createTransporter(data.userId)
    const settings = await getSmtpSettings(data.userId)

    const info = await transporter.sendMail({
      from: settings.from || settings.user,
      to,
      subject,
      text,
      html,
    })

    console.log('Budget alert email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending budget alert email:', error)
    throw error
  }
}

// Test email connection
export async function verifyEmailConnection(userId?: string) {
  try {
    const transporter = await createTransporter(userId)
    await transporter.verify()
    console.log('Email server connection verified')
    return true
  } catch (error) {
    console.error('Email server connection failed:', error)
    return false
  }
}
