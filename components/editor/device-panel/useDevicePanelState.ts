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
                    return;
                }

                // Check for Room selection
                const roomLayer = editor.layerSystem.getLayer('room');
                const rooms = (roomLayer as any)?.content?.rooms || [];
                const room = rooms.find((r: any) => r.id === activeId);
                if (room) {
                    setSelectedRoom(room);
                    setEditingDevice(null);
                    return;
                }
            }

            // Clear if nothing or unknown selected
            setEditingDevice(null);
            setSelectedRoom(null);
            setDraftMetadata(null);
        };

        editor.on('selection-changed', handleSelectionChange);
        return () => editor.off('selection-changed', handleSelectionChange);
    }, [editor, getDevice]);

    return {
        editingDevice,
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
