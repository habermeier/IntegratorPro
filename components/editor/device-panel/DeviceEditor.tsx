import React from 'react';
import { Target, Box, ChevronLeft, ChevronRight, Save, Trash2, Cpu, Activity, Lightbulb, Zap } from 'lucide-react';
import { SYMBOL_LIBRARY } from '../../../editor/models/symbolLibrary';
import { getSpecBuilder } from './SpecBuilderRegistry';
import catalog from '../../../catalog.json';
import { AmpereEngine } from '../../../src/services/AmpereEngine';
import { CatalogV2 } from '../../../src/models/Blueprint';

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
    const catalogProduct = catalogV2.registry.loads.find(p =>
        p.id.toLowerCase() === effectiveProductId?.toLowerCase()
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
        <div className="p-3 space-y-3 pb-20 overflow-y-auto h-full custom-scrollbar">
            {/* Header - Compact */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
                <div className="flex flex-col">
                    <span className="text-[7px] text-slate-500 uppercase font-black">Currently Selecting</span>
                    <h3 className="text-[11px] font-black text-slate-100 truncate w-32">{editingDevice.name}</h3>
                </div>
                <button
                    onClick={onClearSelection}
                    className="text-[9px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors uppercase font-bold border border-slate-600"
                >
                    Done
                </button>
            </div>

            {/* SECTION 1: IDENTITY (Read Only unless instance override) */}
            <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800 space-y-3">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <label className="text-[7px] text-slate-500 uppercase font-black">Master Device Type</label>
                        <div className="flex items-center gap-2">
                            <span className="text-[12px] font-black text-blue-300">{SYMBOL_LIBRARY[editingDevice.deviceTypeId]?.name || editingDevice.deviceTypeId}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <label className="text-[7px] text-slate-500 uppercase font-black px-1">Symbol</label>
                        <div className="w-8 h-8 bg-slate-900 rounded border border-slate-700 flex items-center justify-center">
                            {/* Symbol Preview Placeholder */}
                            <Box size={16} className="text-slate-500" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-slate-800/50">
                    <div>
                        <label className="text-[7px] text-slate-500 uppercase font-black">Manufacturer</label>
                        <p className="text-[10px] font-bold text-slate-300 truncate">{product?.manufacturer || 'Generic'}</p>
                    </div>
                    <div>
                        <label className="text-[7px] text-slate-500 uppercase font-black">Model / Catalog</label>
                        <p className="text-[10px] font-bold text-slate-300 truncate">{product?.name || 'N/A'}</p>
                    </div>
                </div>

                {/* TYPE ACTIONS */}
                <div className="flex gap-1.5 pt-2">
                    <button
                        onClick={onSwap}
                        className="flex-1 py-1 px-2 bg-slate-800 hover:bg-slate-700 rounded text-[8px] font-bold uppercase text-slate-300 border border-slate-700 transition-all hover:border-blue-500/50"
                    >
                        Swap
                    </button>
                    <button
                        onClick={onUpdateGlobal}
                        className="flex-1 py-1 px-2 bg-slate-800 hover:bg-slate-700 rounded text-[8px] font-bold uppercase text-slate-300 border border-slate-700 transition-all hover:border-blue-500/50"
                    >
                        Edit All
                    </button>
                    <button
                        onClick={onSaveNewType}
                        className="flex-1 py-1 px-2 bg-slate-800 hover:bg-slate-700 rounded text-[8px] font-bold uppercase text-slate-300 border border-slate-700 transition-all hover:border-emerald-500/50"
                    >
                        Clone
                    </button>
                </div>
            </div>

            {/* SECTION 2: INSTANCE OVERRIDES (Editable) */}
            <div className="bg-slate-800/30 rounded-lg p-3 border border-blue-500/20 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                    <Target size={10} className="text-blue-400" />
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">Instance Properties</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[8px] text-slate-400 uppercase font-black block mb-1">Floor Offset ({unitPreference === 'IMPERIAL' ? 'ft' : 'm'})</label>
                        <input
                            type="text"
                            value={formData.installationHeight || ''}
                            onChange={(e) => onFieldChange('installationHeight', e.target.value)}
                            className="w-full text-[11px] text-slate-100 font-bold font-mono px-2 py-1.5 bg-slate-950 rounded border border-slate-600 focus:border-blue-400 focus:outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-[8px] text-slate-400 uppercase font-black block mb-1">Rotation</label>
                        <div className="flex items-center gap-2 h-8">
                            <input
                                type="range"
                                min="0"
                                max="360"
                                value={formData.rotation || 0}
                                onChange={(e) => onFieldChange('rotation', parseInt(e.target.value))}
                                className="flex-1 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                            />
                            <span className="text-[9px] text-slate-200 font-mono w-6 text-right leading-none">{formData.rotation}°</span>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-[8px] text-slate-400 uppercase font-black block mb-1">Custom UID / Label</label>
                    <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => onFieldChange('name', e.target.value)}
                        className="w-full text-[11px] text-slate-100 font-bold font-mono px-2 py-1.5 bg-slate-950 rounded border border-slate-600 focus:border-blue-400 focus:outline-none transition-colors"
                        placeholder="Instance unique name..."
                    />
                </div>
            </div>


            {/* NEW SECTION: BLUEPRINT SUMMARY & POWER */}
            <CollapsibleSection
                title="System Connectivity"
                isExpanded={isPlacementExpanded}
                toggle={() => setIsPlacementExpanded(!isPlacementExpanded)}
                icon={<Activity className="w-3 h-3 text-emerald-400" />}
            >
                <div className="p-2 space-y-2">
                    <div className="flex bg-slate-950 p-2 rounded border border-slate-800 justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-[7px] text-slate-500 uppercase font-black">Circuit Assignment</span>
                            <span className="text-[10px] text-slate-200 font-mono">{editingDevice.lcpAssignment || 'Unassigned'}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[7px] text-slate-500 uppercase font-black">Circuit Load</span>
                            <div className={`text-[10px] font-mono ${circuitLoad?.isOverloaded ? 'text-rose-500 font-bold' : 'text-emerald-400'}`}>
                                {circuitLoad?.totalAmps.toFixed(2) || '0.00'}A / 12A
                            </div>
                        </div>
                    </div>

                    <div className="flex bg-slate-950 p-2 rounded border border-slate-800 justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-[7px] text-slate-500 uppercase font-black">Bus / Universe</span>
                            <span className="text-[10px] text-slate-200 font-mono">{editingDevice.busAssignment || 'Unassigned'}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[7px] text-slate-500 uppercase font-black">Bus Load</span>
                            <div className={`text-[10px] font-mono ${busLoad?.isOverloaded ? 'text-rose-500 font-bold' : 'text-blue-400'}`}>
                                {busLoad?.totalMa || 0}mA / 250mA
                            </div>
                        </div>
                    </div>

                    {blueprint && (
                        <div className="mt-3">
                            <label className="text-[9px] text-slate-500 uppercase font-bold block mb-1">Components</label>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 p-1.5 bg-slate-800/50 rounded border border-slate-700/50">
                                    <Lightbulb size={10} className="text-pink-400" />
                                    <span className="text-[9px] text-slate-300 truncate">{blueprint.components.loadId}</span>
                                </div>
                                {blueprint.components.driverId && (
                                    <div className="flex items-center gap-2 p-1.5 bg-slate-800/50 rounded border border-slate-700/50">
                                        <Zap size={10} className="text-amber-400" />
                                        <span className="text-[9px] text-slate-300 truncate">{blueprint.components.driverId}</span>
                                    </div>
                                )}
                                {blueprint.components.logicIds.map((lid: string) => (
                                    <div key={lid} className="flex items-center gap-2 p-1.5 bg-slate-800/50 rounded border border-slate-700/50">
                                        <Cpu size={10} className="text-emerald-400" />
                                        <span className="text-[9px] text-slate-300 truncate">{lid}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </CollapsibleSection>

            {/* SECTION 3: SPECIFICATION */}
            <CollapsibleSection
                title={SpecBuilder ? "Spec Builder" : "Specifications"}
                isExpanded={isConfigExpanded}
                toggle={() => setIsConfigExpanded(!isConfigExpanded)}
                icon={<Box className="w-3 h-3 text-blue-300" />}
            >
                <div className="p-2 space-y-3">
                    <div className="text-[9px] text-slate-400 font-mono mb-2 flex justify-between">
                        <span>{product?.name || "Generic Hardware"}</span>
                        <span className={SpecBuilder ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                            {SpecBuilder ? 'BUILDER ACTIVE' : 'MANUAL'}
                        </span>
                    </div>

                    {SpecBuilder ? (
                        <div className="bg-slate-950/30 rounded border border-slate-800/50">
                            <SpecBuilder
                                deviceId={editingDevice.id}
                                initialMetadata={draftMetadata || editingDevice.metadata || {}}
                                onChange={(spec) => setDraftMetadata(spec)}
                            />
                        </div>
                    ) : (
                        <div className="text-[9px] text-slate-400 italic p-4 text-center border border-dashed border-slate-700 rounded bg-slate-900/50">
                            No specialized builder for this product.
                        </div>
                    )}
                </div>
            </CollapsibleSection>
        </div>
    );
};

const CollapsibleSection: React.FC<{
    title: string;
    isExpanded: boolean;
    toggle: () => void;
    children: React.ReactNode;
    icon?: React.ReactNode;
}> = ({ title, isExpanded, toggle, children, icon }) => (
    <div className="border border-slate-700 rounded bg-slate-900/80 overflow-hidden">
        <button
            onClick={toggle}
            className="w-full flex items-center justify-between p-2 bg-slate-800/80 hover:bg-slate-700 transition-colors border-b border-slate-700/50"
        >
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-[9px] text-slate-200 uppercase font-bold tracking-wider">{title}</span>
            </div>
            {isExpanded ? <ChevronLeft className="w-3 h-3 text-slate-400 rotate-270" /> : <ChevronRight className="w-3 h-3 text-slate-400 rotate-90" />}
        </button>
        {isExpanded && <div className="animate-in slide-in-from-top-1">{children}</div>}
    </div>
);
