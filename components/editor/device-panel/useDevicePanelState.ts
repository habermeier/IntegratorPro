import React from 'react';
import { useDevices } from '../../../src/hooks/useDevices';
import { FloorPlanEditor } from '../../../editor/FloorPlanEditor';

export const useDevicePanelState = (editor: FloorPlanEditor | null) => {
    const { devices, getDevice, updateDevice } = useDevices();

    // Core Selection State
    const [editingDevice, setEditingDevice] = React.useState<any>(() => {
        const selectedIds = editor?.selectionSystem?.getSelectedIds() || [];
        return selectedIds.length === 1 ? getDevice(selectedIds[0]) : null;
    });
    const [formData, setFormData] = React.useState<any>(() => {
        const selectedIds = editor?.selectionSystem?.getSelectedIds() || [];
        if (selectedIds.length === 1) {
            const d = getDevice(selectedIds[0]);
            return d ? {
                name: d.name,
                productId: d.productId,
                installationHeight: d.installationHeight,
                busAssignment: d.busAssignment,
                rotation: d.rotation || 0,
                metadata: { ...d.metadata }
            } : {};
        }
        return {};
    });
    const [draftMetadata, setDraftMetadata] = React.useState<any>(() => {
        const selectedIds = editor?.selectionSystem?.getSelectedIds() || [];
        if (selectedIds.length === 1) {
            return getDevice(selectedIds[0])?.metadata || {};
        }
        return null;
    });
    const [selectedRoom, setSelectedRoom] = React.useState<any>(null);

    const [librarySelectedSymbol, setLibrarySelectedSymbol] = React.useState<any>(null);

    // Sync selection from editor
    React.useEffect(() => {
        if (!editor) return;

        const handleSelectionChange = (selectedIds: string[]) => {
            // Enforce single selection for UI simplicity
            const activeId = selectedIds[0];

            if (activeId) {
                const device = getDevice(activeId);
                if (device) {
                    setEditingDevice(device);
                    setFormData({
                        name: device.name,
                        productId: device.productId,
                        installationHeight: device.installationHeight,
                        busAssignment: device.busAssignment,
                        rotation: device.rotation || 0,
                        metadata: { ...device.metadata }
                    });
                    setDraftMetadata(device.metadata || {});
                    setSelectedRoom(null);
                    setLibrarySelectedSymbol(null);
                    return;
                }

                // Check for Room selection
                const roomLayer = editor.layerSystem.getLayer('room');
                const rooms = (roomLayer as any)?.content?.rooms || [];
                const room = rooms.find((r: any) => r.id === activeId);
                if (room) {
                    setSelectedRoom(room);
                    setEditingDevice(null);
                    setLibrarySelectedSymbol(null);
                    return;
                }
            }

            // Clear if nothing or unknown selected
            setEditingDevice(null);
            setSelectedRoom(null);
            // Don't clear draftMetadata immediately if we might be in library mode
        };

        editor.on('selection-changed', handleSelectionChange);
        return () => editor.off('selection-changed', handleSelectionChange);
    }, [editor, getDevice]);

    // Handle Library Selection Sync (External to editor selection)
    React.useEffect(() => {
        if (!editor) return;

        const handleToolChange = (args: any) => {
            if (args.tool === 'place-symbol' && args.attrs?.symbolType) {
                const typeId = args.attrs.symbolType;
                const { SYMBOL_LIBRARY } = require('../../../editor/models/symbolLibrary'); // Avoid circular if any
                const symbolDef = SYMBOL_LIBRARY[typeId];
                if (symbolDef) {
                    setLibrarySelectedSymbol(symbolDef);
                    // Initialize metadata preview from symbol defaults if not already editing a real device
                    if (!editingDevice) {
                        setDraftMetadata(symbolDef.metadata || {});
                        setFormData({
                            name: symbolDef.name,
                            productId: symbolDef.productId,
                            metadata: { ...symbolDef.metadata }
                        });
                    }
                }
            } else if (args.tool !== 'place-symbol') {
                setLibrarySelectedSymbol(null);
            }
        };

        editor.on('tool-changed', handleToolChange);
        return () => editor.off('tool-changed', handleToolChange);
    }, [editor, editingDevice]);

    // Sync editingDevice if the underlying devices array changes (External sync)
    React.useEffect(() => {
        if (editingDevice) {
            const latest = getDevice(editingDevice.id);
            if (latest && JSON.stringify(latest) !== JSON.stringify(editingDevice)) {
                setEditingDevice(latest);
                setFormData({
                    name: latest.name,
                    productId: latest.productId,
                    installationHeight: latest.installationHeight,
                    busAssignment: latest.busAssignment,
                    rotation: latest.rotation || 0,
                    metadata: { ...latest.metadata }
                });
                // Only sync draftMetadata if it hasn't diverging significantly 
                // (usually spec builders handle their own internal state, but we want a baseline sync)
                if (!draftMetadata || Object.keys(draftMetadata).length === 0) {
                    setDraftMetadata(latest.metadata || {});
                }
            }
        }
    }, [devices, getDevice, editingDevice, draftMetadata]);

    return {
        editingDevice,
        librarySelectedSymbol,
        formData,
        setFormData,
        draftMetadata,
        setDraftMetadata,
        selectedRoom,
        setSelectedRoom,
        devices,
        updateDevice
    };
};
