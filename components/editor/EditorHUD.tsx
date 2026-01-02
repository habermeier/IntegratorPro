import React from 'react';
import { HelpCircle } from 'lucide-react';
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
    isZoomCursorEnabled?: boolean;
}

export const EditorHUD: React.FC<EditorHUDProps> = React.memo(({ editor, activeTool, isEditMode, activeLayerName, lastKey, isElectricalVisible, isZoomCursorEnabled }) => {
    const [isPrimary, setIsPrimary] = React.useState(() => dataService.isPrimary());
    const [showHelp, setShowHelp] = React.useState(false);

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

    // Handle ESC key to close help modal
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && showHelp) {
                setShowHelp(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [showHelp]);

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
                        onClick={() => setShowHelp(!showHelp)}
                        className="p-2 hover:bg-emerald-900/40 rounded-md text-emerald-500 hover:text-emerald-400 transition-colors"
                        title="Keyboard Shortcuts"
                    >
                        <HelpCircle size={18} />
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

            {/* Zoom Cursor Indicator - Shows when zoom cursor is enabled (AUTO-FINAL-POLISH-P18) */}
            {isZoomCursorEnabled && (
                <div className="absolute top-[145px] right-6 z-50 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-blue-900/95 backdrop-blur-md border border-blue-700 px-3 py-2 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center space-x-2 border-l-4 border-l-blue-500">
                        <div className="text-blue-400 text-sm">🔍</div>
                        <span className="text-[10px] text-blue-300 font-black uppercase tracking-wider">ZOOM ACTIVE</span>
                    </div>
                </div>
            )}

            {/* Keyboard Shortcuts Help Modal (AUTO-MAX-REAL-ESTATE-P21) */}
            {showHelp && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setShowHelp(false)}
                >
                    <div
                        className="bg-slate-900/95 backdrop-blur-md border-2 border-emerald-500/30 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-6 max-w-2xl w-full mx-4 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-3">
                            <h3 className="text-lg font-bold text-emerald-400 flex items-center space-x-2">
                                <HelpCircle size={20} />
                                <span>Keyboard Shortcuts</span>
                            </h3>
                            <button
                                onClick={() => setShowHelp(false)}
                                className="text-slate-500 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Panel Controls */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-black text-emerald-500 uppercase tracking-wider mb-2">Panel Controls</h4>
                                <div className="flex justify-between items-center">
                                    <kbd className="px-2 py-1 bg-slate-800 rounded text-white font-mono text-sm border border-slate-700">[</kbd>
                                    <span className="text-sm text-slate-300 ml-3 flex-1">Toggle Left Panel</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <kbd className="px-2 py-1 bg-slate-800 rounded text-white font-mono text-sm border border-slate-700">]</kbd>
                                    <span className="text-sm text-slate-300 ml-3 flex-1">Toggle Right Panel</span>
                                </div>
                            </div>

                            {/* Navigation */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-black text-emerald-500 uppercase tracking-wider mb-2">Navigation</h4>
                                <div className="flex justify-between items-center">
                                    <kbd className="px-2 py-1 bg-slate-800 rounded text-white font-mono text-sm border border-slate-700">Space + Move</kbd>
                                    <span className="text-sm text-slate-300 ml-3 flex-1">Auto-Pan</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <kbd className="px-2 py-1 bg-slate-800 rounded text-white font-mono text-sm border border-slate-700">Shift + Scroll</kbd>
                                    <span className="text-sm text-slate-300 ml-3 flex-1">Fast Zoom</span>
                                </div>
                            </div>

                            {/* Alignment */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-black text-emerald-500 uppercase tracking-wider mb-2">Overlay Alignment</h4>
                                <div className="flex justify-between items-center">
                                    <kbd className="px-2 py-1 bg-slate-800 rounded text-white font-mono text-sm border border-slate-700">L</kbd>
                                    <span className="text-sm text-slate-300 ml-3 flex-1">Toggle Alignment Mode</span>
                                </div>
                            </div>

                            {/* Tools */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-black text-emerald-500 uppercase tracking-wider mb-2">Tool Shortcuts</h4>
                                <div className="grid grid-cols-2 gap-1 text-xs">
                                    <div className="flex items-center space-x-2">
                                        <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-white font-mono border border-slate-700">V</kbd>
                                        <span className="text-slate-300">Select</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-white font-mono border border-slate-700">R</kbd>
                                        <span className="text-slate-300">Room</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-white font-mono border border-slate-700">M</kbd>
                                        <span className="text-slate-300">Mask</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-white font-mono border border-slate-700">P</kbd>
                                        <span className="text-slate-300">Pan</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-white font-mono border border-slate-700">F</kbd>
                                        <span className="text-slate-300">Furniture</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-white font-mono border border-slate-700">S</kbd>
                                        <span className="text-slate-300">Symbol</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-white font-mono border border-slate-700">D</kbd>
                                        <span className="text-slate-300">Device</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-700">
                            <p className="text-xs text-slate-500 italic">
                                Press <kbd className="px-1 py-0.5 bg-slate-800 rounded text-emerald-400 font-mono text-[10px]">Esc</kbd> or click outside to close
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Panel Hint - Small text indicating [ ] shortcuts (AUTO-MAX-REAL-ESTATE-P21) */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-40">
                <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 px-2 py-1 rounded text-[9px] text-slate-400">
                    Press <kbd className="px-1 py-0.5 bg-slate-800 rounded text-emerald-400 font-mono">[ ]</kbd> to hide menus
                </div>
            </div>
        </div>
    );
});

export default EditorHUD;
