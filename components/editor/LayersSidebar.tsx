import React from 'react';
import { Layer, ToolType } from '../../editor/models/types';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';
import { dataService } from '../../src/services/DataService';

interface LayersSidebarProps {
    editor: FloorPlanEditor | null;
    layers: Layer[];
    activeLayerId: string | null;
    isEditMode: boolean;
    selectedIds: string[];
    setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
    activeTool: ToolType;
    isOpen?: boolean;
    isLocked?: boolean;
}

export const LayersSidebar: React.FC<LayersSidebarProps> = React.memo(({
    editor,
    layers,
    activeLayerId,
    isEditMode,
    selectedIds,
    setSelectedIds,
    activeTool,
    isOpen = true,
    isLocked = false
}) => {
    const [lightingMode, setLightingMode] = React.useState<'circles' | 'intensity' | 'fixture'>(() => editor?.layerSystem.getLightingMode() || 'circles');
    const [zoomCursorEnabled, setZoomCursorEnabled] = React.useState<boolean>(() => editor?.cameraSystem.getZoomCursorEnabled() ?? true);

    // Sync state if editor changes or system inits
    React.useEffect(() => {
        if (!editor) return;
        setLightingMode(editor.layerSystem.getLightingMode());
        setZoomCursorEnabled(editor.cameraSystem.getZoomCursorEnabled());
    }, [editor]);

    // Grouping
    const foundationLayers = layers.filter(l => l.category === 'foundation').sort((a, b) => b.zIndex - a.zIndex);
    const technicalLayers = layers.filter(l => l.category === 'technical').sort((a, b) => b.zIndex - a.zIndex);
    const utilityLayers = layers.filter(l => l.category === 'utility' || !l.category).sort((a, b) => b.zIndex - a.zIndex);

    console.log('[LayersSidebar Debug] Tech Layers Visibility:', technicalLayers.map(l => ({ id: l.id, visible: l.visible })));

    const handleQuickAction = (action: 'base' | 'context' | 'clear') => {
        if (!editor) return;
        const allLayers = editor.layerSystem.getAllLayers();

        switch (action) {
            case 'base':
                allLayers.forEach(l => {
                    const isBaseOrMask = l.id === 'base' || l.id === 'mask';
                    editor.setLayerVisible(l.id, isBaseOrMask);
                });
                break;
            case 'context':
                allLayers.forEach(l => {
                    if (l.category === 'foundation') {
                        editor.setLayerVisible(l.id, true);
                    }
                });
                break;
            case 'clear':
                allLayers.forEach(l => {
                    if (l.category === 'technical' || l.category === 'utility') {
                        editor.setLayerVisible(l.id, false);
                    }
                });
                break;
        }
    };

    const validateProjectData = (data: any): { valid: boolean; error?: string } => {
        // Check if data is an object
        if (!data || typeof data !== 'object') {
            return { valid: false, error: 'Invalid project file: not a valid JSON object' };
        }

        // Check metadata
        if (!data.metadata || typeof data.metadata !== 'object') {
            return { valid: false, error: 'Invalid project file: missing or invalid "metadata" object' };
        }
        if (!data.metadata.name || typeof data.metadata.name !== 'string') {
            return { valid: false, error: 'Invalid project file: missing or invalid "metadata.name"' };
        }

        // Check floorPlan
        if (!data.floorPlan || typeof data.floorPlan !== 'object') {
            return { valid: false, error: 'Invalid project file: missing or invalid "floorPlan" object' };
        }
        if (!data.floorPlan.scale || typeof data.floorPlan.scale !== 'object') {
            return { valid: false, error: 'Invalid project file: missing or invalid "floorPlan.scale"' };
        }
        if (!data.floorPlan.electricalOverlay || typeof data.floorPlan.electricalOverlay !== 'object') {
            return { valid: false, error: 'Invalid project file: missing or invalid "floorPlan.electricalOverlay"' };
        }
        if (!Array.isArray(data.floorPlan.polygons)) {
            return { valid: false, error: 'Invalid project file: missing or invalid "floorPlan.polygons" array' };
        }

        // Check required arrays
        if (!Array.isArray(data.devices)) {
            return { valid: false, error: 'Invalid project file: missing or invalid "devices" array' };
        }
        if (!Array.isArray(data.furniture)) {
            return { valid: false, error: 'Invalid project file: missing or invalid "furniture" array' };
        }
        if (!Array.isArray(data.cables)) {
            return { valid: false, error: 'Invalid project file: missing or invalid "cables" array' };
        }

        return { valid: true };
    };

    const handleExportProject = async () => {
        try {
            const projectData = await dataService.loadProject();
            const jsonString = JSON.stringify(projectData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `project-backup-${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export project. See console for details.');
        }
    };

    const handleImportProject = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const confirmed = confirm(
            'WARNING: This will overwrite all current project data. This action cannot be undone. Are you sure you want to continue?'
        );

        if (!confirmed) {
            event.target.value = '';
            return;
        }

        try {
            const fileContent = await file.text();

            // Parse JSON with specific error handling
            let projectData: any;
            try {
                projectData = JSON.parse(fileContent);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                alert('Failed to import project: The file is not valid JSON. Please check the file format.');
                event.target.value = '';
                return;
            }

            // Validate project data structure
            const validation = validateProjectData(projectData);
            if (!validation.valid) {
                console.error('Validation failed:', validation.error);
                alert(`Failed to import project:\n\n${validation.error}\n\nPlease ensure you are uploading a valid project backup file.`);
                event.target.value = '';
                return;
            }

            // Validation passed - proceed with import
            await dataService.saveProject(projectData, true);
            alert('Project imported successfully. Reloading page...');
            window.location.reload();
        } catch (error) {
            console.error('Import failed:', error);
            alert('Failed to import project. An unexpected error occurred. See console for details.');
        } finally {
            event.target.value = '';
        }
    };

    const renderLayerItem = (l: Layer) => {
        const isFoundation = l.category === 'foundation';
        const isActive = activeLayerId === l.id && isEditMode;

        return (
            <div
                key={l.id}
                className={`group rounded mb-0.5 transition-all border ${isActive
                    ? 'bg-red-900/20 border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.1)_inset]'
                    : selectedIds.includes(l.id)
                        ? 'bg-slate-800/80 border-blue-500/50 shadow-inner'
                        : l.visible
                            ? isFoundation
                                ? 'bg-emerald-950/20 border-emerald-500/20 hover:bg-emerald-900/30'
                                : 'bg-slate-800/30 border-transparent hover:bg-slate-800/50'
                            : 'bg-transparent border-transparent hover:bg-slate-800/20'
                    }`}
            >
                <div className="flex items-center py-1 px-1.5 space-x-1">
                    {/* Visibility Toggle */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (e.ctrlKey && l.category === 'technical') {
                                editor?.setLayerSolo(l.id);
                            } else {
                                editor?.setLayerVisible(l.id, !l.visible);
                            }
                        }}
                        className={`w-6 h-6 flex items-center justify-center rounded transition-all`}
                        title={l.category === 'technical' ? "Click to toggle, Ctrl+Click for Solo Focus" : (l.visible ? "Hide Layer" : "Show Layer")}
                    >
                        <div className={`w-2.5 h-2.5 border rounded transition-all ${l.visible
                            ? isFoundation ? 'bg-emerald-400 border-emerald-400' : 'bg-blue-400 border-blue-400'
                            : 'bg-transparent border-slate-600'
                            }`} />
                    </button>

                    <div className="flex-1 min-w-0 px-1 cursor-pointer" onClick={(e) => {
                        if (e.ctrlKey && l.category === 'technical') {
                            editor?.setLayerSolo(l.id);
                            return;
                        }
                        if (selectedIds.includes(l.id)) {
                            setSelectedIds(prev => prev.filter(id => id !== l.id));
                        } else {
                            setSelectedIds(prev => [...prev, l.id]);
                        }
                    }}>
                        <div className={`text-[10px] font-bold truncate leading-tight ${l.visible
                            ? (isActive ? 'text-red-400' : isFoundation ? 'text-emerald-300' : 'text-slate-100')
                            : 'text-slate-600'}`}>
                            {l.name}
                        </div>
                        {l.id === 'lighting' && (
                            <div className="flex items-center space-x-2 mt-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const current = lightingMode;
                                        const next = current === 'circles' ? 'intensity' : (current === 'intensity' ? 'fixture' : 'circles');
                                        editor?.layerSystem.setLightingMode(next);
                                        setLightingMode(next);
                                    }}
                                    className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-[7px] text-blue-400 font-bold uppercase tracking-tighter"
                                >
                                    Mode: {lightingMode}
                                </button>
                                <div className="text-[7px] text-slate-500 font-mono italic">
                                    {lightingMode === 'circles' && 'Circles Only'}
                                    {lightingMode === 'intensity' && 'Heatmap + Stats'}
                                    {lightingMode === 'fixture' && 'Fixture Only'}
                                </div>
                            </div>
                        )}
                        <div className="text-[8px] text-slate-500 font-mono uppercase tracking-tighter leading-tight flex justify-between items-center">
                            <span>{(l.opacity * 100).toFixed(0)}% • Z:{l.zIndex}</span>
                            {l.locked && <span className="text-[7px] text-slate-700">LOCKED</span>}
                        </div>
                    </div>

                    {/* Shimmy/Edit button */}
                    {l.allowLayerEditing === true && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                editor?.setActiveLayer(l.id, false, true);
                            }}
                            className={`w-10 h-5 flex items-center justify-center rounded transition-all text-[8px] font-bold ${activeLayerId === l.id && editor?.isOverlayAlignmentMode
                                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                                : 'text-slate-600 hover:text-slate-400 hover:bg-slate-700'
                                }`}
                            title="Shimmy Overlay"
                        >
                            SHIMMY
                        </button>
                    )}

                    {selectedIds.includes(l.id) && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    )}
                </div>

                {/* Expanded Controls */}
                {selectedIds.includes(l.id) && (
                    <div className="px-4 pb-4 pt-2 space-y-4 border-t border-slate-700/50 mt-1">
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
        );
    };

    return (
        <div className="w-60 bg-slate-900 border-l border-slate-800 flex flex-col z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.3)]">
            {/* Header - Auto-hide when panel is collapsed (AUTO-ULTIMATE-POLISH-P25) */}
            {isLocked && (
                <div className="p-4 border-b border-slate-800 transition-all duration-300 animate-in fade-in slide-in-from-top-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Controls</h3>
                <div className="grid grid-cols-3 gap-1">
                    <button
                        onClick={() => handleQuickAction('base')}
                        className="px-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-[8px] font-bold rounded border border-slate-700 text-slate-300"
                        title="Show only Base and Masking"
                    >
                        [BASE]
                    </button>
                    <button
                        onClick={() => handleQuickAction('context')}
                        className="px-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-[8px] font-bold rounded border border-slate-700 text-slate-300"
                        title="Show all Foundational layers"
                    >
                        [CONTEXT]
                    </button>
                    <button
                        onClick={() => handleQuickAction('clear')}
                        className="px-1 py-1.5 bg-slate-800 hover:bg-red-900/30 text-[8px] font-bold rounded border border-slate-700 text-slate-400"
                        title="Hide all Device data"
                    >
                        [CLEAR]
                    </button>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/50">
                    <div className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Debug</div>
                    <button
                        onClick={() => {
                            const newValue = !zoomCursorEnabled;
                            editor?.cameraSystem.setZoomCursorEnabled(newValue);
                            setZoomCursorEnabled(newValue);
                        }}
                        className={`w-full px-2 py-1.5 text-[8px] font-bold rounded border transition-colors ${
                            zoomCursorEnabled
                                ? 'bg-blue-900/40 border-blue-500/50 text-blue-400 hover:bg-blue-900/60'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                        }`}
                        title="Toggle Zoom Cursor (Magnified Viewport)"
                    >
                        {zoomCursorEnabled ? '✓ ZOOM CURSOR' : 'ZOOM CURSOR OFF'}
                    </button>
                </div>
            </div>
            )}

            {/* Layer Stack */}
            <div className="flex-1 overflow-y-auto bg-slate-950/50 pb-20">
                {technicalLayers.length > 0 && (
                    <div className="mt-2">
                        <div className="px-3 py-1 text-[8px] font-bold text-blue-500/50 uppercase tracking-tighter">Technical Systems</div>
                        <div className="px-2">{technicalLayers.map(renderLayerItem)}</div>
                    </div>
                )}

                {utilityLayers.length > 0 && (
                    <div className="mt-4">
                        <div className="px-3 py-1 text-[8px] font-bold text-slate-500/50 uppercase tracking-tighter">Utility</div>
                        <div className="px-2">{utilityLayers.map(renderLayerItem)}</div>
                    </div>
                )}

                {foundationLayers.length > 0 && (
                    <div className="mt-4">
                        <div className="px-3 py-1 text-[8px] font-bold text-emerald-500/50 uppercase tracking-tighter">Foundation</div>
                        <div className="px-2">{foundationLayers.map(renderLayerItem)}</div>
                    </div>
                )}
            </div>

            {/* Properties Footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800">
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 flex justify-between">
                    <span>Properties</span>
                    <span className="text-slate-700 font-mono text-[8px] italic">Tab-Sync Active</span>
                </div>
                {selectedIds.length > 0 ? (
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-[10px] text-slate-500">Selection</span>
                            <span className="text-[10px] text-blue-400 font-mono">{selectedIds.length} Object{selectedIds.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                            <span className="text-slate-500">Active Tool</span>
                            <span className="text-blue-500 font-bold uppercase">{activeTool}</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-[10px] italic text-slate-700">No selection</div>
                )}

                {/* Project Export/Import */}
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                    <button
                        onClick={handleExportProject}
                        className="w-full px-3 py-2 bg-blue-900/30 hover:bg-blue-800/50 border border-blue-700/50 rounded text-[10px] font-bold text-blue-400 uppercase tracking-wide transition-all"
                        title="Download project as JSON file"
                    >
                        Export Project
                    </button>
                    <label className="block">
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleImportProject}
                            className="hidden"
                            id="import-project-file"
                        />
                        <span
                            className="block w-full px-3 py-2 bg-orange-900/30 hover:bg-orange-800/50 border border-orange-700/50 rounded text-[10px] font-bold text-orange-400 uppercase tracking-wide transition-all cursor-pointer text-center"
                            title="Load project from JSON file (overwrites current data)"
                        >
                            Import Project
                        </span>
                    </label>
                </div>
            </div>
        </div>
    );
});
