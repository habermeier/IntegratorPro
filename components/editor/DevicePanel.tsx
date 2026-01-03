import React from 'react';
import { Box, Database } from 'lucide-react';

// Core imports
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';
import { SYMBOL_CATEGORIES, SYMBOL_LIBRARY, SymbolDefinition } from '../../editor/models/symbolLibrary';
import { ToolType, Room } from '../../editor/models/types';
import { dataService } from '../../src/services/DataService';
import { deviceRegistry } from '../../src/services/DeviceRegistry';
import { calculateRoomArea } from '../../utils/spatialUtils';

// Modular Sub-components
import { useDevicePanelState } from './device-panel/useDevicePanelState';
import { DeviceEditor } from './device-panel/DeviceEditor';
import { DeviceLibrary } from './device-panel/DeviceLibrary';
import { PlacedDevicesView } from './device-panel/PlacedDevicesView';
import { RoomEditor } from './device-panel/RoomEditor';
import { DeviceConversionModal } from './DeviceConversionModal';
import { SwapDeviceModal } from './SwapDeviceModal';

interface DevicePanelProps {
    editor: FloorPlanEditor | null;
    activeTool?: ToolType;
    isOpen?: boolean;
    isLocked?: boolean;
}

const DevicePanelContent: React.FC<DevicePanelProps> = ({ editor, activeTool, isOpen = true, isLocked = false }) => {
    // 1. High-level View Navigation
    const [activeTab, setActiveTab] = React.useState<'library' | 'placed'>('library');
    const [selectedCategory, setSelectedCategory] = React.useState<string>(() => localStorage.getItem('integrator-pro-last-category') || 'lighting');
    const [selectedSymbolType, setSelectedSymbolType] = React.useState<string | null>(() => localStorage.getItem('integrator-pro-last-symbol-type') || null);
    const [isAddingNew, setIsAddingNew] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [productId, setProductId] = React.useState('generic-product');
    const [unitPreference] = React.useState<'IMPERIAL' | 'METRIC'>('METRIC');

    const [showConversionModal, setShowConversionModal] = React.useState(false);
    const [conversionData, setConversionData] = React.useState<any>(null);
    const [swapData, setSwapData] = React.useState<any>(null);

    const {
        editingDevice,
        formData,
        setFormData,
        draftMetadata,
        setDraftMetadata,
        selectedRoom,
        devices,
        updateDevice
    } = useDevicePanelState(editor);

    // 2. Memoized Categories
    const categoryCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        SYMBOL_CATEGORIES.forEach(cat => {
            counts[cat.id] = devices.filter(d => d.layerId === cat.id).length;
        });
        return counts;
    }, [devices]);

    // 3. Automated View Routing
    React.useEffect(() => {
        if (editingDevice || selectedRoom) {
            setActiveTab('placed');
            setIsAddingNew(false); // Close library adding when something selected
        }
    }, [editingDevice, selectedRoom]);

    // 4. Workflow Handlers
    const handleSelectSymbol = (type: string) => {
        const symbolDef = SYMBOL_LIBRARY[type] as any;
        setSelectedSymbolType(type);
        localStorage.setItem('integrator-pro-last-symbol-type', type);
        if (editor) {
            const toolAttrs: any = { symbolType: type };
            if (symbolDef?.productId) toolAttrs.productId = symbolDef.productId;
            editor.setActiveTool('place-symbol', toolAttrs);
        }
    };

    const handleUpdateGlobalType = async () => {
        if (!editingDevice || !draftMetadata) return;
        if (!confirm(`Update GLOBAL type "${editingDevice.deviceTypeId}"? This affects ALL instances.`)) return;

        try {
            const updates: Partial<SymbolDefinition> = {
                metadata: { ...SYMBOL_LIBRARY[editingDevice.deviceTypeId]?.metadata, ...draftMetadata }
            };
            await dataService.updateGlobalSymbolType(editingDevice.deviceTypeId, updates);
            editor?.emit('layers-changed', editor.layerSystem.getAllLayers());
            alert('Global type updated successfully.');
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveAsNewType = async () => {
        if (!editingDevice || !draftMetadata) return;
        const name = prompt('New type name:', `${editingDevice.name} Custom`);
        if (!name) return;

        try {
            const newType: SymbolDefinition = {
                ...SYMBOL_LIBRARY[editingDevice.deviceTypeId],
                id: `custom-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
                name,
                metadata: { ...draftMetadata }
            };
            await dataService.addCustomSymbol(newType);
            handleUpdateType(newType.id);
            alert('New fixture type created and applied.');
        } catch (e) {
            console.error(e);
        }
    };

    const handleFieldChange = (field: string, value: any) => {
        if (!editingDevice || !editor) return;
        setFormData((prev: any) => ({ ...prev, [field]: value }));
        const updateObj = field.startsWith('metadata.')
            ? { metadata: { ...editingDevice.metadata, [field.split('.')[1]]: value } }
            : { [field]: value };

        if (updateDevice(editingDevice.id, updateObj)) {
            editor.emit('layers-changed', editor.layerSystem.getAllLayers());
        }
    };

    const handleUpdateType = (newTypeId: string) => {
        if (!editingDevice || !editor) return;
        const symbolDef = SYMBOL_LIBRARY[newTypeId] as any;
        const updates: any = { deviceTypeId: newTypeId };
        if (symbolDef?.productId) updates.productId = symbolDef.productId;
        if (updateDevice(editingDevice.id, updates)) {
            editor.emit('layers-changed', editor.layerSystem.getAllLayers());
        }
    };

    const calculateRoomStats = React.useMemo(() => {
        if (!selectedRoom?.points) return { area: 0, areaFt: 0, width: 0, height: 0 };
        const pixelsMeter = editor?.pixelsMeter || 39.3701;
        const stats = calculateRoomArea(selectedRoom.points, pixelsMeter);
        return { area: stats.meters, areaFt: stats.feet, width: 0, height: 0 };
    }, [selectedRoom, editor]);

    if (!isOpen) return null;

    return (
        <div className="w-64 h-full bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-xl overflow-x-hidden">
            <div className="p-3 border-b border-slate-800 bg-slate-950 flex justify-between items-center h-10">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    {editingDevice ? 'Hardware Config' : selectedRoom ? 'Room Editor' : 'Devices'}
                </h3>
            </div>

            {!editingDevice && !selectedRoom && (
                <div className="flex p-1 bg-slate-950 border-b border-slate-800 h-9">
                    <TabButton active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={<Box size={12} />} label="Library" />
                    <TabButton active={activeTab === 'placed'} onClick={() => setActiveTab('placed')} icon={<Database size={12} />} label="Placed" />
                </div>
            )}

            <div className="flex-1 overflow-hidden">
                {editingDevice ? (
                    <DeviceEditor
                        editingDevice={editingDevice}
                        formData={formData}
                        draftMetadata={draftMetadata}
                        onFieldChange={handleFieldChange}
                        onFieldBlur={() => { }}
                        onUpdateType={handleUpdateType}
                        onClearSelection={() => editor?.selectionSystem.clearSelection()}
                        onSaveNewType={handleSaveAsNewType}
                        onUpdateGlobal={handleUpdateGlobalType}
                        setDraftMetadata={setDraftMetadata}
                        unitPreference={unitPreference}
                    />
                ) : selectedRoom ? (
                    <RoomEditor
                        selectedRoom={selectedRoom}
                        calculateRoomStats={calculateRoomStats}
                        onClearSelection={() => editor?.selectionSystem.clearSelection()}
                        onFocusRoom={(id) => editor?.focusOnRoom(id)}
                    />
                ) : activeTab === 'library' ? (
                    <DeviceLibrary
                        selectedCategory={selectedCategory}
                        setSelectedCategory={setSelectedCategory}
                        selectedSymbolType={selectedSymbolType}
                        onSelectSymbol={handleSelectSymbol}
                        onDeleteType={() => { }}
                        isAddingNew={isAddingNew}
                        setIsAddingNew={setIsAddingNew}
                        categoryCounts={{}}
                        productId={productId}
                        setProductId={setProductId}
                        draftMetadata={draftMetadata}
                        setDraftMetadata={setDraftMetadata}
                        onUpdateDefinition={handleUpdateGlobalType}
                        onSaveAsNewType={handleSaveAsNewType}
                    />
                ) : (
                    <PlacedDevicesView
                        devices={devices}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onFocusDevice={(id) => editor?.focusOnDevice(id)}
                        onDeleteDevice={(id) => editor?.deleteDevice(id)}
                        onSelectDevice={(id) => editor?.selectionSystem.select(id)}
                    />
                )}
            </div>

            {showConversionModal && conversionData && (
                <DeviceConversionModal isOpen={true} {...conversionData} onConfirm={() => { }} onCancel={() => setShowConversionModal(false)} />
            )}
            {swapData && <SwapDeviceModal isOpen={true} currentDeviceName={editingDevice?.name} newDeviceName={swapData.targetDeviceName}
                onSwapInstance={() => { }} onSwapRoom={() => { }} onSwapProject={() => { }} onCancel={() => setSwapData(null)} />}
        </div>
    );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: any; label: string }> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded transition-all ${active ? 'bg-slate-800 text-blue-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
    >
        {icon}
        <span className="text-[9px] uppercase tracking-wider">{label}</span>
    </button>
);

export const DevicePanel = React.memo(DevicePanelContent);
