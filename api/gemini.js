// /api/gemini.js

// 引入 Google Generative AI SDK
import { GoogleGenerativeAI } from "@google/generative-ai";
// Node.js v18+ 內建了 fetch
import fetch from 'node-fetch';

// --- Helper Functions (輔助函式) ---

const formatClothingList = (items, categoryName) => {
  if (!items || items.length === 0) return `沒有任何${categoryName}可選。\n`;
  return `${categoryName}:\n${items.map(item => `- ${item.description || '一件' + categoryName}`).join('\n')}\n`;
};

const createPrompt = (weather, outfit, task) => {
  const persona = "你是一位專業、有創意且友善的時尚穿搭顧問。你的目標是根據使用者擁有的衣物和當地天氣，提供實用又有型的穿搭建議。";
  const weatherDescription = weather 
    ? `目前的穿搭地點是${weather.city}，天氣為「${weather.description}」，氣溫 ${weather.currentTemp}°C (最低 ${weather.tempMin}°C，最高 ${weather.tempMax}°C)。請務必將天氣狀況作為最重要的考量因素。`
    : "無法獲取天氣資訊，請提供通用建議。";

  if (task === 'generate_suggestions') {
    const clothingInventory = formatClothingList(outfit.tops, "上身") + formatClothingList(outfit.bottoms, "下身") + formatClothingList(outfit.dresses, "洋裝") + formatClothingList(outfit.outwears, "外套");
    return `${persona}\n\n${weatherDescription}\n\n這是我目前擁有的衣物清單：\n${clothingInventory}\n請根據以上條件，為我搭配出三套最適合的穿搭。搭配組合可以是「上身+下身」或「洋裝」。任何組合都可以選擇是否搭配外套。請為每套穿搭提供一個 1-100 分的分數和一句精簡的搭配理由。\n請務必只從我提供的衣物清單中做選擇，不要創造不存在的衣物。`;
  }

  if (task === 'score_outfit') {
    const userOutfitDescription = [outfit.dress && `洋裝: ${outfit.dress.description}`, outfit.top && `上身: ${outfit.top.description}`, outfit.bottom && `下身: ${outfit.bottom.description}`, outfit.outerwear && `外套: ${outfit.outerwear.description}`].filter(Boolean).join('，');
    return `${persona}\n\n${weatherDescription}\n\n我搭配了這一套衣服：${userOutfitDescription}。\n請根據天氣、風格、顏色協調性等方面，為這套穿搭打一個 1-100 分的分數，並提供一句精簡的評語說明理由。`;
  }
  
  // **新增：產生詳細描述的提示詞**
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

    // **新增：處理圖片描述任務**
    if (task === 'describe_image') {
        if (!imageUrl) {
            return res.status(400).json({ error: '缺少圖片網址' });
        }
        
        // 在後端下載圖片
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`無法從網址下載圖片: ${imageResponse.statusText}`);
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Data = Buffer.from(imageBuffer).toString('base64');

        const prompt = createPrompt(null, null, 'describe_image');
        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64Data,
            },
        };
        
        const result = await model.generateContent([prompt, imagePart]);
        const description = result.response.text().trim();
        return res.status(200).json({ response: { description: description } });
    }

    // --- 以下為處理文字任務的既有邏輯 ---
    const fullPrompt = createPrompt(weather, outfit, task);
    let schema;

    if (task === 'generate_suggestions') {
      schema = { type: "ARRAY", items: { type: "OBJECT", properties: { top_desc: { type: "STRING" }, bottom_desc: { type: "STRING" }, dress_desc: { type: "STRING" }, outerwear_desc: { type: "STRING" }, score: { type: "NUMBER" }, reasoning: { type: "STRING" } }, required: ["score", "reasoning"] } };
    } else if (task === 'score_outfit') {
      schema = { type: "OBJECT", properties: { score: { type: "NUMBER" }, reasoning: { type: "STRING" } }, required: ["score", "reasoning"] };
    } else {
      return res.status(400).json({ error: '無效的任務類型' });
    }
    
    const generationConfig = { responseMimeType: "application/json", responseSchema: schema };
    const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: fullPrompt }] }], generationConfig });
    
    const responseText = result.response.text();
    const responseObject = JSON.parse(responseText);
    res.status(200).json({ response: responseObject });

  } catch (error) {
    console.error('API 執行錯誤:', error);
    res.status(500).json({ error: `伺服器內部錯誤: ${error.message}` });
  }
}
