// /api/gemini.js

// 引入 Google Generative AI SDK
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- Helper Functions (輔助函式) ---

/**
 * 格式化衣物清單，方便 AI 閱讀
 * @param {Array} items - 衣物物件陣列
 * @param {string} categoryName - 分類名稱 (例如: "上身")
 * @returns {string} - 格式化後的字串
 */
const formatClothingList = (items, categoryName) => {
  if (!items || items.length === 0) {
    return `沒有任何${categoryName}可選。\n`;
  }
  // 將每個衣物的描述轉換成一個列表項目
  return `${categoryName}:\n${items.map(item => `- ${item.description || '一件' + categoryName}`).join('\n')}\n`;
};

/**
 * 建立給 AI 的主要提示文字 (Prompt)
 * @param {object} weather - 天氣資訊物件
 * @param {object} outfit - 衣物清單物件
 * @param {string} task - 任務類型 ('generate_suggestions' 或 'score_outfit')
 * @returns {string} - 組合好的提示文字
 */
const createPrompt = (weather, outfit, task) => {
  // AI 的角色設定
  const persona = "你是一位專業、有創意且友善的時尚穿搭顧問。你的目標是根據使用者擁有的衣物和當地天氣，提供實用又有型的穿搭建議。";
  
  // 天氣資訊的文字描述
  const weatherDescription = weather 
    ? `目前的穿搭地點是${weather.city}，天氣為「${weather.description}」，氣溫 ${weather.currentTemp}°C (最低 ${weather.tempMin}°C，最高 ${weather.tempMax}°C)。請務必將天氣狀況作為最重要的考量因素。`
    : "無法獲取天氣資訊，請提供通用建議。";

  // 根據不同任務產生不同的提示內容
  if (task === 'generate_suggestions') {
    // 組合衣物清單
    const clothingInventory = 
      formatClothingList(outfit.tops, "上身") +
      formatClothingList(outfit.bottoms, "下身") +
      formatClothingList(outfit.dresses, "洋裝") +
      formatClothingList(outfit.outwears, "外套");

    return `${persona}\n\n${weatherDescription}\n\n這是我目前擁有的衣物清單：\n${clothingInventory}\n請根據以上條件，為我搭配出三套最適合的穿搭。搭配組合可以是「上身+下身」或「洋裝」。任何組合都可以選擇是否搭配外套。請為每套穿搭提供一個 1-100 分的分數和一句精簡的搭配理由。\n請務必只從我提供的衣物清單中做選擇，不要創造不存在的衣物。`;
  }

  if (task === 'score_outfit') {
    // 組合使用者搭配的衣物描述
    const userOutfitDescription = [
      outfit.dress ? `洋裝: ${outfit.dress.description}` : null,
      outfit.top ? `上身: ${outfit.top.description}` : null,
      outfit.bottom ? `下身: ${outfit.bottom.description}` : null,
      outfit.outerwear ? `外套: ${outfit.outerwear.description}` : null,
    ].filter(Boolean).join('，'); // 移除空值並用逗號連接

    return `${persona}\n\n${weatherDescription}\n\n我搭配了這一套衣服：${userOutfitDescription}。\n請根據天氣、風格、顏色協調性等方面，為這套穿搭打一個 1-100 分的分數，並提供一句精簡的評語說明理由。`;
  }

  return "無效的任務"; // 備用
};


// --- Main API Handler (主要的 API 處理函式) ---

export default async function handler(req, res) {
  // 只接受 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '僅允許 POST 請求' });
  }

  try {
    // 檢查 API Key 是否存在
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("找不到 GEMINI_API_KEY，請在伺服器環境變數中設定。");
    }

    // 初始化 AI 模型
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    // 從請求中獲取資料
    const { prompt: task, outfit, weather } = req.body;

    // 建立完整的提示文字
    const fullPrompt = createPrompt(weather, outfit, task);

    let generationConfig;
    let schema;

    // 根據任務類型設定 AI 回應的格式
    if (task === 'generate_suggestions') {
      // 要求 AI 回傳三套建議的 JSON 格式
      schema = {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            top_desc: { type: "STRING", description: "上身衣物的描述" },
            bottom_desc: { type: "STRING", description: "下身衣物的描述" },
            dress_desc: { type: "STRING", description: "洋裝的描述" },
            outerwear_desc: { type: "STRING", description: "外套的描述" },
            score: { type: "NUMBER", description: "分數 (1-100)" },
            reasoning: { type: "STRING", description: "搭配理由" },
          },
          required: ["score", "reasoning"]
        }
      };
    } else if (task === 'score_outfit') {
      // 要求 AI 回傳評分的 JSON 格式
      schema = {
        type: "OBJECT",
        properties: {
          score: { type: "NUMBER", description: "分數 (1-100)" },
          reasoning: { type: "STRING", description: "評分理由" },
        },
        required: ["score", "reasoning"]
      };
    } else {
      return res.status(400).json({ error: '無效的任務類型' });
    }
    
    // 設定 AI 的生成配置
    generationConfig = {
      responseMimeType: "application/json",
      responseSchema: schema,
    };

    // 呼叫 AI 模型
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig,
    });
    
    const responseText = result.response.text();
    let responseObject;

    // **新增：更安全的 JSON 解析**
    // 嘗試解析 AI 回傳的文字，如果失敗則拋出錯誤
    try {
        responseObject = JSON.parse(responseText);
    } catch (e) {
        // 在後台記錄下 AI 回傳的原始文字，方便除錯
        console.error("Gemini 回應的原始文字 (非JSON):", responseText);
        // 拋出一個新的、更明確的錯誤
        throw new Error("AI 回應的格式並非有效的 JSON。");
    }


    // 回傳成功的結果
    res.status(200).json({ response: responseObject });

  } catch (error) {
    // 統一的錯誤處理
    console.error('API 錯誤:', error);
    res.status(500).json({ error: `伺服器內部錯誤: ${error.message}` });
  }
}
