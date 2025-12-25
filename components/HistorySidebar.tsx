
import React from 'react';
import { RecipeHistoryItem, MixingRecipe } from '../types';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  history: RecipeHistoryItem[];
  onSelectRecipe: (recipe: MixingRecipe) => void;
  onDeleteRecipe: (id: string) => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onSelectRecipe, 
  onDeleteRecipe 
}) => {
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-stone-900 border-l border-stone-700 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-stone-800 bg-stone-950/50 flex justify-between items-center">
            <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Bitácora de Mezclas
            </h2>
            <button 
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-stone-500 space-y-4 opacity-60">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-sm">No hay recetas guardadas aún.</p>
              </div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-stone-800/40 hover:bg-stone-800 border border-stone-700 hover:border-orange-500/30 rounded-xl p-4 transition-all duration-200 group relative"
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => {
                      onSelectRecipe(item.recipe);
                      onClose();
                    }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs text-stone-500 font-mono">{formatDate(item.timestamp)}</span>
                      <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.recipe.matchAccuracy > 90 ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-500'}`}>
                        {item.recipe.matchAccuracy}% Match
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full border border-stone-600 shadow-sm mb-1" style={{ backgroundColor: item.recipe.targetColorHex }}></div>
                        <span className="text-[10px] text-stone-500">Objetivo</span>
                      </div>
                      <div className="text-stone-600">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                         </svg>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full border border-stone-600 shadow-sm mb-1" style={{ backgroundColor: item.recipe.resultColorHex }}></div>
                        <span className="text-[10px] text-stone-500">Resultado</span>
                      </div>
                    </div>

                    <p className="text-xs text-stone-400 line-clamp-2 italic opacity-80">
                      "{item.recipe.instructions}"
                    </p>
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRecipe(item.id);
                    }}
                    className="absolute top-3 right-3 text-stone-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    title="Borrar entrada"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default HistorySidebar;
