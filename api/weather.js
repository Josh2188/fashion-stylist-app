// api/weather.js
// This Vercel Serverless Function fetches weather data from a free API.

export default async function handler(req, res) {
  // Get latitude and longitude from the query parameters
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and Longitude are required.' });
  }

  // We use the Open-Meteo API, which is free and doesn't require an API key.
  const weatherApiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;

  try {
    const weatherResponse = await fetch(weatherApiUrl);
    if (!weatherResponse.ok) {
      throw new Error('Failed to fetch weather data.');
    }
    const weatherData = await weatherResponse.json();

    // Simplify the data structure to send back to the frontend
    const simplifiedData = {
      currentTemp: Math.round(weatherData.current.temperature_2m),
      tempMax: Math.round(weatherData.daily.temperature_2m_max[0]),
      tempMin: Math.round(weatherData.daily.temperature_2m_min[0]),
    };

    res.status(200).json(simplifiedData);
  } catch (error) {
    console.error('Error in weather API function:', error);
    res.status(500).json({ error: error.message });
  }
}
