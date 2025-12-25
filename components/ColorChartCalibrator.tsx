import React, { useRef, useState, useEffect } from 'react';
import { Paint } from '../types';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';

// Define worker URL explicitly to match the version in importmap
const PDF_WORKER_URL = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.mjs';

interface ColorChartCalibratorProps {
  paints: Paint[];
  onUpdatePaintColor: (paintId: string, newHex: string) => void;
  onClose: () => void;
  brandName: string;
}

const ColorChartCalibrator: React.FC<ColorChartCalibratorProps> = ({ paints, onUpdatePaintColor, onClose, brandName }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // Main card container
  const scrollContainerRef = useRef<HTMLDivElement>(null); // The specific overflowing div
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [selectedPaintId, setSelectedPaintId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false); // Used for left-click selection dragging
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  
  // PDF State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Confirmation State
  const [pendingChange, setPendingChange] = useState<{ id: string; newHex: string } | null>(null);

  // Zoom and Pan state
  const [zoom, setZoom] = useState(1);
  const [baseScale, setBaseScale] = useState(1);
  
  // Explicit Pan Mode Toggle (still useful for accessibility or if user prefers clicks)
  const [isPanMode, setIsPanMode] = useState(false);

  // Refs for Gesture/Mouse Logic
  const isRightClickPanning = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastTouchDist = useRef<number | null>(null);
  const lastTouchCenter = useRef<{x: number, y: number} | null>(null);

  // Constants for magnifier
  const MAGNIFIER_SIZE = 120;
  const MAGNIFIER_ZOOM = 2; // Relative zoom inside magnifier
  const MAGNIFIER_OFFSET_Y = 100;

  useEffect(() => {
    // Initialize PDF.js worker
    try {
        if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
        }
    } catch (e) {
        console.error("Error initializing PDF worker", e);
    }
  }, []);

  // --- Wheel Zoom Logic (Native Listener for passive: false) ---
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleWheelNative = (e: WheelEvent) => {
        // Prevent default page scrolling when inside this container
        e.preventDefault();
        
        const delta = e.deltaY * -0.001;
        // Updated Max Zoom to 10 (1000%)
        setZoom(prev => Math.min(Math.max(prev + delta, 1), 10));
    };

    // We must use a native listener with passive: false to reliably preventDefault the wheel event
    scrollContainer.addEventListener('wheel', handleWheelNative, { passive: false });

    return () => {
        scrollContainer.removeEventListener('wheel', handleWheelNative);
    };
  }, [scrollContainerRef.current]); // Re-bind if ref changes (rare)

  // --- Native Touch Event Listeners for 2-finger Gestures ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
            e.preventDefault(); // Prevent default browser zoom
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            
            // Initial distance for zoom
            const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            lastTouchDist.current = dist;

            // Initial center for pan
            lastTouchCenter.current = {
                x: (t1.clientX + t2.clientX) / 2,
                y: (t1.clientY + t2.clientY) / 2
            };
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 2 && lastTouchDist.current !== null && lastTouchCenter.current !== null) {
            e.preventDefault();
            const t1 = e.touches[0];
            const t2 = e.touches[1];

            // 1. Handle Zoom (Pinch)
            const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            const distDelta = currentDist - lastTouchDist.current;
            
            if (Math.abs(distDelta) > 5) { // Threshold to avoid jitter
                // Sensitivity factor
                const zoomFactor = distDelta * 0.005; 
                // Updated Max Zoom to 10 (1000%)
                setZoom(prev => Math.min(Math.max(prev + zoomFactor, 1), 10));
                lastTouchDist.current = currentDist;
            }

            // 2. Handle Pan (Two finger drag)
            const currentCenter = {
                x: (t1.clientX + t2.clientX) / 2,
                y: (t1.clientY + t2.clientY) / 2
            };
            
            const dx = currentCenter.x - lastTouchCenter.current.x;
            const dy = currentCenter.y - lastTouchCenter.current.y;
            
            // Pan logic for touch uses scrollContainerRef
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollLeft -= dx;
                scrollContainerRef.current.scrollTop -= dy;
            }

            lastTouchCenter.current = currentCenter;
        }
    };

    const handleTouchEnd = (e: TouchEvent) => {
        if (e.touches.length < 2) {
            lastTouchDist.current = null;
            lastTouchCenter.current = null;
        }
    };

    // Add passive: false to allow e.preventDefault()
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [image]); // Re-bind if image changes/reloads


  // --- Mouse & Pointer Logic ---

  const handlePointerDown = (e: React.PointerEvent) => {
    // Right Click (Button 2) -> Start Pan
    if (e.button === 2 || isPanMode) {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        isRightClickPanning.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        return;
    }

    // Left Click (Button 0) & Not Pan Mode -> Start Selection
    if (e.button === 0 && !isPanMode) {
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDragging(true); // Selection dragging
        pickColor(e.clientX, e.clientY);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Handle Panning (Right click dragging)
    if (isRightClickPanning.current) {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        
        // Use scrollContainerRef for panning
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft -= dx;
            scrollContainerRef.current.scrollTop -= dy;
        }
        
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        return;
    }

    // Handle Selection Dragging (Left click)
    if (isDragging) {
      pickColor(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);

    // Stop Panning
    if (isRightClickPanning.current) {
        isRightClickPanning.current = false;
        return;
    }

    // Stop Selection
    if (isDragging) {
        setIsDragging(false);
        const hex = pickColor(e.clientX, e.clientY);
        if (selectedPaintId && hex) {
            setPendingChange({ id: selectedPaintId, newHex: hex });
        }
    }
  };
  
  const handleContextMenu = (e: React.MouseEvent) => {
      // Prevent context menu on canvas to allow right-click drag
      e.preventDefault();
  };

  // --- Existing Image/PDF Loading Logic ---

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPdfDoc(null);
    setNumPages(0);
    setCurrentPage(1);

    if (file.type === 'application/pdf') {
        handlePdfUpload(file);
    } else {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                setImage(img);
                resetView(img);
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    }
  };

  const handlePdfUpload = async (file: File) => {
    setIsProcessingPdf(true);
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        await renderPdfPage(pdf, 1);
    } catch (error) {
        console.error("Error processing PDF:", error);
        alert("Error al leer el PDF. Asegúrate de que no esté protegido con contraseña.");
        setIsProcessingPdf(false);
    }
  };

  const renderPdfPage = async (pdf: any, pageNumber: number) => {
      setIsProcessingPdf(true);
      try {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 3.0 });
        
        const tempCanvas = document.createElement('canvas');
        const context = tempCanvas.getContext('2d');
        if (!context) throw new Error("Could not create context");

        tempCanvas.height = viewport.height;
        tempCanvas.width = viewport.width;

        const renderContext = { canvasContext: context, viewport: viewport };
        await page.render(renderContext).promise;

        const imgDataUrl = tempCanvas.toDataURL('image/png');
        const img = new Image();
        img.onload = () => {
            setImage(img);
            resetView(img);
            setIsProcessingPdf(false);
        };
        img.src = imgDataUrl;
      } catch (error) {
          console.error("Error rendering page:", error);
      }
  };

  const changePage = (offset: number) => {
      if (!pdfDoc) return;
      const newPage = currentPage + offset;
      if (newPage >= 1 && newPage <= numPages) {
          setCurrentPage(newPage);
          renderPdfPage(pdfDoc, newPage);
      }
  };

  const resetView = (img: HTMLImageElement) => {
    setZoom(1);
    setIsPanMode(false);
    if (containerRef.current) {
        const maxWidth = containerRef.current.clientWidth - 32;
        const maxHeight = 600;
        const scaleX = maxWidth / img.width;
        const scaleY = maxHeight / img.height;
        setBaseScale(Math.min(scaleX, scaleY));
    }
  };

  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
      }
    }
  }, [image]);

  const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  };

  const pickColor = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let x = (clientX - rect.left) * scaleX;
    let y = (clientY - rect.top) * scaleY;

    x = Math.max(0, Math.min(x, canvas.width - 1));
    y = Math.max(0, Math.min(y, canvas.height - 1));

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    
    const visualX = clientX - rect.left;
    const visualY = clientY - rect.top;
    setCursorPos({ x: visualX, y: visualY });
    setPickedColor(hex);
    
    if (magnifierCanvasRef.current && image) {
      const magCtx = magnifierCanvasRef.current.getContext('2d');
      if (magCtx) {
          magCtx.clearRect(0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);
          
          const sWidth = MAGNIFIER_SIZE / MAGNIFIER_ZOOM;
          const sHeight = MAGNIFIER_SIZE / MAGNIFIER_ZOOM;
          const sx = x - (sWidth / 2);
          const sy = y - (sHeight / 2);

          magCtx.imageSmoothingEnabled = true;
          magCtx.imageSmoothingQuality = 'high';
          
          magCtx.fillStyle = '#000';
          magCtx.fillRect(0,0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);

          magCtx.drawImage(canvas, sx, sy, sWidth, sHeight, 0, 0, MAGNIFIER_SIZE, MAGNIFIER_SIZE);
          
          magCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          magCtx.lineWidth = 1;
          magCtx.beginPath();
          magCtx.moveTo(MAGNIFIER_SIZE/2, 0);
          magCtx.lineTo(MAGNIFIER_SIZE/2, MAGNIFIER_SIZE);
          magCtx.moveTo(0, MAGNIFIER_SIZE/2);
          magCtx.lineTo(MAGNIFIER_SIZE, MAGNIFIER_SIZE/2);
          magCtx.stroke();
      }
    }

    return hex;
  };

  const confirmColorChange = () => {
      if (pendingChange) {
          onUpdatePaintColor(pendingChange.id, pendingChange.newHex);
          setPendingChange(null);
      }
  };

  const cancelColorChange = () => {
      setPendingChange(null);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 10)); // Max zoom 10 (1000%)
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 1));

  const displayWidth = image ? image.width * baseScale * zoom : 0;
  const displayHeight = image ? image.height * baseScale * zoom : 0;
  const pendingPaintDetails = pendingChange ? paints.find(p => p.id === pendingChange.id) : null;

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 animate-fade-in relative" ref={containerRef}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">Calibrar Carta: {brandName}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {/* Upload Area */}
        {!image && !isProcessingPdf && (
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center bg-gray-900/50">
                <label className="cursor-pointer flex flex-col items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm text-gray-300">Sube Carta de Colores (Imagen o PDF)</span>
                    <span className="text-xs text-gray-500 mt-1">Soporta: JPG, PNG, PDF</span>
                    <input type="file" accept="image/*,application/pdf" onChange={handleImageUpload} className="hidden" />
                </label>
            </div>
        )}

        {isProcessingPdf && (
            <div className="border-2 border-gray-600 rounded-lg p-12 text-center bg-gray-900/50 flex flex-col items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-indigo-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-gray-300 font-medium">Procesando página...</span>
            </div>
        )}

        {/* Canvas Toolbar & Area */}
        {image && !isProcessingPdf && (
            <div className="space-y-2">
                {/* Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-900 p-2 rounded-lg border border-gray-700 gap-2">
                    
                    {/* Zoom Controls */}
                    <div className="flex space-x-2">
                         <button 
                            onClick={handleZoomOut} 
                            className="bg-gray-700 hover:bg-gray-600 text-white p-1.5 rounded disabled:opacity-50"
                            disabled={zoom <= 1}
                            title="Alejar (o rueda del ratón)"
                         >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                             </svg>
                         </button>
                         <span className="text-xs text-gray-400 flex items-center w-12 justify-center">{Math.round(zoom * 100)}%</span>
                         <button 
                            onClick={handleZoomIn} 
                            className="bg-gray-700 hover:bg-gray-600 text-white p-1.5 rounded disabled:opacity-50"
                            disabled={zoom >= 10}
                            title="Acercar (o rueda del ratón)"
                         >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                             </svg>
                         </button>
                    </div>

                    {/* PDF Pagination */}
                    {pdfDoc && numPages > 1 && (
                        <div className="flex items-center space-x-2 bg-gray-800 rounded p-1">
                             <button onClick={() => changePage(-1)} disabled={currentPage <= 1} className="text-gray-400 hover:text-white disabled:opacity-30 p-1">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                 </svg>
                             </button>
                             <span className="text-xs text-white font-mono px-2">{currentPage} / {numPages}</span>
                             <button onClick={() => changePage(1)} disabled={currentPage >= numPages} className="text-gray-400 hover:text-white disabled:opacity-30 p-1">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                 </svg>
                             </button>
                        </div>
                    )}

                    {/* Tool Mode (Hidden hints for PC/Mobile) */}
                    <div className="flex space-x-1 bg-gray-800 rounded p-1 items-center">
                         <div className="text-[10px] text-gray-500 hidden md:block mr-2">
                            🖱️ Der: Mover | Rueda: Zoom
                         </div>
                         <div className="text-[10px] text-gray-500 md:hidden mr-2">
                            ✌️ 2 Dedos: Mover/Zoom
                         </div>
                        <button
                            onClick={() => setIsPanMode(!isPanMode)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${isPanMode ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                           {isPanMode ? '✋ Mover' : '🖌️ Seleccionar'}
                        </button>
                    </div>
                </div>

                {/* Scrollable Container */}
                <div 
                    ref={scrollContainerRef}
                    className="relative overflow-auto max-h-[60vh] rounded-lg border border-gray-600 bg-gray-900 shadow-inner"
                    // Removed onWheel from here, using useEffect listener instead
                >
                    <div className="relative inline-block align-middle origin-top-left">
                        <canvas 
                            ref={canvasRef} 
                            style={{ 
                                width: displayWidth,
                                height: displayHeight,
                            }}
                            className={`block ${isPanMode || isRightClickPanning.current ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'} touch-none`}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onContextMenu={handleContextMenu}
                        />
                        
                        {/* Magnifier (Only in Select Mode) */}
                        {isDragging && pickedColor && !isPanMode && !isRightClickPanning.current && (
                            <div 
                                className="absolute rounded-full border-4 border-white shadow-2xl overflow-hidden pointer-events-none z-20 bg-black"
                                style={{ 
                                    width: MAGNIFIER_SIZE, 
                                    height: MAGNIFIER_SIZE,
                                    left: cursorPos.x - MAGNIFIER_SIZE / 2, 
                                    top: cursorPos.y - MAGNIFIER_OFFSET_Y - MAGNIFIER_SIZE / 2
                                }}
                            >
                                <canvas ref={magnifierCanvasRef} width={MAGNIFIER_SIZE} height={MAGNIFIER_SIZE} className="block" />
                                <div className="absolute bottom-2 left-0 right-0 text-center">
                                    <span className="bg-black/70 text-white text-[10px] px-1 rounded font-mono shadow-sm">{pickedColor}</span>
                                </div>
                            </div>
                        )}
                        
                        {/* Helper Overlays */}
                        {!selectedPaintId && (
                            <div 
                                className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-yellow-300 text-xs px-3 py-2 rounded-lg pointer-events-none border border-yellow-500/30 whitespace-nowrap z-10 shadow-lg backdrop-blur-sm"
                                style={{ top: Math.min(20, displayHeight / 2) }}
                            >
                                ⚠ Selecciona una pintura de la lista abajo primero
                            </div>
                        )}
                        {selectedPaintId && !isPanMode && !isDragging && !pendingChange && !isRightClickPanning.current && (
                            <div 
                                className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-indigo-600/90 text-white text-xs px-3 py-2 rounded-lg pointer-events-none shadow-lg animate-pulse whitespace-nowrap z-10 backdrop-blur-sm"
                                style={{ top: Math.min(20, displayHeight / 2) }}
                            >
                                🎯 Haz zoom y toca el cuadro de color exacto
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
        
        {image && !isProcessingPdf && (
             <div className="text-right">
                <button onClick={() => setImage(null)} className="text-xs text-red-400 underline">Cambiar imagen/PDF</button>
             </div>
        )}

        {/* Paint List for Selection */}
        <div className="bg-gray-900 rounded-lg p-2 max-h-60 overflow-y-auto custom-scrollbar border border-gray-700">
            <p className="text-xs text-gray-500 mb-2 px-2 sticky top-0 bg-gray-900 py-1 z-10">
                Selecciona una pintura para editar su color:
            </p>
            <div className="grid grid-cols-1 gap-1">
                {paints.map(paint => (
                    <button
                        key={paint.id}
                        onClick={() => setSelectedPaintId(paint.id)}
                        className={`
                            flex items-center p-2 rounded text-left transition-colors
                            ${selectedPaintId === paint.id ? 'bg-indigo-900 border border-indigo-500' : 'hover:bg-gray-800 border border-transparent'}
                        `}
                    >
                        <div className="w-6 h-6 rounded-full border border-gray-600 mr-3 flex-shrink-0" style={{ backgroundColor: paint.hex }}></div>
                        <div className="flex-grow min-w-0">
                            <div className="text-sm font-medium text-gray-200 truncate">{paint.name}</div>
                            <div className="text-[10px] text-gray-500">{paint.id} • {paint.hex}</div>
                        </div>
                        {selectedPaintId === paint.id && (
                            <span className="text-indigo-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {pendingChange && pendingPaintDetails && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm rounded-lg animate-fade-in">
              <div className="bg-gray-800 border border-gray-600 p-6 rounded-xl shadow-2xl max-w-sm w-full">
                  <h4 className="text-lg font-bold text-white mb-2 text-center">¿Confirmar cambio?</h4>
                  <p className="text-sm text-gray-300 text-center mb-6">
                      Estás a punto de actualizar el color de <span className="text-indigo-400 font-semibold">{pendingPaintDetails.name}</span>.
                  </p>
                  
                  <div className="flex items-center justify-center space-x-6 mb-8">
                      <div className="text-center">
                          <div className="w-16 h-16 rounded-full border-2 border-gray-500 shadow-md mx-auto mb-2" style={{ backgroundColor: pendingPaintDetails.hex }}></div>
                          <span className="text-xs text-gray-400 uppercase tracking-wider">Anterior</span>
                      </div>
                      <div className="text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                      </div>
                      <div className="text-center">
                          <div className="w-16 h-16 rounded-full border-2 border-white shadow-lg mx-auto mb-2" style={{ backgroundColor: pendingChange.newHex }}></div>
                          <span className="text-xs text-white font-bold uppercase tracking-wider">Nuevo</span>
                      </div>
                  </div>
                  
                  <div className="flex space-x-3">
                      <button 
                          onClick={cancelColorChange}
                          className="flex-1 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 font-medium transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={confirmColorChange}
                          className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-lg transition-colors"
                      >
                          Confirmar
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default ColorChartCalibrator;