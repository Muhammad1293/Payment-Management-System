// lib/email.ts
import { getCloudflareContext } from '@opennextjs/cloudflare'

async function getConfig() {
  const ctx = await getCloudflareContext({ async: true });
  const env = ctx.env as any;
  return {
    clientId:     env.GOOGLE_CLIENT_ID     || '',
    clientSecret: env.GOOGLE_CLIENT_SECRET || '',
    refreshToken: env.GOOGLE_REFRESH_TOKEN || '',
    senderEmail:  env.SENDER_EMAIL          || '',
    senderName:   env.SENDER_NAME           || 'AF Garden Residents Welfare Association',
  };
}

async function getAccessToken(clientId:string, clientSecret:string, refreshToken:string) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data.access_token;
}

async function sendEmail(to: string, toName: string, subject: string, html: string): Promise<void> {
  const { clientId, clientSecret, refreshToken, senderEmail, senderName } = await getConfig();

  if (!refreshToken) {
    console.warn('[Email] Google Refresh Token not set');
    return;
  }

  // 1. Get fresh token
  const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

  // 2. Format the email for Gmail
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    `From: "${senderName}" <${senderEmail}>`,
    `To: "${toName}" <${to}>`,
    `Content-Type: text/html; charset=utf-8`,
    `MIME-Version: 1.0`,
    `Subject: ${utf8Subject}`,
    ``,
    html,
  ];
  const message = messageParts.join('\n');

  // 3. Base64URL Encode (required by Google API)
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // 4. Send
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail API error: ${err}`);
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
    <h1 style="margin:0;font-size:22px;">AF Garden Residents Welfare Association</h1>
    <p style="margin:4px 0 0;opacity:0.8;">Payment Management System</p>
  </div>
  <div class="body">
    <p>Dear <strong>${name}</strong>,</p>
    <p>Your account has been created on the AF Garden Payment Management System. Here are your login credentials:</p>

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
    AF Garden Residents Welfare Association &bull; Payment Management System<br/>
    This is an automated email, please do not reply.
  </div>
</body>
</html>`;

  await sendEmail(to, name, `Your PMS Account Credentials – AF Garden Residents Welfare Association`, html);
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
    <h1 style="margin:0;font-size:22px;">AF Garden Residents Welfare Association</h1>
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
    AF Garden Residents Welfare Association &bull; Payment Management System<br/>
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
  <p style="margin:6px 0 0;opacity:.85;">AF Garden Residents Welfare Association</p>
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
AF Garden Residents Welfare Association<br/>
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