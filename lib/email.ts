// lib/email.ts
import { getCFEnv } from '@/lib/cf-env';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface ReceiptEmailPayload {
  to: string;
  residentName: string;
  receiptNumber: string;
  paymentType: string;
  amount: number;
  date: string;
  months?: { month: number; year: number }[];
}

export async function sendReceiptEmail(payload: ReceiptEmailPayload): Promise<void> {
  const { RESEND_API_KEY, RECEIPT_EMAIL_FROM, APP_URL } = getCFEnv();

  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set, skipping email');
    return;
  }

  const { to, residentName, receiptNumber, paymentType, amount, date, months } = payload;

  const formattedDate = new Date(date).toLocaleDateString('en-PK', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const monthsHtml = months?.length
    ? `<p><strong>Months Covered:</strong> ${months
        .map(m => `${MONTH_NAMES[m.month]} ${m.year}`)
        .join(', ')}</p>`
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: #1e3a5f; color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p  { margin: 4px 0 0; font-size: 13px; opacity: 0.8; }
    .body { padding: 24px; }
    .receipt-box { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 16px 0; }
    .receipt-box p { margin: 6px 0; font-size: 15px; }
    .amount { font-size: 28px; font-weight: bold; color: #1e3a5f; margin: 12px 0; }
    .badge { display: inline-block; background: #198754; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; }
    .footer { text-align: center; padding: 16px; font-size: 12px; color: #888; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="header">
    <h1>AF Garden Society</h1>
    <p>Payment Management System</p>
  </div>
  <div class="body">
    <p>Dear <strong>${residentName}</strong>,</p>
    <p>Your payment has been successfully recorded. Please find the receipt details below.</p>

    <div class="receipt-box">
      <span class="badge">✓ PAID</span>
      <div class="amount">PKR ${amount.toLocaleString('en-PK')}</div>
      <p><strong>Receipt No:</strong> ${receiptNumber}</p>
      <p><strong>Payment Type:</strong> ${paymentType}</p>
      <p><strong>Date:</strong> ${formattedDate}</p>
      ${monthsHtml}
    </div>

    <p>Please keep this email as your payment record.</p>
    <p>If you have any queries, please contact the society management office.</p>
  </div>
  <div class="footer">
    AF Garden Society &bull; Payment Management System<br/>
    This is an automated email, please do not reply.
  </div>
</body>
</html>
  `.trim();

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: RECEIPT_EMAIL_FROM || 'AF Garden Society <noreply@afgarden.com>',
      to: [to],
      subject: `Payment Receipt – ${receiptNumber} | AF Garden Society`,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }
}
