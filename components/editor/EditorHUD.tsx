import React from 'react';
import { HelpCircle, Menu, Home, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ToolType } from '../../editor/models/types';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';
import { dataService } from '../../src/services/DataService';
import { getToolHint, getModeTheme } from '../../src/constants/toolHints';

interface EditorHUDProps {
    editor: FloorPlanEditor | null;
    activeTool: ToolType;
    isEditMode: boolean;
    activeLayerName?: string;
    lastKey?: string;
    isZoomCursorEnabled?: boolean;
}

export const EditorHUD: React.FC<EditorHUDProps> = React.memo(({ editor, activeTool, isEditMode, activeLayerName, lastKey, isZoomCursorEnabled }) => {
    const navigate = useNavigate();
    const [isPrimary, setIsPrimary] = React.useState(() => dataService.isPrimary());
    const [showHelp, setShowHelp] = React.useState(false);
    const [viewportWidth, setViewportWidth] = React.useState(() => window.innerWidth);

    // Track viewport width for responsive hints (AUTO-ULTIMATE-POLISH-P25)
    React.useEffect(() => {
        const handleResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Contextual hint logic (AUTO-HUD-CONSOLIDATE-P23, AUTO-HUD-POLISH-P24, AUTO-ULTIMATE-POLISH-P25)
    const commandHint = React.useMemo(
        () => getToolHint(activeTool, isEditMode, isZoomCursorEnabled, viewportWidth),
        [activeTool, isEditMode, isZoomCursorEnabled, viewportWidth]
    );

    // Mode theming for Command Bar (AUTO-ULTIMATE-POLISH-P25)
    const modeTheme = React.useMemo(
        () => getModeTheme(activeTool, isEditMode),
        [activeTool, isEditMode]
    );

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

    // Handle keyboard shortcuts for help modal (AUTO-ULTIMATE-UX-P26)
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Close help modal with ESC
            if (e.key === 'Escape' && showHelp) {
                setShowHelp(false);
            }
            // Open help modal with ? or F1
            else if ((e.key === '?' || e.key === 'F1') && !showHelp) {
                e.preventDefault(); // Prevent default F1 browser help
                setShowHelp(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [showHelp]);

    return (
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center z-10 relative animate-in fade-in slide-in-from-top-4 duration-400 h-16">
            <div className="flex items-center space-x-4">
                <button
                    onClick={() => navigate('/project-brief')}
                    className="p-2 hover:bg-slate-800 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg text-slate-400 hover:text-white transition-all group flex items-center gap-1"
                    title="Return to Project Dashboard"
                    aria-label="Home"
                >
                    <Menu size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline opacity-0 group-hover:opacity-100 transition-opacity">Menu</span>
                </button>

                <div className="h-8 w-px bg-slate-800 mx-2" />

                <div>
                    <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-bold text-white leading-none tracking-tight">IntegratorPro Editor</h2>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter ${isPrimary ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                            {isPrimary ? 'Primary' : 'Secondary'}
                        </span>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-blue-500/70 font-bold mt-1">System Planning Suite</p>
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
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 focus:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 text-white text-[10px] font-black uppercase tracking-wider rounded-md transition-colors ml-2 border border-red-400/50"
                                title="Exit Overlay Alignment Mode (L)"
                                aria-label="Exit Overlay Alignment Mode"
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
                        className="p-2 hover:bg-slate-800 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md text-slate-400 hover:text-white transition-colors text-lg"
                        title="Undo (Ctrl+Z)"
                        aria-label="Undo last action"
                    >
                        ↩️
                    </button>
                    <button
                        onClick={() => editor?.commandManager.redo()}
                        className="p-2 hover:bg-slate-800 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md text-slate-400 hover:text-white transition-colors text-lg"
                        title="Redo (Ctrl+Shift+Z)"
                        aria-label="Redo last action"
                    >
                        ↪️
                    </button>
                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        className="p-2 hover:bg-emerald-900/40 focus:bg-emerald-900/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-md text-emerald-500 hover:text-emerald-400 transition-colors"
                        title="Keyboard Shortcuts (Press ? or F1)"
                        aria-label="Show keyboard shortcuts help"
                    >
                        <HelpCircle size={18} />
                    </button>
                    <button
                        onClick={() => editor?.resetView()}
                        className="p-2 hover:bg-blue-900/40 focus:bg-blue-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md text-blue-500 hover:text-blue-400 transition-colors text-lg"
                        title="Reset View (Center & Zoom)"
                        aria-label="Reset floor plan view"
                    >
                        📐
                    </button>
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('test-purge-polygons'))}
                        className="p-2 hover:bg-red-900/40 focus:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md text-red-500 hover:text-red-400 transition-colors text-lg"
                        title="DEBUG: Purge All Polygons (Test Data Protection)"
                        aria-label="Debug: Purge all polygons"
                    >
                        🗑️
                    </button>
                </div>
            </div>

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
                                className="text-slate-500 hover:text-white focus:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded transition-colors p-1"
                                aria-label="Close keyboard shortcuts help"
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
                                <div className="flex justify-between items-center">
                                    <kbd className="px-2 py-1 bg-slate-800 rounded text-white font-mono text-sm border border-slate-700">Ctrl + F</kbd>
                                    <span className="text-sm text-slate-300 ml-3 flex-1">Toggle FPS Counter</span>
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

            {/* Unified Command Bar - Fixed at bottom for Zen Mode (AUTO-MAX-REAL-ESTATE-P21, AUTO-ULTIMATE-UX-P26) */}
            <div className="fixed bottom-16 left-1/2 transform -translate-x-1/2 z-[60] w-full px-4 pointer-events-none">
                <div
                    className={`bg-slate-900/95 backdrop-blur-md border-2 ${modeTheme.borderClass} rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.6)] min-w-[320px] max-w-[90vw] md:max-w-2xl mx-auto transition-all duration-300 pointer-events-auto ${modeTheme.shouldPulse ? 'animate-pulse' : ''}`}
                    role="status"
                    aria-label="Current tool instructions and keyboard shortcuts"
                    aria-live="polite"
                >
                    <div className="flex items-center justify-center space-x-2 md:space-x-4 px-2 md:px-4 py-2">
                        {/* Panel Toggle Hint */}
                        <div className="flex items-center space-x-2">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Panels:</span>
                            <kbd className="px-1.5 py-0.5 bg-slate-800/80 rounded text-emerald-400 font-mono text-[10px] border border-emerald-500/30">[ ]</kbd>
                        </div>

                        {/* Divider */}
                        <div className="h-4 w-px bg-slate-700"></div>

                        {/* Contextual hints based on active tool/mode (AUTO-HUD-CONSOLIDATE-P23, AUTO-HUD-POLISH-P24, AUTO-ULTIMATE-POLISH-P25) */}
                        <div className="flex items-center space-x-2 text-[10px] flex-1 min-w-0">
                            <span className={`font-bold uppercase tracking-wider truncate ${modeTheme.textClass}`}>
                                {commandHint}
                            </span>
                        </div>

                        {/* Last Key Badge (integrated from removed floating overlay) */}
                        {lastKey && (
                            <>
                                <div className="h-4 w-px bg-slate-700"></div>
                                <div className="flex items-center space-x-1.5 bg-slate-800/60 px-2 py-1 rounded border border-slate-700">
                                    <span className="text-[8px] text-slate-500 uppercase font-black tracking-wider">Key:</span>
                                    <span className="text-[9px] text-white font-mono font-bold uppercase">{lastKey}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default EditorHUD;
