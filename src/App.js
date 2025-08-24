import React, { useState, useEffect, useRef } from 'react';
// --- UPDATE: Import new auth tools ---
import { auth, db, storage, onAuthStateChanged, googleProvider, signInWithPopup, signOut } from './firebase';
import { collection, addDoc, query, where, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";

// --- Icon Components (remain the same) ---
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


function App() {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true); // New state for initial auth check
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
                fetchWeather(24.9576, 121.2245);
            }
        );
    }, []);

    // --- UPDATE: Authentication Logic ---
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false); // Auth check is complete
        });
        return () => unsub();
    }, []);

    // --- NEW: Sign-in and Sign-out Functions ---
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
            // Clear all local state on sign out
            setProfiles([]);
            setActiveProfile(null);
            setClothingItems([]);
        } catch (error) {
            console.error("Sign-Out Error", error);
            setError("登出失敗。");
        }
    };

    useEffect(() => {
        if (!user) { // Clear data if user logs out
            setProfiles([]);
            setActiveProfile(null);
            return;
        };
        const q = query(collection(db, `users/${user.uid}/profiles`));
        const unsub = onSnapshot(q, snap => {
            const profilesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setProfiles(profilesData);
            if (!activeProfile && profilesData.length > 0) {
                setActiveProfile(profilesData[0]);
            } else if (profilesData.length === 0) {
                setActiveProfile(null);
            }
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
            if (view === 'suggestions' && items.length > 0) {
                generateSuggestions(currentTops, currentBottoms);
            } else {
                setLoading(p => ({ ...p, suggestions: false }));
            }
        }, e => { setError("讀取衣物資料失敗"); setLoading(p => ({ ...p, gallery: false, suggestions: false })); });
        return () => unsub();
    }, [activeProfile, user, view]);

    const callGeminiAPI = async (prompt, imageData = null, weatherData = null) => { /* ... same ... */ };
    const handleAddProfile = async () => { /* ... same ... */ };
    const handleImageUpload = async (event) => { /* ... same ... */ };
    const generateSuggestions = async (currentTops, currentBottoms) => { /* ... same ... */ };
    const getManualSuggestion = async () => { /* ... same ... */ };
    const openEditModal = (item) => { /* ... same ... */ };
    const handleUpdateItem = async () => { /* ... same ... */ };
    const handleDeleteConfirmation = (item) => { /* ... same ... */ };
    const confirmDeleteItem = async () => { /* ... same ... */ };
    
    // --- NEW: Loading and Login Screens ---
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

    // --- Main App Render (for logged-in users) ---
    return (
        <div className="max-w-md mx-auto bg-white shadow-lg min-h-screen relative">
            {/* All modals are the same */}
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
                <div className="flex justify-end col-span-1 items-center">
                    <button onClick={() => setProfileModalOpen(true)} className="p-2 rounded-full hover:bg-gray-100"><PlusIcon /></button>
                    <button onClick={handleSignOut} className="p-2 rounded-full hover:bg-gray-100 text-gray-500" title="登出">
                        <LogOutIcon />
                    </button>
                </div>
            </header>

            <main className="p-4 pb-20">
                {/* ... The rest of the main content is the same ... */}
            </main>
            <footer className="bg-white border-t fixed bottom-0 left-0 right-0 max-w-md mx-auto z-10 p-2">
                {/* ... The footer is the same ... */}
            </footer>
        </div>
    );
}

export default App;
