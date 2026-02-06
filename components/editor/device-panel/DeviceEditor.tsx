import React from 'react';
import { Target, Box, ChevronLeft, ChevronRight, Save, Trash2, Cpu, Activity, Lightbulb, Zap, ArrowLeftRight, Settings2, Copy, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SYMBOL_LIBRARY } from '../../../editor/models/symbolLibrary';
import { getSpecBuilder } from './SpecBuilderRegistry';
import catalog from '../../../catalog.json';
import { AmpereEngine } from '../../../src/services/AmpereEngine';
import { CatalogV2 } from '../../../src/models/Blueprint';
import { SymbolIcon } from '../SymbolIcon';

interface DeviceEditorProps {
    editingDevice: any;
    formData: any;
    draftMetadata: any;
    onFieldChange: (field: string, value: any) => void;
    setDraftMetadata: (metadata: any) => void;
    onSwap: () => void;
    onUpdateType: (newTypeId: string) => void;
    onClearSelection: () => void;
    onSaveNewType: () => void;
    onUpdateGlobal: () => void;
    unitPreference: 'IMPERIAL' | 'METRIC';
    devices: any[];
}

export const DeviceEditor: React.FC<DeviceEditorProps> = ({
    editingDevice,
    formData,
    draftMetadata,
    onFieldChange,
    setDraftMetadata,
    onSwap,
    onUpdateType,
    onClearSelection,
    onSaveNewType,
    onUpdateGlobal,
    unitPreference,
    devices
}) => {
    const navigate = useNavigate();
    const [isGeneralExpanded, setIsGeneralExpanded] = React.useState(true);
    const [isPlacementExpanded, setIsPlacementExpanded] = React.useState(true);
    const [isConfigExpanded, setIsConfigExpanded] = React.useState(true);

    const catalogV2 = catalog as any as CatalogV2;
    const blueprint = catalogV2.blueprints.find(bp => bp.id === editingDevice.deviceTypeId);

    // Calculate Loads (AUTO-POWER-P28)
    const { circuits, buses } = AmpereEngine.calculateLoads(devices, catalogV2);
    const circuitLoad = circuits.find(c => c.id === editingDevice.lcpAssignment || (editingDevice.lcpAssignment === null && c.id === 'Unassigned'));
    const busLoad = buses.find(b => b.id === editingDevice.busAssignment || (editingDevice.busAssignment === null && b.id === 'Unassigned'));

    // Helper to check if an ID is 'generic'
    const isGeneric = (id: string | null | undefined) => !id || id === 'generic-product' || id === 'generic-light' || id === 'generic-switch';

    const effectiveProductId =
        (!isGeneric(formData.productId) ? formData.productId : null) ||
        (!isGeneric(editingDevice.productId) ? editingDevice.productId : null) ||
        (!isGeneric(editingDevice.metadata?.productId) ? editingDevice.metadata.productId : null) ||
        (!isGeneric(SYMBOL_LIBRARY[editingDevice.deviceTypeId]?.productId) ? SYMBOL_LIBRARY[editingDevice.deviceTypeId].productId : null) ||
        (!isGeneric((SYMBOL_LIBRARY[editingDevice.deviceTypeId] as any)?.metadata?.productId) ? (SYMBOL_LIBRARY[editingDevice.deviceTypeId] as any).metadata.productId : null) ||
        editingDevice.productId; // Final fallback

    // Attempt to find in catalog (Case Insensitive)
    const catalogProduct = (catalogV2.registry.loads as any[]).find(p =>
        (p.id || '').toLowerCase() === (effectiveProductId || '').toLowerCase()
    ) || (catalogV2.blueprints as any[]).find(bp =>
        (bp.id || '').toLowerCase() === (effectiveProductId || '').toLowerCase()
    );

    const product = catalogProduct || (effectiveProductId && !isGeneric(effectiveProductId) ? {
        id: effectiveProductId,
        name: `${effectiveProductId} (Unknown)`,
        manufacturer: 'Unknown',
        type: 'LIGHTING'
    } as any : undefined);

    const SpecBuilder = getSpecBuilder(product);

    // Filter catalog for relevant items
    const catalogOptions = React.useMemo(() => {
        return [...catalogV2.registry.loads].sort((a, b) => (a.manufacturer + a.name).localeCompare(b.manufacturer + b.name));
    }, [catalogV2]);

    return (
        <div className="p-2 space-y-2 pb-20 overflow-y-auto h-full custom-scrollbar bg-slate-900/40">
            {/* Header - ultra compact */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-700/50 sticky top-0 bg-slate-950 z-20 px-1">
                <h3 className="text-[12px] font-black text-white truncate max-w-[220px] uppercase tracking-tight">{editingDevice.name}</h3>
                <button
                    onClick={onClearSelection}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700 group"
                    title="Close Panel (Deselect)"
                >
                    <X size={16} className="opacity-70 group-hover:opacity-100" />
                </button>
            </div>

            {/* SECTION 1: IDENTITY & MASTER ACTIONS */}
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="flex gap-3 items-center relative z-10">
                    <div className="w-12 h-12 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center shrink-0 shadow-inner">
                        <SymbolIcon
                            symbolType={editingDevice.deviceTypeId}
                            color="#3b82f6"
                            size={42}
                            showShorthand={false}
                            meshType={SYMBOL_LIBRARY[editingDevice.deviceTypeId]?.meshType}
                            metadata={editingDevice.metadata}
                            rotation={0}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 max-w-full">
                            <h2 className="text-[13px] font-black text-white leading-none uppercase tracking-tighter truncate">
                                {SYMBOL_LIBRARY[editingDevice.deviceTypeId]?.name || editingDevice.deviceTypeId}
                            </h2>
                        </div>
                        <div className="mt-1.5 flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[8px] text-sky-400 uppercase font-black tracking-widest shrink-0 w-8">Model</span>
                                <span className="text-[10px] text-white font-bold truncate">{product?.name || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[8px] text-sky-400 uppercase font-black tracking-widest shrink-0 w-8">Make</span>
                                <span className="text-[10px] text-slate-300 font-bold truncate">{product?.manufacturer || 'Generic'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TYPE ACTIONS - Condensed Grid */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 relative z-10">
                    <ActionButton
                        onClick={onSwap}
                        icon={<ArrowLeftRight size={11} />}
                        label="Swap"
                        variant="blue"
                    />
                    <ActionButton
                        onClick={onUpdateGlobal}
                        icon={<Settings2 size={11} />}
                        label="Edit All"
                        variant="slate"
                    />
                    <ActionButton
                        onClick={onSaveNewType}
                        icon={<Copy size={11} />}
                        label="Clone"
                        variant="slate"
                    />
                </div>
            </div>

            {/* SECTION 2: INSTANCE OVERRIDES (Editable) */}
            <div className="bg-slate-950 rounded-xl p-3 border border-blue-500/30 shadow-lg space-y-2.5">
                <div className="flex items-center gap-2 mb-0.5">
                    <Target size={11} className="text-blue-400" />
                    <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Instance Context</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        <label className="text-[8px] text-sky-300 uppercase font-black shrink-0">Hgt ({unitPreference === 'IMPERIAL' ? 'ft' : 'm'})</label>
                        <input
                            type="text"
                            value={formData.installationHeight || ''}
                            onChange={(e) => onFieldChange('installationHeight', e.target.value)}
                            className="bg-transparent text-[11px] text-white font-black font-mono w-full text-right focus:outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        <label className="text-[8px] text-sky-300 uppercase font-black shrink-0">Deg</label>
                        <div className="flex-1 flex items-center min-w-0">
                            <input
                                type="range"
                                min="0"
                                max="360"
                                value={formData.rotation || 0}
                                onChange={(e) => onFieldChange('rotation', parseInt(e.target.value))}
                                className="flex-1 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-500"
                            />
                            <span className="text-[10px] text-emerald-400 font-black font-mono ml-2 shrink-0">{formData.rotation}°</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-900 px-2 py-1.5 rounded border border-slate-800 group focus-within:border-blue-500/50">
                    <label className="text-[8px] text-sky-300 uppercase font-black shrink-0">Label / UID</label>
                    <input
                        type="text"
                        value={formData.label || formData.name || ''}
                        onChange={(e) => {
                            onFieldChange('label', e.target.value);
                            onFieldChange('name', e.target.value);
                        }}
                        className="bg-transparent text-[11px] text-white font-black font-mono w-full text-right focus:outline-none placeholder:text-slate-600"
                        placeholder="Instance ID (e.g. LCP-1)..."
                    />
                </div>

                <div className="flex items-center gap-2 bg-slate-900 px-2 py-1.5 rounded border border-slate-800 group focus-within:border-blue-500/50">
                    <label className="text-[8px] text-sky-300 uppercase font-black shrink-0">Phase</label>
                    <input
                        type="text"
                        value={formData['metadata.phase'] || editingDevice.metadata?.phase || ''}
                        onChange={(e) => onFieldChange('metadata.phase', e.target.value)}
                        className="bg-transparent text-[11px] text-white font-black font-mono w-full text-right focus:outline-none placeholder:text-slate-600"
                        placeholder="Phase 1, 2, 3..."
                    />
                </div>

                <div className="flex items-center gap-2 bg-slate-900 px-2 py-1.5 rounded border border-blue-500/50 group">
                    <label className="text-[8px] text-blue-400 uppercase font-black shrink-0">Instance UID</label>
                    <input
                        type="text"
                        value={formData['metadata.instanceLabel'] || editingDevice.metadata?.instanceLabel || ''}
                        onChange={(e) => onFieldChange('metadata.instanceLabel', e.target.value)}
                        className="bg-transparent text-[11px] text-amber-400 font-black font-mono w-full text-right focus:outline-none placeholder:text-slate-700"
                        placeholder="e.g. SUB1, INV2..."
                    />
                </div>
            </div>


            {/* NEW SECTION: BLUEPRINT SUMMARY & POWER */}
            <CollapsibleSection
                title="System Connectivity"
                isExpanded={isPlacementExpanded}
                toggle={() => setIsPlacementExpanded(!isPlacementExpanded)}
                icon={<Activity className="w-3.5 h-3.5 text-emerald-400" />}
            >
                <div className="p-2.5 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 flex items-center justify-between gap-2 overflow-hidden">
                            <span className="text-[8px] text-sky-400 uppercase font-black shrink-0">Circ</span>
                            <div className="flex flex-col items-end min-w-0">
                                <span className="text-[10px] text-white font-black font-mono truncate w-full text-right">{editingDevice.lcpAssignment || 'NONE'}</span>
                                <span className={`text-[9px] font-black font-mono leading-none ${circuitLoad?.isOverloaded ? 'text-rose-500' : 'text-emerald-400'}`}>
                                    {circuitLoad?.totalAmps.toFixed(2) || '0.00'}A
                                </span>
                            </div>
                        </div>

                        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 flex items-center justify-between gap-2 overflow-hidden">
                            <span className="text-[8px] text-sky-400 uppercase font-black shrink-0">Bus</span>
                            <div className="flex flex-col items-end min-w-0">
                                <span className="text-[10px] text-white font-black font-mono truncate w-full text-right">{editingDevice.busAssignment || 'NONE'}</span>
                                <span className={`text-[9px] font-black font-mono leading-none ${busLoad?.isOverloaded ? 'text-rose-500' : 'text-blue-400'}`}>
                                    {busLoad?.totalMa || 0}mA
                                </span>
                            </div>
                        </div>
                    </div>

                    {blueprint && (
                        <div className="mt-1 pt-2 border-t border-slate-800/50">
                            <div className="flex flex-wrap gap-1.5">
                                {Array.isArray(blueprint.components) ? (
                                    // MODULAR SYSTEM (New)
                                    blueprint.components.map((comp: any) => (
                                        <ComponentTag
                                            key={comp.productId}
                                            icon={<Box size={9} />}
                                            id={comp.productId}
                                            color="emerald"
                                        />
                                    ))
                                ) : (
                                    // LEGACY SYSTEM
                                    <>
                                        {blueprint.components.loadId && (
                                            <ComponentTag icon={<Lightbulb size={9} />} id={blueprint.components.loadId} color="pink" />
                                        )}
                                        {blueprint.components.driverId && (
                                            <ComponentTag icon={<Zap size={9} />} id={blueprint.components.driverId} color="amber" />
                                        )}
                                        {(blueprint.components.logicIds || []).map((lid: string) => (
                                            <ComponentTag key={lid} icon={<Cpu size={9} />} id={lid} color="emerald" />
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </CollapsibleSection>

            {/* SECTION: INFRASTRUCTURE METADATA (AUTO-LABELS-P28) */}
            {SYMBOL_LIBRARY[editingDevice.deviceTypeId]?.category === 'infrastructure' && (
                <CollapsibleSection
                    title="Electrical Info"
                    isExpanded={true}
                    toggle={() => { }}
                    icon={<Zap className="w-3.5 h-3.5 text-amber-500" />}
                >
                    <div className="p-2.5 space-y-2">
                        <div className="flex items-center gap-2 bg-slate-950/60 px-2 py-1.5 rounded border border-slate-800">
                            <label className="text-[8px] text-amber-500 uppercase font-black shrink-0">Panel Name</label>
                            <input
                                type="text"
                                value={formData['metadata.panelName'] || editingDevice.metadata?.panelName || ''}
                                onChange={(e) => onFieldChange('metadata.panelName', e.target.value)}
                                className="bg-transparent text-[10px] text-white font-black font-mono w-full text-right focus:outline-none"
                                placeholder="e.g. Main Service"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-slate-950/60 px-2 py-1.5 rounded border border-slate-800">
                            <label className="text-[8px] text-blue-400 uppercase font-black shrink-0">Part #</label>
                            <input
                                type="text"
                                value={formData['metadata.partNumber'] || editingDevice.metadata?.partNumber || ''}
                                onChange={(e) => onFieldChange('metadata.partNumber', e.target.value)}
                                className="bg-transparent text-[10px] text-white font-black font-mono w-full text-right focus:outline-none"
                                placeholder="Manufacturer Part #"
                            />
                        </div>
                    </div>
                </CollapsibleSection>
            )}

            {/* SECTION 3: SPECIFICATION */}
            <CollapsibleSection
                title="Device Specification"
                isExpanded={isConfigExpanded}
                toggle={() => setIsConfigExpanded(!isConfigExpanded)}
                icon={<Box className="w-3.5 h-3.5 text-blue-300" />}
            >
                <div className="p-3 space-y-4">
                    <div className="text-[10px] text-slate-300 font-black flex justify-between items-center uppercase tracking-widest pb-2 border-b border-slate-800">
                        <span className="truncate pr-4">{product?.name || "Generic Hardware"}</span>
                        <div className="flex gap-1">
                            {SpecBuilder && (
                                <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded leading-none">
                                    LOGIC ACTIVE
                                </span>
                            )}
                        </div>
                    </div>

                    {SpecBuilder ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
                            <div className="p-3 bg-slate-900/50 rounded-lg border border-blue-500/20">
                                <SpecBuilder
                                    deviceId={editingDevice.id}
                                    initialMetadata={draftMetadata || editingDevice.metadata || {}}
                                    onChange={setDraftMetadata}
                                />
                            </div>

                            <button
                                onClick={() => navigate('/registry')}
                                className="w-full group flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 transition-all text-slate-400 hover:text-white"
                            >
                                <div className="flex flex-col text-left">
                                    <span className="text-[7px] uppercase font-black">Global Registry</span>
                                    <span className="text-[9px] font-bold">Manage Hardware Defaults</span>
                                </div>
                                <ExternalLink size={14} className="opacity-50 group-hover:opacity-100" />
                            </button>
                        </div>
                    ) : (
                        <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">No Advanced Logic for this Item</span>
                        </div>
                    )}
                </div>
            </CollapsibleSection>
        </div>
    );
};

const ComponentTag: React.FC<{ icon: React.ReactNode; id: string; color: 'pink' | 'amber' | 'emerald' }> = ({ icon, id, color }) => {
    const colors = {
        pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
        amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    };

    return (
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-black truncate max-w-[120px] ${colors[color]}`}>
            {icon}
            <span className="truncate uppercase tracking-tighter">{id}</span>
        </div>
    );
};

const ActionButton: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string; variant: 'blue' | 'slate' | 'emerald' }> = ({ onClick, icon, label, variant }) => {
    const variants = {
        blue: 'bg-blue-600/20 text-blue-300 border-blue-500/50 hover:bg-blue-600/40 hover:border-blue-400 hover:text-white shadow-lg shadow-blue-900/20',
        slate: 'bg-slate-800/60 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-slate-500 hover:text-white',
        emerald: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-600/40 hover:border-emerald-400 hover:text-white shadow-lg shadow-emerald-900/20'
    };

    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all duration-150 ${variants[variant]}`}
        >
            <div className="shrink-0">{icon}</div>
            <span className="leading-none">{label}</span>
        </button>
    );
};

const CollapsibleSection: React.FC<{
    title: string;
    isExpanded: boolean;
    toggle: () => void;
    children: React.ReactNode;
    icon?: React.ReactNode;
}> = ({ title, isExpanded, toggle, children, icon }) => (
    <div className="border border-slate-800 rounded-xl bg-slate-900/80 overflow-hidden shadow-sm">
        <button
            onClick={toggle}
            className="w-full flex items-center justify-between p-3 bg-slate-800/40 hover:bg-slate-700/60 transition-colors border-b border-slate-800"
        >
            <div className="flex items-center gap-2.5">
                {icon}
                <span className="text-[10px] text-white uppercase font-black tracking-widest leading-none">{title}</span>
            </div>
            {isExpanded ? <ChevronLeft className="w-3.5 h-3.5 text-slate-400 -rotate-90" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />}
        </button>
        {isExpanded && <div className="animate-in fade-in slide-in-from-top-1 duration-200">{children}</div>}
    </div>
);
