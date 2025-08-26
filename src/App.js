import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage, onAuthStateChanged, googleProvider, signInWithPopup, signOut } from './firebase';
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
const LogOutIcon = createSvgIcon(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>);
const GoogleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 35.797 44 30.138 44 24c0-1.341-.138-2.65-.389-3.917z"></path></svg>);

// --- NEW: Camera Capture Modal Component ---
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
                        facingMode: "environment", // Prioritize rear camera
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

        return () => { // Cleanup function to stop the camera stream
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCaptureClick = () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Create a square crop from the center of the video
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
                onCapture(blob); // Pass the captured image blob back
            }
        }, 'image/jpeg', 0.95); // High quality JPEG
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
                    {/* Square Frame Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[80vw] h-[80vw] max-w-[80vh] max-h-[80vh] border-4 border-dashed border-white/70 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/50 flex justify-around items-center">
                        <button onClick={onClose} className="text-white font-semibold px-4 py-2">取消</button>
                        <button onClick={handleCaptureClick} className="w-20 h-20 rounded-full bg-white border-4 border-pink-500"></button>
                        <div className="w-16"></div> {/* Placeholder for alignment */}
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
    
    // --- NEW: State for custom camera modal ---
    const [isCameraOpen, setCameraOpen] = useState(false);

    useEffect(() => { /* ... Weather fetch logic ... */ }, []);
    useEffect(() => { /* ... Auth logic ... */ }, []);
    const handleSignIn = async () => { /* ... */ };
    const handleSignOut = async () => { /* ... */ };
    useEffect(() => { /* ... Profile fetch logic ... */ }, [user]);
    useEffect(() => { /* ... Clothing items fetch logic ... */ }, [activeProfile, user, view]);
    const callGeminiAPI = async (prompt, imageData = null, weatherData = null) => { /* ... */ };
    const handleAddProfile = async () => { /* ... */ };
    
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

    // --- UPDATED: handleImageUpload now processes a file object ---
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
        event.target.value = null; // Reset input
    };
    
    // --- NEW: Handle image captured from custom camera ---
    const handleCapture = (imageBlob) => {
        setCameraOpen(false);
        const fileName = `capture-${Date.now()}.jpg`;
        const file = new File([imageBlob], fileName, { type: 'image/jpeg' });
        processAndUploadFile(file);
    };


    const generateSuggestions = async (currentTops, currentBottoms) => { /* ... */ };
    const getManualSuggestion = async () => { /* ... */ };
    const openEditModal = (item) => { /* ... */ };
    const handleUpdateItem = async () => { /* ... */ };
    const handleDeleteConfirmation = (item) => { /* ... */ };
    const confirmDeleteItem = async () => { /* ... */ };
    
    if (authLoading) { /* ... Loading screen ... */ }
    if (!user) { /* ... Login screen ... */ }

    return (
        <div className="max-w-md mx-auto bg-white shadow-lg min-h-screen relative">
            {/* --- NEW: Render Camera Modal when isCameraOpen is true --- */}
            {isCameraOpen && <CameraCaptureModal onClose={() => setCameraOpen(false)} onCapture={handleCapture} />}
            
            {/* All other modals remain the same */}
            {isProfileModalOpen && ( /* ... */ )}
            {isDeleteModalOpen && ( /* ... */ )}
            {isEditModalOpen && editingItem && ( /* ... */ )}
            {isDuplicateModalOpen && ( /* ... */ )}

            <header className="bg-white p-4 border-b sticky top-0 z-10 grid grid-cols-3 items-center">
                 {/* ... Header JSX is the same ... */}
            </header>

            <main className="p-4 pb-20">
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">{error} <button onClick={() => setError('')} className="absolute top-0 bottom-0 right-0 px-4 py-3"><XIcon size={20}/></button></div>}
                {view !== 'add' && !activeProfile && (
                    <div className="text-center p-8 bg-gray-50 rounded-lg">
                        <h3 className="text-xl font-semibold text-gray-700">歡迎使用 AI 穿搭師！</h3>
                        <p className="text-gray-500 mt-2">請點擊右上角的 '+' 來新增第一位使用者，開始您的智慧穿搭之旅。</p>
                    </div>
                )}
                {view === 'add' || (activeProfile && (
                    <>
                        {view === 'suggestions' && ( <section>{/* ... Suggestions JSX ... */}</section> )}
                        {view === 'manual' && ( <section>{/* ... Manual JSX ... */}</section> )}
                        {view === 'gallery' && ( <section>{/* ... Gallery JSX ... */}</section> )}
                    </>
                ))}
                {view === 'add' && (
                    <section className="flex flex-col items-center justify-center p-4">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">新增衣物</h2>
                        {/* --- UPDATE: Add guidance if no profile is selected --- */}
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
                                     {/* --- UPDATE: Buttons to open custom camera or file picker --- */}
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
                {/* ... Footer JSX is the same ... */}
            </footer>
        </div>
    );
}

export default App;
