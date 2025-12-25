
import React, { createContext, useContext, useRef, useEffect } from 'react';

interface SoundContextType {
  playClick: () => void;
  playHover: () => void;
  playSuccess: () => void;
  playError: () => void;
  playPop: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize AudioContext on first user interaction to comply with browser policies
    const initAudio = () => {
        if (!audioCtxRef.current) {
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            if (AudioContextClass) {
                audioCtxRef.current = new AudioContextClass();
            }
        }
        if (audioCtxRef.current?.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    };

    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });

    return () => {
        window.removeEventListener('click', initAudio);
        window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const playOscillator = (type: OscillatorType, freq: number, duration: number, vol: number = 0.1) => {
    if (!audioCtxRef.current) return;
    
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const playClick = () => {
     // Mechanical switch sound imitation
     playOscillator('square', 200, 0.1, 0.05);
     setTimeout(() => playOscillator('triangle', 300, 0.05, 0.03), 10);
  };

  const playHover = () => {
     // Very subtle airy sound
     playOscillator('sine', 800, 0.05, 0.01);
  };

  const playPop = () => {
      // Bubble pop
      playOscillator('sine', 600, 0.1, 0.05);
  };

  const playSuccess = () => {
     // Major chord arpeggio
     const now = audioCtxRef.current?.currentTime || 0;
     const notes = [440, 554, 659]; // A Major
     notes.forEach((freq, i) => {
         setTimeout(() => playOscillator('sine', freq, 0.6, 0.1), i * 80);
     });
  };

  const playError = () => {
      playOscillator('sawtooth', 150, 0.3, 0.1);
      setTimeout(() => playOscillator('sawtooth', 120, 0.3, 0.1), 100);
  };

  return (
    <SoundContext.Provider value={{ playClick, playHover, playSuccess, playError, playPop }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
};
