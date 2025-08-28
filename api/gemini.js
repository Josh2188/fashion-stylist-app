// /api/gemini.js

// 引入 Google Generative AI SDK (僅用於圖片處理)
import { GoogleGenerativeAI } from "@google/generative-ai";
// 使用 require 語法來引入 node-fetch v2
const fetch = require('node-fetch');

// --- Helper Functions (輔助函式) ---

const formatClothingList = (items, categoryName) => {
  if (!items || items.length === 0) return `沒有任何${categoryName}可選。\n`;
  return `${categoryName}:\n${items.map(item => `- [id: ${item.id}] ${item.description || '一件' + categoryName}`).join('\n')}\n`;
};

const createPrompt = (weather, outfit, task) => {
  const persona = "你是一位專業、有創意且友善的時尚穿搭顧問。你的目標是根據使用者擁有的衣物和當地天氣，提供實用又有型的穿搭建議。";
  const weatherDescription = weather 
    ? `目前的穿搭地點是${weather.city}，天氣為「${weather.description}」，氣溫 ${weather.currentTemp}°C (最低 ${weather.tempMin}°C，最高 ${weather.tempMax}°C)。請務必將天氣狀況作為最重要的考量因素。`
    : "無法獲取天氣資訊，請提供通用建議。";

  if (task === 'generate_suggestions') {
    const clothingInventory = formatClothingList(outfit.tops, "上身") + formatClothingList(outfit.bottoms, "下身") + formatClothingList(outfit.dresses, "洋裝") + formatClothingList(outfit.outwears, "外套");
    // 【最終修正】要求 AI 回傳極其簡單的純文字格式
    return `${persona}\n\n${weatherDescription}\n\n這是我目前擁有的衣物清單：\n${clothingInventory}\n請根據以上條件，為我搭配出三套最適合的穿搭。請在每一行只回覆一套穿搭，並嚴格遵循以下兩種格式之一：\n1. 洋裝搭配: DRESS:[洋裝ID],OUTERWEAR:[外套ID(可選)],SCORE:[分數],REASON:[一句精簡的理由]\n2. 上下身搭配: TOP:[上身ID],BOTTOM:[下身ID],OUTERWEAR:[外套ID(可選)],SCORE:[分數],REASON:[一句精簡的理由]\n請不要包含任何 JSON 格式、引號、或多餘的文字。`;
  }

  if (task === 'describe_image') {
    return "你是一位時尚單品描述專家。請用一句話，精準且生動地描述這件衣物。請包含顏色、款式、材質或圖案等關鍵特徵。例如：「一件黑色的高腰緊身牛仔褲」或「一件米白色的麻花針織毛衣」。描述請使用繁體中文。";
  }

  return "無效的任務";
};


// --- Main API Handler (主要的 API 處理函式) ---

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '僅允許 POST 請求' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("API 錯誤: 找不到 GEMINI_API_KEY 環境變數。");
    return res.status(500).json({ error: "伺服器設定錯誤：找不到 API 金鑰。" });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const { prompt: task, outfit, weather, imageUrl } = req.body;

    // 任務：描述圖片 (維持使用 SDK)
    if (task === 'describe_image') {
        if (!imageUrl) return res.status(400).json({ error: '缺少圖片網址' });
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) throw new Error(`無法從網址下載圖片: ${imageResponse.statusText}`);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Data = Buffer.from(imageBuffer).toString('base64');
        const prompt = createPrompt(null, null, 'describe_image');
        const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Data } };
        const result = await model.generateContent([prompt, imagePart]);
        const description = result.response.text().trim();
        return res.status(200).json({ response: { description: description } });
    }

    // --- 【最終修正】任務：文字生成 (獲取純文字後由後端自行解析) ---
    if (task === 'generate_suggestions') {
        const fullPrompt = createPrompt(weather, outfit, task);
        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();

        // 由後端程式碼負責解析 AI 回傳的簡單文字
        const suggestions = [];
        const lines = responseText.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
            const suggestion = {};
            // 使用正規表達式來穩定地抓取鍵值對
            const parts = line.match(/([A-Z_]+):\[([^\]]+)\]/g) || [];
            
            for (const part of parts) {
                const match = part.match(/([A-Z_]+):\[([^\]]+)\]/);
                if (match) {
                    const key = match[1].toLowerCase();
                    const value = match[2];
                    if (key === 'top') suggestion.top_id = value;
                    else if (key === 'bottom') suggestion.bottom_id = value;
                    else if (key === 'dress') suggestion.dress_id = value;
                    else if (key === 'outerwear') suggestion.outerwear_id = value;
                    else if (key === 'score') suggestion.score = parseInt(value, 10);
                    else if (key === 'reason') suggestion.reasoning = value;
                }
            }
            
            // 驗證解析出的物件是否完整
            if (suggestion.score && suggestion.reasoning && (suggestion.dress_id || (suggestion.top_id && suggestion.bottom_id))) {
                suggestions.push(suggestion);
            }
        }
        
        return res.status(200).json({ response: suggestions });
    }

    // 對於其他任務，如果未來有需要，可以加在這裡
    return res.status(400).json({ error: '無效的任務類型' });

  } catch (error) {
    console.error('API 執行錯誤:', error);
    res.status(500).json({ error: `伺服器內部錯誤: ${error.message}` });
  }
}
