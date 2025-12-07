import React, { useState, useRef, useEffect } from 'react';
import { HardwareModule, ModuleType, MountType } from '../types';
import { ZoomIn, ZoomOut, Move, Eye, EyeOff, Layers, CheckCircle2, GripVertical, Ruler, Upload, Zap, Lightbulb, ImageOff, Trash2 } from 'lucide-react';

interface FloorPlanMapProps {
  modules: HardwareModule[];
  setModules: React.Dispatch<React.SetStateAction<HardwareModule[]>>;
}

const CEILING_HEIGHT_FT = 12;
const PANEL_HEIGHT_FT = 5; 
const DEVICE_HEIGHT_FT = 4;

// DALI Universe Colors
const UNIVERSE_COLORS: {[key: number]: string} = {
    1: '#a855f7', // Purple (Uni 1)
    2: '#3b82f6', // Blue (Uni 2)
    3: '#ef4444', // Red (Uni 3)
    4: '#f59e0b', // Amber (Uni 4)
};

const FloorPlanMap: React.FC<FloorPlanMapProps> = ({ modules, setModules }) => {
  // Viewport State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Drag State (Map)
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Map Layers
  const [structuralMap, setStructuralMap] = useState<string | null>(null);
  const [electricalMap, setElectricalMap] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<'STRUCTURAL' | 'ELECTRICAL'>('STRUCTURAL');

  // Visualization Modes
  const [viewMode, setViewMode] = useState<'DEVICE' | 'UNIVERSE' | 'ZONE'>('DEVICE');
  const [showWireEstimates, setShowWireEstimates] = useState(true);

  // Calibration State
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState<{x: number, y: number}[]>([]);
  const [pixelsPerFoot, setPixelsPerFoot] = useState<number | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedStructural = localStorage.getItem('floorPlan_structural');
    const savedElectrical = localStorage.getItem('floorPlan_electrical');
    const savedScale = localStorage.getItem('floorPlan_pxPerFt');

    if (savedStructural) setStructuralMap(savedStructural);
    if (savedElectrical) setElectricalMap(savedElectrical);
    if (savedScale) setPixelsPerFoot(parseFloat(savedScale));
  }, []);

  // --- Zoom & Pan Logic ---
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleAdjustment = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.2, scale + scaleAdjustment), 8);
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-element')) return;
    
    // Calibration Click Handler
    if (isCalibrating && mapRef.current) {
        const rect = mapRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - position.x) / scale;
        const y = (e.clientY - rect.top - position.y) / scale;
        
        const newPoints = [...calibrationPoints, { x, y }];
        setCalibrationPoints(newPoints);

        if (newPoints.length === 2) {
            const distPx = Math.sqrt(Math.pow(newPoints[1].x - newPoints[0].x, 2) + Math.pow(newPoints[1].y - newPoints[0].y, 2));
            const realDist = parseFloat(prompt("Enter real-world distance in FEET between these points:", "3") || "0");
            if (realDist > 0) {
                const pxPerFt = distPx / realDist;
                setPixelsPerFoot(pxPerFt);
                localStorage.setItem('floorPlan_pxPerFt', pxPerFt.toString());
            }
            setIsCalibrating(false);
            setCalibrationPoints([]);
        }
        return;
    }

    setIsDraggingMap(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingMap) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDraggingMap(false);

  // --- Drag & Drop Item Placement ---
  const handleDragStartItem = (e: React.DragEvent, modId: string) => {
    e.dataTransfer.setData("moduleId", modId);
  };

  const handleDropOnMap = (e: React.DragEvent) => {
    e.preventDefault();
    const modId = e.dataTransfer.getData("moduleId");
    if (!modId || !mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - position.x) / (rect.width * scale) * 100;
    const y = (e.clientY - rect.top - position.y) / (rect.height * scale) * 100;

    setModules(prev => prev.map(m => {
        if (m.id === modId) {
            return { ...m, position: { x, y } };
        }
        return m;
    }));
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  // --- Wire Calculation ---
  const getWireLength = (m: HardwareModule, parent: HardwareModule) => {
      if (!pixelsPerFoot || !m.position || !parent.position || !mapRef.current) return null;
      
      const w = mapRef.current.offsetWidth;
      const h = mapRef.current.offsetHeight;

      const x1 = (m.position.x / 100) * w;
      const y1 = (m.position.y / 100) * h;
      const x2 = (parent.position!.x / 100) * w;
      const y2 = (parent.position!.y / 100) * h;

      const pxDist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      const horizontalFt = pxDist / pixelsPerFoot;
      const verticalFt = (CEILING_HEIGHT_FT - DEVICE_HEIGHT_FT) + (CEILING_HEIGHT_FT - PANEL_HEIGHT_FT);
      
      return Math.ceil((horizontalFt + verticalFt) * 1.1); // +10% slack
  };

  // --- Helpers ---
  const placedModules = modules.filter(m => m.position && m.mountType !== MountType.NA);
  const unplacedModules = modules.filter(m => !m.position && m.mountType !== MountType.NA && m.type !== 'ACCESSORY');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'STRUCTURAL' | 'ELECTRICAL') => {
      if(e.target.files?.[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              const result = ev.target?.result as string;
              if (type === 'STRUCTURAL') {
                  setStructuralMap(result);
                  localStorage.setItem('floorPlan_structural', result);
              } else {
                  setElectricalMap(result);
                  localStorage.setItem('floorPlan_electrical', result);
              }
              setActiveLayer(type);
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const clearMap = () => {
      localStorage.removeItem('floorPlan_structural');
      localStorage.removeItem('floorPlan_electrical');
      localStorage.removeItem('floorPlan_pxPerFt');
      setStructuralMap(null);
      setElectricalMap(null);
      setPixelsPerFoot(null);
  };

  const currentMapImage = activeLayer === 'STRUCTURAL' ? structuralMap : (electricalMap || structuralMap);

  return (
    <div className="h-full flex overflow-hidden bg-slate-950">
      
      {/* SIDEBAR */}
      <div className="w-80 border-r border-slate-800 bg-slate-900 flex flex-col z-20 shadow-xl">
          {/* Unplaced Items */}
          <div className="p-4 border-b border-slate-800">
              <h3 className="text-white font-bold flex items-center">
                  <GripVertical className="w-5 h-5 mr-2 text-slate-400" />
                  Unplaced Devices
              </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {unplacedModules.map(m => (
                  <div 
                    key={m.id}
                    draggable
                    onDragStart={(e) => handleDragStartItem(e, m.id)}
                    className="bg-slate-800 p-3 rounded border border-slate-700 hover:border-blue-500 cursor-grab active:cursor-grabbing group"
                  >
                      <div className="flex justify-between items-start">
                          <span className="text-sm font-medium text-slate-200">{m.name}</span>
                          <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400">{m.location}</span>
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-1">{m.description}</div>
                  </div>
              ))}
              {unplacedModules.length === 0 && (
                  <div className="text-center text-slate-500 text-xs py-8">All mappable devices placed.</div>
              )}
          </div>
          
          {/* Controls */}
          <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-4">
              
              {/* Layers */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                    <div className="flex items-center"><Layers className="w-3 h-3 mr-2" /> Base Plans</div>
                    {currentMapImage && <button onClick={clearMap} className="text-xs text-red-500 hover:text-red-400 flex items-center"><Trash2 size={10} className="mr-1"/> Reset</button>}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                    <label className={`cursor-pointer rounded border p-2 text-center text-xs transition-colors relative overflow-hidden group
                        ${activeLayer === 'STRUCTURAL' ? 'bg-blue-900/30 border-blue-500 text-blue-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                        <div className="relative z-10 flex flex-col items-center">
                            <span className="font-bold">Structural</span>
                            <span className="text-[9px] opacity-70">Clean Layout</span>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'STRUCTURAL')} />
                        {activeLayer !== 'STRUCTURAL' && structuralMap && <button onClick={(e) => { e.preventDefault(); setActiveLayer('STRUCTURAL'); }} className="absolute inset-0"></button>}
                    </label>
                    <label className={`cursor-pointer rounded border p-2 text-center text-xs transition-colors relative overflow-hidden group
                        ${activeLayer === 'ELECTRICAL' ? 'bg-blue-900/30 border-blue-500 text-blue-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                        <div className="relative z-10 flex flex-col items-center">
                            <span className="font-bold">Electrical</span>
                            <span className="text-[9px] opacity-70">Wiring Plan</span>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'ELECTRICAL')} />
                        {activeLayer !== 'ELECTRICAL' && electricalMap && <button onClick={(e) => { e.preventDefault(); setActiveLayer('ELECTRICAL'); }} className="absolute inset-0"></button>}
                    </label>
                </div>
              </div>

              {/* View Modes */}
              <div>
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                    <Eye className="w-3 h-3 mr-2" /> Visualization
                 </h4>
                 <div className="flex bg-slate-800 rounded p-1 gap-1">
                     <button 
                        onClick={() => setViewMode('DEVICE')} 
                        className={`flex-1 text-[10px] py-1.5 rounded flex items-center justify-center gap-1 ${viewMode === 'DEVICE' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                     >
                         Dev
                     </button>
                     <button 
                        onClick={() => setViewMode('UNIVERSE')} 
                        className={`flex-1 text-[10px] py-1.5 rounded flex items-center justify-center gap-1 ${viewMode === 'UNIVERSE' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                     >
                         <Lightbulb size={10} /> Universe
                     </button>
                     <button 
                        onClick={() => setViewMode('ZONE')} 
                        className={`flex-1 text-[10px] py-1.5 rounded flex items-center justify-center gap-1 ${viewMode === 'ZONE' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                     >
                         <Zap size={10} /> LCP
                     </button>
                 </div>
              </div>

              {/* Calibration */}
              <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                      <Ruler className="w-3 h-3 mr-2" /> Scale
                  </h4>
                  <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setIsCalibrating(true); setCalibrationPoints([]); }}
                        disabled={!currentMapImage}
                        className={`flex-1 py-1.5 px-3 rounded text-xs border transition-colors flex items-center justify-center
                            ${isCalibrating ? 'bg-amber-500/20 border-amber-500 text-amber-500 animate-pulse' : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                      >
                          {isCalibrating ? 'Click 2 Points...' : 'Calibrate Scale'}
                      </button>
                      <div className="text-[10px] text-slate-500 font-mono w-16 text-right">
                          {pixelsPerFoot ? `${pixelsPerFoot.toFixed(1)} px/ft` : 'N/A'}
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* MAIN CANVAS */}
      <div className="flex-1 relative overflow-hidden cursor-crosshair bg-slate-950"
           onMouseDown={handleMouseDown}
           onMouseMove={handleMouseMove}
           onMouseUp={handleMouseUp}
           onMouseLeave={handleMouseUp}
           onWheel={handleWheel}
           onDragOver={handleDropOnMap}
           onDrop={handleDropOnMap}
      >
          {/* Zoom Controls */}
          {currentMapImage && (
              <div className="absolute top-4 left-4 z-30 flex gap-2 interactive-element">
                  <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-1 flex shadow-xl">
                      <button onClick={() => setScale(s => Math.min(s + 0.5, 8))} className="p-2 hover:bg-slate-800 text-slate-300 rounded"><ZoomIn size={20}/></button>
                      <button onClick={() => setScale(s => Math.max(s - 0.5, 0.2))} className="p-2 hover:bg-slate-800 text-slate-300 rounded"><ZoomOut size={20}/></button>
                      <button onClick={() => { setPosition({x:0,y:0}); setScale(1); }} className="p-2 hover:bg-slate-800 text-slate-300 rounded"><Move size={20}/></button>
                  </div>
                  {isCalibrating && (
                      <div className="bg-amber-500 text-black font-bold px-4 py-2 rounded shadow-lg animate-pulse flex items-center">
                          Click point {calibrationPoints.length + 1} of 2 on the map
                      </div>
                  )}
              </div>
          )}

          {/* Map Transform Container */}
          <div 
            style={{ 
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: '0 0',
                transition: isDraggingMap ? 'none' : 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }}
            className="w-full h-full"
          >
              <div ref={mapRef} className="relative inline-block shadow-2xl min-w-[800px] min-h-[600px] bg-slate-900" style={{
                  backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
              }}>
                  
                  {/* Active Map Image */}
                  {currentMapImage ? (
                      <img 
                        src={currentMapImage} 
                        alt="Floor Plan" 
                        className="pointer-events-none select-none w-full h-full object-contain"
                        draggable={false}
                      />
                  ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 backdrop-blur-sm m-12 rounded-xl border-2 border-dashed border-slate-700">
                          <ImageOff size={48} className="mb-4 text-slate-600" />
                          <h3 className="text-xl font-bold text-slate-300">No Floor Plan Loaded</h3>
                          <p className="max-w-md text-center mt-2 mb-6">Upload your 270 Boll Ave architectural drawing to begin placing devices and estimating wire runs.</p>
                          <label className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium cursor-pointer flex items-center gap-2 transition-colors shadow-lg">
                              <Upload size={18} />
                              Upload Floor Plan
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'STRUCTURAL')} />
                          </label>
                      </div>
                  )}

                  {/* Connections & Universe Lines */}
                  {showWireEstimates && currentMapImage && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10">
                          {placedModules.map(m => {
                              const parent = placedModules.find(p => p.location === m.location && p.type === ModuleType.ENCLOSURE);
                              if (!parent || !m.position || !parent.position || m.type === ModuleType.ENCLOSURE) return null;
                              
                              const wireLen = getWireLength(m, parent);
                              let strokeColor = '#6366f1';
                              if (viewMode === 'UNIVERSE' && m.universe) strokeColor = UNIVERSE_COLORS[m.universe];
                              else if (m.location === 'LCP-1') strokeColor = '#ef4444';
                              else if (m.location === 'LCP-2') strokeColor = '#3b82f6';

                              return (
                                  <g key={`con-${m.id}`}>
                                      <line 
                                        x1={`${m.position.x}%`} 
                                        y1={`${m.position.y}%`}
                                        x2={`${parent.position!.x}%`} 
                                        y2={`${parent.position!.y}%`}
                                        stroke={strokeColor}
                                        strokeWidth={viewMode === 'UNIVERSE' ? 2/scale : 1.5/scale}
                                        strokeDasharray={viewMode === 'UNIVERSE' ? '0' : '4'}
                                        opacity={viewMode === 'UNIVERSE' ? 0.8 : 0.4}
                                      />
                                      {wireLen && scale > 1.5 && viewMode === 'DEVICE' && (
                                          <text 
                                            x={`${(m.position.x + parent.position!.x) / 2}%`} 
                                            y={`${(m.position.y + parent.position!.y) / 2}%`}
                                            fill={strokeColor}
                                            fontSize={12 / scale}
                                            fontWeight="bold"
                                            textAnchor="middle"
                                            className="bg-white/80"
                                          >
                                              {wireLen}'
                                          </text>
                                      )}
                                  </g>
                              );
                          })}
                      </svg>
                  )}

                  {/* Device Markers */}
                  {currentMapImage && placedModules.map(m => {
                      const bgColor = viewMode === 'UNIVERSE' && m.universe 
                        ? UNIVERSE_COLORS[m.universe] 
                        : (m.location === 'LCP-1' ? '#ef4444' : m.location === 'LCP-2' ? '#3b82f6' : '#f59e0b');

                      return (
                      <div
                        key={m.id}
                        className={`interactive-element module-marker absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20 hover:z-50`}
                        style={{ left: `${m.position!.x}%`, top: `${m.position!.y}%` }}
                        onMouseDown={(e) => { e.stopPropagation(); }}
                      >
                          <div className={`
                             shadow-md border border-white transition-transform hover:scale-150 relative
                             ${m.type === ModuleType.ENCLOSURE ? 'w-10 h-10 rounded-sm' : 
                               m.type === ModuleType.SENSOR ? 'w-4 h-4 rounded-full' : 
                               'w-6 h-6 rounded-sm'}
                          `} style={{ backgroundColor: bgColor }}>
                             {m.type === ModuleType.ENCLOSURE && (
                                 <span className="flex items-center justify-center h-full text-[8px] font-bold text-white leading-tight">
                                     {m.location?.replace('LCP-','')}
                                 </span>
                             )}
                          </div>

                          {/* Hover Label */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-slate-900/90 text-white text-[10px] px-2 py-1 rounded border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                              <div className="font-bold">{m.name}</div>
                              <div className="text-slate-400">{m.location} {m.universe ? `• Universe ${m.universe}` : ''}</div>
                          </div>
                      </div>
                  )})}
                  
                  {/* Calibration Markers */}
                  {calibrationPoints.map((p, i) => (
                      <div key={i} className="absolute w-4 h-4 rounded-full border-2 border-amber-500 bg-amber-500/50 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none" style={{ left: p.x, top: p.y }}></div>
                  ))}

              </div>
          </div>
          
          {/* Legend */}
          {currentMapImage && (
              <div className="absolute bottom-4 left-4 bg-slate-900/90 p-2 rounded border border-slate-700 text-[10px] text-slate-300 pointer-events-none">
                  {viewMode === 'UNIVERSE' && (
                      <div className="space-y-1">
                          <div className="font-bold mb-1">DALI Universes</div>
                          <div className="flex items-center"><span className="w-2 h-2 rounded-full mr-2" style={{background: UNIVERSE_COLORS[1]}}></span> Universe 1</div>
                          <div className="flex items-center"><span className="w-2 h-2 rounded-full mr-2" style={{background: UNIVERSE_COLORS[2]}}></span> Universe 2</div>
                          <div className="flex items-center"><span className="w-2 h-2 rounded-full mr-2" style={{background: UNIVERSE_COLORS[3]}}></span> Universe 3</div>
                          <div className="flex items-center"><span className="w-2 h-2 rounded-full mr-2" style={{background: UNIVERSE_COLORS[4]}}></span> Universe 4</div>
                      </div>
                  )}
                  {viewMode === 'ZONE' && (
                      <div className="space-y-1">
                          <div className="font-bold mb-1">Panel Zones</div>
                          <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span> LCP-1 (Garage)</div>
                          <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span> LCP-2 (Office)</div>
                      </div>
                  )}
              </div>
          )}
      </div>
    </div>
  );
};

export default FloorPlanMap;