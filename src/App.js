import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage, onAuthStateChanged, googleProvider, signInWithPopup, signOut } from './firebase';
import { collection, addDoc, query, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
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
const SparklesIcon = createSvgIcon(<><path d="m12 3-1.9 1.9-1.3-2.8-1.3 2.8L5.6 3l1.9 1.9L5.6 6.8l1.9-1.9 1.9 1.9 2.8-1.3-2.8-1.3L12 3Z" /><path d="M21 12 l-1.9-1.9-2.8 1.3 2.8 1.3 1.9 1.9-1.9 1.9 1.3 2.8 1.3-2.8 1.9-1.9-1.9-1.9Z" /><path d="M12 21l1.9-1.9 1.3 2.8 1.3-2.8 1.9 1.9-1.9-1.9-2.8-1.3 2.8-1.3-1.9-1.9 1.9-1.9Z" /></>);
const AlertTriangleIcon = createSvgIcon(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>);
const GoogleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 35.797 44 30.138 44 24c0-1.341-.138-2.65-.389-3.917z"></path></svg>);
const EditIcon = createSvgIcon(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>);
const MapPinOffIcon = createSvgIcon(<><path d="M12 20v-3.3a4.2 4.2 0 0 0-2.2-3.6l-1.6-1a4.2 4.2 0 0 1-1.2-5.7 4.2 4.2 0 0 1 6-1.2l1.6 1a4.2 4.2 0 0 0 2.2 3.6V17" /><path d="M12 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" /><path d="m2 2 20 20" /><path d="M9.1 9.1A4.2 4.2 0 0 1 12 4.8" /></>);

// --- Component: CameraCaptureModal (相機捕捉彈窗) ---
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

// --- Component: App (主應用程式) ---
function App() {
    // --- State Declarations (狀態宣告) ---
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [members, setMembers] = useState([]);
    const [activeMember, setActiveMember] = useState(null);
    const [clothingItems, setClothingItems] = useState([]);
    const [view, setView] = useState('suggestions');
    const [loading, setLoading] = useState({ suggestions: false, upload: false, weather: true, scoring: false, optimization: false });
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const [isMemberModalOpen, setMemberModalOpen] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [editingMember, setEditingMember] = useState(null);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [weather, setWeather] = useState(null);
    const [weatherStatus, setWeatherStatus] = useState({ loading: true, usingFallback: false, error: null });
    const [isCameraOpen, setCameraOpen] = useState(false);
    const [uploadQueue, setUploadQueue] = useState([]);
    const [currentItemToClassify, setCurrentItemToClassify] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [hasGeneratedSuggestions, setHasGeneratedSuggestions] = useState(false);
    const [manualOutfit, setManualOutfit] = useState({ top: null, bottom: null, dress: null, outerwear: null });
    const [manualScoreResult, setManualScoreResult] = useState(null);
    const [scoreReasoning, setScoreReasoning] = useState(null);
    const [optimizationStatus, setOptimizationStatus] = useState('');
    const [itemToReview, setItemToReview] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [imageToView, setImageToView] = useState(null);

    // --- useEffect Hooks (副作用掛鉤) ---

    // 【最終修正】重構天氣與定位獲取邏輯
    useEffect(() => {
        const fetchWeather = async (lat, lon, isFallback = false) => {
            setWeatherStatus({ loading: true, usingFallback: isFallback, error: null });
            setError(''); // 清除舊的錯誤提示
            try {
                const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setWeather(data);
            } catch (err) {
                console.error("Weather fetch error:", err);
                setWeatherStatus(prev => ({ ...prev, error: "無法獲取天氣資訊" }));
            } finally {
                setWeatherStatus(prev => ({ ...prev, loading: false }));
            }
        };

        const defaultLocation = { lat: 24.9576, lon: 121.2245 }; // 桃園市平鎮區

        const handlePositionError = (error) => {
            console.warn(`Geolocation Error (${error.code}): ${error.message}`);
            let errorMessage = "無法確定您的位置，將使用預設地點。";
            if (error.code === 1) { // PERMISSION_DENIED
                errorMessage = "您已拒絕位置授權，將使用預設地點。";
            }
            // 【最終修正】專門處理 kCLErrorLocationUnknown
            if (error.code === 2 && error.message.includes("kCLErrorLocationUnknown")) {
                errorMessage = "暫時無法獲取精準定位，將使用預設地點。";
            }
            setError(errorMessage);
            fetchWeather(defaultLocation.lat, defaultLocation.lon, true);
        };
        
        if (navigator.geolocation) {
             navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setError(''); // 成功定位，清除可能存在的舊錯誤
                    fetchWeather(pos.coords.latitude, pos.coords.longitude);
                }, 
                handlePositionError,
                { timeout: 10000, enableHighAccuracy: false } // 10秒超時
            );
        } else {
            setError("您的瀏覽器不支援定位功能，將使用預設地點。");
            fetchWeather(defaultLocation.lat, defaultLocation.lon, true);
        }
    }, []);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (currentUser) => { setUser(currentUser); setAuthLoading(false); });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!user) return;
        const membersQuery = query(collection(db, "members"));
        const unsubMembers = onSnapshot(membersQuery, snap => {
            const membersData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setMembers(membersData);
            if (membersData.length > 0 && !activeMember) {
                setActiveMember(membersData[0]);
            } else if (membersData.length === 0) {
                setActiveMember(null);
            }
        }, e => setError("讀取成員資料失敗"));

        const clothingQuery = query(collection(db, "clothingItems"));
        const unsubClothing = onSnapshot(clothingQuery, snap => { setClothingItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }, e => setError("讀取衣物資料失敗"));

        return () => { unsubMembers(); unsubClothing(); };
    }, [user, activeMember]);

    useEffect(() => {
        if (uploadQueue.length > 0 && !currentItemToClassify) {
            setCurrentItemToClassify(uploadQueue[0]);
        }
    }, [uploadQueue, currentItemToClassify]);

    useEffect(() => {
        if (!activeMember || clothingItems.length === 0 || loading.optimization) return;
        
        const runBackgroundTasks = async () => {
            const itemsToAnalyze = clothingItems.filter(item => item.memberId === activeMember.id && !item.isAnalyzed);
            if (itemsToAnalyze.length > 0) {
                setLoading(p => ({ ...p, optimization: true }));
                setOptimizationStatus(`正在為 ${activeMember.name} 優化 ${itemsToAnalyze.length} 件衣物...`);
                for (const item of itemsToAnalyze) {
                    try {
                        const result = await callAPI('/api/gemini', { prompt: 'describe_image', imageUrl: item.imageUrl });
                        if (result && result.response && result.response.description) {
                            await updateDoc(doc(db, "clothingItems", item.id), { description: result.response.description, isAnalyzed: true });
                        }
                    } catch (e) { console.error(`Failed to optimize item ${item.id}`, e); }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                setOptimizationStatus(`衣櫥優化完成！`);
                setTimeout(() => setOptimizationStatus(''), 3000);
                setLoading(p => ({ ...p, optimization: false }));
            }

            const itemsToCheck = clothingItems.filter(item => item.memberId === activeMember.id && item.duplicateStatus === 'unchecked');
            if (itemsToCheck.length > 0) {
                 for (const item of itemsToCheck) {
                    callAPI('/api/background-check', { itemId: item.id, memberId: activeMember.id });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                 }
            }
        };
        
        runBackgroundTasks();
    }, [activeMember, clothingItems]);


    // --- API & Data Functions (API 與資料處理函式) ---

    const callAPI = async (endpoint, body) => {
        try {
            const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!response.ok) { const errBody = await response.json(); throw new Error(errBody.error || 'API 請求失敗'); }
            return await response.json();
        } catch (error) {
            console.error(`Error calling ${endpoint}:`, error);
            setError(`服務暫時無法使用: ${error.message}`);
            throw error; // 重新拋出錯誤以便上層捕捉
        }
    };
    
    // --- Event Handlers (事件處理函式) ---

    const handleSignIn = async () => { try { await signInWithPopup(auth, googleProvider); } catch (error) { console.error("Google Sign-In Error", error); setError("Google 登入失敗，請稍後再試。"); } };
    const handleSignOut = async () => { try { await signOut(auth); setMembers([]); setActiveMember(null); setClothingItems([]); } catch (error) { console.error("Sign-Out Error", error); setError("登出失敗。"); } };

    const handleOpenMemberModal = (member = null) => { setEditingMember(member); setNewMemberName(member ? member.name : ''); setMemberModalOpen(true); };
    const handleSaveMember = async () => {
        if (!newMemberName.trim()) return;
        try { if (editingMember) { await updateDoc(doc(db, "members", editingMember.id), { name: newMemberName.trim() }); } else { await addDoc(collection(db, "members"), { name: newMemberName.trim() }); } } catch (error) { setError("儲存成員失敗"); }
        setMemberModalOpen(false); setNewMemberName(''); setEditingMember(null);
    };

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    const handleFileSelectFromPicker = (event) => {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
            handleFilesSelected(files);
        }
        event.target.value = null;
    };
    
    const handleCapture = (imageBlob) => {
        setCameraOpen(false);
        const fileName = `capture-${Date.now()}.jpg`;
        const file = new File([imageBlob], fileName, { type: 'image/jpeg' });
        handleFilesSelected([file]);
    };

    const handleFilesSelected = (files) => {
        if (!files || files.length === 0) return;
        const newQueueItems = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
        setUploadQueue(prev => [...prev, ...newQueueItems]);
    };

    const handleSaveClassification = async (item, category, memberId) => {
        setLoading(p => ({ ...p, upload: true }));
        const { file } = item;
        const storageRef = ref(storage, `clothing/${memberId}/${Date.now()}-${file.name}`);
        try {
            const dataUrl = await fileToBase64(file);
            const snap = await uploadString(storageRef, dataUrl, 'data_url');
            const url = await getDownloadURL(snap.ref);
            const memberName = members.find(m => m.id === memberId)?.name || '成員';
            
            await addDoc(collection(db, "clothingItems"), { 
                memberId: memberId, 
                imageUrl: url, 
                storagePath: snap.ref.fullPath, 
                category: category,
                description: `${memberName}的${category}`,
                isAnalyzed: false,
                duplicateStatus: 'unchecked',
                createdAt: new Date() 
            });
            
            setUploadQueue(prev => prev.slice(1));
            setCurrentItemToClassify(null);
        } catch (error) {
            setError("儲存衣物失敗");
            console.error(error);
        } finally {
            setLoading(p => ({ ...p, upload: false }));
        }
    };
    
    const openEditModal = (item) => {
        if (item.duplicateStatus === 'needs_review') {
            setItemToReview(item);
        } else {
            setEditingItem(item);
            setIsEditModalOpen(true);
        }
    };

    const handleUpdateItem = async (newCategory, newMemberId) => {
        if (!editingItem) return;
        try {
            const memberName = members.find(m => m.id === newMemberId)?.name || '成員';
            const newDescription = `${memberName}的${newCategory}`;
            
            await updateDoc(doc(db, "clothingItems", editingItem.id), {
                category: newCategory,
                memberId: newMemberId,
                description: newDescription,
                isAnalyzed: false,
                duplicateStatus: 'unchecked'
            });
        } catch (error) {
            setError("更新衣物失敗。");
        }
        setIsEditModalOpen(false);
        setEditingItem(null);
    };
    
    const handleResolveDuplicate = async (item, isDuplicate) => {
        if (isDuplicate) {
            await confirmDeleteItem(item);
        } else {
            await updateDoc(doc(db, "clothingItems", item.id), {
                duplicateStatus: 'resolved_as_unique'
            });
        }
        setItemToReview(null);
    };

    const handleManualSelect = (category, item) => {
        setManualOutfit(prev => {
            const isSelected = prev[category]?.id === item.id;
            if (isSelected) return { ...prev, [category]: null };
            if (category === 'dress') return { ...prev, top: null, bottom: null, dress: item };
            if (category === 'top' || category === 'bottom') return { ...prev, dress: null, [category]: item };
            return { ...prev, [category]: item };
        });
    };

    const generateSuggestions = async () => {
        if (!activeMember) { setError("請先選擇一位成員。"); return; }
        setLoading(p => ({ ...p, suggestions: true }));
        setSuggestions([]);
        setHasGeneratedSuggestions(true);
        setError('');
        
        const memberItems = clothingItems.filter(item => item.memberId === activeMember.id);
        const outfit = { 
            tops: memberItems.filter(i => i.category === 'top'), 
            bottoms: memberItems.filter(i => i.category === 'bottom'), 
            dresses: memberItems.filter(i => i.category === 'dress'), 
            outwears: memberItems.filter(i => i.category === 'outerwear') 
        };

        try {
            const result = await callAPI('/api/gemini', { prompt: 'generate_suggestions', outfit, weather });
            if (result && Array.isArray(result.response)) {
                const matchedSuggestions = result.response
                    .map(sugg => ({
                        top: outfit.tops.find(i => i.id === sugg.top_id) || null,
                        bottom: outfit.bottoms.find(i => i.id === sugg.bottom_id) || null,
                        dress: outfit.dresses.find(i => i.id === sugg.dress_id) || null,
                        outerwear: outfit.outwears.find(i => i.id === sugg.outerwear_id) || null,
                        score: sugg.score,
                        reasoning: sugg.reasoning
                    }))
                    .filter(s => s.dress || (s.top && s.bottom)); // 智慧過濾器

                setSuggestions(matchedSuggestions);

                if (matchedSuggestions.length === 0 && result.response.length > 0) {
                   setError("AI 回應的搭配不完整，請再試一次。");
                }

            } else { 
                setError("AI 回應格式不正確，無法產生建議。"); 
            }
        } catch (e) { 
            // setError 已經在 callAPI 中設定
        } finally { 
            setLoading(p => ({ ...p, suggestions: false })); 
        }
    };

    const scoreManualOutfit = async () => {
        if (!manualOutfit.dress && (!manualOutfit.top || !manualOutfit.bottom)) { setError("請至少選擇一件洋裝，或一件上身加一件下身。"); return; }
        setLoading(p => ({ ...p, scoring: true }));
        setManualScoreResult(null);

        try {
            // 【最終修正】在請求中加入 'prompt' 欄位
            const result = await callAPI('/api/gemini', { prompt: 'score_outfit', outfit: manualOutfit, weather });
            if (result && result.response && result.response.score && result.response.reasoning) { 
                setManualScoreResult(result.response); 
            } else { 
                setError("AI 評分失敗，請稍後再試。"); 
            }
        } catch (e) { /* setError 已在 callAPI 中設定 */ } 
        finally { 
            setLoading(p => ({ ...p, scoring: false })); 
        }
    };

    const confirmDeleteItem = async (item) => {
        const itemToDeleteFinal = item || itemToDelete;
        if (!itemToDeleteFinal) return;
        try { 
            await deleteDoc(doc(db, "clothingItems", itemToDeleteFinal.id)); 
            if (itemToDeleteFinal.storagePath) {
                await deleteObject(ref(storage, itemToDeleteFinal.storagePath)); 
            }
        } catch (error) { 
            setError("刪除失敗。"); 
            console.error("Delete error:", error);
        }
        setItemToDelete(null); setDeleteModalOpen(false); setIsEditModalOpen(false);
    };
    
    // --- Render Logic (渲染邏輯) ---
    
    if (authLoading) { return (<div className="flex items-center justify-center h-screen bg-gray-100"><div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div></div>); }
    if (!user) { return (<div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center bg-gray-100 p-8 text-center"><h1 className="text-4xl font-bold text-pink-500 mb-2">AI 穿搭師</h1><p className="text-gray-600 mb-8">您的個人智慧衣櫥</p><button onClick={handleSignIn} className="w-full max-w-xs bg-white text-gray-700 font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center justify-center"><GoogleIcon /><span className="ml-4">使用 Google 帳號登入</span></button>{error && <p className="mt-4 text-red-500">{error}</p>}<p className="text-xs text-gray-400 mt-12">登入後即可在所有裝置同步您的衣櫥資料。</p></div>); }

    const memberItems = activeMember ? clothingItems.filter(item => item.memberId === activeMember.id) : [];
    const memberTops = memberItems.filter(i => i.category === 'top');
    const memberBottoms = memberItems.filter(i => i.category === 'bottom');
    const memberDresses = memberItems.filter(i => i.category === 'dress');
    const memberOutwears = memberItems.filter(i => i.category === 'outerwear');

    const renderClothingGrid = (items, category, selectedItem, onSelect, disabled = false) => {
        if (items.length === 0) { return <p className="text-sm text-gray-500 col-span-full">此分類沒有衣物。</p>; }
        return items.map(item => (
            <div key={item.id} className={`cursor-pointer rounded-lg overflow-hidden border-2 ${selectedItem?.id === item.id ? 'border-pink-500' : 'border-transparent'} ${disabled ? 'opacity-50 pointer-events-none' : ''}`} onClick={() => !disabled && onSelect(category, item)}>
                <img src={item.imageUrl} alt={item.description || 'clothing item'} className="w-full h-24 object-cover" />
            </div>
        ));
    };

    const renderSuggestionContent = () => {
        if (loading.suggestions) {
            return <div className="flex flex-col items-center justify-center p-8 text-gray-500"><RefreshCwIcon className="animate-spin h-8 w-8 mb-4" /><p className="text-lg">AI 正在搭配中...</p></div>;
        }
        if (suggestions.length > 0) {
            return <div className="space-y-6">{suggestions.map((s, i) => ( <div key={i} className="bg-white border rounded-xl overflow-hidden shadow-sm"><div className="grid grid-cols-2"><img src={s.top?.imageUrl || s.dress?.imageUrl || 'https://placehold.co/400x400/eee/ccc?text=Top/Dress'} alt="Top/Dress" className="w-full h-48 object-cover cursor-pointer" onClick={() => setImageToView(s.top?.imageUrl || s.dress?.imageUrl)}/><img src={s.bottom?.imageUrl || s.outerwear?.imageUrl || 'https://placehold.co/400x400/eee/ccc?text=Bottom/Outer'} alt="Bottom/Outerwear" className="w-full h-48 object-cover cursor-pointer" onClick={() => setImageToView(s.bottom?.imageUrl || s.outerwear?.imageUrl)}/></div><div className="p-4 bg-gray-50"><button onClick={() => setScoreReasoning(s)} className="w-full text-left"><p className="text-gray-700 italic">"{s.reasoning}"</p><p className="mt-2 text-lg font-bold text-pink-500 text-right">AI 評分: {s.score}</p></button></div></div> ))}</div>;
        }
        if (hasGeneratedSuggestions) {
            return <div className="text-center p-8 bg-gray-50 rounded-lg"><h3 className="text-xl font-semibold text-gray-700">找不到合適搭配</h3><p className="text-gray-500 mt-2">AI 找不到完整的穿搭建議，您可以調整衣物或稍後再試一次！</p></div>;
        }
        if (memberItems.length === 0) {
             return <div className="text-center p-8 bg-gray-50 rounded-lg"><h3 className="text-xl font-semibold text-gray-700">衣櫥空空的...</h3><p className="text-gray-500 mt-2">請先為「{activeMember.name}」新增一些衣物吧！</p></div>;
        }
        return <div className="text-center p-8 bg-gray-50 rounded-lg"><h3 className="text-xl font-semibold text-gray-700">準備好了嗎？</h3><p className="text-gray-500 mt-2">點擊右上角的更新按鈕，讓 AI 為您推薦今日穿搭！</p></div>;
    };

    return (
        <div className="max-w-md mx-auto bg-white shadow-lg min-h-screen relative">
            {isCameraOpen && <CameraCaptureModal onClose={() => setCameraOpen(false)} onCapture={handleCapture} />}
            {currentItemToClassify && (
                <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <ClassificationModal item={currentItemToClassify} members={members} onSave={handleSaveClassification} onCancel={() => { setUploadQueue(prev => prev.slice(1)); setCurrentItemToClassify(null); }} queueLength={uploadQueue.length} />
                </div>
            )}
            {itemToReview && (
                <DuplicateReviewModal 
                    item={itemToReview}
                    allItems={clothingItems}
                    onResolve={handleResolveDuplicate}
                    onClose={() => setItemToReview(null)}
                    onViewImage={setImageToView}
                />
            )}
            {isMemberModalOpen && ( <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-lg p-6 w-full max-w-sm"><h3 className="text-lg font-semibold mb-4">{editingMember ? '編輯成員名稱' : '新增成員'}</h3><input type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="例如：媽媽、女兒" className="w-full border rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-pink-500" /><div className="flex justify-end space-x-2"><button onClick={() => setMemberModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md">取消</button><button onClick={handleSaveMember} className="px-4 py-2 bg-pink-500 text-white rounded-md">儲存</button></div></div></div> )}
            {isDeleteModalOpen && ( <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-lg p-6 w-full max-w-sm text-center"><h3 className="text-lg font-semibold mb-2">確定刪除？</h3><p className="text-gray-600 mb-6">您確定要刪除這件衣物嗎？此操作無法復原。</p><div className="flex justify-center space-x-4"><button onClick={() => setDeleteModalOpen(false)} className="px-6 py-2 bg-gray-200 rounded-md">取消</button><button onClick={() => confirmDeleteItem()} className="px-6 py-2 bg-red-500 text-white rounded-md">刪除</button></div></div></div> )}
            {scoreReasoning && ( <div className="absolute inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"><div className="bg-white rounded-lg p-6 w-full max-w-sm relative"><button onClick={() => setScoreReasoning(null)} className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-800"><XIcon size={24} /></button><h3 className="text-xl font-semibold mb-2 text-center">AI 評分解析</h3><div className="text-center mb-4"><span className="text-6xl font-bold text-pink-500">{scoreReasoning.score}</span><span className="text-xl font-semibold text-gray-600"> / 100</span></div><p className="text-gray-700">{scoreReasoning.reasoning}</p></div></div> )}
            {isEditModalOpen && editingItem && (
                 <EditItemModal 
                    item={editingItem}
                    members={members}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleUpdateItem}
                    onDelete={confirmDeleteItem}
                    onViewImage={setImageToView}
                 />
            )}
            {imageToView && (
                <ImageViewerModal imageUrl={imageToView} onClose={() => setImageToView(null)} />
            )}

            <header className="bg-white p-4 border-b sticky top-0 z-10 grid grid-cols-3 items-center">
                <div className="flex items-center col-span-1"><UserIcon className="text-pink-500" /><select value={activeMember?.id || ''} onChange={(e) => { const newMember = members.find(m => m.id === e.target.value); if(newMember) setActiveMember(newMember); setHasGeneratedSuggestions(false); setSuggestions([]); }} className="ml-2 font-semibold text-lg border-none bg-transparent focus:ring-0" disabled={members.length === 0}>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select><button onClick={() => handleOpenMemberModal(activeMember)} className="p-1 text-gray-400 hover:text-gray-600" disabled={!activeMember}><EditIcon size={16}/></button></div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 col-span-1">
                    {weatherStatus.loading ? <span>天氣載入中...</span> : weather ? ( <><SunIcon className="text-yellow-500 flex-shrink-0" />{weatherStatus.usingFallback && <MapPinOffIcon size={16} className="text-gray-400 flex-shrink-0" title="正在使用預設地點" /> }<div className="flex flex-col items-start"><span className="font-semibold leading-tight">{weather.city}</span><span className="leading-tight">{weather.currentTemp}°C <span className="text-xs text-gray-500">({weather.tempMin}°/{weather.tempMax}°)</span></span></div></> ) : <span>天氣資訊無法取得</span>}
                </div>
                <div className="flex justify-end col-span-1 items-center"><button onClick={() => handleOpenMemberModal(null)} className="p-2 rounded-full hover:bg-gray-100"><PlusIcon /></button><button onClick={handleSignOut} className="p-2 rounded-full hover:bg-gray-100 text-gray-500" title="登出"><LogOutIcon /></button></div>
            </header>

            <main className="p-4 pb-20">
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">{error} <button onClick={() => setError('')} className="absolute top-0 bottom-0 right-0 px-4 py-3"><XIcon size={20}/></button></div>}
                
                {optimizationStatus && (
                    <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg relative mb-4 flex items-center">
                        {loading.optimization && <RefreshCwIcon className="animate-spin mr-3" />}
                        <span>{optimizationStatus}</span>
                    </div>
                )}

                {view !== 'add' && !activeMember && ( <div className="text-center p-8 bg-gray-50 rounded-lg"><h3 className="text-xl font-semibold text-gray-700">歡迎！</h3><p className="text-gray-500 mt-2">請點擊右上角的 '+' 來新增第一位成員，開始您的智慧穿搭之旅。</p></div> )}

                {view === 'add' && ( <section className="flex flex-col items-center justify-center p-4"><h2 className="text-2xl font-bold text-gray-800 mb-4">新增衣物</h2>{!activeMember ? ( <div className="text-center p-8 bg-yellow-50 border border-yellow-200 rounded-lg w-full"><h3 className="text-xl font-semibold text-yellow-800">請先建立成員</h3><p className="text-yellow-700 mt-2">您需要先建立一個成員，才能開始新增衣物喔！</p><button onClick={() => handleOpenMemberModal(null)} className="mt-4 bg-pink-500 text-white font-bold py-2 px-4 rounded-lg">立即建立</button></div> ) : ( <> <p className="text-gray-600 mb-6 text-center">您可以選擇開啟相機拍照，或從相簿選擇照片。</p><div className="w-full max-w-xs space-y-4"><button onClick={() => setCameraOpen(true)} disabled={loading.upload} className="w-full bg-pink-500 text-white font-bold py-3 px-8 rounded-full flex items-center justify-center gap-2 disabled:bg-pink-300"><CameraIcon />開啟相機</button><button onClick={() => fileInputRef.current.click()} disabled={loading.upload} className="w-full bg-gray-700 text-white font-bold py-3 px-8 rounded-full flex items-center justify-center gap-2 disabled:bg-gray-500"><GalleryIcon />從相簿選擇</button></div><input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleFileSelectFromPicker} className="hidden" /></> )} </section> )}

                {activeMember && (
                    <>
                        {view === 'suggestions' && (
                            <section>
                                <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold text-gray-800">AI 推薦</h2><button onClick={generateSuggestions} disabled={loading.suggestions || weatherStatus.loading} className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"><RefreshCwIcon className={loading.suggestions ? 'animate-spin' : ''}/></button></div>
                                {renderSuggestionContent()}
                            </section>
                        )}
                        {view === 'manual' && (
                            <section>
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">自行搭配</h2>
                                <div className="space-y-6">
                                    <div><h3 className="text-lg font-semibold text-gray-700 mb-2">洋裝</h3><div className="grid grid-cols-3 gap-2">{renderClothingGrid(memberDresses, 'dress', manualOutfit.dress, handleManualSelect)}</div></div>
                                    <div><h3 className={`text-lg font-semibold mb-2 ${manualOutfit.dress ? 'text-gray-400' : 'text-gray-700'}`}>上身</h3><div className="grid grid-cols-3 gap-2">{renderClothingGrid(memberTops, 'top', manualOutfit.top, handleManualSelect, !!manualOutfit.dress)}</div></div>
                                    <div><h3 className={`text-lg font-semibold mb-2 ${manualOutfit.dress ? 'text-gray-400' : 'text-gray-700'}`}>下身</h3><div className="grid grid-cols-3 gap-2">{renderClothingGrid(memberBottoms, 'bottom', manualOutfit.bottom, handleManualSelect, !!manualOutfit.dress)}</div></div>
                                    <div><h3 className="text-lg font-semibold text-gray-700 mb-2">外套</h3><div className="grid grid-cols-3 gap-2">{renderClothingGrid(memberOutwears, 'outerwear', manualOutfit.outerwear, handleManualSelect)}</div></div>
                                </div>
                                <div className="mt-6 text-center"><button onClick={scoreManualOutfit} disabled={loading.scoring || weatherStatus.loading} className="bg-pink-500 text-white font-bold py-3 px-6 rounded-full w-full flex items-center justify-center disabled:bg-pink-300">{loading.scoring ? <RefreshCwIcon className="animate-spin mr-2"/> : <LightbulbIcon className="mr-2"/>}{loading.scoring ? 'AI 評分中...' : '獲取 AI 評分'}</button>{manualScoreResult && ( <button onClick={() => setScoreReasoning(manualScoreResult)} className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg text-purple-800 w-full text-left"><p className="italic">"{manualScoreResult.reasoning}"</p><p className="mt-2 text-lg font-bold text-right">AI 評分: {manualScoreResult.score}</p></button> )}</div>
                            </section>
                        )}
                        {view === 'gallery' && (
                            <section>
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">我的衣櫥 - {activeMember.name}</h2>
                                {memberItems.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {memberItems.map(item => (
                                            <div key={item.id} className="relative group cursor-pointer" onClick={() => openEditModal(item)}>
                                                <img src={item.imageUrl} alt={item.description} className="w-full h-32 object-cover rounded-md"/>
                                                {!item.isAnalyzed && (
                                                    <div className="absolute top-1 right-1 bg-yellow-400 p-1 rounded-full" title="等待 AI 優化">
                                                        <SparklesIcon size={12} color="white" />
                                                    </div>
                                                )}
                                                {item.duplicateStatus === 'needs_review' && (
                                                    <div className="absolute top-1 left-1 bg-red-500 p-1 rounded-full" title="發現可能重複的項目">
                                                        <AlertTriangleIcon size={12} color="white" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center rounded-md">
                                                    <p className="text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity">編輯</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <div className="text-center p-8 bg-gray-50 rounded-lg"><h3 className="text-xl font-semibold text-gray-700">衣櫥是空的</h3><p className="text-gray-500 mt-2">點擊下方的「新增衣物」按鈕，為「{activeMember.name}」建立數位衣櫥吧！</p></div>}
                            </section>
                        )}
                    </>
                )}
            </main>
            
            <footer className="bg-white border-t fixed bottom-0 left-0 right-0 max-w-md mx-auto z-10 p-2">
                <nav className="flex justify-around">
                    <button onClick={() => setView('suggestions')} className={`flex flex-col items-center w-full p-2 rounded-lg ${view === 'suggestions' ? 'text-pink-500 bg-pink-50' : 'text-gray-500'}`}><Wand2Icon /><span className="text-xs font-medium">AI 推薦</span></button>
                    <button onClick={() => setView('manual')} className={`flex flex-col items-center w-full p-2 rounded-lg ${view === 'manual' ? 'text-pink-500 bg-pink-50' : 'text-gray-500'}`}><LightbulbIcon /><span className="text-xs font-medium">自行搭配</span></button>
                    <button onClick={() => setView('add')} className={`flex flex-col items-center w-full p-2 rounded-lg ${view === 'add' ? 'text-pink-500 bg-pink-50' : 'text-gray-500'}`}><CameraIcon /><span className="text-xs font-medium">新增衣物</span></button>
                    <button onClick={() => setView('gallery')} className={`flex flex-col items-center w-full p-2 rounded-lg ${view === 'gallery' ? 'text-pink-500 bg-pink-50' : 'text-gray-500'}`}><GalleryIcon /><span className="text-xs font-medium">我的衣櫥</span></button>
                </nav>
            </footer>
        </div>
    );
}

// --- Component: ClassificationModal (分類彈窗) ---
function ClassificationModal({ item, members, onSave, onCancel, queueLength }) {
    const [category, setCategory] = useState('top');
    const [memberId, setMemberId] = useState(members[0]?.id || '');

    useEffect(() => {
        if (!memberId && members.length > 0) {
            setMemberId(members[0].id);
        }
    }, [members, memberId]);

    const handleSaveClick = () => {
        if (!memberId) {
            alert("請選擇一位成員！");
            return;
        }
        onSave(item, category, memberId);
    };

    return (
        <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-xl font-semibold mb-4">分類衣物 ({queueLength} 張待處理)</h3>
            <img src={item.preview} alt="Preview" className="w-full h-48 object-cover rounded-md mb-4"/>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">分類</label>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md">
                        <option value="top">上身</option>
                        <option value="bottom">下身</option>
                        <option value="dress">洋裝</option>
                        <option value="outerwear">外套</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">屬於哪位成員？</label>
                    <select value={memberId} onChange={e => setMemberId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md">
                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>
            </div>
            <div className="mt-6 flex justify-between">
                <button onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md">跳過</button>
                <button onClick={handleSaveClick} className="px-4 py-2 bg-pink-500 text-white rounded-md">儲存並繼續</button>
            </div>
        </div>
    );
}

// --- Component: EditItemModal (編輯衣物彈窗) ---
function EditItemModal({ item, members, onClose, onSave, onDelete, onViewImage }) {
    const [category, setCategory] = useState(item.category);
    const [memberId, setMemberId] = useState(item.memberId);

    return (
        <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm relative">
                <button onClick={onClose} className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-800"><XIcon size={24} /></button>
                <h3 className="text-xl font-semibold mb-4">編輯衣物</h3>
                <img src={item.imageUrl} alt="Editing item" className="w-full h-48 object-cover rounded-md mb-4 cursor-pointer" onClick={() => onViewImage(item.imageUrl)}/>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">分類</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md">
                            <option value="top">上身</option>
                            <option value="bottom">下身</option>
                            <option value="dress">洋裝</option>
                            <option value="outerwear">外套</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">屬於哪位成員？</label>
                        <select value={memberId} onChange={e => setMemberId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md">
                            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="mt-6 flex justify-between items-center">
                    <button onClick={() => onDelete(item)} className="p-2 text-red-600 hover:bg-red-50 rounded-full"><Trash2Icon size={24}/></button>
                    <button onClick={() => onSave(category, memberId)} className="px-6 py-2 bg-pink-500 text-white font-semibold rounded-md hover:bg-pink-600">儲存變更</button>
                </div>
            </div>
        </div>
    );
}

// --- Component: DuplicateReviewModal (重複審核彈窗) ---
function DuplicateReviewModal({ item, allItems, onClose, onResolve, onViewImage }) {
    const potentialMatch = allItems.find(i => i.id === item.potentialMatchId);

    if (!potentialMatch) {
        // 自動解決：如果找不到匹配的項目，就標記為唯一並關閉
        onResolve(item, false); 
        return null;
    }

    return (
        <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm text-center">
                <h3 className="text-xl font-semibold mb-4">AI 發現可能重複的衣物</h3>
                <p className="text-gray-600 mb-4">請確認這兩件衣物是否為同一件？</p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <p className="text-sm font-medium mb-1">新上傳的</p>
                        <img src={item.imageUrl} alt="New item" className="w-full h-32 object-cover rounded-md cursor-pointer" onClick={() => onViewImage(item.imageUrl)}/>
                    </div>
                    <div>
                        <p className="text-sm font-medium mb-1">已存在的</p>
                        <img src={potentialMatch.imageUrl} alt="Existing item" className="w-full h-32 object-cover rounded-md cursor-pointer" onClick={() => onViewImage(potentialMatch.imageUrl)}/>
                    </div>
                </div>
                <div className="flex flex-col space-y-2">
                    <button onClick={() => onResolve(item, false)} className="px-6 py-2 bg-gray-600 text-white rounded-md w-full">不是，這是兩件不同的衣服</button>
                    <button onClick={() => onResolve(item, true)} className="px-6 py-2 bg-red-500 text-white rounded-md w-full">是同一件，請刪除新的</button>
                </div>
            </div>
        </div>
    );
}

// **新增：圖片檢視器彈窗元件**
function ImageViewerModal({ imageUrl, onClose }) {
    return (
        <div className="absolute inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="relative">
                <button onClick={onClose} className="absolute -top-4 -right-4 p-2 bg-white rounded-full text-gray-800 hover:bg-gray-200"><XIcon size={24} /></button>
                <img src={imageUrl} alt="Full view" className="max-w-[90vw] max-h-[90vh] object-contain"/>
            </div>
        </div>
    );
}

export default App;

