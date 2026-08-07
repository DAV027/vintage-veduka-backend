const nodemailer = require("nodemailer");
const { formatIstDateTime } = require('./time');
require("dotenv").config();

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify((err, success) => {
  if (err) {
    console.log("SMTP Error:", err);
  } else {
    console.log("SMTP Connected");
  }
});

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
                  ${buildKeyValueRow('Total Paid', `₹${booking.amount}`)}
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
                    <td style="vertical-align:top;padding:0 8px 0 0;width:50px;">📍</td>
                    <td style="font-size:14px;color:#5a2d1a;line-height:1.7;">SK Retreat Farmstay</td>
                  </tr>
                  <tr>
                    <td style="vertical-align:top;padding:14px 8px 0 0;">✉️</td>
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

function buildKeyValueRow(label, value) {
  return `
    <tr style="border-top:1px solid rgba(212,175,55,0.18);">
      <td style="padding:14px 0 14px 0;font-size:14px;color:#5a2d1a;width:170px;font-weight:700;">${label}</td>
      <td style="padding:14px 0 14px 0;font-size:14px;color:#3f2a1a;">${value ?? '--'}</td>
    </tr>
  `;
}

exports.sendCustomerReceipt = async (booking) => {
  if (!EMAIL_USER || !EMAIL_PASS) return; // skip when not configured
  const mailOptions = {
    from: EMAIL_USER,
    to: booking.email,
    subject: `Booking Confirmed - ${booking.bookingId}`,
    headers: {
      'X-Priority': '1',
      Priority: 'urgent',
      Importance: 'high',
    },
    html: buildReceiptHtml(booking),
  };
  return transporter.sendMail(mailOptions);
};

exports.sendAdminNotification = async (booking) => {
  if (!EMAIL_USER || !EMAIL_PASS || !ADMIN_EMAIL) return;
  const mailOptions = {
    from: EMAIL_USER,
    to: ADMIN_EMAIL,
    subject: `New Booking - ${booking.bookingId}`,
    headers: {
      'X-Priority': '1',
      Priority: 'urgent',
      Importance: 'high',
    },
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#3f2a1a;">
        <h2 style="margin-bottom:0.5rem;color:#5a2d1a;">New Vintage Veduka Booking</h2>
        <p style="margin:0 0 18px;font-size:14px;color:#5a2d1a;">A new booking has been completed and requires your attention.</p>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
          ${buildKeyValueRow('Booking ID', booking.bookingId)}
          ${buildKeyValueRow('Name', booking.fullName)}
          ${buildKeyValueRow('Email', booking.email)}
          ${buildKeyValueRow('Phone', booking.phone)}
          ${buildKeyValueRow('Adults', booking.adults)}
          ${buildKeyValueRow('Children', booking.children)}
          ${buildKeyValueRow('Total Paid', `₹${booking.amount}`)}
          ${buildKeyValueRow('Event Date', booking.eventDate)}
          ${buildKeyValueRow('Venue', booking.venue)}
          ${buildKeyValueRow('Payment ID', booking.paymentId)}
          ${buildKeyValueRow('Order ID', booking.orderId)}
          ${buildKeyValueRow('Booking Date', formatIstDateTime(booking.bookingDate))}
        </table>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
};
