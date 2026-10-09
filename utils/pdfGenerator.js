const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { formatIstDateTime } = require('./time');

const pageMargins = { top: 72, bottom: 72, left: 56, right: 56 };

function addHeader(doc) {
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#5A2D1A');
  doc.text('Vintage Veduka', pageMargins.left, pageMargins.top, { align: 'left' });
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(10).fillColor('#5A2D1A');
  doc.text('Event Booking Receipt', { align: 'left' });
  doc.moveTo(pageMargins.left, pageMargins.top + 52)
    .lineTo(612 - pageMargins.right, pageMargins.top + 52)
    .stroke('#D4AF37');
}

function addWatermark(doc) {
  doc.fillColor('rgba(212,175,55,0.08)')
    .font('Helvetica-Bold')
    .fontSize(82)
    .opacity(0.14)
    .rotate(-45, { origin: [300, 420] })
    .text('Vintage Veduka', 120, 330, { align: 'center', width: 400 });
  doc.rotate(45, { origin: [300, 420] }).opacity(1);
}

function drawSectionTitle(doc, y, title) {
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#5A2D1A');
  doc.text(title, pageMargins.left, y);
  doc.moveTo(pageMargins.left, y + 18)
    .lineTo(612 - pageMargins.right, y + 18)
    .stroke('#D4AF37');
}

function addKeyValue(doc, label, value, y) {
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#5A2D1A');
  doc.text(`${label}`, pageMargins.left, y);
  doc.font('Helvetica').fontSize(10).fillColor('#3F2A1A');
  doc.text(`${value}`, pageMargins.left + 140, y, { width: 396 });
}

function formatPdfCurrency(value) {
  return `RS ${Number(value || 0).toLocaleString('en-IN')}`;
}

function addItemSummaryTable(doc, startY, items, amount) {
  const rowHeight = 24;
  const cellX = [pageMargins.left, 240, 340, 460];
  const tableWidth = 612 - pageMargins.left - pageMargins.right;

  doc.roundedRect(pageMargins.left - 4, startY - 6, tableWidth + 8, rowHeight * Math.max(items.length + 2, 4) + 12, 12)
    .fillOpacity(0.06)
    .fill('#5A2D1A')
    .fillOpacity(1);

  doc.fillColor('#5A2D1A').font('Helvetica-Bold').fontSize(11);
  ['Item', 'Qty', 'Unit Price', 'Amount'].forEach((heading, index) => {
    doc.text(heading, cellX[index], startY, { width: index === 3 ? 132 : 100 });
  });

  const headingBottom = startY + rowHeight - 6;
  doc.moveTo(pageMargins.left, headingBottom)
    .lineTo(612 - pageMargins.right, headingBottom)
    .stroke('#D4AF37');

  const rows = [
    ...items.map((item) => ({
      label: item.name || item.id || 'Item',
      quantity: Number(item.quantity || 0),
      price: formatPdfCurrency(item.unitPrice),
      total: formatPdfCurrency(item.subtotal),
    })),
    { label: 'Total Amount', quantity: '', price: '', total: formatPdfCurrency(amount) },
  ];

  let currentY = startY + 32;
  doc.font('Helvetica').fontSize(10);
  rows.forEach((row) => {
    const rowTop = currentY;
    doc.fillColor('#5A2D1A').text(row.label, cellX[0], rowTop);
    doc.text(row.quantity, cellX[1], rowTop);
    doc.text(row.price, cellX[2], rowTop);
    doc.font('Helvetica-Bold').text(row.total, cellX[3], rowTop);
    currentY += rowHeight;
  });
}

async function generateReceiptPdf(booking) {
  const qrString = `Booking:${booking.bookingId} | Payment:${booking.paymentId}`;
  const qrDataUrl = await QRCode.toDataURL(qrString, { margin: 1, color: { dark: '#5A2D1A', light: '#ffffff' } });
  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: pageMargins });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      addWatermark(doc);
      addHeader(doc);
      doc.image(Buffer.from(qrBase64, 'base64'), 500, 62, { width: 54, height: 54 });

      let currentY = pageMargins.top + 80;

      drawSectionTitle(doc, currentY, 'Customer Information');
      currentY += 28;
      addKeyValue(doc, 'Name:', booking.fullName || '--', currentY);
      currentY += 18;
      addKeyValue(doc, 'Email:', booking.email || '--', currentY);
      currentY += 18;
      addKeyValue(doc, 'Phone:', booking.phone || '--', currentY);
      currentY += 30;

      drawSectionTitle(doc, currentY, 'Booking Details');
      currentY += 28;
      addKeyValue(doc, 'Booking ID:', booking.bookingId || '--', currentY);
      currentY += 18;
      addKeyValue(doc, 'Payment ID:', booking.paymentId || '--', currentY);
      currentY += 18;
      addKeyValue(doc, 'Payment Status:', booking.paymentStatus || 'paid', currentY);
      currentY += 18;
      addKeyValue(doc, 'Booked On:', formatIstDateTime(booking.bookingDate), currentY);
      currentY += 30;

      drawSectionTitle(doc, currentY, 'Event Information');
      currentY += 28;
      addKeyValue(doc, 'Event:', 'Vintage Veduka', currentY);
      currentY += 18;
      addKeyValue(doc, 'Date:', booking.eventDate || '31 October 2026', currentY);
      currentY += 18;
      addKeyValue(doc, 'Timing:', booking.eventTime || '2:00 PM – 8:00 PM', currentY);
      currentY += 18;
      addKeyValue(doc, 'Venue:', booking.venue || 'Saptaparni, Banjara Hills, Road No. 8, Hyderabad', currentY);
      currentY += 30;

      drawSectionTitle(doc, currentY, 'Selected Activities');
      currentY += 32;
      const items = Array.isArray(booking.items) ? booking.items : [];
      addItemSummaryTable(doc, currentY, items, booking.amount || 0);
      currentY += 32 + (items.length + 1) * 24 + 6;

      doc.font('Helvetica').fontSize(10).fillColor('#3F2A1A');
      doc.text('Thank you for choosing Vintage Veduka.', pageMargins.left, currentY, { width: 500 });
      doc.text('vintageveduka@gmail.com', pageMargins.left, currentY + 16, { width: 500 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { formatPdfCurrency, generateReceiptPdf };
