
import React, { useRef, useState, useEffect } from 'react';
import { PixelColor } from '../types';

interface ColorPickerProps {
  onColorSelect: (color: PixelColor) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ onColorSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [currentSelection, setCurrentSelection] = useState<PixelColor | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Constants for magnifier
  const MAGNIFIER_SIZE = 120; // px diameter
  const MAGNIFIER_ZOOM = 3;
  const MAGNIFIER_OFFSET_Y = 90; // Distance above finger

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setCurrentSelection(null);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Resize canvas to fit container but maintain aspect ratio
        const maxWidth = containerRef.current?.clientWidth || 300;
        // Limit height to viewable area roughly
        const scale = Math.min(maxWidth / image.width, 500 / image.height);
        
        canvas.width = image.width * scale;
        canvas.height = image.height * scale;
        
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      }
    }
  }, [image]);

  const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  };

  const updateSelection = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    
    // Calculate scale factors between internal canvas resolution and visual DOM size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Visual coordinates (relative to the DOM element/Canvas)
    let visualX = clientX - rect.left;
    let visualY = clientY - rect.top;

    // Clamp visual coordinates to the visual bounds
    visualX = Math.max(0, Math.min(visualX, rect.width));
    visualY = Math.max(0, Math.min(visualY, rect.height));

    // Convert to Internal Canvas Coordinates for data extraction
    const internalX = Math.floor(visualX * scaleX);
    const internalY = Math.floor(visualY * scaleY);
    
    // Safety clamp for internal coordinates
    const safeInternalX = Math.max(0, Math.min(internalX, canvas.width - 1));
    const safeInternalY = Math.max(0, Math.min(internalY, canvas.height - 1));

    // Get pixel color using Internal Coordinates
    const pixel = ctx.getImageData(safeInternalX, safeInternalY, 1, 1).data;
    const color: PixelColor = {
      r: pixel[0],
      g: pixel[1],
      b: pixel[2],
      hex: rgbToHex(pixel[0], pixel[1], pixel[2]),
      x: visualX, // Store visual coordinates for the UI marker
      y: visualY
    };

    setCurrentSelection(color);
    
    // Draw Magnifier using Internal Coordinates
    if (magnifierCanvasRef.current && image) {
      const magCtx = magnifierCanvasRef.current.getContext('2d');
      if (magCtx) {
          // Clear
          magCtx.clearRect(0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);
          
          // Calculate source rectangle in Internal Coordinates
          const sWidth = MAGNIFIER_SIZE / MAGNIFIER_ZOOM;
          const sHeight = MAGNIFIER_SIZE / MAGNIFIER_ZOOM;
          const sx = safeInternalX - (sWidth / 2);
          const sy = safeInternalY - (sHeight / 2);

          magCtx.imageSmoothingEnabled = false; // Keep pixels sharp
          
          // Draw fill background
          magCtx.fillStyle = '#0c0a09';
          magCtx.fillRect(0,0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);
          
          magCtx.drawImage(canvas, sx, sy, sWidth, sHeight, 0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);
          
          // Draw crosshair on magnifier
          magCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          magCtx.lineWidth = 1;
          magCtx.beginPath();
          magCtx.moveTo(MAGNIFIER_SIZE/2, 0);
          magCtx.lineTo(MAGNIFIER_SIZE/2, MAGNIFIER_SIZE);
          magCtx.moveTo(0, MAGNIFIER_SIZE/2);
          magCtx.lineTo(MAGNIFIER_SIZE, MAGNIFIER_SIZE/2);
          magCtx.stroke();
          
          // Outer Border
          magCtx.strokeStyle = '#f97316'; // Orange border
          magCtx.lineWidth = 4;
          magCtx.strokeRect(0,0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateSelection(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updateSelection(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (currentSelection) {
      onColorSelect(currentSelection);
    }
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="w-full flex flex-col items-center space-y-6" ref={containerRef}>
      {!image && (
        <div 
            className="glass-panel w-full p-10 border-2 border-dashed border-stone-600/50 rounded-2xl text-center hover:border-orange-500/50 hover:bg-white/5 transition-all group cursor-pointer"
        >
          <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
              <div className="bg-orange-500/10 p-5 rounded-full mb-5 group-hover:scale-110 transition-transform duration-300 border border-orange-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            <span className="text-xl font-bold text-stone-200 mb-2">Cargar Referencia</span>
            <span className="text-sm text-stone-500">Toca para subir una foto de tu miniatura o arte conceptual</span>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>
      )}

      {image && (
        <>
          <div className="w-full flex justify-end">
            <label 
                htmlFor="image-reupload" 
                className="text-xs font-medium text-orange-300 cursor-pointer hover:text-white flex items-center bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-all shadow-sm"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Cambiar imagen
            </label>
            <input id="image-reupload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>

          <div className="w-full flex justify-center animate-fade-in-up">
            <div 
                className="relative touch-none select-none rounded-xl shadow-2xl border-4 border-stone-800 bg-stone-900 cursor-crosshair overflow-hidden ring-1 ring-white/10"
                style={{ width: 'fit-content', maxWidth: '100%' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                <canvas
                ref={canvasRef}
                className="block"
                />
                
                {/* Persisting Selection Marker */}
                {currentSelection && !isDragging && (
                    <div 
                        className="absolute w-8 h-8 border-2 border-white rounded-full shadow-[0_0_15px_rgba(0,0,0,0.8)] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-10 animate-pulse-glow"
                        style={{ left: currentSelection.x, top: currentSelection.y }}
                    >
                        <div className="w-full h-full border border-black rounded-full opacity-60"></div>
                        <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-orange-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 box-border border border-white shadow-[0_0_5px_orange]"></div>
                    </div>
                )}

                {/* Offset Magnifier */}
                {isDragging && currentSelection && (
                    <div 
                        className="absolute rounded-full border-4 border-stone-200 shadow-[0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden pointer-events-none z-20 bg-stone-900"
                        style={{ 
                            width: MAGNIFIER_SIZE, 
                            height: MAGNIFIER_SIZE,
                            left: currentSelection.x - MAGNIFIER_SIZE / 2, 
                            top: currentSelection.y - MAGNIFIER_OFFSET_Y - MAGNIFIER_SIZE / 2
                        }}
                    >
                        <canvas 
                            ref={magnifierCanvasRef} 
                            width={MAGNIFIER_SIZE} 
                            height={MAGNIFIER_SIZE}
                            className="block"
                        />
                        {/* Color code badge */}
                        <div className="absolute bottom-3 left-0 right-0 text-center">
                            <span className="bg-stone-900/90 text-orange-200 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold tracking-wider border border-orange-500/30">
                                {currentSelection.hex}
                            </span>
                        </div>
                    </div>
                )}
            </div>
          </div>
        </>
      )}

      {currentSelection && (
        <div className="flex items-center space-x-6 p-6 glass-panel rounded-2xl w-full shadow-2xl border border-white/5 animate-fade-in-up">
          <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
              <div
                className="relative w-24 h-24 rounded-2xl border-4 border-stone-800 shadow-inner flex-shrink-0"
                style={{ backgroundColor: currentSelection.hex }}
              ></div>
              <div className="absolute -bottom-3 -right-3 bg-stone-900 rounded-full p-1.5 border border-stone-700 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
          </div>
          <div className="flex-grow">
            <p className="text-orange-400 text-xs uppercase tracking-widest font-bold mb-1">Color Objetivo Seleccionado</p>
            <p className="text-4xl font-black font-mono text-white tracking-wide drop-shadow-md">{currentSelection.hex}</p>
            <div className="flex items-center space-x-3 mt-3">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-stone-500 mb-1">RED</span>
                    <span className="px-2 py-1 rounded bg-stone-800 text-stone-300 text-xs font-mono min-w-[3rem] text-center border-b-2 border-red-500">{currentSelection.r}</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-stone-500 mb-1">GREEN</span>
                    <span className="px-2 py-1 rounded bg-stone-800 text-stone-300 text-xs font-mono min-w-[3rem] text-center border-b-2 border-green-500">{currentSelection.g}</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-stone-500 mb-1">BLUE</span>
                    <span className="px-2 py-1 rounded bg-stone-800 text-stone-300 text-xs font-mono min-w-[3rem] text-center border-b-2 border-blue-500">{currentSelection.b}</span>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
