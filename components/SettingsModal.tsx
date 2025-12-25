
import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { AI_MODELS } from '../constants';

interface SettingsModalProps {
  currentSettings?: UserSettings;
  onSave: (settings: UserSettings) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ currentSettings, onSave, onClose }) => {
  const [provider, setProvider] = useState<'gemini' | 'openrouter'>('gemini');
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [modelId, setModelId] = useState('gemini-2.5-flash');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setProvider(currentSettings.provider);
      setOpenRouterApiKey(currentSettings.openRouterApiKey || '');
      setGeminiApiKey(currentSettings.geminiApiKey || '');
      setModelId(currentSettings.modelId);
    }
  }, [currentSettings]);

  const handleSave = () => {
    onSave({
      provider,
      openRouterApiKey: provider === 'openrouter' ? openRouterApiKey : undefined,
      geminiApiKey: provider === 'gemini' ? geminiApiKey : undefined,
      modelId
    });
    onClose();
  };

  const filteredModels = AI_MODELS.filter(m => m.provider === provider);

  useEffect(() => {
    const isModelValid = AI_MODELS.find(m => m.id === modelId && m.provider === provider);
    if (!isModelValid) {
       const defaultModel = AI_MODELS.find(m => m.provider === provider);
       if (defaultModel) setModelId(defaultModel.id);
    }
  }, [provider]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/90 backdrop-blur-md animate-fade-in">
      <div className="bg-stone-900 border border-stone-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ring-1 ring-white/10">
        
        {/* Header */}
        <div className="p-6 border-b border-stone-800 flex justify-between items-center bg-stone-900/50">
          <h2 className="text-xl font-bold text-stone-100 flex items-center gap-3">
             <div className="p-2 bg-stone-800 rounded-lg border border-stone-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
             </div>
             Configuración de IA
          </h2>
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-8 bg-stone-900/80">
          
          {/* Provider Selection */}
          <div className="space-y-4">
             <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Proveedor de IA</label>
             <div className="grid grid-cols-2 gap-4">
                <button
                   onClick={() => setProvider('gemini')}
                   className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${provider === 'gemini' ? 'bg-orange-900/20 border-orange-500 text-white shadow-[0_0_15px_rgba(234,88,12,0.2)]' : 'bg-stone-800 border-stone-700 text-stone-400 hover:bg-stone-700'}`}
                >
                   <span className="font-bold text-lg mb-1">Gemini</span>
                   <span className="text-xs opacity-70">Nativo de Google</span>
                </button>
                <button
                   onClick={() => setProvider('openrouter')}
                   className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${provider === 'openrouter' ? 'bg-purple-900/20 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-stone-800 border-stone-700 text-stone-400 hover:bg-stone-700'}`}
                >
                   <span className="font-bold text-lg mb-1">OpenRouter</span>
                   <span className="text-xs opacity-70">Modelos Gratuitos (Llama, etc)</span>
                </button>
             </div>
          </div>

          {/* Settings for Gemini */}
          {provider === 'gemini' && (
             <div className="space-y-4 animate-fade-in-up">
                <div className="space-y-2">
                   <div className="flex justify-between items-center">
                      <label className="text-sm font-semibold text-stone-300">Google AI Studio API Key (Opcional)</label>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-orange-400 hover:text-orange-300 underline">
                         Obtener Key
                      </a>
                   </div>
                   <div className="relative">
                      <input 
                         type={showKey ? "text" : "password"}
                         value={geminiApiKey}
                         onChange={(e) => setGeminiApiKey(e.target.value)}
                         placeholder="Dejar vacío para usar la predeterminada"
                         className="w-full bg-stone-950/50 border border-stone-700 rounded-lg px-4 py-3 text-sm text-stone-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none pr-10 placeholder-stone-600"
                      />
                      <button 
                         type="button"
                         onClick={() => setShowKey(!showKey)}
                         className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white"
                      >
                         {showKey ? "Ocultar" : "Mostrar"}
                      </button>
                   </div>
                   <p className="text-xs text-stone-500">Si dejas esto vacío, usaremos nuestra API Key compartida.</p>
                </div>
             </div>
          )}

          {/* Settings for OpenRouter */}
          {provider === 'openrouter' && (
             <div className="space-y-4 animate-fade-in-up">
                <div className="space-y-2">
                   <div className="flex justify-between items-center">
                      <label className="text-sm font-semibold text-stone-300">OpenRouter API Key</label>
                      <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-xs text-orange-400 hover:text-orange-300 underline">
                         Obtener Key
                      </a>
                   </div>
                   <div className="relative">
                      <input 
                         type={showKey ? "text" : "password"}
                         value={openRouterApiKey}
                         onChange={(e) => setOpenRouterApiKey(e.target.value)}
                         placeholder="sk-or-v1-..."
                         className="w-full bg-stone-950/50 border border-stone-700 rounded-lg px-4 py-3 text-sm text-stone-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none pr-10 placeholder-stone-600"
                      />
                      <button 
                         type="button"
                         onClick={() => setShowKey(!showKey)}
                         className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white"
                      >
                         {showKey ? "Ocultar" : "Mostrar"}
                      </button>
                   </div>

                   {/* Usage Limit Warning */}
                   <div className="bg-blue-900/10 border border-blue-700/30 rounded-lg p-3 mt-3 flex items-start gap-3">
                      <div className="text-blue-500 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                          <h4 className="text-blue-400 font-bold text-xs uppercase mb-1">Límites de Uso Gratuito</h4>
                          <p className="text-xs text-stone-400">
                            Ten en cuenta que OpenRouter limita las cuentas gratuitas a aproximadamente <span className="text-stone-200 font-bold">50 generaciones por día</span>.
                          </p>
                      </div>
                   </div>

                   <div className="bg-yellow-900/10 border border-yellow-700/30 rounded-lg p-3 mt-3">
                      <h4 className="text-yellow-500 font-bold text-xs uppercase mb-1">¿Error de Privacidad?</h4>
                      <p className="text-xs text-stone-400">
                        Si usas modelos gratuitos en OpenRouter, asegúrate de habilitar el "Data Logging" en tu <a href="https://openrouter.ai/settings/privacy" target="_blank" className="text-yellow-400 underline">Privacidad</a>.
                      </p>
                   </div>
                </div>
             </div>
          )}

          {/* Model Selection */}
          <div className="space-y-3">
             <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Modelo de Lenguaje</label>
             <div className="relative">
                <select
                   value={modelId}
                   onChange={(e) => setModelId(e.target.value)}
                   className="w-full bg-stone-950/50 border border-stone-700 rounded-lg px-4 py-3 text-sm text-stone-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none appearance-none cursor-pointer hover:bg-stone-900"
                >
                   {filteredModels.map(model => (
                      <option key={model.id} value={model.id}>
                         {model.name}
                      </option>
                   ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                   </svg>
                </div>
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-stone-800 bg-stone-900/50 flex justify-end gap-3">
          <button
             onClick={onClose}
             className="px-5 py-2.5 rounded-lg text-sm font-medium text-stone-400 hover:bg-stone-800 transition-colors"
          >
             Cancelar
          </button>
          <button
             onClick={handleSave}
             disabled={provider === 'openrouter' && !openRouterApiKey}
             className="px-6 py-2.5 rounded-lg text-sm font-bold bg-orange-600 text-white hover:bg-orange-500 shadow-lg shadow-orange-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
             Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
