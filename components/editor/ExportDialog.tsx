import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, FileDown, Layers, FileText, Loader2, Printer } from 'lucide-react';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';
import { PAPER_SIZES, ExportDocument } from '../../src/services/PDFService';
import { pdf } from '@react-pdf/renderer';
import { dataService } from '../../src/services/DataService';

interface ExportDialogProps {
    editor: FloorPlanEditor | null;
    onClose: () => void;
    autoStart?: boolean;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ editor, onClose, autoStart }) => {
    // --- LOCAL STATE (Transient UI State) ---
    const [paperSize, setPaperSize] = useState<keyof typeof PAPER_SIZES>('ARCH_D');
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [exportType, setExportType] = useState<'combined' | 'layers'>('combined');
    const [selectedLayers, setSelectedLayers] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    // Tracks if we've successfully initialized from server or editor
    const [isHydrated, setIsHydrated] = useState(false);
    const hasStartedRef = useRef(false);
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // --- SYSTEM CONTEXT: SYNC FROM SERVER (DRY) ---
    const hydrateFromProject = useCallback(() => {
        const project = dataService.getCachedProject();
        if (!project) return false;

        const settings = project.settings?.exportSettings;
        if (settings) {
            if (settings.paperSize) setPaperSize(settings.paperSize as any);
            if (settings.orientation) setOrientation(settings.orientation as any);
            if (settings.exportType) setExportType(settings.exportType as any);
            if (settings.selectedLayers) setSelectedLayers(settings.selectedLayers);
            setIsHydrated(true);
            return true;
        }
        return false;
    }, []);

    // Initial hydration or fallback to editor
    useEffect(() => {
        if (!editor) return;

        // Try server first
        const success = hydrateFromProject();

        // If no server settings exist yet, use current editor state as baseline
        if (!success && !isHydrated) {
            const currentVisible = editor.layerSystem.getAllLayers()
                .filter(l => l.visible && l.id !== 'grid' && l.id !== 'labels')
                .map(l => l.id);
            setSelectedLayers(currentVisible);
            setIsHydrated(true);
        }

        // Listen for project data updates (Cross-tab or Reload sync)
        const onProjectChange = (e: any) => {
            // Only re-hydrate if the change was external (another tab) 
            // to avoid overwriting current local user interaction
            if (e.detail?.external) {
                hydrateFromProject();
            }
        };

        window.addEventListener('project-data-changed', onProjectChange);
        return () => window.removeEventListener('project-data-changed', onProjectChange);
    }, [editor, hydrateFromProject, isHydrated]);

    // --- SERVER PERSISTENCE: DEBOUNCED WRITETHROUGH ---
    const persistSettings = useCallback((updates: any) => {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

        syncTimeoutRef.current = setTimeout(async () => {
            const project = dataService.getCachedProject();
            if (!project) return;

            const newSettings = {
                ...project.settings,
                exportSettings: {
                    ...(project.settings.exportSettings || {}),
                    paperSize,
                    orientation,
                    exportType,
                    selectedLayers,
                    ...updates
                }
            };

            try {
                // DRY: Update the standardized project settings object
                await dataService.updateSettings(newSettings);
                console.log('✅ Export preferences synced to server.');
            } catch (e) {
                console.error('Failed to persist export settings:', e);
            }
        }, 1000); // 1s debounce to prevent race conditions during rapid clicking
    }, [paperSize, orientation, exportType, selectedLayers]);

    // --- UI EVENT HANDLERS ---

    // Auto-start (Deep Links)
    useEffect(() => {
        if (autoStart && editor && !hasStartedRef.current) {
            hasStartedRef.current = true;
            // Force reset to visible in deep link scenario
            const currentVisible = editor.layerSystem.getAllLayers()
                .filter(l => l.visible && l.id !== 'grid' && l.id !== 'labels')
                .map(l => l.id);
            setSelectedLayers(currentVisible);
        }
    }, [autoStart, !!editor]);

    // Escape listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const resetToVisible = () => {
        if (!editor) return;
        const currentVisible = editor.layerSystem.getAllLayers()
            .filter(l => l.visible && l.id !== 'grid' && l.id !== 'labels')
            .map(l => l.id);
        setSelectedLayers(currentVisible);
        persistSettings({ selectedLayers: currentVisible });
    };

    const handleExport = async () => {
        if (!editor) return;
        setIsGenerating(true);

        // Ensure current state is saved before proceeding
        await persistSettings({});

        try {
            const projectData = dataService.getCachedProject();
            const [v1, v2] = PAPER_SIZES[paperSize];
            const actualWidthPt = orientation === 'landscape' ? Math.max(v1, v2) : Math.min(v1, v2);
            const actualHeightPt = orientation === 'landscape' ? Math.min(v1, v2) : Math.max(v1, v2);

            const scaleFactor = 150 / 72;
            const pxWidth = Math.round(actualWidthPt * scaleFactor);
            const pxHeight = Math.round(actualHeightPt * scaleFactor);

            const imageData = await editor.captureHighResImage(pxWidth, pxHeight, selectedLayers);

            const projectInfo = {
                name: projectData?.metadata.name || 'Untitled Project',
                location: (projectData?.metadata as any).address || '270 Bolla Ave, Palo Alto',
                date: new Date().toLocaleDateString(),
                revision: '1.0',
                scaleTxt: 'NOT TO SCALE (N.T.S.)'
            };

            const doc = <ExportDocument
                image={imageData}
                projectInfo={projectInfo}
                pageTitle={exportType === 'combined' ? 'Combined Electrical Layout' : 'Layer Specific Layout'}
                paperSize={paperSize}
                orientation={orientation}
            />;

            const blob = await pdf(doc).toBlob();

            // Archive to server
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64data = (reader.result as string).split(',')[1];
                const projectId = window.location.pathname.split('/').pop() || 'unknown';
                const filename = `${projectInfo.name.replace(/\s+/g, '_')}_${paperSize}_${Date.now()}.pdf`;

                await fetch(`/api/export-pdf/${projectId}?filename=${filename}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: base64data })
                });
            };

            // Download in browser
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${projectInfo.name.replace(/\s+/g, '_')}_${paperSize}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            onClose();
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to generate PDF.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300 p-4">
            <div className="bg-slate-900 border border-slate-700 w-[500px] max-h-[90vh] flex flex-col rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                            <Printer className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white leading-tight">Export Drawing</h2>
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Architectural PDF Generator</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors group">
                        <X className="w-5 h-5 text-slate-400 group-hover:text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0 bg-slate-900/50">
                    <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                        <button
                            onClick={() => { setExportType('combined'); persistSettings({ exportType: 'combined' }); }}
                            className={`p-4 rounded-xl border transition-all text-left flex flex-col gap-2 ${exportType === 'combined' ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-800 border-slate-700'}`}
                        >
                            <FileText className="w-4 h-4 text-blue-400" />
                            <span>Combined Plan</span>
                        </button>
                        <button disabled className="p-4 rounded-xl border border-slate-800/50 bg-slate-900 opacity-40 cursor-not-allowed text-left flex flex-col gap-2">
                            <Layers className="w-4 h-4 text-slate-600" />
                            <span>Set Layout</span>
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Included Layers</label>
                            <button onClick={resetToVisible} className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase">Use Current View</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {editor?.layerSystem.getAllLayers().filter(l => l.id !== 'grid' && l.id !== 'labels').map((layer) => (
                                <button
                                    key={layer.id}
                                    onClick={() => {
                                        const next = selectedLayers.includes(layer.id)
                                            ? selectedLayers.filter(id => id !== layer.id)
                                            : [...selectedLayers, layer.id];
                                        setSelectedLayers(next);
                                        persistSettings({ selectedLayers: next });
                                    }}
                                    className={`px-3 py-2 rounded-lg border text-[11px] font-bold transition-all truncate ${selectedLayers.includes(layer.id) ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                                >
                                    {layer.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Orientation & Paper</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['landscape', 'portrait'].map(o => (
                                <button
                                    key={o}
                                    onClick={() => { setOrientation(o as any); persistSettings({ orientation: o }); }}
                                    className={`px-4 py-3 rounded-lg border text-left transition-all ${orientation === o ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                >
                                    <span className="block font-bold capitalize text-xs">{o}</span>
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {['ARCH_D', 'ARCH_E'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => { setPaperSize(s as any); persistSettings({ paperSize: s }); }}
                                    className={`px-4 py-3 rounded-lg border text-left transition-all ${paperSize === s ? 'bg-slate-100 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                >
                                    <span className="block font-bold text-[11px]">{s === 'ARCH_D' ? '36"x24" (D)' : '48"x36" (E)'}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-5 bg-slate-950 border-t border-slate-800 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-5 py-2 text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">Cancel</button>
                    <button
                        onClick={handleExport}
                        disabled={isGenerating}
                        className={`flex items-center gap-2 px-8 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${isGenerating ? 'bg-blue-600/50 text-white/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg active:scale-95'}`}
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-5 h-5" />}
                        {isGenerating ? 'Generating...' : 'Generate PDF'}
                    </button>
                </div>
            </div>
        </div>
    );
};
