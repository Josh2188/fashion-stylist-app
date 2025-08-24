import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 錯誤的 import 已經被完全移除

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA 的註冊現在完全由 public/index.html 中的 script 處理，
// 這個檔案不再需要任何相關程式碼。
