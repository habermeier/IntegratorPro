import React from 'react';
import { ToolType } from '../../editor/models/types';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';
import { dataService } from '../../src/services/DataService';

interface EditorHUDProps {
    editor: FloorPlanEditor | null;
    activeTool: ToolType;
    isEditMode: boolean;
    activeLayerName?: string;
    lastKey?: string;
    isElectricalVisible?: boolean;
}

export const EditorHUD: React.FC<EditorHUDProps> = React.memo(({ editor, activeTool, isEditMode, activeLayerName, lastKey, isElectricalVisible }) => {
    const [isPrimary, setIsPrimary] = React.useState(() => dataService.isPrimary());

    React.useEffect(() => {
        const handleBatonChange = (e: any) => {
            setIsPrimary(e.detail.isPrimary);
        };

        const handleProjectChange = (e: any) => {
            if (e.detail?.isMaster !== undefined) {
                setIsPrimary(e.detail.isMaster);
            }
        };

        window.addEventListener('master-baton-changed', handleBatonChange);
        window.addEventListener('project-data-changed', handleProjectChange);

        return () => {
            window.removeEventListener('master-baton-changed', handleBatonChange);
            window.removeEventListener('project-data-changed', handleProjectChange);
        };
    }, []);

    return (
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center z-10 relative">
            <div className="flex items-center space-x-6">
                <div>
                    <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-bold text-white leading-none">IntegratorPro Editor</h2>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter ${isPrimary ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                            {isPrimary ? 'Primary' : 'Secondary'}
                        </span>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-blue-500 font-bold mt-1">System Planning Suite</p>
                </div>
            </div>

            <div className="flex items-center space-x-4">
                {editor && (
                    <div className="flex items-center space-x-3 bg-slate-800 p-1 rounded-lg border border-slate-700 pr-3">
                        {activeLayerName && (
                            <div className="flex items-center space-x-2">
                                <span className="text-[10px] text-slate-500 uppercase font-black">Target:</span>
                                <span className="text-xs text-blue-400 font-bold truncate max-w-[120px]">{activeLayerName}</span>
                            </div>
                        )}
                        {isEditMode && (
                            <button
                                onClick={() => editor.setEditMode(false)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider rounded-md transition-colors ml-2 border border-red-400/50"
                                title="Exit Overlay Alignment Mode (L)"
                            >
                                EXIT ALIGNMENT MODE
                            </button>
                        )}
                        <div className="flex items-center space-x-2 pl-2 border-l border-slate-700 ml-2">
                            <span className="text-[9px] text-slate-500 uppercase font-bold">Space + Drag:</span>
                            <span className="text-[9px] text-blue-500/80 uppercase font-bold italic">Pan View</span>
                        </div>
                    </div>
                )}

                <div className="flex space-x-1 border-l border-slate-800 pl-4">
                    <button
                        onClick={() => editor?.commandManager.undo()}
                        className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors text-lg"
                        title="Undo (Ctrl+Z)"
                    >
                        ↩️
                    </button>
                    <button
                        onClick={() => editor?.commandManager.redo()}
                        className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors text-lg"
                        title="Redo (Ctrl+Shift+Z)"
                    >
                        ↪️
                    </button>
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('test-purge-polygons'))}
                        className="p-2 hover:bg-red-900/40 rounded-md text-red-500 hover:text-red-400 transition-colors text-lg"
                        title="DEBUG: Purge All Polygons (Test Data Protection)"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            {/* Floating Last Key Overlay (Absolute Positioned, No Layout Shift) */}
            {lastKey && (
                <div className="absolute top-[80px] right-6 z-50 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 px-3 py-2 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center space-x-3 border-l-4 border-l-blue-600">
                        <div className="flex flex-col">
                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1">Last Key</span>
                            <span className="text-sm text-white font-mono font-bold uppercase leading-none">{lastKey}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Shimmy Guide Banner - Shows when Electrical Overlay is visible (AUTO-UI-SHIMMY-GUIDE-P17) */}
            {isElectricalVisible && (
                <div className="absolute top-[80px] left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-emerald-900/95 backdrop-blur-md border border-emerald-700 px-4 py-2 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center space-x-3 border-l-4 border-l-emerald-500">
                        <div className="text-emerald-400 text-lg">ℹ️</div>
                        <div className="flex flex-col">
                            <span className="text-[11px] text-white font-bold leading-tight">
                                Press <kbd className="px-1.5 py-0.5 bg-slate-900/80 rounded text-emerald-400 font-mono">L</kbd> to toggle Alignment Mode
                            </span>
                            <span className="text-[9px] text-emerald-300/80 leading-tight mt-0.5">
                                Use <span className="text-white font-semibold">Arrows</span> to move • <span className="text-white font-semibold">Ctrl+Arrows</span> to Rotate/Scale
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default EditorHUD;
