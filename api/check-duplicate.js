// api/check-duplicate.js
// This Vercel Serverless Function uses Gemini to visually compare images.

// Helper function to fetch an image and convert it to a base64 string.
const fetchImageAsBase64 = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch (error) {
    console.error(`Failed to fetch image: ${imageUrl}`, error);
    return null;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API Key is not configured.' });
  }

  try {
    const { newImageBase64, existingItems } = req.body;

    if (!newImageBase64 || !Array.isArray(existingItems)) {
      return res.status(400).json({ error: 'Invalid request body.' });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    const prompt = "Are these two images of the same clothing item? Consider variations in angle, lighting, or wrinkles. Please answer only with a single word: 'Yes' or 'No'.";

    // Iterate through existing items to check for duplicates.
    for (const item of existingItems) {
      const existingImageBase64 = await fetchImageAsBase64(item.imageUrl);
      if (!existingImageBase64) continue; // Skip if fetching fails

      const payload = {
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: newImageBase64 } },
            { inlineData: { mimeType: "image/jpeg", data: existingImageBase64 } }
          ]
        }]
      };

      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!geminiResponse.ok) {
        console.warn(`Gemini API call failed for item ${item.id}. Status: ${geminiResponse.status}`);
        continue; // Skip to the next item if one comparison fails
      }

      const result = await geminiResponse.json();
      
      if (result.candidates && result.candidates.length > 0) {
        const answer = result.candidates[0].content.parts[0].text.trim().toLowerCase();
        if (answer.includes('yes')) {
          // Found a duplicate, return immediately.
          return res.status(200).json({ isDuplicate: true, matchingItem: item });
        }
      }
    }

    // If the loop completes without finding any duplicates.
    res.status(200).json({ isDuplicate: false });

  } catch (error) {
    console.error('Error in duplicate check function:', error);
    res.status(500).json({ error: 'An internal error occurred during the duplicate check.' });
  }
}
