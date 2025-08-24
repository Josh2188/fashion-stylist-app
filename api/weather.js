// api/weather.js
// This function now also fetches the city name.

export default async function handler(req, res) {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and Longitude are required.' });
  }

  // Weather API for temperature data
  const weatherApiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
  
  // Geocoding API for getting the city name (also free, no key needed)
  const geoApiUrl = `https://geocode.maps.co/reverse?lat=${lat}&lon=${lon}`;

  try {
    // Fetch both weather and location data in parallel
    const [weatherResponse, geoResponse] = await Promise.all([
      fetch(weatherApiUrl),
      fetch(geoApiUrl)
    ]);

    if (!weatherResponse.ok) throw new Error('Failed to fetch weather data.');
    if (!geoResponse.ok) throw new Error('Failed to fetch location data.');

    const weatherData = await weatherResponse.json();
    const geoData = await geoResponse.json();

    // Extract the city or district from the address
    const address = geoData.address;
    const city = address.city || address.town || address.county || '未知地區';

    const simplifiedData = {
      currentTemp: Math.round(weatherData.current.temperature_2m),
      tempMax: Math.round(weatherData.daily.temperature_2m_max[0]),
      tempMin: Math.round(weatherData.daily.temperature_2m_min[0]),
      city: city
    };

    res.status(200).json(simplifiedData);
  } catch (error) {
    console.error('Error in weather/geo API function:', error);
    res.status(500).json({ error: error.message });
  }
}
