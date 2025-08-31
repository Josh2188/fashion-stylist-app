// /api/background-check.js

import { GoogleGenerativeAI } from "@google/generative-ai";
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase-admin/firestore';
const fetch = require('node-fetch');

// --- Firebase Admin Initialization ---
try {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error("Firebase service account key is not set.");
  }

  // 【最終修正】在解析前，先將金鑰字串化再解析，避免 Vercel 環境變數格式問題
  const serviceAccountString = JSON.stringify(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  const serviceAccount = JSON.parse(JSON.parse(serviceAccountString)); // 雙重解析是必要的

  if (!global._firebaseApp) {
    global._firebaseApp = initializeApp({
      credential: cert(serviceAccount)
    });
  }
} catch (e) {
  console.error('Firebase Admin Initialization Error:', e.message);
}

const db = getFirestore(global._firebaseApp);

// --- Helper Functions ---
const fetchImageAsBase64 = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch (error) {
    console.error(`Error fetching image ${imageUrl}:`, error);
    return null;
  }
};

// --- Main API Handler ---
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  // 檢查 Firebase 是否成功初始化
  if (!global._firebaseApp) {
    return res.status(500).json({ error: 'Firebase Admin SDK not initialized.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API Key is not configured.' });
  }

  try {
    const { itemId, memberId } = req.body;
    if (!itemId || !memberId) {
      return res.status(400).json({ error: 'itemId and memberId are required.' });
    }

    const clothingRef = collection(db, 'clothingItems');
    const q = query(clothingRef, where('memberId', '==', memberId));
    const snapshot = await getDocs(q);
    const allMemberItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const newItem = allMemberItems.find(item => item.id === itemId);
    if (!newItem) {
      return res.status(404).json({ error: 'New item not found.' });
    }

    const newItemBase64 = await fetchImageAsBase64(newItem.imageUrl);
    if (!newItemBase64) {
      return res.status(500).json({ error: 'Failed to process new item image.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = "Are these two images of the same clothing item? Consider variations in angle, lighting, or wrinkles. Please answer only with a single word: 'Yes' or 'No'.";

    let matchFound = false;

    for (const existingItem of allMemberItems) {
      if (existingItem.id === newItem.id) continue;

      const existingImageBase64 = await fetchImageAsBase64(existingItem.imageUrl);
      if (!existingImageBase64) continue;

      const imageParts = [
        { inlineData: { mimeType: "image/jpeg", data: newItemBase64 } },
        { inlineData: { mimeType: "image/jpeg", data: existingImageBase64 } }
      ];

      const result = await model.generateContent([prompt, ...imageParts]);
      const answer = result.response.text().trim().toLowerCase();

      if (answer.includes('yes')) {
        await updateDoc(doc(db, "clothingItems", newItem.id), {
          duplicateStatus: 'needs_review',
          potentialMatchId: existingItem.id
        });
        matchFound = true;
        break;
      }
    }

    if (!matchFound) {
      await updateDoc(doc(db, "clothingItems", newItem.id), {
        duplicateStatus: 'unique'
      });
    }

    res.status(200).json({ success: true, status: matchFound ? 'needs_review' : 'unique' });

  } catch (error) {
    console.error('Error in background check function:', error);
    res.status(500).json({ error: 'An internal error occurred during the check.' });
  }
}
