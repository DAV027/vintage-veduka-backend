const { Resend } = require('resend');
const { formatIstDateTime } = require('./time');
require('dotenv').config();

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'vintageveduka@gmail.com';
const RESEND_FROM = process.env.RESEND_FROM || 'Vintage Veduka <bookings@vintageveduka.com>';

// Single shared Resend client. If the API key is missing, emails are skipped
// (payments remain unaffected). The key is read from the environment only —
// it is never logged and never sent to the frontend.
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

if (!resend) {
  console.warn('Email transport: RESEND_API_KEY not set. Emails will be skipped but payments remain unaffected.');
} else {
  console.log('Email transport: Resend API configured.');
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '--';
  return String(value)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#39;');
}

function buildKeyValueRow(label, value) {
  const safe = escapeHtml(value);
  return `
    <tr style="border-top:1px solid rgba(212,175,55,0.18);">
      <td style="padding:14px 0 14px 0;font-size:14px;color:#5a2a1a;width:170px;font-weight:700;">${label}</td>
      <td style="padding:14px 0 14px 0;font-size:14px;color:#3f2a1a;">${safe}</td>
    </tr>
  `;
}

function buildReceiptHtml(booking) {
  const bookingDate = formatIstDateTime(booking.bookingDate);
  return `
  <body style="margin:0;padding:0;background-color:#f7e8d0;font-family:Arial,Helvetica,sans-serif;color:#3f2a1a;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.18);">
            <tr style="background:#5a2d1a;color:#f7e8d0;">
              <td style="padding:24px 28px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="font-size:20px;font-weight:700;font-family:'Cinzel',Georgia,serif;letter-spacing:0.16em;">Vintage Veduka</td>
                    <td align="right" style="font-size:14px;color:#d4af37;">Heritage Experience</td>
                  </tr>
                </table>
                <hr style="border:none;height:1px;background:#d4af37;margin:18px 0 0;opacity:.8;" />
              </td>
            </tr>
            <tr>
              <td style="padding:28px 30px 20px;">
                <h1 style="margin:0;font-size:28px;font-family:'Cinzel',Georgia,serif;color:#5a2d1a;">Booking Confirmed</h1>
                <p style="margin:16px 0 0;font-size:16px;line-height:1.7;color:#5a2d1a;">Thank you for choosing Vintage Veduka. Your heritage booking is confirmed and your seat has been reserved.</p>
                <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#7d3d24;">Your PDF receipt is attached to this email.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
                  ${buildKeyValueRow('Booking ID', booking.bookingId)}
                  ${buildKeyValueRow('Name', booking.fullName)}
                  ${buildKeyValueRow('Email', booking.email)}
                  ${buildKeyValueRow('Phone', booking.phone)}
                  ${buildKeyValueRow('Adults', booking.adults)}
                  ${buildKeyValueRow('Children', booking.children)}
                  ${buildKeyValueRow('Total Paid', '\u20B9' + booking.amount)}
                  ${buildKeyValueRow('Event Date', booking.eventDate || '22 August')}
                  ${buildKeyValueRow('Venue', booking.venue || 'SK Retreat Farmstay')}
                  ${buildKeyValueRow('Payment ID', booking.paymentId)}
                  ${buildKeyValueRow('Order ID', booking.orderId)}
                  ${buildKeyValueRow('Booking Date', bookingDate)}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 30px;">
                <p style="margin:0 0 18px;font-size:16px;color:#5a2d1a;">We look forward to celebrating our heritage with you.</p>
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
                  <tr>
                    <td style="vertical-align:top;padding:0 8px 0 0;width:50px;">&#128205;</td>
                    <td style="font-size:14px;color:#5a2d1a;line-height:1.7;">SK Retreat Farmstay</td>
                  </tr>
                  <tr>
                    <td style="vertical-align:top;padding:14px 8px 0 0;">&#9993;&#65039;</td>
                    <td style="font-size:14px;color:#5a2d1a;line-height:1.7;">vintageveduka@gmail.com</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr style="background:#5a2d1a;color:#f7e8d0;">
              <td style="padding:18px 30px;text-align:center;font-size:13px;line-height:1.6;color:#f4e3c7;">
                Thank you for celebrating our heritage.
                <div style="margin-top:12px;">
                  <a href="https://www.instagram.com/vintageveduka" style="color:#d4af37;text-decoration:none;margin:0 6px;" target="_blank" rel="noopener">Instagram</a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  `;
}

