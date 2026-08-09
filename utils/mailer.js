const nodemailer = require('nodemailer')
const { formatIstDateTime } = require('./time')
require('dotenv').config()

const EMAIL_USER = process.env.EMAIL_USER
const EMAIL_PASS = process.env.EMAIL_PASS
const ADMIN_EMAIL = process.env.ADMIN_EMAIL

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM = process.env.RESEND_FROM || 'Vintage Veduka <booking@vintageveduka.com>'

let transporter = null

function buildSmtpTransport() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
  })
}

function getTransporter() {
  if (transporter) return transporter
  if (RESEND_API_KEY) return null
  if (!EMAIL_USER || !EMAIL_PASS) return null
  transporter = buildSmtpTransport()
  return transporter
}

async function verifyTransporter() {
  const t = getTransporter()
  if (!t) return
  try {
    await t.verify()
    console.log('SMTP Connected')
  } catch (err) {
    console.error('SMTP verification failed (emails will be skipped, payments unaffected):', err.message || err.message?.code || err)
  }
}

verifyTransporter()

async function sendViaResend({ to, subject, html, attachments, from }) {
  const body = {
    from: from || RESEND_FROM,
    to,
    subject,
    html,
  }
  if (Array.isArray(attachments) && attachments.length) {
    body.attachments = attachments
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Resend API error ${res.status}: ${errText}`)
  }
  return res.json()
}

async function sendMail({ to, subject, html, attachments, from }) {
  if (RESEND_API_KEY) {
    return sendViaResend({ to, subject, html, attachments, from })
  }
  const t = getTransporter()
  if (!t) {
    console.warn('Email skipped: EMAIL_USER/EMAIL_PASS not configured (payment unaffected).')
    return null
  }
  return t.sendMail({
    from: from || EMAIL_USER,
    to,
    subject,
    html,
    attachments: attachments || [],
  })
}

function buildReceiptHtml(booking) {
  const bookingDate = formatIstDateTime(booking.bookingDate)
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
  `
}

function buildKeyValueRow(label, value) {
  return `
    <tr style="border-top:1px solid rgba(212,175,55,0.18);">
      <td style="padding:14px 0 14px 0;font-size:14px;color:#5a2d1a;width:170px;font-weight:700;">${label}</td>
      <td style="padding:14px 0 14px 0;font-size:14px;color:#3f2a1a;">${value ?? '--'}</td>
    </tr>
  `
}

exports.sendCustomerReceipt = async (booking, pdfBuffer) => {
  if (RESEND_API_KEY) {
    if (!EMAIL_USER && !ADMIN_EMAIL) return
  } else if (!EMAIL_USER || !EMAIL_PASS) {
    return
  }

  const attachments = []
  if (pdfBuffer && Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 0) {
    attachments.push({
      filename: `VintageVeduka_Receipt_${booking.bookingId}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    })
  }

  return sendMail({
    to: booking.email,
    subject: `Booking Confirmed - ${booking.bookingId}`,
    html: buildReceiptHtml(booking),
    attachments,
  })
}

exports.sendAdminNotification = async (booking, pdfBuffer) => {
  if (!ADMIN_EMAIL) return
  if (!RESEND_API_KEY && (!EMAIL_USER || !EMAIL_PASS)) return

  const attachments = []
  if (pdfBuffer && Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 0) {
    attachments.push({
      filename: `VintageVeduka_Receipt_${booking.bookingId}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    })
  }

  return sendMail({
    to: ADMIN_EMAIL,
    replyTo: EMAIL_USER || undefined,
    subject: `New Booking - ${booking.bookingId}`,
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
    attachments,
  })
}
