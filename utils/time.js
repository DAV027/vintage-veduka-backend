function formatIstDateTime(value) {
  const date = value ? new Date(value) : new Date();
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);

  const partValues = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const day = partValues.day;
  const month = partValues.month;
  const year = partValues.year;
  const hour = partValues.hour;
  const minute = partValues.minute;
  const period = (partValues.dayPeriod || '').toUpperCase();

  return `${day} ${month} ${year}, ${hour}:${minute} ${period} IST`;
}

function toIstIso(value) {
  const date = value ? new Date(value) : new Date();
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return istDate.toISOString();
}

module.exports = { formatIstDateTime, toIstIso };
