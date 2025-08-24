// This is a Vercel Serverless Function that runs on the backend.
// It securely handles the Gemini API key.

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Get the Gemini API Key securely from Vercel's environment variables
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API Key is not configured on the server.' });
  }

  try {
    const { prompt, imageData } = req.body;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    let parts = [{ text: prompt }];
    if (imageData) {
        const imageParts = Array.isArray(imageData) ? imageData : [imageData];
        imageParts.forEach(img => parts.push({ inlineData: { mimeType: "image/jpeg", data: img } }));
    }

    const payload = {
      contents: [{ parts: parts }],
    };

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