function buildAdminHtml(booking) {
  return `
  <body style="margin:0;padding:0;background-color:#f7e8d0;font-family:Arial,Helvetica,sans-serif;color:#3f2a1a;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.18);">
            <tr style="background:#5a2d1a;color:#f7e8d0;">
              <td style="padding:24px 28px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="font-size:20px;font-weight:700;font-family:'Cinzel',Georgia,serif;letter-spacing:0.16em;">Vintage Veduka</td>
                    <td align="right" style="font-size:14px;color:#d4af37;">New Booking Notification</td>
                  </tr>
                </table>
                <hr style="border:none;height:1px;background:#d4af37;margin:18px 0 0;opacity:.8;" />
              </td>
            </tr>
            <tr>
              <td style="padding:28px 30px 20px;">
                <h1 style="margin:0;font-size:24px;font-family:'Cinzel',Georgia,serif;color:#5a2d1a;">New Booking Received</h1>
                <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:#5a2d1a;">A new booking has been completed and requires your attention. The PDF receipt is attached.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
                  ${buildKeyValueRow('Booking ID', booking.bookingId)}
                  ${buildKeyValueRow('Name', booking.fullName)}
                  ${buildKeyValueRow('Email', booking.email)}
                  ${buildKeyValueRow('Phone', booking.phone)}
                  ${buildKeyValueRow('Adults', booking.adults)}
                  ${buildKeyValueRow('Children', booking.children)}
                  ${buildKeyValueRow('Total Paid', '\u20B9' + booking.amount)}
                  ${buildKeyValueRow('Event Date', booking.eventDate)}
                  ${buildKeyValueRow('Venue', booking.venue)}
                  ${buildKeyValueRow('Payment ID', booking.paymentId)}
                  ${buildKeyValueRow('Order ID', booking.orderId)}
                  ${buildKeyValueRow('Booking Date', formatIstDateTime(booking.bookingDate))}
                </table>
              </td>
            </tr>
            <tr style="background:#5a2d1a;color:#f7e8d0;">
              <td style="padding:18px 30px;text-align:center;font-size:13px;line-height:1.6;color:#f4e3c7;">
                Vintage Veduka Booking System
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  `;
}

function buildAttachments(booking, pdfBuffer) {
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) return [];
  return [
    {
      filename: `VintageVeduka_Receipt_${booking.bookingId}.pdf`,
      content: pdfBuffer.toString('base64'),
    },
  ];
}

/**
 * Sends a customer confirmation email via Resend.
 * Never throws — callers (paymentController) rely on this being safe to await.
 */
exports.sendCustomerReceipt = async (booking, pdfBuffer) => {
  if (!resend) {
    console.warn('Customer email skipped: RESEND_API_KEY not configured (payment unaffected).');
    return null;
  }
  if (!booking || !booking.email) {
    console.warn('Customer email skipped: missing booking email.');
    return null;
  }

  try {
    const result = await resend.emails.send({
      from: RESEND_FROM,
      to: [booking.email],
      subject: `Booking Confirmed - ${booking.bookingId}`,
      html: buildReceiptHtml(booking),
      attachments: buildAttachments(booking, pdfBuffer),
    });
    console.log(`Customer email sent to ${booking.email} for ${booking.bookingId}.`);
    return result;
  } catch (err) {
    // Failure is logged only; never let it propagate to fail the payment.
    console.error('Customer email failed (payment remains successful):', safeErr(err));
    return null;
  }
};

/**
 * Sends an admin booking notification to vintageveduka@gmail.com via Resend.
 * Never throws — independent of customer email outcome.
 */
exports.sendAdminNotification = async (booking, pdfBuffer) => {
  if (!resend) {
    console.warn('Admin email skipped: RESEND_API_KEY not configured (payment unaffected).');
    return null;
  }
  if (!ADMIN_EMAIL) {
    console.warn('Admin email skipped: ADMIN_EMAIL not configured.');
    return null;
  }

  try {
    const result = await resend.emails.send({
      from: RESEND_FROM,
      to: [ADMIN_EMAIL],
      replyTo: booking.email || undefined,
      subject: `New Vintage Veduka Booking - ${booking.bookingId}`,
      html: buildAdminHtml(booking),
      attachments: buildAttachments(booking, pdfBuffer),
    });
    console.log(`Admin email sent to ${ADMIN_EMAIL} for ${booking.bookingId}.`);
    return result;
  } catch (err) {
    console.error('Admin email failed (payment remains successful):', safeErr(err));
    return null;
  }
};

function safeErr(err) {
  if (!err) return 'unknown error';
  if (err.response && err.response.data) return JSON.stringify(err.response.data);
  if (err.message) return err.message;
  return String(err);
}
