const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/contributions', async (req, res) => {
  const { username, year } = req.query;

  if (!username || !year) {
    return res.status(400).json({ error: 'Please provide both username and year.' });
  }

  const url = `https://github.com/users/${username}/contributions?tab=overview&from=${year}-01-01&to=${year}-12-31`;

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const contributions = generateDefaultContributions(year);

    $('.ContributionCalendar-day').each((_, element) => {
      const date = $(element).attr('data-date');
      const dataLevel = parseInt($(element).attr('data-level') || '0');

      if (date && contributions[date]) {
        contributions[date].dataLevel = dataLevel;
      }
    });

    $('.sr-only').each((_, element) => {
      const text = $(element).text().trim();
      const match = text.match(/(\d+)\s+contributions?\s+on\s+([\w\s\d]+)/);

      if (match) {
        const amount = parseInt(match[1]);
        const dateText = match[2];
        const parsedDate = parseDateText(dateText, year);

        if (parsedDate && contributions[parsedDate]) {
          contributions[parsedDate].amount = amount;
        }
      }
    });

    const resultArray = Object.values(contributions).sort((a, b) => new Date(a.date) - new Date(b.date));
    res.json({ username, year, daily_contributions: resultArray });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data.' });
  }
});

function generateDefaultContributions(year) {
  const contributions = {};
  const startDate = new Date(`${year}-01-01`);
  const endDate = new Date(`${year}-12-31`);

  for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
    const formattedDate = date.toISOString().split('T')[0];
    contributions[formattedDate] = { date: formattedDate, dataLevel: 0, amount: 0 };
  }

  return contributions;
}

function parseDateText(dateText, year) {
  const months = {
    January: '01', February: '02', March: '03', April: '04',
    May: '05', June: '06', July: '07', August: '08',
    September: '09', October: '10', November: '11', December: '12'
  };

  const match = dateText.match(/([A-Za-z]+)\s+(\d+)/);
  if (match) {
    const month = months[match[1]];
    const day = match[2].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return null;
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
