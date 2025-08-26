import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage, onAuthStateChanged, googleProvider, signInWithPopup, signOut } from './firebase';
import { collection, addDoc, query, where, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";

// --- Icon Components (圖示元件) ---
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
const LogOutIcon = createSvgIcon(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>);
const GoogleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 35.797 44 30.138 44 24c0-1.341-.138-2.65-.389-3.917z"></path></svg>);

// --- Camera Capture Modal Component (相機擷取彈出視窗元件) ---
function CameraCaptureModal({ onClose, onCapture }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let stream;
        const startCamera = async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('您的瀏覽器不支援相機功能。');
                }
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: "environment",
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    } 
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera access error:", err);
                setError(`無法開啟相機：${err.message}。請確認您已在瀏覽器設定中授權相機權限。`);
            }
        };
        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCaptureClick = () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const size = Math.min(videoWidth, videoHeight);
        const x = (videoWidth - size) / 2;
        const y = (videoHeight - size) / 2;

        canvas.width = size;
        canvas.height = size;
        
        const context = canvas.getContext('2d');
        context.drawImage(video, x, y, size, size, 0, 0, size, size);
        
        canvas.toBlob(blob => {
            if (blob) {
                onCapture(blob);
            }
        }, 'image/jpeg', 0.95);
    };

    return (
        <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center">
            {error ? (
                <div className="p-8 text-center text-white">
                    <h3 className="text-xl font-bold text-red-500 mb-4">開啟相機失敗</h3>
                    <p>{error}</p>
                    <button onClick={onClose} className="mt-6 px-6 py-2 bg-gray-700 rounded-lg">關閉</button>
                </div>
            ) : (
                <>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[80vw] h-[80vw] max-w-[80vh] max-h-[80vh] border-4 border-dashed border-white/70 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/50 flex justify-around items-center">
                        <button onClick={onClose} className="text-white font-semibold px-4 py-2">取消</button>
                        <button onClick={handleCaptureClick} className="w-20 h-20 rounded-full bg-white border-4 border-pink-500"></button>
                        <div className="w-16"></div>
                    </div>
                </>
            )}
            <canvas ref={canvasRef} className="hidden"></canvas>
        </div>
    );
}


