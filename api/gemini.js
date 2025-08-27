// api/gemini.js
// 全面升級，以處理評分和更複雜的搭配邏輯

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API Key is not configured.' });
  }

  try {
    const { prompt, outfit, weather } = req.body;
    let finalPrompt = '';

    const weatherInfo = weather 
      ? `目前地點在台灣 ${weather.city}，氣溫約 ${weather.currentTemp}°C (高溫 ${weather.tempMax}°C，低溫 ${weather.tempMin}°C)。`
      : '無法獲取天氣資訊。';

    if (prompt === 'generate_suggestions') {
      // 處理 AI 自動推薦
      const { tops, bottoms, dresses, outwears, member } = outfit;
      finalPrompt = `您是一位頂尖的 AI 造型師。${weatherInfo}
請為「${member.name}」從以下衣物清單中，搭配出【三套】風格不同且適合今天天氣的穿搭。

可選衣物 (描述是 AI 產生的參考):
- 上身: ${tops.map(c => c.description).join(', ') || '無'}
- 下身: ${bottoms.map(c => c.description).join(', ') || '無'}
- 洋裝: ${dresses.map(c => c.description).join(', ') || '無'}
- 外套: ${outwears.map(c => c.description).join(', ') || '無'}

搭配規則:
1. 組合可以是「上身+下身」、「洋裝+下身」或「單穿洋裝」。
2. 「上身」或「洋裝」都可以選擇性地外加一件「外套」。
3. 必須從提供的清單中選擇衣物。

您的回答必須是、也只能是一個 JSON 陣列，陣列中包含三個物件，每個物件代表一套穿搭，且必須包含以下鍵:
- "top": (string) 所選上身的描述，如果沒選則為 null。
- "bottom": (string) 所選下身的描述，如果沒選則為 null。
- "dress": (string) 所選洋裝的描述，如果沒選則為 null。
- "outerwear": (string) 所選外套的描述，如果沒選則為 null。
- "score": (number) 您對此搭配的評分 (0-100)。
- "reasoning": (string) 簡短的評分理由和穿搭建議。

JSON 範例:
[
  { "top": "白色T恤", "bottom": "藍色牛仔褲", "dress": null, "outerwear": "黑色皮夾克", "score": 95, "reasoning": "經典的街頭風格，皮夾克提供了層次感，非常適合今天的涼爽天氣。" },
  { "top": null, "bottom": null, "dress": "碎花長洋裝", "outerwear": null, "score": 88, "reasoning": "這件洋裝充滿夏日氣息，單穿就很優雅，適合白天的戶外活動。" }
]`;

    } else if (prompt === 'score_outfit') {
      // 處理手動搭配的評分
      const { top, bottom, dress, outerwear } = outfit;
      const outfitDesc = [
          top ? `上身: ${top.description}` : null,
          bottom ? `下身: ${bottom.description}` : null,
          dress ? `洋裝: ${dress.description}` : null,
          outerwear ? `外套: ${outerwear.description}` : null,
      ].filter(Boolean).join('，');

      finalPrompt = `您是一位頂尖的 AI 造型師。${weatherInfo}
使用者自行搭配了一套穿搭：「${outfitDesc}」。

您的任務是為這套穿搭評分，並嚴格遵循以下 JSON 格式回傳，不要有任何額外的文字或符號:
{
  "score": (number) 您對此搭配的評分 (0-100)。
  "reasoning": (string) 簡短的評分理由，說明優點、潛在問題，並根據天氣提供建議。
}`;
    } else {
      return res.status(400).json({ error: 'Invalid prompt type.' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text: finalPrompt }] }] };

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
    if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
      const text = result.candidates[0].content.parts[0].text;
      res.status(200).json({ response: text });
    } else {
      throw new Error("Invalid response structure from Gemini API.");
    }

  } catch (error) {
    console.error('Error in Gemini API function:', error);
    res.status(500).json({ error: error.message });
  }
}
