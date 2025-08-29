// /api/gemini.js

// 引入 Google Generative AI SDK
import { GoogleGenerativeAI } from "@google/generative-ai";
// 使用 require 語法來引入 node-fetch v2
const fetch = require('node-fetch');

// --- Helper Functions (輔助函式) ---

const formatClothingList = (items, categoryName) => {
  if (!items || items.length === 0) return `沒有任何${categoryName}可選。\n`;
  return `${categoryName}:\n${items.map(item => `- [id: ${item.id}] ${item.description || '一件' + categoryName}`).join('\n')}\n`;
};

// 【最終修正】提示詞現在一次要求三套，並強調多樣性
const createPrompt = (weather, outfit) => {
  const persona = "你是一位專業、有創意且友善的時尚穿搭顧問。你的目標是根據使用者擁有的衣物和當地天氣，提供實用又有型的穿搭建議。";
  const weatherDescription = weather 
    ? `目前的穿搭地點是${weather.city}，天氣為「${weather.description}」，氣溫 ${weather.currentTemp}°C (最低 ${weather.tempMin}°C，最高 ${weather.tempMax}°C)。請務必將天氣狀況作為最重要的考量因素。`
    : "無法獲取天氣資訊，請提供通用建議。";
  
  const clothingInventory = formatClothingList(outfit.tops, "上身") + formatClothingList(outfit.bottoms, "下身") + formatClothingList(outfit.dresses, "洋裝") + formatClothingList(outfit.outwears, "外套");
  
  // 【關鍵修正】明確要求 AI 提供三套風格不同的穿搭
  return `${persona}\n\n${weatherDescription}\n\n這是我目前擁有的衣物清單：\n${clothingInventory}\n請根據以上條件，為我搭配出「三套」最適合的穿搭。請務必確保這三套穿搭彼此之間有顯著的風格差異。請為每一套穿搭提供一個分數和一句精簡的理由。`;
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

    // 任務：描述圖片 (維持不變)
    if (task === 'describe_image') {
        if (!imageUrl) return res.status(400).json({ error: '缺少圖片網址' });
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) throw new Error(`無法從網址下載圖片: ${imageResponse.statusText}`);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Data = Buffer.from(imageBuffer).toString('base64');
        const promptText = "你是一位時尚單品描述專家。請用一句話，精準且生動地描述這件衣物。請包含顏色、款式、材質或圖案等關鍵特徵。例如：「一件黑色的高腰緊身牛仔褲」或「一件米白色的麻花針織毛衣」。描述請使用繁體中文。";
        const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Data } };
        const result = await model.generateContent([promptText, imagePart]);
        const description = result.response.text().trim();
        return res.status(200).json({ response: { description: description } });
    }
    
    // 任務：評分 (維持不變，但使用 REST API)
    if (task === 'score_outfit') {
        const persona = "你是一位專業、有創意且友善的時尚穿搭顧問。";
        const weatherDescription = weather ? `目前的穿搭地點是${weather.city}，天氣為「${weather.description}」，氣溫 ${weather.currentTemp}°C。` : "";
        const userOutfitDescription = [outfit.dress && `洋裝: ${outfit.dress.description}`, outfit.top && `上身: ${outfit.top.description}`, outfit.bottom && `下身: ${outfit.bottom.description}`, outfit.outerwear && `外套: ${outgit.outerwear.description}`].filter(Boolean).join('，');
        const fullPrompt = `${persona}\n\n${weatherDescription}\n\n我搭配了這一套衣服：${userOutfitDescription}。\n請根據天氣、風格、顏色協調性等方面，為這套穿搭打一個 1-100 分的分數，並提供一句精簡的評語說明理由。`;
        const schema = { type: "OBJECT", properties: { score: { type: "NUMBER" }, reasoning: { type: "STRING" } }, required: ["score", "reasoning"] };
        
        const generationConfig = { responseMimeType: "application/json", responseSchema: schema };
        const result = await model.generateContent(fullPrompt, generationConfig);
        const responseObject = JSON.parse(result.response.text());
        return res.status(200).json({ response: responseObject });
    }
    
    // 【最終修正】任務：產生建議 (回到最初的架構，但提示詞已優化)
    if (task === 'generate_suggestions') {
        const fullPrompt = createPrompt(weather, outfit);
        const schema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    top_id: { type: "STRING" },
                    bottom_id: { type: "STRING" },
                    dress_id: { type: "STRING" },
                    outerwear_id: { type: "STRING" },
                    score: { type: "NUMBER" },
                    reasoning: { type: "STRING" }
                },
                required: ["score", "reasoning"]
            }
        };

        const generationConfig = { responseMimeType: "application/json", responseSchema: schema };
        
        // 增加重試機制
        for (let i = 0; i < 3; i++) {
            try {
                const result = await model.generateContent(fullPrompt, generationConfig);
                const responseObject = JSON.parse(result.response.text());

                // 驗證回應是否有效
                if (Array.isArray(responseObject) && responseObject.length > 0) {
                    const validSuggestions = responseObject.filter(s => s.score && s.reasoning && (s.dress_id || (s.top_id && s.bottom_id)));
                    if (validSuggestions.length > 0) {
                        return res.status(200).json({ response: validSuggestions });
                    }
                }
            } catch (error) {
                console.warn(`Attempt ${i + 1} failed:`, error.message);
                if (i === 2) throw error; // 最後一次嘗試失敗則拋出錯誤
            }
        }
    }

    return res.status(400).json({ error: '無效的任務類型' });

  } catch (error) {
    console.error('API 執行錯誤:', error);
    res.status(500).json({ error: `伺服器內部錯誤: ${error.message}` });
  }
}

