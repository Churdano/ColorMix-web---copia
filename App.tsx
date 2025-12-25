
import React, { useState, useEffect } from 'react';
import ColorPicker from './components/ColorPicker';
import InventoryManager from './components/InventoryManager';
import RecipeDisplay from './components/RecipeDisplay';
import UserSelector from './components/UserSelector';
import SettingsModal from './components/SettingsModal';
import HistorySidebar from './components/HistorySidebar';
import { generatePaintRecipe } from './services/geminiService';
import { Paint, PixelColor, MixingRecipe, UserProfile, UserSettings, RecipeHistoryItem } from './types';
import { COMMON_PAINTS, AI_MODELS } from './constants';

import { supabaseService } from './services/supabaseService';


// URL de la imagen de fondo (Usamos un placeholder de Unsplash que imita la foto subida: pinceles, óleos, madera)
// Si el usuario tiene la foto local, debería reemplazar esto por 'background.jpg' si está en public.
const BACKGROUND_IMAGE_URL = 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=2071&auto=format&fit=crop';

const generateRandomColor = () => {
    const colors = ['#f59e0b', '#ef4444', '#d97706', '#b45309', '#78350f', '#0ea5e9', '#6366f1'];
    return colors[Math.floor(Math.random() * colors.length)];
};

const MainContent: React.FC = () => {
    // Global App State
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

    // Session State
    const [targetColor, setTargetColor] = useState<PixelColor | null>(null);
    const [recipe, setRecipe] = useState<MixingRecipe | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // UI State
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Load users on mount
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const loadedUsers = await supabaseService.getUsers();
                setUsers(loadedUsers);
            } catch (e) {
                console.error("Failed to load users from Supabase", e);
                setError("Error al cargar los datos. Revisa tu conexión.");
            }
        };
        loadUsers();
    }, []);

    // Wrapper to update inventory for the CURRENT user
    const setUserInventory = async (newInventoryAction: React.SetStateAction<Paint[]>) => {
        if (!currentUser) return;

        let newInventory: Paint[];
        if (typeof newInventoryAction === 'function') {
            newInventory = newInventoryAction(currentUser.inventory);
        } else {
            newInventory = newInventoryAction;
        }

        const updatedUser = { ...currentUser, inventory: newInventory };
        setCurrentUser(updatedUser);
        setUsers(prevUsers => prevUsers.map(u => u.id === currentUser.id ? updatedUser : u));

        try {
            await supabaseService.updateInventory(currentUser.id, newInventory);
        } catch (e) {
            console.error("Failed to save inventory", e);
            setError("Error al guardar el inventario.");
        }
    };

    const handleUpdateSettings = async (newSettings: UserSettings) => {
        if (!currentUser) return;
        const updatedUser = { ...currentUser, settings: newSettings };
        setCurrentUser(updatedUser);
        setUsers(prevUsers => prevUsers.map(u => u.id === currentUser.id ? updatedUser : u));

        try {
            await supabaseService.updateSettings(currentUser.id, newSettings);
        } catch (e) {
            console.error("Failed to save settings", e);
        }
    };

    const handleCreateUser = async (name: string) => {
        const newUser: UserProfile = {
            id: Date.now().toString(),
            name,
            inventory: COMMON_PAINTS.slice(0, 5), // Default starter kit
            avatarColor: generateRandomColor(),
            createdAt: Date.now(),
            settings: {
                provider: 'gemini',
                modelId: 'gemini-2.5-flash'
            },
            history: []
        };

        // Optimistic update
        const updatedUsers = [...users, newUser];
        setUsers(updatedUsers);
        setCurrentUser(newUser);

        try {
            await supabaseService.createUser(newUser);
        } catch (e) {
            console.error("Failed to create user", e);
            setError("Error al crear usuario.");
        }
    };

    const handleDeleteUser = async (userId: string) => {
        const updated = users.filter(u => u.id !== userId);
        setUsers(updated);

        try {
            await supabaseService.deleteUser(userId);
        } catch (e) {
            console.error("Failed to delete user", e);
            setError("Error al eliminar usuario.");
        }
    };

    const handleLogin = (user: UserProfile) => {
        // Ensure history is initialized
        const safeUser = { ...user, history: user.history || [] };
        setCurrentUser(safeUser);
        setTargetColor(null);
        setRecipe(null);
        setError(null);
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setTargetColor(null);
        setRecipe(null);
        setShowSettings(false);
        setShowHistory(false);
    };

    const handleColorSelect = (color: PixelColor) => {
        setTargetColor(color);
        setRecipe(null);
        setError(null);
    };

    const handleGenerateRecipe = async () => {
        if (!targetColor) return;
        if (!currentUser || currentUser.inventory.length === 0) {
            setError("¡Necesitas agregar pinturas a tu inventario para poder mezclar!");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await generatePaintRecipe(
                targetColor.hex,
                currentUser.inventory,
                currentUser.settings
            );
            setRecipe(result);

            // Auto-save to history
            const newHistoryItem: RecipeHistoryItem = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                recipe: result
            };

            const updatedUser = {
                ...currentUser,
                history: [newHistoryItem, ...(currentUser.history || [])]
            };
            setCurrentUser(updatedUser);
            setUsers(prevUsers => prevUsers.map(u => u.id === currentUser.id ? updatedUser : u));

            await supabaseService.addHistoryItem(currentUser.id, newHistoryItem);

        } catch (err: any) {
            setError(err.message || "Error al conectar con el servicio de IA.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteHistoryItem = async (id: string) => {
        if (!currentUser) return;
        const updatedHistory = currentUser.history.filter(item => item.id !== id);
        const updatedUser = { ...currentUser, history: updatedHistory };
        setCurrentUser(updatedUser);
        setUsers(prevUsers => prevUsers.map(u => u.id === currentUser.id ? updatedUser : u));

        try {
            await supabaseService.deleteHistoryItem(id);
        } catch (e) {
            console.error("Failed to delete history item", e);
        }
    };

    const handleLoadHistoryItem = (recipeToLoad: MixingRecipe) => {
        setRecipe(recipeToLoad);
        // Construct a fake target color object just for visualization if needed, 
        // though RecipeDisplay uses the recipe's stored hex.
        setTargetColor({
            hex: recipeToLoad.targetColorHex,
            r: 0, g: 0, b: 0, x: 0, y: 0 // Dummy coords
        });
    };

    const getCurrentModelName = () => {
        if (!currentUser?.settings?.modelId) return "Gemini 2.5 Flash";
        const model = AI_MODELS.find(m => m.id === currentUser.settings?.modelId);
        return model ? model.name : currentUser.settings.modelId;
    };

    return (
        <div className="min-h-screen relative overflow-x-hidden pb-20 font-sans selection:bg-orange-500/30">

            {/* Background Image with Overlay */}
            <div className="fixed inset-0 z-0">
                {/* Base Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] hover:scale-105"
                    style={{ backgroundImage: `url(${BACKGROUND_IMAGE_URL})` }}
                ></div>
                {/* Blur & Darkening Overlay to ensure text readability */}
                <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm"></div>

                {/* Vignette effect */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]"></div>
            </div>

            {/* Decorative Lights/Glows matching the photo's colors */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/20 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-600/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
            </div>

            {!currentUser ? (
                <div className="relative z-10 pt-20">
                    <UserSelector
                        users={users}
                        onSelectUser={handleLogin}
                        onCreateUser={handleCreateUser}
                        onDeleteUser={handleDeleteUser}
                    />
                </div>
            ) : (
                <>
                    {/* Header */}
                    <header className="glass-panel sticky top-4 mx-4 md:mx-auto max-w-5xl z-50 rounded-2xl animate-fade-in-up mt-4">
                        <div className="px-6 py-3 flex items-center justify-between">
                            <div className="flex items-center space-x-3 group cursor-default">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-orange-500 blur rounded-full opacity-30 group-hover:opacity-60 transition-opacity duration-500"></div>
                                    <div className="relative bg-gradient-to-br from-stone-800 to-stone-900 p-2 rounded-xl border border-white/10 shadow-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                        </svg>
                                    </div>
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight text-stone-100 font-sans">ColorMix</h1>
                                    <p className="text-[10px] text-orange-400/80 font-medium tracking-widest uppercase">Atelier</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <div className="hidden md:flex items-center text-right">
                                    <div className="mr-3">
                                        <p className="text-sm font-semibold text-stone-200">{currentUser.name}</p>
                                        <p className="text-[10px] text-stone-500 uppercase tracking-wider">{currentUser.inventory.length} Tubos</p>
                                    </div>
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-inner border border-white/10 ring-2 ring-black/20"
                                        style={{ backgroundColor: currentUser.avatarColor }}
                                    >
                                        {currentUser.name.charAt(0).toUpperCase()}
                                    </div>
                                </div>

                                <div className="h-6 w-px bg-stone-700 mx-1 hidden md:block"></div>

                                <button
                                    onClick={() => setShowHistory(true)}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/30 text-stone-400 hover:text-indigo-300 transition-all duration-300 relative"
                                    title="Bitácora (Historial)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                    {currentUser.history && currentUser.history.length > 0 && (
                                        <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full"></span>
                                    )}
                                </button>

                                <button
                                    onClick={() => setShowSettings(true)}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-orange-500/10 border border-transparent hover:border-orange-500/30 text-stone-400 hover:text-orange-400 transition-all duration-300"
                                    title="Configuración"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>

                                <button
                                    onClick={handleLogout}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 text-stone-400 hover:text-red-400 transition-all duration-300"
                                    title="Salir"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </header>

                    <main className="relative z-10 max-w-4xl mx-auto px-4 py-10 space-y-8">

                        {/* Intro Text */}
                        <div className="text-center space-y-2 mb-8 animate-fade-in-up">
                            <h2 className="text-3xl md:text-5xl font-bold text-stone-100 tracking-tight drop-shadow-xl">
                                Mesa de Trabajo
                            </h2>
                            <p className="text-orange-200/60 text-base max-w-xl mx-auto font-light">
                                Prepara tu paleta, selecciona tu referencia y deja que la IA mezcle los óleos por ti.
                            </p>
                        </div>

                        {/* Step 1: Inventory */}
                        <section className="animate-fade-in-up transition-transform hover:scale-[1.01] duration-500" style={{ animationDelay: '0.1s' }}>
                            <InventoryManager inventory={currentUser.inventory} setInventory={setUserInventory} />
                        </section>

                        {/* Step 2: Image & Color */}
                        <section className="animate-fade-in-up transition-transform hover:scale-[1.01] duration-500" style={{ animationDelay: '0.2s' }}>
                            <ColorPicker onColorSelect={handleColorSelect} />
                        </section>

                        {/* Action Button */}
                        <section className="flex justify-center sticky bottom-6 z-40 pointer-events-none animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                            <button
                                onClick={handleGenerateRecipe}
                                disabled={!targetColor || loading}
                                className={`
                            pointer-events-auto
                            px-8 py-4 rounded-xl font-bold text-lg shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] transform transition-all duration-300
                            flex items-center space-x-3 border backdrop-blur-md
                            ${!targetColor
                                        ? 'bg-stone-800/90 border-stone-600 text-stone-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-orange-600 to-red-700 border-orange-500/50 text-white hover:scale-105 active:scale-95 animate-pulse-glow hover:shadow-[0_0_30px_rgba(234,88,12,0.4)]'
                                    }
                        `}
                            >
                                {loading ? (
                                    <div className="flex items-center space-x-3">
                                        <svg className="animate-spin h-5 w-5 text-orange-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span className="text-orange-100">Mezclando pigmentos...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-1.5 bg-white/20 rounded-full border border-white/10">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <span>Crear Receta</span>
                                    </>
                                )}
                            </button>
                        </section>

                        {/* Error Message */}
                        {error && (
                            <div className="animate-fade-in-up glass-panel border-l-4 border-l-red-500 text-red-100 p-4 rounded-r-xl shadow-lg relative" role="alert">
                                <div className="flex items-center">
                                    <svg className="h-6 w-6 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-medium">{error}</span>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Result */}
                        <section ref={(el) => {
                            if (recipe && el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }}>
                            <RecipeDisplay
                                recipe={recipe}
                                loading={loading}
                                modelName={getCurrentModelName()}
                            />
                        </section>

                    </main>

                    <footer className="relative z-10 max-w-4xl mx-auto px-4 py-8 text-center text-stone-500 text-sm border-t border-white/5 mt-12 mb-4">
                        <p className="font-medium text-stone-400">© 2026 ColorMix Atelier.</p>
                        <p className="mt-2 text-xs opacity-60">Compatible con Vallejo, Citadel, Army Painter y óleos digitales.</p>
                    </footer>

                    {/* Settings Modal */}
                    {showSettings && (
                        <SettingsModal
                            currentSettings={currentUser.settings}
                            onSave={handleUpdateSettings}
                            onClose={() => setShowSettings(false)}
                        />
                    )}

                    {/* History Sidebar */}
                    <HistorySidebar
                        isOpen={showHistory}
                        onClose={() => setShowHistory(false)}
                        history={currentUser.history || []}
                        onSelectRecipe={handleLoadHistoryItem}
                        onDeleteRecipe={handleDeleteHistoryItem}
                    />
                </>
            )}
        </div>
    );
}

const App: React.FC = () => {
    return (
        <MainContent />
    )
};

export default App;
