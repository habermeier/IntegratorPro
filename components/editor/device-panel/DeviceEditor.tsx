import React from 'react';
import { Target, Box, ChevronLeft, ChevronRight, Save, Trash2 } from 'lucide-react';
import { SYMBOL_LIBRARY } from '../../../editor/models/symbolLibrary';
import { getSpecBuilder } from './SpecBuilderRegistry';
import catalog from '../../../catalog.json';

interface DeviceEditorProps {
    editingDevice: any;
    formData: any;
    draftMetadata: any;
    onFieldChange: (field: string, value: any) => void;
    onFieldBlur: (field: string, value: any) => void;
    onUpdateType: (newTypeId: string) => void;
    onClearSelection: () => void;
    onSaveNewType: () => void;
    onUpdateGlobal: () => void;
    setDraftMetadata: (metadata: any) => void;
    unitPreference: 'IMPERIAL' | 'METRIC';
}

export const DeviceEditor: React.FC<DeviceEditorProps> = ({
    editingDevice,
    formData,
    draftMetadata,
    onFieldChange,
    onFieldBlur,
    onUpdateType,
    onClearSelection,
    onSaveNewType,
    onUpdateGlobal,
    setDraftMetadata,
    unitPreference
}) => {
    const [isGeneralExpanded, setIsGeneralExpanded] = React.useState(true);
    const [isPlacementExpanded, setIsPlacementExpanded] = React.useState(true);
    const [isConfigExpanded, setIsConfigExpanded] = React.useState(true);

    // Resolve product more robustly (check metadata and deviceTypeId if needed)
    // Resolve product more robustly:
    // 1. User manual selection (formData)
    // 2. Symbol Definition (Source of Truth for Custom Types)
    // 3. Metadata (Legacy/Instance specific)
    // 4. Instance ID
    // Resolve product more robustly:
    // 1. User manual selection (formData)
    // 2. Instance ID (if specific) - CRITICAL: Must override generic symbol defaults
    // 3. Metadata (Legacy/Instance specific)
    // 4. Symbol Definition (if specific)
    // 5. Fallback to whatever is available
    const effectiveProductId =
        (formData.productId && formData.productId !== 'generic-product' ? formData.productId : null) ||
        (editingDevice.productId && editingDevice.productId !== 'generic-product' && editingDevice.productId !== 'generic-light' ? editingDevice.productId : null) ||
        (editingDevice.metadata?.productId && editingDevice.metadata.productId !== 'generic-product' ? editingDevice.metadata.productId : null) ||
        (editingDevice.deviceTypeId && SYMBOL_LIBRARY[editingDevice.deviceTypeId]?.productId && SYMBOL_LIBRARY[editingDevice.deviceTypeId]?.productId !== 'generic-product' && SYMBOL_LIBRARY[editingDevice.deviceTypeId]?.productId !== 'generic-light' ? SYMBOL_LIBRARY[editingDevice.deviceTypeId].productId : null) ||
        editingDevice.productId;

    const product = catalog.find(p => p.id === effectiveProductId);

    const SpecBuilder = getSpecBuilder(product);

    // Filter catalog for relevant items (simple match for now, or all)
    // We want to allow re-assignment to any valid hardware.
    const catalogOptions = React.useMemo(() => {
        return catalog.sort((a, b) => (a.manufacturer + a.name).localeCompare(b.manufacturer + b.name));
    }, []);

    return (
        <div className="p-3 space-y-3 pb-20 overflow-y-auto h-full custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <h3 className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Editing Device</h3>
                </div>
                <button
                    onClick={onClearSelection}
                    className="text-[9px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors uppercase font-bold border border-slate-600"
                >
                    Done
                </button>
            </div>

            {/* SECTION 1: GENERAL INFO */}
            <CollapsibleSection
                title="General Info"
                isExpanded={isGeneralExpanded}
                toggle={() => setIsGeneralExpanded(!isGeneralExpanded)}
            >
                <div className="p-2 space-y-2">
                    {/* PRODUCT IDENTITY (Source of Truth) */}
                    <div>
                        <label className="text-[9px] text-slate-300 uppercase font-bold block mb-1 text-emerald-400">Product Model</label>
                        <select
                            value={effectiveProductId || ''}
                            onChange={(e) => onFieldChange('productId', e.target.value)}
                            className="w-full text-[10px] text-slate-100 font-bold font-mono px-2 py-1.5 bg-slate-800 rounded border border-emerald-500/50 focus:border-emerald-400 focus:outline-none"
                        >
                            <option value="">-- Generic / None --</option>
                            {catalogOptions.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.manufacturer} {p.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-[7px] text-slate-500 mt-1">
                            Assigning a product enables manufacturer-specific controls.
                        </p>
                    </div>

                    <div className="border-t border-slate-800 my-2 pt-2">
                        <label className="text-[9px] text-slate-300 uppercase font-bold block mb-1">Symbol Style</label>
                        <select
                            value={editingDevice.deviceTypeId}
                            onChange={(e) => onUpdateType(e.target.value)}
                            className="w-full text-[11px] text-blue-200 font-mono px-2 py-1 bg-slate-950 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                        >
                            {Object.keys(SYMBOL_LIBRARY).map(typeId => (
                                <option key={typeId} value={typeId}>
                                    {SYMBOL_LIBRARY[typeId].name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[9px] text-slate-300 uppercase font-bold block mb-1">Name</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={(e) => onFieldChange('name', e.target.value)}
                            onBlur={(e) => onFieldBlur('name', e.target.value)}
                            className="w-full text-[11px] text-slate-100 font-bold font-mono px-2 py-1.5 bg-slate-950 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[9px] text-slate-300 uppercase font-bold block mb-1">Bus Assignment</label>
                        <input
                            type="text"
                            value={formData.busAssignment || ''}
                            onChange={(e) => onFieldChange('busAssignment', e.target.value)}
                            onBlur={(e) => onFieldBlur('busAssignment', e.target.value)}
                            className="w-full text-[11px] text-slate-100 font-mono px-2 py-1.5 bg-slate-950 rounded border border-slate-600"
                        />
                    </div>
                </div>
            </CollapsibleSection>

            {/* SECTION 2: PLACEMENT */}
            <CollapsibleSection
                title="Placement"
                isExpanded={isPlacementExpanded}
                toggle={() => setIsPlacementExpanded(!isPlacementExpanded)}
            >
                <div className="p-2 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[9px] text-slate-300 uppercase font-bold block mb-1">
                                Height ({unitPreference === 'IMPERIAL' ? 'ft' : 'm'})
                            </label>
                            <input
                                type="text"
                                value={formData.installationHeight || ''}
                                onChange={(e) => onFieldChange('installationHeight', e.target.value)}
                                onBlur={(e) => onFieldBlur('installationHeight', e.target.value)}
                                className="w-full text-[11px] text-slate-100 font-mono px-2 py-1.5 bg-slate-950 rounded border border-slate-600"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] text-slate-300 uppercase font-bold block mb-1">Rotation</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="360"
                                    value={formData.rotation || 0}
                                    onChange={(e) => onFieldChange('rotation', parseInt(e.target.value))}
                                    className="flex-1 h-1 bg-slate-600 rounded appearance-none cursor-pointer accent-blue-400"
                                />
                                <span className="text-[9px] text-slate-200 font-mono w-6 text-right">{formData.rotation}°</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CollapsibleSection>

            {/* SECTION 3: SPECIFICATION */}
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
                        <SpecBuilder
                            deviceId={editingDevice.id}
                            initialMetadata={draftMetadata || editingDevice.metadata || {}}
                            onChange={(spec) => setDraftMetadata(spec)}
                        />
                    ) : (
                        <div className="text-[9px] text-slate-400 italic p-4 text-center border border-dashed border-slate-700 rounded bg-slate-900/50">
                            No specialized builder for this product.
                            Manual metadata can be edited in Advanced mode.
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 space-y-2">
                        <button
                            onClick={onUpdateGlobal}
                            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 transition-all text-[9px] font-bold uppercase"
                        >
                            <Save size={12} />
                            <span>Update All of this Type</span>
                        </button>
                        <button
                            onClick={onSaveNewType}
                            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 transition-all text-[9px] font-bold uppercase"
                        >
                            <span>Save as New Fixture Type</span>
                        </button>
                    </div>
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