function App() {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
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
    const [isDuplicateModalOpen, setDuplicateModalOpen] = useState(false);
    const [duplicateCheckData, setDuplicateCheckData] = useState({ newImageSrc: null, potentialMatch: null, newImageBase64: null });
    const [isCameraOpen, setCameraOpen] = useState(false);

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
                fetchWeather(24.9576, 121.2245); // 備用座標
            }
        );
    }, []);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });
        return () => unsub();
    }, []);

    const handleSignIn = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Google Sign-In Error", error);
            setError("Google 登入失敗，請稍後再試。");
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            setProfiles([]);
            setActiveProfile(null);
            setClothingItems([]);
        } catch (error) {
            console.error("Sign-Out Error", error);
            setError("登出失敗。");
        }
    };

    useEffect(() => {
        if (!user) {
            setProfiles([]);
            setActiveProfile(null);
            return;
        };
        const q = query(collection(db, `users/${user.uid}/profiles`));
        const unsub = onSnapshot(q, snap => {
            const profilesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setProfiles(profilesData);
            if (profilesData.length > 0 && !profilesData.find(p => p.id === activeProfile?.id)) {
                setActiveProfile(profilesData[0]);
            } else if (profilesData.length === 0) {
                setActiveProfile(null);
            }
        }, e => setError("讀取使用者資料失敗"));
        return () => unsub();
    }, [user]);

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
            if (view === 'suggestions' && items.length > 0) {
                generateSuggestions(currentTops, currentBottoms);
            } else {
                setLoading(p => ({ ...p, suggestions: false }));
            }
        }, e => { setError("讀取衣物資料失敗"); setLoading(p => ({ ...p, gallery: false, suggestions: false })); });
        return () => unsub();
    }, [activeProfile, user, view]);

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
    
    const uploadNewItem = async (base64, dataUrl) => {
        setLoading(p => ({ ...p, upload: true }));
        setError('');
        const category = await callGeminiAPI("這是一件上半身衣物（top）還是一件下半身衣物（bottom）？請只回答 'top' 或 'bottom'。", base64);
        
        if (category === 'top' || category === 'bottom') {
            const storageRef = ref(storage, `clothing/${user.uid}/${activeProfile.id}/${Date.now()}`);
            try {
                const snap = await uploadString(storageRef, dataUrl, 'data_url');
                const url = await getDownloadURL(snap.ref);
                await addDoc(collection(db, `clothingItems`), { userId: user.uid, profileId: activeProfile.id, imageUrl: url, storagePath: snap.ref.fullPath, category, createdAt: new Date() });
                setView('gallery');
            } catch (error) { setError("上傳圖片或儲存資料失敗。"); }
        } else { setError("AI 無法識別這件衣物。"); }
        setLoading(p => ({ ...p, upload: false }));
    };

    const processAndUploadFile = (file) => {
        if (!file) return;
        if (!activeProfile) {
            setError("請先選擇或建立一個使用者才能上傳衣物。");
            return;
        }
        setLoading(p => ({ ...p, upload: true }));
        setError('');
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const dataUrl = reader.result;
            const base64 = dataUrl.replace(/^.+,/, '');
            try {
                const response = await fetch('/api/check-duplicate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newImageBase64: base64, existingItems: clothingItems })
                });
                const result = await response.json();
                if (result.isDuplicate) {
                    setDuplicateCheckData({ newImageSrc: dataUrl, potentialMatch: result.matchingItem, newImageBase64: base64 });
                    setDuplicateModalOpen(true);
                    setLoading(p => ({ ...p, upload: false }));
                } else {
                    await uploadNewItem(base64, dataUrl);
                }
            } catch (err) {
                setError("比對重複衣物時發生錯誤，將直接上傳。");
                await uploadNewItem(base64, dataUrl);
            }
        };
        reader.onerror = () => {
            setError("讀取檔案失敗。");
            setLoading(p => ({ ...p, upload: false }));
        };
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        processAndUploadFile(file);
        event.target.value = null;
    };
    
    const handleCapture = (imageBlob) => {
        setCameraOpen(false);
        const fileName = `capture-${Date.now()}.jpg`;
        const file = new File([imageBlob], fileName, { type: 'image/jpeg' });
        processAndUploadFile(file);
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
    
    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center bg-gray-100 p-8 text-center">
                 <h1 className="text-4xl font-bold text-pink-500 mb-2">AI 穿搭師</h1>
                 <p className="text-gray-600 mb-8">您的個人智慧衣櫥</p>
                 <button 
                    onClick={handleSignIn}
                    className="w-full max-w-xs bg-white text-gray-700 font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center justify-center"
                 >
                    <GoogleIcon />
                    <span className="ml-4">使用 Google 帳號登入</span>
                 </button>
                 {error && <p className="mt-4 text-red-500">{error}</p>}
                 <p className="text-xs text-gray-400 mt-12">登入後即可在所有裝置同步您的衣櫥資料。</p>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto bg-white shadow-lg min-h-screen relative">
            {isCameraOpen && <CameraCaptureModal onClose={() => setCameraOpen(false)} onCapture={handleCapture} />}
            
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
                        <img src={editingItem.imageUrl} alt="正在編輯的衣物" className="w-full h-48 object-cover rounded-md mb-4"/>
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
            {isDuplicateModalOpen && (
                <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm text-center">
                        <h3 className="text-xl font-semibold mb-4">重複確認</h3>
                        <p className="text-gray-600 mb-4">這件衣服似乎已經在您的衣櫥裡了。請問是同一件嗎？</p>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <p className="text-sm font-medium mb-1">新上傳的</p>
                                <img src={duplicateCheckData.newImageSrc} alt="新上傳的衣物" className="w-full h-32 object-cover rounded-md"/>
                            </div>
                            <div>
                                <p className="text-sm font-medium mb-1">已存在的</p>
                                <img src={duplicateCheckData.potentialMatch.imageUrl} alt="已存在的衣物" className="w-full h-32 object-cover rounded-md"/>
                            </div>
                        </div>
                        <div className="flex justify-around space-x-4">
                            <button 
                                onClick={() => {
                                    setDuplicateModalOpen(false);
                                    uploadNewItem(duplicateCheckData.newImageBase64, duplicateCheckData.newImageSrc);
                                }} 
                                className="px-6 py-2 bg-gray-200 rounded-md w-full"
                            >
                                不是，這是新的
                            </button>
                            <button 
                                onClick={() => setDuplicateModalOpen(false)} 
                                className="px-6 py-2 bg-pink-500 text-white rounded-md w-full"
                            >
                                是，取消上傳
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
                            <SunIcon className="text-yellow-500 flex-shrink-0" />
                            <div className="flex flex-col items-start">
                                <span className="font-semibold leading-tight">{weather.city}</span>
                                <span className="leading-tight">{weather.currentTemp}°C <span className="text-xs text-gray-500">({weather.tempMin}°/{weather.tempMax}°)</span></span>
                            </div>
                        </>
                    ) : <span>天氣資訊無法取得</span>}
                </div>
                <div className="flex justify-end col-span-1 items-center">
                    <button onClick={() => setProfileModalOpen(true)} className="p-2 rounded-full hover:bg-gray-100"><PlusIcon /></button>
                    <button onClick={handleSignOut} className="p-2 rounded-full hover:bg-gray-100 text-gray-500" title="登出">
                        <LogOutIcon />
                    </button>
                </div>
            </header>

            <main className="p-4 pb-20">
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">{error} <button onClick={() => setError('')} className="absolute top-0 bottom-0 right-0 px-4 py-3"><XIcon size={20}/></button></div>}
                
                {/* --- 以下是修正後的顯示邏輯 --- */}

                {/* 狀況一：當沒有選擇使用者時，顯示歡迎訊息 (新增衣物頁除外) */}
                {!activeProfile && view !== 'add' && (
                    <div className="text-center p-8 bg-gray-50 rounded-lg">
                        <h3 className="text-xl font-semibold text-gray-700">歡迎使用 AI 穿搭師！</h3>
                        <p className="text-gray-500 mt-2">請點擊右上角的 '+' 來新增第一位使用者，開始您的智慧穿搭之旅。</p>
                    </div>
                )}
                
                {/* 狀況二：當選擇了使用者時，才顯示依賴使用者資料的頁面 */}
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
                                                        <img src={s.top.imageUrl} alt="上衣" className="w-full h-48 object-cover"/>
                                                        <img src={s.bottom.imageUrl} alt="下身" className="w-full h-48 object-cover"/>
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
                                        {tops.map(item => <img key={item.id} src={item.imageUrl} alt="上衣" onClick={() => setManualSelection(prev => ({...prev, top: item}))} className={`w-28 h-36 object-cover rounded-lg flex-shrink-0 cursor-pointer border-4 ${manualSelection.top?.id === item.id ? 'border-pink-500' : 'border-transparent'}`}/>)}
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <h3 className="font-semibold text-lg mb-2">選擇下身</h3>
                                    <div className="flex overflow-x-auto space-x-3 pb-3 -mx-4 px-4">
                                        {bottoms.map(item => <img key={item.id} src={item.imageUrl} alt="下身" onClick={() => setManualSelection(prev => ({...prev, bottom: item}))} className={`w-28 h-36 object-cover rounded-lg flex-shrink-0 cursor-pointer border-4 ${manualSelection.bottom?.id === item.id ? 'border-pink-500' : 'border-transparent'}`}/>)}
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
                        {view === 'gallery' && (
                            <section>
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">我的衣櫥</h2>
                                {clothingItems.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {clothingItems.map(item => (
                                            <div key={item.id} className="relative group cursor-pointer" onClick={() => openEditModal(item)}>
                                                <img src={item.imageUrl} alt="衣物照片" className="w-full h-32 object-cover rounded-md"/>
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

                {/* 狀況三：永遠獨立判斷是否顯示「新增衣物」頁面 */}
                {view === 'add' && (
                    <section className="flex flex-col items-center justify-center p-4">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">新增衣物</h2>
                        {!activeProfile ? (
                                <div className="text-center p-8 bg-yellow-50 border border-yellow-200 rounded-lg w-full">
                                <h3 className="text-xl font-semibold text-yellow-800">請先建立使用者</h3>
                                <p className="text-yellow-700 mt-2">您需要先建立一個使用者（例如：媽媽），才能開始新增衣物喔！</p>
                                <button onClick={() => setProfileModalOpen(true)} className="mt-4 bg-pink-500 text-white font-bold py-2 px-4 rounded-lg">立即建立</button>
                            </div>
                        ) : (
                            <>
                                <p className="text-gray-600 mb-6 text-center">您可以選擇開啟相機拍照，或從相簿選擇照片。</p>
                                <div className="w-full max-w-xs space-y-4">
                                    <button onClick={() => setCameraOpen(true)} disabled={loading.upload} className="w-full bg-pink-500 text-white font-bold py-3 px-8 rounded-full flex items-center justify-center gap-2 disabled:bg-pink-300">
                                        <CameraIcon />
                                        開啟相機
                                    </button>
                                        <button onClick={() => fileInputRef.current.click()} disabled={loading.upload} className="w-full bg-gray-700 text-white font-bold py-3 px-8 rounded-full flex items-center justify-center gap-2 disabled:bg-gray-500">
                                        <GalleryIcon />
                                        從相簿選擇
                                    </button>
                                </div>
                                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                                {loading.upload && <div className="mt-4"><div className="flex flex-col items-center justify-center p-8 text-gray-500"><RefreshCwIcon className="animate-spin h-8 w-8 mb-4" /><p className="text-lg">AI 處理中...</p></div></div>}
                            </>
                        )}
                    </section>
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
