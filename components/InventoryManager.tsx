
import React, { useState, useMemo } from 'react';
import { Paint } from '../types';
import { COMMON_PAINTS, BRANDS } from '../constants';
import ColorChartCalibrator from './ColorChartCalibrator';

interface InventoryManagerProps {
  inventory: Paint[];
  setInventory: React.Dispatch<React.SetStateAction<Paint[]>>;
}

const InventoryManager: React.FC<InventoryManagerProps> = ({ inventory, setInventory }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeBrandTab, setActiveBrandTab] = useState(BRANDS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customName, setCustomName] = useState('');
  const [customHex, setCustomHex] = useState('#ffffff');
  const [confirmingClear, setConfirmingClear] = useState(false);
  
  // Local state for available paints (initialized from Constants, but mutable)
  const [availablePaints, setAvailablePaints] = useState<Paint[]>(COMMON_PAINTS);
  const [isCalibrating, setIsCalibrating] = useState(false);

  const togglePaint = (paint: Paint) => {
    // Check by ID
    const exists = inventory.find(p => p.id === paint.id);
    if (exists) {
      setInventory(inventory.filter(p => p.id !== paint.id));
    } else {
      setInventory([...inventory, paint]);
    }
  };

  const addCustomPaint = () => {
    if (!customName.trim()) return;
    const newPaint: Paint = {
      id: `custom-${Date.now()}`,
      brand: activeBrandTab,
      name: customName,
      category: 'base',
      hex: customHex
    };
    // Add to local available paints as well so it persists in the list view
    setAvailablePaints([...availablePaints, newPaint]);
    setInventory([...inventory, newPaint]);
    setCustomName('');
  };

  const handleClearClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmingClear(true);
  };

  const confirmClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setInventory([]);
    setConfirmingClear(false);
  };

  const cancelClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmingClear(false);
  };

  const handleUpdatePaintColor = (paintId: string, newHex: string) => {
    // 1. Update in available list
    const updatedAvailable = availablePaints.map(p => 
        p.id === paintId ? { ...p, hex: newHex } : p
    );
    setAvailablePaints(updatedAvailable);

    // 2. Update in user inventory if it exists there
    const updatedInventory = inventory.map(p => 
        p.id === paintId ? { ...p, hex: newHex } : p
    );
    setInventory(updatedInventory);
  };

  // Group paints by brand and apply search filter
  const filteredPaints = useMemo(() => {
    return availablePaints.filter(p => {
        let isBrandMatch = false;
        if (activeBrandTab === 'Citadel') {
            isBrandMatch = p.brand === 'Citadel';
        } else {
            isBrandMatch = p.brand === activeBrandTab;
        }

        if (!isBrandMatch) return false;

        if (!searchQuery.trim()) return true;

        const query = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(query) || 
               p.id.toLowerCase().includes(query);
    });
  }, [activeBrandTab, searchQuery, availablePaints]);

  const handleTabChange = (brand: string) => {
      setActiveBrandTab(brand);
      setSearchQuery('');
      setIsCalibrating(false); // Reset mode when changing tabs
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ring-1 ring-white/5">
        <button 
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full p-6 flex justify-between items-center bg-gradient-to-r from-stone-800/40 to-stone-900/40 hover:bg-stone-800/60 transition-colors focus:outline-none group"
        >
            <div className="flex items-center space-x-5">
                <div className={`p-3 rounded-xl transition-all duration-300 ${inventory.length > 0 ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg shadow-orange-900/40' : 'bg-stone-700 text-stone-400'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
                    </svg>
                </div>
                <div className="text-left">
                    <h2 className="text-xl font-bold text-stone-100 group-hover:text-orange-200 transition-colors">Mis Pigmentos</h2>
                    <p className="text-sm text-stone-400">
                        {inventory.length > 0 
                            ? <span className="text-orange-400 font-medium">{inventory.length} colores en la paleta</span>
                            : 'Define tu inventario disponible'}
                    </p>
                </div>
            </div>
            <div className="flex items-center">
                <div className="flex -space-x-2 mr-6 overflow-hidden">
                    {inventory.slice(0, 5).map(p => (
                        <div key={p.id} className="w-9 h-9 rounded-full border-2 border-stone-800 shadow-md transform hover:scale-110 transition-transform z-0 hover:z-10" style={{backgroundColor: p.hex || '#ccc'}}></div>
                    ))}
                    {inventory.length > 5 && (
                        <div className="w-9 h-9 rounded-full bg-stone-700 border-2 border-stone-800 flex items-center justify-center text-[10px] font-bold text-stone-300 shadow-md z-10">
                            +{inventory.length - 5}
                        </div>
                    )}
                </div>
                <div className={`bg-stone-700/50 p-2 rounded-full transition-transform duration-300 border border-white/5 ${isOpen ? 'rotate-180 bg-stone-600' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
        </button>

      {isOpen && (
        <div className="border-t border-white/5 bg-stone-950/30 flex flex-col animate-fade-in-up">
          
          {/* Brand Tabs */}
          <div className="flex overflow-x-auto border-b border-white/5 scrollbar-hide bg-stone-900/40">
            {BRANDS.map(brand => (
                <button
                    key={brand}
                    type="button"
                    onClick={() => handleTabChange(brand)}
                    className={`
                        px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all relative focus:outline-none
                        ${activeBrandTab === brand ? 'text-orange-100 bg-white/5' : 'text-stone-500 hover:text-stone-300 hover:bg-white/5'}
                    `}
                >
                    {brand}
                    {activeBrandTab === brand && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"></span>
                    )}
                </button>
            ))}
          </div>

          <div className="p-6">
             {/* Calibration Mode Toggle */}
             {activeBrandTab !== 'Other' && !isCalibrating && (
                <div className="mb-6 flex justify-end">
                    <button 
                        onClick={() => setIsCalibrating(true)}
                        className="text-xs flex items-center space-x-2 text-orange-300 hover:text-white bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 px-4 py-2 rounded-lg transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                        <span>Calibrar Carta de Colores</span>
                    </button>
                </div>
             )}

             {isCalibrating ? (
                 <ColorChartCalibrator 
                    paints={filteredPaints} 
                    onUpdatePaintColor={handleUpdatePaintColor}
                    onClose={() => setIsCalibrating(false)}
                    brandName={activeBrandTab}
                 />
             ) : (
                <>
                    {/* Toolbar: Search & Clear Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                        {/* Search Input */}
                        {activeBrandTab !== 'Other' ? (
                            <div className="relative flex-grow group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-stone-500 group-focus-within:text-orange-400 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder={`Buscar en ${activeBrandTab}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-10 py-3 bg-stone-900/50 border border-stone-700 rounded-xl focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500 text-sm text-stone-100 placeholder-stone-600 outline-none transition-all hover:bg-stone-900/80"
                                />
                                {searchQuery && (
                                    <button 
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-500 hover:text-white transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ) : <div className="flex-grow text-sm text-stone-500 italic">Pinturas personalizadas</div>}

                        {/* Delete All Button */}
                        {inventory.length > 0 && (
                            <div className="flex-shrink-0">
                                {confirmingClear ? (
                                    <div className="flex items-center space-x-2 animate-fade-in p-1 bg-red-900/20 rounded-lg border border-red-500/20">
                                        <span className="text-xs text-red-300 font-medium pl-2">¿Borrar?</span>
                                        <button
                                            type="button"
                                            onClick={confirmClear}
                                            className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-500 text-xs font-bold uppercase transition-colors shadow-lg shadow-red-900/50"
                                        >
                                            Sí
                                        </button>
                                        <button
                                            type="button"
                                            onClick={cancelClear}
                                            className="px-3 py-1.5 rounded-md bg-stone-700 text-stone-300 hover:bg-stone-600 text-xs font-medium uppercase transition-colors"
                                        >
                                            No
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleClearClick}
                                        className="flex items-center justify-center space-x-1 px-4 py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-xs font-bold uppercase tracking-wide"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span>Vaciar</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Paint Grid */}
                    {activeBrandTab !== 'Other' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                            {filteredPaints.map(paint => {
                                const isSelected = inventory.some(p => p.id === paint.id);
                                return (
                                    <button
                                        key={paint.id}
                                        type="button"
                                        onClick={() => togglePaint(paint)}
                                        className={`
                                            flex items-center p-2.5 rounded-xl border transition-all duration-200 group focus:outline-none relative overflow-hidden
                                            ${isSelected 
                                                ? 'bg-orange-900/20 border-orange-600/50 shadow-[0_0_15px_rgba(234,88,12,0.1)]' 
                                                : 'bg-white/5 border-transparent hover:border-stone-600 hover:bg-white/10'
                                            }
                                        `}
                                    >
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent pointer-events-none"></div>
                                        )}
                                        
                                        <div 
                                            className={`w-9 h-9 rounded-full border border-stone-600 shadow-sm flex-shrink-0 mr-3 transition-transform duration-300 ${isSelected ? 'scale-110 border-orange-400' : 'group-hover:scale-105'}`} 
                                            style={{backgroundColor: paint.hex}}
                                        >
                                            {isSelected && (
                                                <div className="w-full h-full flex items-center justify-center bg-black/20 rounded-full animate-fade-in">
                                                    <svg className="w-5 h-5 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-left overflow-hidden relative z-10">
                                            <p className={`text-sm truncate transition-colors ${isSelected ? 'text-white font-semibold' : 'text-stone-300 group-hover:text-white'}`}>
                                                {paint.name}
                                            </p>
                                            <p className={`text-[10px] truncate transition-colors ${isSelected ? 'text-orange-300' : 'text-stone-500'}`}>{paint.id}</p>
                                        </div>
                                    </button>
                                );
                            })}
                            {filteredPaints.length === 0 && (
                                <p className="col-span-full text-center text-stone-500 py-8 text-sm italic">
                                    {searchQuery ? 'No se encontraron pigmentos con ese nombre.' : 'No hay colores predefinidos para esta marca.'}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-stone-500 text-sm py-8 bg-black/20 rounded-xl border border-white/5 border-dashed">
                            Usa la sección de abajo para agregar pigmentos personalizados.
                        </div>
                    )}

                    {/* Manual Add Section */}
                    <div className="mt-6 pt-5 border-t border-white/5">
                        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center">
                            <span className="w-2 h-2 rounded-full bg-orange-500 mr-2"></span>
                            Mezcla Personalizada para "{activeBrandTab}"
                        </h4>
                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-orange-500 blur-sm opacity-20 group-hover:opacity-40 transition-opacity rounded-lg"></div>
                                <input 
                                    type="color" 
                                    value={customHex}
                                    onChange={(e) => setCustomHex(e.target.value)}
                                    className="relative w-11 h-11 rounded-lg border-2 border-stone-600 cursor-pointer bg-transparent"
                                    title="Selecciona el color aproximado"
                                />
                            </div>
                            <input
                                type="text"
                                value={customName}
                                onChange={(e) => setCustomName(e.target.value)}
                                placeholder="Nombre del pigmento..."
                                className="bg-stone-900/50 text-white rounded-lg px-4 py-2.5 text-sm flex-grow outline-none border border-stone-600 focus:border-orange-500 focus:bg-stone-900/80 placeholder-stone-600 transition-all"
                                onKeyDown={(e) => e.key === 'Enter' && addCustomPaint()}
                            />
                            <button
                                type="button"
                                onClick={addCustomPaint}
                                className="bg-orange-700 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-orange-900/20 hover:shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!customName.trim()}
                            >
                                Añadir
                            </button>
                        </div>
                    </div>
                </>
             )}

          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManager;
