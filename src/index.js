import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// 我們將 serviceWorkerRegistration 引入的方式稍微改變
import { unregister } from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 關鍵的修改在這裡：
// 我們不再呼叫 register()，因為我們的 service-worker.js 是自訂的。
// Vercel 會自動處理 PWA 的註冊，所以我們不需要在這裡做任何事情。
// 如果您未來想取消 PWA 功能，可以呼叫 unregister()。
// For now, we can comment this out or call unregister if needed.
// unregister();

// 我們將手動在 public/index.html 中載入 service worker，
// 所以這裡不需要再做任何註冊。
