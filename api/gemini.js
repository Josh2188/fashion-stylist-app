// api/gemini.js
// This function now accepts weather data to provide smarter suggestions.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API Key is not configured on the server.' });
  }

  try {
    // Now we also receive weather data from the frontend
    const { prompt, imageData, weather } = req.body;
    
    let finalPrompt = prompt;

    // If weather data is available, create a more detailed prompt for the AI
    if (weather) {
      finalPrompt = `地點在台灣桃園，目前氣溫約 ${weather.currentTemp}°C，今日高溫 ${weather.tempMax}°C，低溫 ${weather.tempMin}°C。這是一套服裝搭配，請根據這個天氣狀況，用繁體中文給出一句簡短（最多20字）且吸引人的穿搭建議。然後，請務必在下一行加上一個[提醒]標籤，後面跟著一句貼心的天氣或穿搭提醒（例如：早晚溫差大，記得帶件薄外套喔！）。`;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    let parts = [{ text: finalPrompt }];
    if (imageData) {
        const imageParts = Array.isArray(imageData) ? imageData : [imageData];
        imageParts.forEach(img => parts.push({ inlineData: { mimeType: "image/jpeg", data: img } }));
    }

    const payload = {
      contents: [{ parts: parts }],
    };

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error('Gemini API Error:', errorBody);
      throw new Error(`Gemini API call failed with status: ${geminiResponse.status}`);
    }

    const result = await geminiResponse.json();

    if (result.candidates && result.candidates.length > 0) {
      const text = result.candidates[0].content.parts[0].text.trim();
      res.status(200).json({ text: text });
    } else {
      throw new Error("Invalid response structure from Gemini API.");
    }
  } catch (error) {
    console.error('Error in Gemini API function:', error);
    res.status(500).json({ error: error.message });
  }
}
