// api/weather.js
// This Vercel Serverless Function fetches weather data from a free API.
// This version is more robust and handles potential failures in the geocoding API.

export default async function handler(req, res) {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and Longitude are required.' });
  }

  const weatherApiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
  const geoApiUrl = `https://geocode.maps.co/reverse?lat=${lat}&lon=${lon}`;

  try {
    // First, fetch the essential weather data.
    const weatherResponse = await fetch(weatherApiUrl);
    if (!weatherResponse.ok) {
      throw new Error('Failed to fetch weather data from Open-Meteo.');
    }
    const weatherData = await weatherResponse.json();

    let city = '所在地區'; // Default city name

    // Then, try to fetch the city name, but don't let it block the response.
    try {
      const geoResponse = await fetch(geoApiUrl);
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        const address = geoData.address;
        // Try to find the most specific location name available
        city = address.city || address.town || address.county || city;
      }
    } catch (geoError) {
      console.warn("Could not fetch city name, proceeding without it:", geoError.message);
      // We ignore the error and proceed with the default city name.
    }

    const simplifiedData = {
      currentTemp: Math.round(weatherData.current.temperature_2m),
      tempMax: Math.round(weatherData.daily.temperature_2m_max[0]),
      tempMin: Math.round(weatherData.daily.temperature_2m_min[0]),
      city: city
    };

    res.status(200).json(simplifiedData);
  } catch (error) {
    console.error('Critical error in weather API function:', error);
    res.status(500).json({ error: error.message });
  }
}
