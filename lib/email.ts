// lib/email.ts
import { getCloudflareContext } from '@opennextjs/cloudflare'

async function getConfig() {
  const ctx = await getCloudflareContext({ async: true });
  const env = ctx.env as any;
  return {
    apiKey:      env.BREVO_API_KEY  || '',
    senderEmail: env.SENDER_EMAIL   || '',
    senderName:  env.SENDER_NAME    || 'AF Garden Society Welfare Association',
  };
}

async function sendEmail(to: string, toName: string, subject: string, html: string): Promise<void> {
  const { apiKey, senderEmail, senderName } = await getConfig();

  if (!apiKey) {
    console.warn('[Email] BREVO_API_KEY not set');
    return;
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'api-key':        apiKey,
    },
    body: JSON.stringify({
      sender:     { name: senderName, email: senderEmail },
      to:         [{ email: to, name: toName }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo error: ${err}`);
  }
}

// ── Send login credentials to new user ──────────────────────────
export async function sendUserCredentials(payload: {
  to: string;
  name: string;
  password: string;
  role: string;
  appUrl: string;
}): Promise<void> {
  const { to, name, password, role, appUrl } = payload;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; }
  .header { background: #1e3a5f; color: white; padding: 24px; text-align: center; }
  .body { padding: 24px; }
  .cred-box { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 16px 0; }
  .cred-box p { margin: 8px 0; font-size: 15px; }
  .value { font-weight: bold; color: #1e3a5f; font-size: 16px; }
  .btn { display: inline-block; background: #1e3a5f; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px; }
  .footer { text-align: center; padding: 16px; font-size: 12px; color: #888; border-top: 1px solid #eee; margin-top: 24px; }
  .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px; margin-top: 16px; font-size: 13px; }
</style>
</head>
<body>
  <div class="header">
    <h1 style="margin:0;font-size:22px;">AF Garden Society Welfare Association</h1>
    <p style="margin:4px 0 0;opacity:0.8;">Payment Management System</p>
  </div>
  <div class="body">
    <p>Dear <strong>${name}</strong>,</p>
    <p>Your account has been created on the AF Garden Society Payment Management System. Here are your login credentials:</p>

    <div class="cred-box">
      <p>🌐 <strong>Login URL:</strong><br/><span class="value">${appUrl}</span></p>
      <p>📧 <strong>Email:</strong><br/><span class="value">${to}</span></p>
      <p>🔑 <strong>Password:</strong><br/><span class="value">${password}</span></p>
      <p>👤 <strong>Role:</strong><br/><span class="value" style="text-transform:capitalize;">${role}</span></p>
    </div>

    <a href="${appUrl}" class="btn">Login to PMS</a>

    <div class="warning">
      ⚠️ <strong>Important:</strong> Please change your password immediately after first login by going to Profile → Change Password.
    </div>
  </div>
  <div class="footer">
    AF Garden Society Welfare Association &bull; Payment Management System<br/>
    This is an automated email, please do not reply.
  </div>
</body>
</html>`;

  await sendEmail(to, name, `Your PMS Account Credentials – AF Garden Society Welfare Association`, html);
}

// ── Send password reset email ────────────────────────────────────
export async function sendPasswordReset(payload: {
  to: string;
  name: string;
  newPassword: string;
  appUrl: string;
}): Promise<void> {
  const { to, name, newPassword, appUrl } = payload;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; }
  .header { background: #1e3a5f; color: white; padding: 24px; text-align: center; }
  .body { padding: 24px; }
  .cred-box { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 16px 0; }
  .value { font-weight: bold; color: #1e3a5f; font-size: 18px; letter-spacing: 1px; }
  .btn { display: inline-block; background: #1e3a5f; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px; }
  .footer { text-align: center; padding: 16px; font-size: 12px; color: #888; border-top: 1px solid #eee; margin-top: 24px; }
  .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px; margin-top: 16px; font-size: 13px; }
</style>
</head>
<body>
  <div class="header">
    <h1 style="margin:0;font-size:22px;">AF Garden Society Welfare Association</h1>
    <p style="margin:4px 0 0;opacity:0.8;">Password Reset</p>
  </div>
  <div class="body">
    <p>Dear <strong>${name}</strong>,</p>
    <p>Your password has been reset by the system administrator. Here is your new password:</p>

    <div class="cred-box">
      <p>🔑 <strong>New Password:</strong></p>
      <p class="value">${newPassword}</p>
    </div>

    <a href="${appUrl}" class="btn">Login Now</a>

    <div class="warning">
      ⚠️ <strong>Important:</strong> Please change this password immediately after login by going to Profile → Change Password.
    </div>
  </div>
  <div class="footer">
    AF Garden Society Welfare Association &bull; Payment Management System<br/>
    This is an automated email, please do not reply.
  </div>
</body>
</html>`;

  await sendEmail(to, name, `Password Reset – AF Garden Society PMS`, html);
}

// ── Send payment receipt email ───────────────────────────────
export async function sendReceiptEmail(payload: {
  to: string;
  residentName: string;
  receiptNumber: string;
  paymentType: string;
  amount: number;
  date: string;
  months?: { month: number; year: number }[];
}): Promise<void> {
  const {
    to,
    residentName,
    receiptNumber,
    paymentType,
    amount,
    date,
    months = [],
  } = payload;

  const paidMonthsHtml =
    months.length > 0
      ? `
      <tr>
        <td style="padding:8px 0;font-weight:bold;">Paid Months:</td>
        <td style="padding:8px 0;">
          ${months
            .map(
              (m) =>
                `${new Date(m.year, m.month - 1).toLocaleString('en', {
                  month: 'long',
                })} ${m.year}`
            )
            .join(', ')}
        </td>
      </tr>
    `
      : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body{
  font-family:Arial,sans-serif;
  color:#333;
  max-width:650px;
  margin:0 auto;
}
.header{
  background:#1e3a5f;
  color:#fff;
  padding:24px;
  text-align:center;
}
.body{
  padding:24px;
}
.box{
  background:#f8f9fa;
  border:1px solid #ddd;
  border-radius:8px;
  padding:20px;
}
table{
  width:100%;
  border-collapse:collapse;
}
.footer{
  text-align:center;
  font-size:12px;
  color:#888;
  margin-top:24px;
  padding-top:16px;
  border-top:1px solid #eee;
}
.amount{
  color:#1e3a5f;
  font-size:22px;
  font-weight:bold;
}
</style>
</head>

<body>

<div class="header">
  <h2 style="margin:0;">Payment Receipt</h2>
  <p style="margin:6px 0 0;opacity:.85;">AF Garden Society Welfare Association</p>
</div>

<div class="body">

<p>Dear <strong>${residentName}</strong>,</p>

<p>We have successfully received your payment. Receipt details are below:</p>

<div class="box">

<table>
<tr>
<td style="padding:8px 0;font-weight:bold;">Resident Name:</td>
<td style="padding:8px 0;">${residentName}</td>
</tr>

<tr>
<td style="padding:8px 0;font-weight:bold;">Receipt No:</td>
<td style="padding:8px 0;">${receiptNumber}</td>
</tr>

<tr>
<td style="padding:8px 0;font-weight:bold;">Payment Type:</td>
<td style="padding:8px 0;">${paymentType}</td>
</tr>

${paidMonthsHtml}

<tr>
<td style="padding:8px 0;font-weight:bold;">Payment Date:</td>
<td style="padding:8px 0;">${new Date(date).toLocaleDateString('en-PK')}</td>
</tr>

<tr>
<td style="padding:8px 0;font-weight:bold;">Amount Paid:</td>
<td style="padding:8px 0;" class="amount">PKR ${amount.toLocaleString()}</td>
</tr>

</table>

</div>

<p style="margin-top:18px;">Thank you for your payment and cooperation.</p>

</div>

<div class="footer">
AF Garden Society Welfare Association<br/>
This is an automated email. Please do not reply.
</div>

</body>
</html>
`;

  await sendEmail(
    to,
    residentName,
    `Payment Receipt - ${receiptNumber}`,
    html
  );
}