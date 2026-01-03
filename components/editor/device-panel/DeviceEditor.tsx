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
    const effectiveProductId = formData.productId || editingDevice.metadata?.productId || editingDevice.productId;
    const product = catalog.find(p => p.id === effectiveProductId) ||
        catalog.find(p => (editingDevice.deviceTypeId && p.id === SYMBOL_LIBRARY[editingDevice.deviceTypeId]?.productId));

    const SpecBuilder = getSpecBuilder(product);

    return (
        <div className="p-3 space-y-3 pb-20 overflow-y-auto h-full custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Editing Device</h3>
                </div>
                <button
                    onClick={onClearSelection}
                    className="text-[8px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors uppercase font-bold"
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
                    <div>
                        <label className="text-[7px] text-slate-400 uppercase font-bold block mb-1">Device Type</label>
                        <select
                            value={editingDevice.deviceTypeId}
                            onChange={(e) => onUpdateType(e.target.value)}
                            className="w-full text-[9px] text-blue-300 font-mono px-2 py-1 bg-slate-950 rounded border border-slate-700 focus:border-blue-500 focus:outline-none"
                        >
                            {Object.keys(SYMBOL_LIBRARY).map(typeId => (
                                <option key={typeId} value={typeId}>
                                    {SYMBOL_LIBRARY[typeId].name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[7px] text-slate-400 uppercase font-bold block mb-1">Name</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={(e) => onFieldChange('name', e.target.value)}
                            onBlur={(e) => onFieldBlur('name', e.target.value)}
                            className="w-full text-[9px] text-slate-100 font-mono px-2 py-1.5 bg-slate-950 rounded border border-slate-700 focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[7px] text-slate-400 uppercase font-bold block mb-1">Bus Assignment</label>
                        <input
                            type="text"
                            value={formData.busAssignment || ''}
                            onChange={(e) => onFieldChange('busAssignment', e.target.value)}
                            onBlur={(e) => onFieldBlur('busAssignment', e.target.value)}
                            className="w-full text-[9px] text-slate-100 font-mono px-2 py-1.5 bg-slate-950 rounded border border-slate-700"
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
                            <label className="text-[7px] text-slate-400 uppercase font-bold block mb-1">
                                Height ({unitPreference === 'IMPERIAL' ? 'ft' : 'm'})
                            </label>
                            <input
                                type="text"
                                value={formData.installationHeight || ''}
                                onChange={(e) => onFieldChange('installationHeight', e.target.value)}
                                onBlur={(e) => onFieldBlur('installationHeight', e.target.value)}
                                className="w-full text-[9px] text-slate-100 font-mono px-2 py-1.5 bg-slate-950 rounded border border-slate-700"
                            />
                        </div>
                        <div>
                            <label className="text-[7px] text-slate-400 uppercase font-bold block mb-1">Rotation</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="360"
                                    value={formData.rotation || 0}
                                    onChange={(e) => onFieldChange('rotation', parseInt(e.target.value))}
                                    className="flex-1 h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-blue-500"
                                />
                                <span className="text-[8px] text-slate-200 font-mono w-6 text-right">{formData.rotation}°</span>
                            </div>
                        </div>
                    </div>
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
                    <div className="text-[7px] text-slate-500 font-mono mb-2 flex justify-between">
                        <span>{product?.name || "Generic Hardware"}</span>
                        <span className={SpecBuilder ? "text-emerald-400" : "text-amber-400"}>
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
                        <div className="text-[8px] text-slate-500 italic p-4 text-center border border-dashed border-slate-800 rounded">
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
    <div className="border border-slate-700 rounded bg-slate-900/50 overflow-hidden">
        <button
            onClick={toggle}
            className="w-full flex items-center justify-between p-2 bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
        >
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-[8px] text-slate-300 uppercase font-bold tracking-wider">{title}</span>
            </div>
            {isExpanded ? <ChevronLeft className="w-3 h-3 text-slate-400 rotate-270" /> : <ChevronRight className="w-3 h-3 text-slate-400 rotate-90" />}
        </button>
        {isExpanded && <div className="animate-in slide-in-from-top-1">{children}</div>}
    </div>
);
