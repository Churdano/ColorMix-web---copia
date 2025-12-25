
import React, { useState } from 'react';
import { UserProfile } from '../types';

interface UserSelectorProps {
  users: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  onCreateUser: (name: string) => void;
  onDeleteUser: (userId: string) => void;
}

const UserSelector: React.FC<UserSelectorProps> = ({ users, onSelectUser, onCreateUser, onDeleteUser }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newUserName, setNewUserName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
      onCreateUser(newUserName.trim());
      setNewUserName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in-up">
      <div className="text-center mb-12 relative">
        <div className="absolute -inset-10 bg-orange-500/10 blur-[50px] rounded-full pointer-events-none"></div>
        <h1 className="relative text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-stone-100 to-stone-400 mb-4 tracking-tight drop-shadow-sm font-sans">
          ¿Quién está pintando?
        </h1>
        <p className="text-orange-200/60 text-lg font-light">Selecciona tu perfil para acceder a tu mesa de trabajo.</p>
      </div>

      <div className="flex flex-wrap justify-center gap-10 max-w-4xl px-4">
        {users.map((user) => (
          <div key={user.id} className="group relative flex flex-col items-center">
             {/* Delete Button (Visible on Hover) */}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    if(confirm(`¿Estás seguro de que quieres borrar el perfil de ${user.name}?`)) {
                        onDeleteUser(user.id);
                    }
                }}
                className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 hover:bg-red-500 shadow-lg scale-75 group-hover:scale-100"
                title="Borrar perfil"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <button
              onClick={() => onSelectUser(user)}
              className="flex flex-col items-center group focus:outline-none"
            >
              <div 
                className="w-32 h-32 rounded-3xl mb-5 flex items-center justify-center text-4xl font-bold text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-300 transform group-hover:scale-105 group-hover:-translate-y-2 border-4 border-stone-800 group-hover:border-orange-500/50 ring-1 ring-white/10"
                style={{ 
                    background: `linear-gradient(135deg, ${user.avatarColor}, #1c1917)` 
                }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-stone-300 text-xl font-bold group-hover:text-white transition-colors tracking-wide">
                {user.name}
              </span>
              <span className="text-xs text-stone-500 mt-1 uppercase tracking-widest font-semibold group-hover:text-orange-400/80 transition-colors">
                {user.inventory.length} pigmentos
              </span>
            </button>
          </div>
        ))}

        {/* Add Profile Button */}
        <div className="flex flex-col items-center">
            {isCreating ? (
                <form onSubmit={handleSubmit} className="w-32 flex flex-col items-center animate-fade-in">
                    <div className="w-32 h-32 rounded-3xl mb-5 bg-stone-900/80 border-2 border-dashed border-stone-600 flex items-center justify-center shadow-lg">
                         <input
                            autoFocus
                            type="text"
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            placeholder="Nombre"
                            className="w-24 bg-transparent text-center text-white text-lg font-bold outline-none border-b-2 border-stone-600 focus:border-orange-500 pb-1 placeholder-stone-700"
                            maxLength={10}
                         />
                    </div>
                    <div className="flex gap-2">
                        <button 
                            type="submit"
                            disabled={!newUserName.trim()}
                            className="text-xs bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 font-bold uppercase tracking-wider transition-colors"
                        >
                            Crear
                        </button>
                        <button 
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="text-xs bg-stone-700 hover:bg-stone-600 text-white px-3 py-1.5 rounded-lg font-bold transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </form>
            ) : (
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex flex-col items-center group focus:outline-none"
                >
                    <div className="w-32 h-32 rounded-3xl mb-5 bg-stone-900/40 border-2 border-dashed border-stone-700 flex items-center justify-center text-stone-600 shadow-xl transition-all duration-300 transform group-hover:scale-105 group-hover:border-orange-500/50 group-hover:text-orange-400 group-hover:bg-stone-900/60 backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-50 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <span className="text-stone-500 text-xl font-medium group-hover:text-stone-300 transition-colors">
                        Nuevo Artista
                    </span>
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default UserSelector;
