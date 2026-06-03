const url = require('url');
const https = require('https');

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars';
const PH_HOLIDAYS_CALENDAR_ID = 'en.philippines%23holiday%40group.v.calendar.google.com';

function holidayRoutes(req, res, parsedUrl) {
  const path = parsedUrl.pathname;
  const method = req.method;

  if (method === 'GET' && path === '/api/holidays/philippines') {
    handleGetPhilippineHolidays(req, res, parsedUrl.query);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Route not found' }));
  }
}

async function handleGetPhilippineHolidays(req, res, query) {
  try {
    const year = parseInt(query.year) || new Date().getFullYear();
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ holidays: [], error: 'GOOGLE_API_KEY not configured' }));
      return;
    }

    const timeMin = new Date(Date.UTC(year, 0, 1)).toISOString();
    const timeMax = new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();

    const apiUrl = `${GOOGLE_CALENDAR_API_BASE}/${PH_HOLIDAYS_CALENDAR_ID}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&orderBy=startTime&singleEvents=true`;

    const data = await fetchFromGoogle(apiUrl);

    const holidays = (data.items || []).map(item => ({
      date: (item.start?.date || item.start?.dateTime || '').slice(0, 10),
      name: item.summary || 'Unknown Holiday',
      description: item.description || ''
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ holidays }));
  } catch (error) {
    console.error('Error fetching Philippine holidays:', error);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ holidays: [], error: error.message }));
  }
}

function fetchFromGoogle(apiUrl) {
  return new Promise((resolve, reject) => {
    https.get(apiUrl, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse Google API response'));
        }
      });
    }).on('error', reject);
  });
}

module.exports = holidayRoutes;
