import React, { useMemo, useEffect, useRef } from 'react';
import { HardwareModule, MountType, ModuleType } from '../types';

interface VisualizerProps {
  modules: HardwareModule[];
  highlightedModuleId?: string | null;
}

const Visualizer: React.FC<VisualizerProps> = ({ modules, highlightedModuleId }) => {
  // Unique Locations
  const cabinets = useMemo(() => {
    const locs = Array.from(new Set(modules.map(m => m.location || 'Unassigned')))
      .filter(l => l !== 'Field' && l !== 'Infra' && l !== 'Unassigned');
    return locs.sort();
  }, [modules]);

  // Field Devices
  const fieldModules = useMemo(() => {
    return modules.filter(m => m.location === 'Field' || m.mountType === MountType.WALL_MOUNT || m.mountType === MountType.CEILING_MOUNT);
  }, [modules]);

  // Ref to store element references for auto-scrolling
  const moduleRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  // Auto-scroll effect
  useEffect(() => {
    if (highlightedModuleId && moduleRefs.current[highlightedModuleId]) {
      moduleRefs.current[highlightedModuleId]?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, [highlightedModuleId]);

  // --- BEST PRACTICE LOGIC ---
  const getCabinetModulesWithSpacers = (location: string) => {
    const items: HardwareModule[] = [];
    
    // Expand Quantities
    modules
      .filter(m => m.location === location && m.mountType === MountType.DIN_RAIL)
      .forEach(m => {
        for(let i=0; i<m.quantity; i++) {
           const newItem = {...m, id: i === 0 ? m.id : `${m.id}-${i}`}; // Keep original ID for first instance for linking
           items.push(newItem);
           
           // Thermal Gap Rule: If Power > 4W or heatDissipation > 3W, add 0.5TE spacer
           const heat = m.heatDissipation || (m.powerWatts * 0.1); // Estimate heat if unknown
           if (heat > 3) {
             items.push({
               id: `${m.id}-gap-${i}`,
               name: 'Air Gap',
               manufacturer: 'Thermal',
               description: 'Heat Dissipation',
               type: ModuleType.ACCESSORY,
               mountType: MountType.DIN_RAIL,
               size: 0.5, // Small gap
               cost: 0,
               powerWatts: 0,
               quantity: 1,
               location: location
             });
           }
        }
      });

    // Sort Logic: Power First -> Actuators -> Gateways -> Logic
    return items.sort((a, b) => {
       const typePriority = {
        [ModuleType.POWER]: 1,
        [ModuleType.CONTROLLER]: 2, // Actuators (High Voltage Switching)
        [ModuleType.LIGHTING]: 3, // Dimmers
        [ModuleType.HVAC]: 4,
        [ModuleType.NETWORK]: 5, // Logic/Bus
        [ModuleType.SENSOR]: 6,
        [ModuleType.ACCESSORY]: 99
      };
      // @ts-ignore
      const pA = typePriority[a.type] || 50;
      // @ts-ignore
      const pB = typePriority[b.type] || 50;
      
      return pA - pB;
    });
  };

  const renderRail = (railModules: HardwareModule[], rowIndex: number, usableWidthTE: number) => {
    // Check fill percentage
    const usedTE = railModules.reduce((acc, m) => acc + m.size, 0);
    const fillPercent = (usedTE / usableWidthTE) * 100;
    const isOverfilled = fillPercent > 100;

    return (
      <div key={rowIndex} className="relative flex flex-col">
        {/* Wire Duct (Panduit) - Standard 2" duct above rail */}
        <div className="h-8 w-full bg-slate-700/80 border-b border-slate-600 mb-1 flex items-center justify-between px-2 relative pattern-dots">
            {/* Duct Fingers Visual */}
            <div className="absolute inset-0 flex justify-between px-1 opacity-30 pointer-events-none">
                 {Array.from({length: 40}).map((_, i) => <div key={i} className="w-1 h-full bg-slate-900 mx-1"></div>)}
            </div>
            <span className="text-[9px] text-slate-400 z-10 bg-slate-800 px-1 rounded">Wire Duct</span>
        </div>

        {/* The Rail */}
        <div className="relative bg-slate-800/20 border-x border-slate-700 h-[100px] flex items-center px-4 mx-2">
          {/* Physical Metal Rail (35mm) */}
          <div className="absolute left-0 right-0 top-1/2 h-8 bg-gradient-to-b from-slate-400 to-slate-500 shadow-md -translate-y-1/2 -z-10 rounded-sm"></div>

          {/* Modules */}
          <div className="flex items-center h-full">
            {railModules.map((mod, mIdx) => {
              const isHighlighted = highlightedModuleId === mod.id;
              if (mod.name === 'Air Gap') {
                 return (
                    <div key={`${rowIndex}-${mIdx}`} style={{ width: `${mod.size * 18}px` }} className="h-full flex items-center justify-center relative">
                        <div className="w-[1px] h-full bg-yellow-500/20 dashed"></div>
                        <div className="absolute top-2 text-[6px] text-yellow-500/50 rotate-90 whitespace-nowrap">AIR GAP</div>
                    </div>
                 )
              }
              return (
              <div 
                key={`${rowIndex}-${mIdx}`}
                ref={(el) => { moduleRefs.current[mod.id] = el; }}
                className="relative flex flex-col group pl-[1px]" // 1px gap between modules
                style={{ width: `${mod.size * 18}px` }} // 1 TE = 18mm standard
              >
                <div className={`
                  h-[88px] w-full rounded-[2px] border shadow-sm flex flex-col items-center relative overflow-hidden transition-all
                  ${isHighlighted ? 'ring-4 ring-blue-500 z-30 scale-105 shadow-blue-500/50' : 'hover:z-20 hover:scale-105 hover:shadow-2xl'}
                  ${mod.type === 'POWER' ? 'bg-slate-200 border-slate-400' : 
                    mod.type === 'CONTROLLER' ? 'bg-emerald-50 border-emerald-300' :
                    mod.type === 'LIGHTING' ? 'bg-violet-50 border-violet-300' : 
                    mod.type === 'HVAC' ? 'bg-blue-50 border-blue-300' : 
                    mod.type === 'NETWORK' ? 'bg-indigo-50 border-indigo-300' : 'bg-slate-300'}
                `}>
                   {/* Module Top Label (Manufacturer) */}
                  <div className="w-full bg-slate-800 text-[8px] text-slate-300 text-center py-0.5 truncate px-1 font-mono tracking-tighter">
                    {mod.manufacturer.toUpperCase()}
                  </div>
                  
                  {/* Body */}
                  <div className="flex-1 flex flex-col items-center justify-center w-full p-1 text-center relative">
                      <span className="text-[9px] font-bold text-slate-800 leading-tight break-words w-full px-0.5">
                        {mod.name.replace('Actuator', '').replace('Module', '').replace('Interface', 'Int.').replace('Gateway', 'GW')}
                      </span>
                      {mod.heatDissipation && mod.heatDissipation > 2 && (
                          <span className="absolute bottom-1 right-1 text-[8px] text-red-500 font-bold">HOT</span>
                      )}
                  </div>

                  {/* Terminals Visual */}
                  <div className="w-full flex justify-between px-1 mb-1 opacity-40">
                     <div className="flex gap-[2px] mx-auto">{Array.from({length: Math.min(4, Math.ceil(mod.size))}).map((_,i)=><div key={i} className="w-1.5 h-1.5 bg-slate-600 rounded-full border border-slate-400"></div>)}</div>
                  </div>
                </div>

                {/* Tooltip */}
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 ${isHighlighted ? 'block' : 'hidden group-hover:block'} z-50 w-64 pointer-events-none`}>
                   <div className="bg-slate-900 text-white text-xs rounded-lg p-3 border border-slate-600 shadow-2xl z-50">
                     <div className="font-bold text-base mb-1">{mod.name}</div>
                     <div className="text-slate-400 italic mb-2">{mod.description}</div>
                     <div className="grid grid-cols-2 gap-2 text-[10px]">
                         <div><span className="text-slate-500">Power:</span> {mod.powerWatts}W</div>
                         <div><span className="text-slate-500">Heat:</span> ~{mod.heatDissipation || 0}W</div>
                         <div><span className="text-slate-500">Width:</span> {mod.size} TE ({mod.size * 18}mm)</div>
                         <div><span className="text-slate-500">Cost:</span> ${mod.cost}</div>
                     </div>
                     {mod.notes && <div className="mt-2 pt-2 border-t border-slate-700 text-amber-500">{mod.notes}</div>}
                   </div>
                </div>
              </div>
            )})}
          </div>
        </div>
        
        {/* Rail Usage Stats */}
        <div className="absolute -right-2 top-10 translate-x-full flex flex-col text-[9px] text-slate-500 w-16 pl-2">
            <span className={isOverfilled ? 'text-red-500 font-bold' : 'text-slate-500'}>{usedTE.toFixed(1)} / {usableWidthTE} TE</span>
            <span>{fillPercent.toFixed(0)}% Fill</span>
        </div>
      </div>
    );
  };

  const renderCabinet = (location: string) => {
    const cabinetModules = getCabinetModulesWithSpacers(location);
    const enclosure = modules.find(m => m.location === location && m.type === ModuleType.ENCLOSURE);
    
    // Determine Physical Constraints based on Enclosure Model
    // 1 TE = 0.7 inches approx (18mm)
    let RAIL_WIDTH_TE = 24; // Default
    let ENCLOSURE_WIDTH_PX = 400; // Default visualization width
    let NUM_RAILS = 3;

    if (location === 'LCP-1') {
        // Saginaw 24x24. 24 inches wide.
        // Usable width roughly 20 inches accounting for wire duct side channels.
        // 20 inches / 0.7 = ~28 TE
        RAIL_WIDTH_TE = 28; 
        ENCLOSURE_WIDTH_PX = 600; 
        NUM_RAILS = 4; // 24" height allows about 4 rails with 2" ducts
    } else if (location === 'LCP-2') {
        // Leviton 14.5" wide.
        // Usable width roughly 12 inches.
        // 12 / 0.7 = ~17 TE
        RAIL_WIDTH_TE = 17;
        ENCLOSURE_WIDTH_PX = 350;
        NUM_RAILS = 4; // 21" height
    }

    // Layout Rows
    const rows: HardwareModule[][] = [];
    let currentRow: HardwareModule[] = [];
    let currentWidth = 0;

    cabinetModules.forEach(mod => {
      if (currentWidth + mod.size > RAIL_WIDTH_TE) {
        rows.push(currentRow);
        currentRow = [];
        currentWidth = 0;
      }
      currentRow.push(mod);
      currentWidth += mod.size;
    });
    if (currentRow.length > 0) rows.push(currentRow);

    // MDF Logic
    if (location === 'MDF') {
        const rackModules = modules.filter(m => m.location === 'MDF' && m.mountType === MountType.RACK_UNIT);
        return (
            <div key={location} className="min-w-[300px] flex flex-col">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center">
                    <span className="w-2 h-6 bg-blue-500 mr-3 rounded-full"></span> {location} (19" Rack)
                </h3>
                <div className="bg-slate-900 border-2 border-slate-700 rounded-lg p-4 shadow-xl relative min-h-[500px]">
                     {/* Rack Rails */}
                    <div className="absolute left-2 top-0 bottom-0 w-4 border-r border-slate-700 bg-slate-800 flex flex-col justify-around py-2">
                        {Array.from({length: 20}).map((_,i) => <div key={i} className="w-1.5 h-1.5 bg-slate-900 rounded-full mx-auto"></div>)}
                    </div>
                    <div className="absolute right-2 top-0 bottom-0 w-4 border-l border-slate-700 bg-slate-800 flex flex-col justify-around py-2">
                        {Array.from({length: 20}).map((_,i) => <div key={i} className="w-1.5 h-1.5 bg-slate-900 rounded-full mx-auto"></div>)}
                    </div>

                    <div className="mt-2 space-y-1 mx-6">
                        {rackModules.map((m, i) => (
                            <div 
                                key={i} 
                                ref={(el) => { moduleRefs.current[m.id] = el; }}
                                className={`h-12 bg-slate-800 border rounded flex items-center px-4 justify-between group relative shadow-lg
                                  ${highlightedModuleId === m.id ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-slate-600'}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center text-[10px] text-slate-500 border border-slate-700">1U</div>
                                    <div>
                                        <div className="text-sm font-medium text-slate-300">{m.name}</div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">{m.manufacturer}</div>
                                    </div>
                                </div>
                                <div className="text-emerald-500 text-xs">${m.cost}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
      <div key={location} className="flex flex-col" style={{ width: ENCLOSURE_WIDTH_PX }}>
        <div className="flex justify-between items-end mb-2 px-1">
            <h3 className="text-xl font-bold text-white flex items-center">
                <span className={`w-2 h-6 mr-3 rounded-full ${location === 'LCP-1' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                {location}
            </h3>
            <div className="text-right">
                <div className="text-xs text-slate-300">{enclosure?.description}</div>
                <div className="text-[10px] text-slate-500">{enclosure?.dimensions ? `${enclosure.dimensions.width}"W x ${enclosure.dimensions.height}"H x ${enclosure.dimensions.depth}"D` : ''}</div>
            </div>
        </div>
        
        {/* ENCLOSURE BOX */}
        <div className="bg-slate-300 border-[12px] border-slate-400 rounded-sm p-0 shadow-2xl relative overflow-hidden">
          {/* Backplate */}
          <div className="bg-white/90 min-h-[500px] relative p-4 flex flex-col gap-1">
             <div className="absolute top-0 left-0 right-0 h-4 bg-yellow-400/20 flex justify-center items-center text-[9px] text-yellow-800 font-bold border-b border-yellow-400/30">
                 DANGER: HIGH VOLTAGE
             </div>
             
             {/* DIN Rows */}
             <div className="mt-6 flex flex-col gap-1">
                 {rows.map((row, idx) => renderRail(row, idx, RAIL_WIDTH_TE))}
                 
                 {/* Empty Spare Rails */}
                 {Array.from({length: Math.max(0, NUM_RAILS - rows.length)}).map((_, i) => (
                    <div key={`empty-${i}`} className="opacity-50 grayscale">
                        {renderRail([], rows.length + i, RAIL_WIDTH_TE)}
                    </div>
                 ))}
             </div>
          </div>
        </div>
        
        <div className="mt-2 text-[10px] text-slate-500 text-center">
            * Visualization includes 2" wire ducts and thermal air gaps.
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-8 bg-slate-950">
      
      {/* Cabinet Layouts Row */}
      <div className="flex flex-col xl:flex-row gap-12 pb-12 overflow-x-auto items-start">
        {cabinets.map(loc => renderCabinet(loc))}
      </div>

      {/* Field Devices Section */}
      <div className="border-t border-slate-800 pt-8 mt-8">
           <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <span className="w-2 h-8 bg-amber-500 mr-3 rounded-full"></span>
            Field & Rough-In Devices (Bill of Materials)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {fieldModules.map((mod, idx) => (
                   <a 
                     key={`${mod.id}-${idx}`} 
                     href={mod.url} 
                     target="_blank" 
                     rel="noreferrer"
                     className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-start space-x-3 hover:border-blue-500 hover:bg-slate-800 transition-all group"
                    >
                      <div className={`mt-1 w-8 h-8 rounded flex items-center justify-center shrink-0 
                          ${mod.mountType === MountType.CEILING_MOUNT ? 'bg-blue-900/30 text-blue-400' : 
                            mod.type === 'SECURITY' ? 'bg-red-900/30 text-red-400' : 'bg-amber-900/30 text-amber-400'}`}>
                          <span className="font-bold text-xs">{mod.quantity}</span>
                      </div>
                      <div className="overflow-hidden flex-1">
                        <div className="flex justify-between">
                            <div className="text-sm font-medium text-slate-200 truncate group-hover:text-blue-400">{mod.name}</div>
                            <span className="text-xs text-emerald-500 font-mono">${mod.cost}</span>
                        </div>
                        <div className="text-xs text-slate-500 truncate">{mod.manufacturer} • {mod.description}</div>
                        <div className="mt-2 flex gap-2">
                             <span className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">{mod.location}</span>
                             {mod.url && <span className="text-[10px] text-blue-500 flex items-center gap-1">View Product &rarr;</span>}
                        </div>
                        {mod.notes && <div className="mt-2 text-[10px] text-amber-500 italic truncate">{mod.notes}</div>}
                      </div>
                   </a>
               ))}
          </div>
      </div>
    </div>
  );
};

export default Visualizer;