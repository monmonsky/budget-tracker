import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, test_email } = body

    console.log('[Test Email] Received request with host:', smtp_host)

    // Validate required fields
    if (!smtp_host || !smtp_user || !smtp_pass) {
      return NextResponse.json(
        { error: 'Missing required SMTP configuration' },
        { status: 400 }
      )
    }

    // Create transporter with provided settings
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: parseInt(smtp_port) || 587,
      secure: parseInt(smtp_port) === 465, // true for 465, false for other ports
      auth: {
        user: smtp_user,
        pass: smtp_pass,
      },
    })

    console.log('[Test Email] Verifying SMTP connection...')

    // Verify connection
    try {
      await transporter.verify()
      console.log('[Test Email] SMTP connection verified successfully')
    } catch (verifyError: unknown) {
      console.error('[Test Email] SMTP verification failed:', verifyError)
      return NextResponse.json(
        {
          error: 'SMTP connection failed',
          details: verifyError instanceof Error ? verifyError.message : 'Unknown verification error',
        },
        { status: 400 }
      )
    }

    const recipientEmail = test_email || smtp_user

    console.log('[Test Email] Sending test email to:', recipientEmail)

    // Send test email
    const info = await transporter.sendMail({
      from: smtp_from || smtp_user,
      to: recipientEmail,
      subject: '✅ SMTP Configuration Test - Success!',
      text: `Hello,

This is a test email to verify your SMTP configuration for the Monthly Budget Tracker application.

If you're reading this, your email settings are working correctly! 🎉

SMTP Configuration:
- Host: ${smtp_host}
- Port: ${smtp_port}
- Username: ${smtp_user}
- From: ${smtp_from || smtp_user}

You can now receive budget alert notifications via email.

---
Monthly Budget Tracker
Sent at ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
    .success-box {
      background-color: #f0fdf4;
      border-left: 4px solid #10b981;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .config-table {
      width: 100%;
      margin: 20px 0;
      border-collapse: collapse;
    }
    .config-table td {
      padding: 10px;
      border-bottom: 1px solid #e5e5e5;
    }
    .config-table td:first-child {
      color: #737373;
      font-weight: 500;
      width: 40%;
    }
    .footer {
      background-color: #fafafa;
      padding: 20px 30px;
      text-align: center;
      color: #737373;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ SMTP Configuration Test</h1>
    </div>
    <div class="content">
      <p>Hello,</p>

      <div class="success-box">
        <h3 style="margin: 0 0 10px 0; color: #10b981;">🎉 Success!</h3>
        <p style="margin: 0;">
          Your SMTP configuration is working correctly. You can now receive budget alert notifications via email.
        </p>
      </div>

      <h3>SMTP Configuration Details:</h3>
      <table class="config-table">
        <tr>
          <td>Host</td>
          <td><strong>${smtp_host}</strong></td>
        </tr>
        <tr>
          <td>Port</td>
          <td><strong>${smtp_port}</strong></td>
        </tr>
        <tr>
          <td>Username</td>
          <td><strong>${smtp_user}</strong></td>
        </tr>
        <tr>
          <td>From Address</td>
          <td><strong>${smtp_from || smtp_user}</strong></td>
        </tr>
      </table>

      <p>
        This test confirms that your email server is properly configured and can send notifications
        from your Monthly Budget Tracker application.
      </p>
    </div>
    <div class="footer">
      <p>
        Monthly Budget Tracker<br>
        Test email sent at ${new Date().toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          dateStyle: 'full',
          timeStyle: 'long'
        })}
      </p>
    </div>
  </div>
</body>
</html>
      `,
    })

    console.log('[Test Email] Email sent successfully:', info.messageId)

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: info.messageId,
      recipient: recipientEmail,
    })
  } catch (error) {
    console.error('[Test Email] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
