import React from 'react';
import { Layer, ToolType } from '../../editor/models/types';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';

interface LayersSidebarProps {
    editor: FloorPlanEditor | null;
    layers: Layer[];
    activeLayerId: string | null;
    isEditMode: boolean;
    selectedIds: string[];
    setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
    activeTool: ToolType;
}

export const LayersSidebar: React.FC<LayersSidebarProps> = React.memo(({
    editor,
    layers,
    activeLayerId,
    isEditMode,
    selectedIds,
    setSelectedIds,
    activeTool
}) => {
    return (
        <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.3)]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Layers</h3>
                <span className="text-[10px] text-slate-600 font-mono">{layers.length} Active</span>
            </div>

            {/* Layer Stack */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5 bg-slate-950/50">
                {[...layers].sort((a, b) => b.zIndex - a.zIndex).map(l => (
                    <div
                        key={l.id}
                        className={`group rounded transition-all border ${activeLayerId === l.id && isEditMode
                            ? 'bg-red-900/20 border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.1)_inset]'
                            : selectedIds.includes(l.id)
                                ? 'bg-slate-800/80 border-blue-500/50 shadow-inner'
                                : 'bg-transparent border-transparent hover:bg-slate-800/30'
                            }`}
                    >
                        <div className="flex items-center py-1 px-1.5 space-x-1">
                            {/* Edit button - only for image layers */}
                            {l.allowLayerEditing === true && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        editor?.setActiveLayer(activeLayerId === l.id ? null : l.id);
                                    }}
                                    className={`w-12 h-5 flex items-center justify-center rounded transition-all text-[8px] font-bold ${
                                        activeLayerId === l.id
                                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                                            : 'text-slate-600 hover:text-slate-400 hover:bg-slate-700'
                                        }`}
                                    title={activeLayerId === l.id ? "End Editing" : "Edit Layer Transform"}
                                >
                                    {activeLayerId === l.id ? 'ACTIVE' : 'EDIT'}
                                </button>
                            )}

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    editor?.setLayerVisible(l.id, !l.visible);
                                }}
                                className={`w-10 h-5 flex items-center justify-center rounded transition-all text-[8px] font-bold ${
                                    l.visible
                                        ? 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 hover:text-blue-300'
                                        : 'text-slate-500 bg-slate-800/50 hover:bg-slate-700 hover:text-slate-400'
                                    }`}
                            >
                                {l.visible ? 'SHOW' : 'HIDE'}
                            </button>

                            <div className="flex-1 min-w-0 px-1" onClick={() => {
                                if (selectedIds.includes(l.id)) {
                                    setSelectedIds(prev => prev.filter(id => id !== l.id));
                                } else {
                                    setSelectedIds(prev => [...prev, l.id]);
                                }
                            }}>
                                <div className={`text-[10px] font-bold truncate leading-tight ${l.visible ? (activeLayerId === l.id ? 'text-red-400' : 'text-slate-200') : 'text-slate-600'}`}>
                                    {l.name}
                                </div>
                                <div className="text-[8px] text-slate-500 font-mono uppercase tracking-tighter leading-tight">
                                    <span>opacity {(l.opacity * 100).toFixed(0)}%</span>
                                </div>
                            </div>

                            {selectedIds.includes(l.id) && (
                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                            )}
                        </div>

                        {/* Expanded Controls for Selected Layer */}
                        {selectedIds.includes(l.id) && (
                            <div className="px-4 pb-4 pt-2 space-y-4 border-t border-slate-700/50 mt-1">
                                {/* Opacity - available for all layers */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Opacity</label>
                                        <span className="text-[10px] text-blue-400 font-mono">{(l.opacity * 100).toFixed(0)}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="1" step="0.01" value={l.opacity} className="w-full accent-blue-500 bg-slate-700 h-1 rounded-full appearance-none outline-none"
                                        onChange={(e) => editor?.setLayerOpacity(l.id, parseFloat(e.target.value))}
                                    />
                                </div>

                                {/* Scale & Rotation - only for image layers */}
                                {l.allowLayerEditing === true && (
                                    <>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Scale</label>
                                                <span className="text-[10px] text-blue-400 font-mono">{l.transform.scale.x.toFixed(2)}x</span>
                                            </div>
                                            <input
                                                type="range" min="0.1" max="5" step="0.01" value={l.transform.scale.x} className="w-full accent-blue-500 bg-slate-700 h-1 rounded-full appearance-none outline-none"
                                                onChange={(e) => {
                                                    const s = parseFloat(e.target.value);
                                                    editor?.setLayerTransform(l.id, { scale: { x: s, y: s } });
                                                }}
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Rotation</label>
                                                <span className="text-[10px] text-blue-400 font-mono">{((l.transform.rotation * 180) / Math.PI).toFixed(1)}°</span>
                                            </div>
                                            <input
                                                type="range" min="-180" max="180" step="0.5" value={(l.transform.rotation * 180) / Math.PI} className="w-full accent-blue-500 bg-slate-700 h-1 rounded-full appearance-none outline-none"
                                                onChange={(e) => {
                                                    const r = (parseFloat(e.target.value) * Math.PI) / 180;
                                                    editor?.setLayerTransform(l.id, { rotation: r });
                                                }}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Selected Layer Info / Properties */}
            <div className="p-4 bg-slate-900 border-t border-slate-800">
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Properties</div>
                {selectedIds.length > 0 ? (
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-[10px] text-slate-500">Selection</span>
                            <span className="text-[10px] text-slate-300 font-mono">{selectedIds.length} Objects</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                            <span className="text-slate-500">Active Tool</span>
                            <span className="text-blue-500 font-bold uppercase">{activeTool}</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-[10px] italic text-slate-700">No selection</div>
                )}
            </div>
        </div>
    );
});
