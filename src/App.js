import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage, signInAnonymously, onAuthStateChanged } from './firebase';
import { collection, addDoc, query, where, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";

// --- Icon Components ---
const createSvgIcon = (path) => (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke={props.color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>{path}</svg>
);
const UserIcon = createSvgIcon(<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>);
const PlusIcon = createSvgIcon(<><path d="M5 12h14" /><path d="M12 5v14" /></>);
const CameraIcon = createSvgIcon(<><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></>);
const Trash2Icon = createSvgIcon(<><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></>);
const Wand2Icon = createSvgIcon(<><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L11.8 9.2a1.21 1.21 0 0 0 0 1.72l5.8 5.8a1.21 1.21 0 0 0 1.72 0l6.84-6.84a1.21 1.21 0 0 0 0-1.72Z" /><path d="m14 7 3 3" /><path d="M5 6v4" /><path d="M19 14v4" /><path d="M10 2v2" /><path d="M7 8H3" /><path d="M21 16h-4" /><path d="M11 3H9" /></>);
const RefreshCwIcon = createSvgIcon(<><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></>);
const LightbulbIcon = createSvgIcon(<><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></>);
const XIcon = createSvgIcon(<><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></>);
const GalleryIcon = createSvgIcon(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></>);
const SunIcon = createSvgIcon(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></>);

function App() {
    const [user, setUser] = useState(null);
    const [profiles, setProfiles] = useState([]);
    const [activeProfile, setActiveProfile] = useState(null);
    const [clothingItems, setClothingItems] = useState([]);
    const [tops, setTops] = useState([]);
    const [bottoms, setBottoms] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [manualSelection, setManualSelection] = useState({ top: null, bottom: null });
    const [manualSuggestion, setManualSuggestion] = useState('');
    const [view, setView] = useState('suggestions');
    const [loading, setLoading] = useState({ suggestions: false, manual: false, upload: false, gallery: false, weather: true });
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [editFormData, setEditFormData] = useState({ category: '', profileId: '' });
    const [weather, setWeather] = useState(null);

    useEffect(() => {
        const fetchWeather = (lat, lon) => {
            fetch(`/api/weather?lat=${lat}&lon=${lon}`)
                .then(res => res.json())
                .then(data => {
                    if (data.error) throw new Error(data.error);
                    setWeather(data);
                })
                .catch(err => {
                    console.error("Weather fetch error:", err);
                    setError("無法獲取天氣資訊");
                })
                .finally(() => setLoading(p => ({ ...p, weather: false })));
        };
        navigator.geolocation.getCurrentPosition(
            (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
            () => {
                console.error("Geolocation permission denied.");
                setError("請允許位置權限以獲取天氣");
                fetchWeather(24.9576, 121.2245); // Fallback to Pingzhen District, Taoyuan
            }
        );
    }, []);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, u => u ? setUser(u) : signInAnonymously(auth).catch(e => setError("驗證失敗")));
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, `users/${user.uid}/profiles`));
        const unsub = onSnapshot(q, snap => {
            const profilesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setProfiles(profilesData);
            if (!activeProfile && profilesData.length > 0) setActiveProfile(profilesData[0]);
            else if (profilesData.length === 0) setActiveProfile(null);
        }, e => setError("讀取使用者資料失敗"));
        return () => unsub();
    }, [user, activeProfile]);

    useEffect(() => {
        if (!activeProfile || !user) {
            setClothingItems([]); setTops([]); setBottoms([]); setSuggestions([]);
            return;
        }
        setLoading(p => ({ ...p, gallery: true, suggestions: true }));
        const q = query(collection(db, `clothingItems`), where("userId", "==", user.uid), where("profileId", "==", activeProfile.id));
        const unsub = onSnapshot(q, snap => {
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const currentTops = items.filter(i => i.category === 'top');
            const currentBottoms = items.filter(i => i.category === 'bottom');
            setClothingItems(items); setTops(currentTops); setBottoms(currentBottoms);
            setLoading(p => ({ ...p, gallery: false }));
            if (view === 'suggestions' && items.length > 0) generateSuggestions(currentTops, currentBottoms);
            else setLoading(p => ({ ...p, suggestions: false }));
        }, e => { setError("讀取衣物資料失敗"); setLoading(p => ({ ...p, gallery: false, suggestions: false })); });
        return () => unsub();
    }, [activeProfile, user, view]); // Added view to dependencies

    const callGeminiAPI = async (prompt, imageData = null, weatherData = null) => {
        try {
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, imageData, weather: weatherData })
            });
            if (!response.ok) {
                const errBody = await response.json();
                throw new Error(errBody.error || 'API 請求失敗');
            }
            const result = await response.json();
            return result.text;
        } catch (error) {
            console.error("Error calling our API:", error);
            setError(`AI 服務暫時無法使用: ${error.message}`);
            return null;
        }
    };
    
    const handleAddProfile = async () => {
        if (newProfileName.trim() && user) {
            try {
                await addDoc(collection(db, `users/${user.uid}/profiles`), { name: newProfileName.trim() });
            } catch (error) { setError("新增使用者失敗。"); }
        }
        setNewProfileName(''); setProfileModalOpen(false);
    };

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file || !activeProfile) return;
        setLoading(p => ({ ...p, upload: true })); setError('');
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const base64 = reader.result.replace(/^.+,/, '');
            const category = await callGeminiAPI("這是一件上半身衣物（top）還是一件下半身衣物（bottom）？請只回答 'top' 或 'bottom'。", base64);
            if (category === 'top' || category === 'bottom') {
                const storageRef = ref(storage, `clothing/${user.uid}/${activeProfile.id}/${Date.now()}_${file.name}`);
                try {
                    const snap = await uploadString(storageRef, reader.result, 'data_url');
                    const url = await getDownloadURL(snap.ref);
                    await addDoc(collection(db, `clothingItems`), { userId: user.uid, profileId: activeProfile.id, imageUrl: url, storagePath: snap.ref.fullPath, category, createdAt: new Date() });
                    setView('gallery');
                } catch (error) { setError("上傳圖片或儲存資料失敗。"); }
            } else { setError("AI 無法識別這件衣物。"); }
            setLoading(p => ({ ...p, upload: false }));
        };
        reader.onerror = () => { setError("讀取檔案失敗。"); setLoading(p => ({ ...p, upload: false })); };
    };

    const generateSuggestions = async (currentTops, currentBottoms) => {
        if (!weather || currentTops.length === 0 || currentBottoms.length === 0) {
            setSuggestions([]); setLoading(p => ({ ...p, suggestions: false })); return;
        }
        setLoading(p => ({ ...p, suggestions: true }));
        const newSuggestions = []; const usedPairs = new Set();
        const attempts = Math.min(3, currentTops.length * currentBottoms.length);
        while (newSuggestions.length < attempts) {
            let top, bottom, pairKey, maxTries = 10;
            do {
                top = currentTops[Math.floor(Math.random() * currentTops.length)];
                bottom = currentBottoms[Math.floor(Math.random() * currentBottoms.length)];
                pairKey = `${top.id}-${bottom.id}`;
            } while (usedPairs.has(pairKey) && --maxTries > 0);
            if (maxTries === 0) break;
            usedPairs.add(pairKey);
            try {
                const toBase64 = blob => new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                const [topRes, bottomRes] = await Promise.all([fetch(top.imageUrl), fetch(bottom.imageUrl)]);
                const [topBlob, bottomBlob] = await Promise.all([topRes.blob(), bottomRes.blob()]);
                const [topBase64, bottomBase64] = await Promise.all([toBase64(topBlob), toBase64(bottomBlob)]);
                const rawComment = await callGeminiAPI("Generate suggestion", [topBase64, bottomBase64], weather);
                let comment = "試試這個組合！", reminder = null;
                if (rawComment && rawComment.includes('[提醒]')) {
                    const parts = rawComment.split('[提醒]');
                    comment = parts[0].trim();
                    reminder = parts[1].trim();
                } else if (rawComment) { comment = rawComment; }
                newSuggestions.push({ top, bottom, comment, reminder });
            } catch (error) { newSuggestions.push({ top, bottom, comment: "清新的組合，適合今天！", reminder: "保持好心情！" }); }
        }
        setSuggestions(newSuggestions); setLoading(p => ({ ...p, suggestions: false }));
    };

    const getManualSuggestion = async () => {
        if (!manualSelection.top || !manualSelection.bottom) return;
        setLoading(p => ({ ...p, manual: true })); setManualSuggestion('');
        try {
            const toBase64 = blob => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            const [topRes, bottomRes] = await Promise.all([fetch(manualSelection.top.imageUrl), fetch(manualSelection.bottom.imageUrl)]);
            const [topBlob, bottomBlob] = await Promise.all([topRes.blob(), bottomRes.blob()]);
            const [topBase64, bottomBase64] = await Promise.all([toBase64(topBlob), toBase64(bottomBlob)]);
            const comment = await callGeminiAPI("這是一套使用者自己搭配的服裝，請用繁體中文以專業且鼓勵的語氣給出建議（約30-40字）。", [topBase64, bottomBase64]);
            setManualSuggestion(comment || "很棒的選擇！");
        } catch (error) { setManualSuggestion("您的搭配很有創意！"); }
        setLoading(p => ({ ...p, manual: false }));
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setEditFormData({ category: item.category, profileId: item.profileId });
        setEditModalOpen(true);
    };

    const handleUpdateItem = async () => {
        if (!editingItem) return;
        try {
            await updateDoc(doc(db, "clothingItems", editingItem.id), editFormData);
        } catch (error) { setError("更新衣物失敗。"); }
        setEditModalOpen(false); setEditingItem(null);
    };

    const handleDeleteConfirmation = (item) => {
        const itemToDelete = item || editingItem;
        setItemToDelete(itemToDelete);
        setDeleteModalOpen(true);
        setEditModalOpen(false);
    };
    
    const confirmDeleteItem = async () => {
        if (!itemToDelete) return;
        try {
            await deleteDoc(doc(db, "clothingItems", itemToDelete.id));
            await deleteObject(ref(storage, itemToDelete.storagePath));
        } catch (error) { setError("刪除失敗。"); }
        setItemToDelete(null); setDeleteModalOpen(false);
    };
    
    return (
        <div className="max-w-md mx-auto bg-white shadow-lg min-h-screen relative">
            {isProfileModalOpen && (
                <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold mb-4">新增使用者</h3>
                        <input type="text" value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} placeholder="例如：媽媽、女兒" className="w-full border rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-pink-500" />
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => setProfileModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md">取消</button>
                            <button onClick={handleAddProfile} className="px-4 py-2 bg-pink-500 text-white rounded-md">確定</button>
                        </div>
                    </div>
                </div>
            )}
            {isDeleteModalOpen && (
                <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm text-center">
                        <h3 className="text-lg font-semibold mb-2">確定刪除？</h3>
                        <p className="text-gray-600 mb-6">您確定要刪除這件衣物嗎？此操作無法復原。</p>
                        <div className="flex justify-center space-x-4">
                            <button onClick={() => setDeleteModalOpen(false)} className="px-6 py-2 bg-gray-200 rounded-md">取消</button>
                            <button onClick={confirmDeleteItem} className="px-6 py-2 bg-red-500 text-white rounded-md">刪除</button>
                        </div>
                    </div>
                </div>
            )}
            {isEditModalOpen && editingItem && (
                 <div className="absolute inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm relative">
                        <button onClick={() => setEditModalOpen(false)} className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-800">
                            <XIcon size={24} />
                        </button>
                        <h3 className="text-xl font-semibold mb-4">編輯衣物</h3>
                        <img src={editingItem.imageUrl} alt="Editing item" className="w-full h-48 object-cover rounded-md mb-4"/>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-gray-700">分類</label>
                                <select id="category" value={editFormData.category} onChange={e => setEditFormData({...editFormData, category: e.target.value})} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md">
                                    <option value="top">上身</option>
                                    <option value="bottom">下身</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="profile" className="block text-sm font-medium text-gray-700">所屬使用者</label>
                                <select id="profile" value={editFormData.profileId} onChange={e => setEditFormData({...editFormData, profileId: e.target.value})} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md">
                                    {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-between items-center">
                            <button onClick={() => handleDeleteConfirmation()} className="p-2 text-red-600 hover:bg-red-50 rounded-full">
                                <Trash2Icon size={24}/>
                            </button>
                            <button onClick={handleUpdateItem} className="px-6 py-2 bg-pink-500 text-white font-semibold rounded-md hover:bg-pink-600">
                                儲存變更
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className="bg-white p-4 border-b sticky top-0 z-10 grid grid-cols-3 items-center">
                <div className="flex items-center col-span-1">
                    <UserIcon className="text-pink-500" />
                    <select value={activeProfile?.id || ''} onChange={(e) => setActiveProfile(profiles.find(p => p.id === e.target.value))} className="ml-2 font-semibold text-lg border-none bg-transparent focus:ring-0" disabled={profiles.length === 0}>
                        {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 col-span-1">
                    {loading.weather ? <span>天氣載入中...</span> : weather ? (
                        <>
                            <SunIcon className="text-yellow-500" />
                            <div className="flex flex-col items-center">
                                <span className="font-semibold">{weather.city} {weather.currentTemp}°C</span>
                                <span className="text-xs">({weather.tempMin}° / {weather.tempMax}°)</span>
                            </div>
                        </>
                    ) : <span>天氣資訊無法取得</span>}
                </div>
                <div className="flex justify-end col-span-1">
                    <button onClick={() => setProfileModalOpen(true)} className="p-2 rounded-full hover:bg-gray-100"><PlusIcon /></button>
                </div>
            </header>

            <main className="p-4 pb-20">
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">{error} <button onClick={() => setError('')} className="absolute top-0 bottom-0 right-0 px-4 py-3"><XIcon size={20}/></button></div>}
                {!activeProfile && profiles.length === 0 && <div className="text-center p-8 bg-gray-50 rounded-lg"><h3 className="text-xl font-semibold text-gray-700">歡迎使用 AI 穿搭師！</h3><p className="text-gray-500 mt-2">請點擊右上角的 '+' 來新增第一位使用者。</p></div>}
                {activeProfile && (
                    <>
                        {view === 'suggestions' && (
                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl font-bold text-gray-800">今日推薦</h2>
                                    <button onClick={() => generateSuggestions(tops, bottoms)} disabled={loading.suggestions || tops.length === 0 || bottoms.length === 0} className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <RefreshCwIcon className={loading.suggestions ? 'animate-spin' : ''}/>
                                    </button>
                                </div>
                                {loading.suggestions ? <div className="flex flex-col items-center justify-center p-8 text-gray-500"><RefreshCwIcon className="animate-spin h-8 w-8 mb-4" /><p className="text-lg">AI 正在搭配中...</p></div> : (
                                    suggestions.length > 0 ? (
                                        <div className="space-y-6">
                                            {suggestions.map((s, i) => (
                                                <div key={i} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                                                    <div className="grid grid-cols-2">
                                                        <img src={s.top.imageUrl} alt="Top" className="w-full h-48 object-cover"/>
                                                        <img src={s.bottom.imageUrl} alt="Bottom" className="w-full h-48 object-cover"/>
                                                    </div>
                                                    <div className="p-4 bg-gray-50">
                                                        <p className="text-gray-700 italic">"{s.comment}"</p>
                                                        {s.reminder && <p className="mt-2 text-sm text-pink-600 font-semibold">💡 {s.reminder}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <div className="text-center p-8 bg-gray-50 rounded-lg"><h3 className="text-xl font-semibold text-gray-700">衣櫥空空的...</h3><p className="text-gray-500 mt-2">請先去「新增衣物」分頁新增一些衣物吧！</p></div>
                                )}
                            </section>
                        )}
                        {view === 'manual' && (
                            <section>
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">自己動手搭</h2>
                                <div>
                                    <h3 className="font-semibold text-lg mb-2">選擇上身</h3>
                                    <div className="flex overflow-x-auto space-x-3 pb-3 -mx-4 px-4">
                                        {tops.map(item => <img key={item.id} src={item.imageUrl} alt="Top" onClick={() => setManualSelection(prev => ({...prev, top: item}))} className={`w-28 h-36 object-cover rounded-lg flex-shrink-0 cursor-pointer border-4 ${manualSelection.top?.id === item.id ? 'border-pink-500' : 'border-transparent'}`}/>)}
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <h3 className="font-semibold text-lg mb-2">選擇下身</h3>
                                    <div className="flex overflow-x-auto space-x-3 pb-3 -mx-4 px-4">
                                        {bottoms.map(item => <img key={item.id} src={item.imageUrl} alt="Bottom" onClick={() => setManualSelection(prev => ({...prev, bottom: item}))} className={`w-28 h-36 object-cover rounded-lg flex-shrink-0 cursor-pointer border-4 ${manualSelection.bottom?.id === item.id ? 'border-pink-500' : 'border-transparent'}`}/>)}
                                    </div>
                                </div>
                                {manualSelection.top && manualSelection.bottom && (
                                    <div className="mt-6 text-center">
                                        <button onClick={getManualSuggestion} disabled={loading.manual} className="bg-pink-500 text-white font-bold py-3 px-6 rounded-full w-full flex items-center justify-center disabled:bg-pink-300">
                                            {loading.manual ? <RefreshCwIcon className="animate-spin mr-2"/> : <LightbulbIcon className="mr-2"/>}
                                            {loading.manual ? 'AI 思考中...' : '獲取 AI 建議'}
                                        </button>
                                        {manualSuggestion && <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg text-purple-800"><p>{manualSuggestion}</p></div>}
                                    </div>
                                )}
                            </section>
                        )}
                        {view === 'add' && (
                            <section className="flex flex-col items-center justify-center p-4">
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">新增衣物</h2>
                                <div className="w-full max-w-xs aspect-square bg-gray-900 rounded-lg flex flex-col items-center justify-center p-4 shadow-lg">
                                    <div className="w-full h-full border-4 border-dashed border-gray-500 rounded-md flex flex-col items-center justify-center text-center text-white">
                                        <CameraIcon className="h-16 w-16 text-gray-400 mb-4"/>
                                        <p className="text-gray-300 mb-6">將衣物置於方框中拍攝</p>
                                    </div>
                                </div>
                                <p className="text-gray-600 my-6 text-center">上傳照片，AI 會自動幫您分類！</p>
                                <button onClick={() => fileInputRef.current.click()} disabled={loading.upload} className="bg-pink-500 text-white font-bold py-3 px-8 rounded-full w-full max-w-xs disabled:bg-pink-300">
                                    {loading.upload ? 'AI 辨識中...' : '開啟相機或選擇照片'}
                                </button>
                                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                                {loading.upload && <div className="mt-4"><div className="flex flex-col items-center justify-center p-8 text-gray-500"><RefreshCwIcon className="animate-spin h-8 w-8 mb-4" /><p className="text-lg">請稍候...</p></div></div>}
                            </section>
                        )}
                        {view === 'gallery' && (
                            <section>
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">我的衣櫥</h2>
                                {clothingItems.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {clothingItems.map(item => (
                                            <div key={item.id} className="relative group cursor-pointer" onClick={() => openEditModal(item)}>
                                                <img src={item.imageUrl} alt="Clothing item" className="w-full h-32 object-cover rounded-md"/>
                                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                                                    <p className="text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity">編輯</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <div className="text-center p-8 bg-gray-50 rounded-lg"><h3 className="text-xl font-semibold text-gray-700">衣櫥是空的</h3><p className="text-gray-500 mt-2">點擊下方的「新增衣物」按鈕，開始建立您的數位衣櫥吧！</p></div>}
                            </section>
                        )}
                    </>
                )}
            </main>
            <footer className="bg-white border-t fixed bottom-0 left-0 right-0 max-w-md mx-auto z-10 p-2">
                <nav className="flex justify-around">
                    <button onClick={() => setView('suggestions')} className={`flex flex-col items-center w-full p-2 rounded-lg ${view === 'suggestions' ? 'text-pink-500 bg-pink-50' : 'text-gray-500'}`}><Wand2Icon /><span className="text-xs font-medium">AI 推薦</span></button>
                    <button onClick={() => setView('manual')} className={`flex flex-col items-center w-full p-2 rounded-lg ${view === 'manual' ? 'text-pink-500 bg-pink-50' : 'text-gray-500'}`}><LightbulbIcon /><span className="text-xs font-medium">手動搭配</span></button>
                    <button onClick={() => setView('add')} className={`flex flex-col items-center w-full p-2 rounded-lg ${view === 'add' ? 'text-pink-500 bg-pink-50' : 'text-gray-500'}`}><CameraIcon /><span className="text-xs font-medium">新增衣物</span></button>
                    <button onClick={() => setView('gallery')} className={`flex flex-col items-center w-full p-2 rounded-lg ${view === 'gallery' ? 'text-pink-500 bg-pink-50' : 'text-gray-500'}`}><GalleryIcon /><span className="text-xs font-medium">我的衣櫥</span></button>
                </nav>
            </footer>
        </div>
    );
}

export default App;
