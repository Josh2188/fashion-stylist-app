// /api/gemini.js

import { GoogleGenerativeAI } from "@google/generative-ai";
const fetch = require('node-fetch');

// --- Helper Functions ---
const formatClothingList = (items, categoryName) => {
  if (!Array.isArray(items) || items.length === 0) return `沒有任何${categoryName}可選。\n`;
  return `${categoryName}:\n${items
    .filter(item => item && typeof item === 'object' && item.id)
    .map(item => `- [id: ${item.id}] ${item.description || `一件${categoryName}`}`)
    .join('\n')}\n`;
};

const createPrompt = (weather, outfit) => {
  const persona = "你是一位專業、有創意且友善的時尚穿搭顧問。你的目標是根據使用者擁有的衣物和當地天氣，提供實用又有型的穿搭建議。";
  const weatherDescription = weather 
    ? `目前的穿搭地點是${weather.city}，天氣為「${weather.description}」，氣溫 ${weather.currentTemp}°C (最低 ${weather.tempMin}°C，最高 ${weather.tempMax}°C)。請務必將天氣狀況作為最重要的考量因素。`
    : "無法獲取天氣資訊，請提供通用建議。";
  
  const clothingInventory = [
    formatClothingList(outfit.tops || [], "上身"),
    formatClothingList(outfit.bottoms || [], "下身"),
    formatClothingList(outfit.dresses || [], "洋裝"),
    formatClothingList(outfit.outwears || [], "外套")
  ].join('');
  
  const schema = `{ "top_id": "string", "bottom_id": "string", "dress_id": "string", "outerwear_id": "string", "score": "number", "reasoning": "string" }`;
  return `${persona}\n\n${weatherDescription}\n\n這是我目前擁有的衣物清單：\n${clothingInventory}\n請根據以上條件，為我搭配出「三套」最適合的穿搭。請務必確保這三套穿搭彼此之間有顯著的風格差異。請為每一套穿搭提供一個分數和一句精簡的理由。\n\n**重要：** 在你的回覆中，請務必包含一個有效的 JSON 陣列 (Array)，其中包含三個物件 (Object)，每個物件都符合以下結構：${schema}。`;
};

// --- Main API Handler ---
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
    
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: '無效的請求主體' });
    }
    const { prompt: task, outfit, weather, imageUrl } = req.body;

    // 任務：描述圖片
    if (task === 'describe_image') {
      // ... (此部分邏輯不變)
    }
    
    // 任務：評分
    if (task === 'score_outfit') {
      // ... (此部分邏輯不變)
    }
    
    // 任務：產生建議
    if (task === 'generate_suggestions') {
      const fullPrompt = createPrompt(weather, outfit);
      let responseObject = [];
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const result = await model.generateContent(fullPrompt);
          const responseText = result.response.text();
          
          // 【最終修正】使用更穩健的 JSON 解析策略
          let jsonString = null;
          const markdownMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);

          if (markdownMatch && markdownMatch[1]) {
            jsonString = markdownMatch[1];
          } else {
            const arrayMatch = responseText.match(/\[[\s\S]*\]/);
            if (arrayMatch && arrayMatch[0]) {
              jsonString = arrayMatch[0];
            }
          }
          
          if (jsonString) {
            let parsedJson = JSON.parse(jsonString);
            
            if (Array.isArray(parsedJson)) {
              const validSuggestions = parsedJson.filter(s =>
                s && typeof s.score === 'number' && typeof s.reasoning === 'string' &&
                (typeof s.dress_id === 'string' || (typeof s.top_id === 'string' && typeof s.bottom_id === 'string'))
              );
              
              if (validSuggestions.length > 0) {
                responseObject = validSuggestions;
                break; 
              }
            }
          }
          console.log(`Attempt ${attempt} succeeded but no valid suggestions found. Retrying...`);
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);
          if (attempt === 3) {
            return res.status(500).json({ error: 'AI 服務暫時不穩定，請稍後再試' });
          }
        }
      }
      return res.status(200).json({ response: responseObject });
    }

    return res.status(400).json({ error: '無效的任務類型' });

  } catch (error) {
    console.error('API 執行錯誤:', error);
    return res.status(500).json({ error: '向 AI 請求建議時發生未預期的錯誤。' });
  }
}
