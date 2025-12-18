import React from 'react';
import { ToolType } from '../../editor/models/types';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';

interface EditorHUDProps {
    editor: FloorPlanEditor | null;
    activeTool: ToolType;
    isEditMode: boolean;
    activeLayerName?: string;
    lastKey?: string;
}

export const EditorHUD: React.FC<EditorHUDProps> = React.memo(({ editor, activeTool, isEditMode, activeLayerName, lastKey }) => {
    return (
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center z-10 relative">
            <div className="flex items-center space-x-6">
                <div>
                    <h2 className="text-lg font-bold text-white leading-none">IntegratorPro Editor</h2>
                    <p className="text-[10px] uppercase tracking-widest text-blue-500 font-bold mt-1">System Planning Suite</p>
                </div>

                <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                    <button
                        onClick={() => editor?.setActiveTool('select')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTool === 'select' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        Select
                    </button>
                    <button
                        onClick={() => editor?.setActiveTool('scale-calibrate')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTool === 'scale-calibrate' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        Calibrate Scale
                    </button>
                </div>
            </div>

            <div className="flex items-center space-x-4">
                {editor && (
                    <div className="flex items-center space-x-3 bg-slate-800 p-1 rounded-lg border border-slate-700 pr-3">
                        <button
                            onClick={() => editor.toggleEditMode()}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center space-x-2 ${isEditMode ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        >
                            <span>{isEditMode ? '🛠️ Editing' : '📐 Edit Layer'}</span>
                        </button>
                        {activeLayerName && (
                            <div className="flex items-center space-x-2 pl-2 border-l border-slate-700">
                                <span className="text-[10px] text-slate-500 uppercase font-black">Target:</span>
                                <span className="text-xs text-blue-400 font-bold truncate max-w-[120px]">{activeLayerName}</span>
                            </div>
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
        </div>
    );
});

export default EditorHUD;
