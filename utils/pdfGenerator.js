const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { formatIstDateTime } = require('./time');

const logoHeight = 40;
const pageMargins = { top: 72, bottom: 72, left: 56, right: 56 };

function addHeader(doc) {
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#5A2D1A');
  doc.text('Vintage Veduka', pageMargins.left, pageMargins.top, { align: 'left' });
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(10).fillColor('#5A2D1A');
  doc.text('Heritage Event Booking Receipt', { align: 'left' });
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

function addTicketSummaryTable(doc, startY, adults, children, amount) {
  const rowHeight = 24;
  const cellX = [pageMargins.left, 240, 340, 460];
  const tableWidth = 612 - pageMargins.left - pageMargins.right;

  doc.roundedRect(pageMargins.left - 4, startY - 6, tableWidth + 8, rowHeight * 4 + 12, 12)
    .fillOpacity(0.06)
    .fill('#5A2D1A')
    .fillOpacity(1);

  doc.fillColor('#5A2D1A').font('Helvetica-Bold').fontSize(11);
  ['Category', 'Quantity', 'Price', 'Total'].forEach((heading, index) => {
    doc.text(heading, cellX[index], startY, { width: index === 3 ? 132 : 100 });
  });

  const headingBottom = startY + rowHeight - 6;
  doc.moveTo(pageMargins.left, headingBottom)
    .lineTo(612 - pageMargins.right, headingBottom)
    .stroke('#D4AF37');

  const dataRows = [
    { label: 'Adults', value: adults, price: '₹500', total: `₹${adults * 500}` },
    { label: 'Children', value: children, price: '₹200', total: `₹${children * 200}` },
    { label: 'Grand Total', value: '', price: '', total: `₹${amount}` },
  ];

  let currentY = startY + 10;
  doc.font('Helvetica').fontSize(10);
  dataRows.forEach((row, index) => {
    const rowTop = currentY + index * rowHeight;
    doc.fillColor('#5A2D1A').text(row.label, cellX[0], rowTop);
    doc.text(row.value, cellX[1], rowTop);
    doc.text(row.price, cellX[2], rowTop);
    doc.font('Helvetica-Bold').text(row.total, cellX[3], rowTop);
  });
}

async function generateReceiptPdf(booking) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: pageMargins });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      addWatermark(doc);
      addHeader(doc);

      const yStart = pageMargins.top + 80;
      let currentY = yStart;

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
      addKeyValue(doc, 'Order ID:', booking.orderId || '--', currentY);
      currentY += 18;
      addKeyValue(doc, 'Payment ID:', booking.paymentId || '--', currentY);
      currentY += 18;
      addKeyValue(doc, 'Booking Date:', formatIstDateTime(booking.bookingDate), currentY);
      currentY += 30;

      drawSectionTitle(doc, currentY, 'Event Information');
      currentY += 28;
      addKeyValue(doc, 'Event Date:', booking.eventDate || '22 August', currentY);
      currentY += 18;
      addKeyValue(doc, 'Venue:', booking.venue || 'SK Retreat Farmstay', currentY);
      currentY += 30;

      drawSectionTitle(doc, currentY, 'Ticket Summary');
      currentY += 32;
      addTicketSummaryTable(doc, currentY, booking.adults || 0, booking.children || 0, booking.amount || 0);
      currentY += 120;

      const qrString = `Booking:${booking.bookingId} | Payment:${booking.paymentId}`;
      const qrDataUrl = await QRCode.toDataURL(qrString, { margin: 1, color: { dark: '#5A2D1A', light: '#ffffff' } });
      const qrImage = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      doc.image(Buffer.from(qrImage, 'base64'), pageMargins.left, currentY, { width: 110, height: 110 });

      doc.font('Helvetica-Bold').fontSize(12).fillColor('#5A2D1A');
      doc.text('Scan for verification', pageMargins.left + 130, currentY + 38);

      doc.font('Helvetica').fontSize(10).fillColor('#3F2A1A');
      doc.text('Thank you for choosing Vintage Veduka.', pageMargins.left, currentY + 140, { width: 500 });
      doc.text('vintageveduka@gmail.com | vintageveduka.com', pageMargins.left, currentY + 158, { width: 500 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateReceiptPdf };
