function formatIstDateTime(value) {
  const parsedDate = value ? new Date(value) : new Date();
  const date = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);

  const getPart = (type) => parts.find((part) => part.type === type)?.value || '';
  const day = getPart('day');
  const month = getPart('month');
  const year = getPart('year');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const period = (getPart('dayPeriod') || '').toUpperCase();

  return `${day} ${month} ${year}, ${hour}:${minute} ${period} IST`;
}

function toIstIso(value) {
  const date = value ? new Date(value) : new Date();
  return date.toISOString();
}

module.exports = { formatIstDateTime, toIstIso };
