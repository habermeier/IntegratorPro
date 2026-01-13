import { useState, useEffect, useMemo } from 'react';
import { deviceRegistry } from '../services/DeviceRegistry';
import { HardwareModule, ModuleType, MountType } from '../../types';
import { Device } from '../models/Device';
import catalog from '../../catalog.json';

/**
 * useDeviceRegistry Hook
 * 
 * Centralizes access to items in the DeviceRegistry.
 * Provides real-time synchronization with registry changes.
 * Returns both the total cost and the grouped HardwareModules for the BOM.
 */
export function useDeviceRegistry() {
    const [devices, setDevices] = useState(deviceRegistry.getAllDevices());

    useEffect(() => {
        const updateRegistry = () => {
            setDevices([...deviceRegistry.getAllDevices()]);
        };

        deviceRegistry.on('change', updateRegistry);
        return () => deviceRegistry.off('change', updateRegistry);
    }, []);

    const totalCost = useMemo(() => {
        return devices.reduce((acc, d) => acc + (d.metadata?.cost || 0), 0);
    }, [devices]);

    const deviceModules = useMemo(() => {
        if (devices.length === 0) return [];

        // Group devices by SKU, Ordering Code, or fallback to productId
        const groupedMap = new Map<string, Device[]>();
        devices.forEach(device => {
            const groupKey = device.metadata?.sku || device.metadata?.orderingCode || device.productId;
            if (!groupedMap.has(groupKey)) groupedMap.set(groupKey, []);
            groupedMap.get(groupKey)!.push(device);
        });

        // Convert groups to HardwareModule/aggregate entries
        return Array.from(groupedMap.entries()).map(([groupKey, devicesInGroup]) => {
            const firstDevice = devicesInGroup[0];
            const category = firstDevice.layerId as any;

            // Resolve Catalog Fallback
            const catalogItem = catalog.find(p => p.id === firstDevice.productId);

            // Resolve a descriptive "Display SKU"
            const displaySku = firstDevice.metadata?.sku
                || firstDevice.metadata?.orderingCode
                || catalogItem?.id // Often the ID is the SKU
                || firstDevice.productId;

            return {
                id: `device-group-${groupKey}`,
                name: firstDevice.name,
                manufacturer: firstDevice.metadata?.manufacturer || catalogItem?.manufacturer || 'Unknown',
                description: firstDevice.metadata?.sku || firstDevice.metadata?.orderingCode
                    ? `${displaySku}`
                    : (catalogItem?.description || `Product: ${firstDevice.productId}`),
                type: category,
                mountType: MountType.NA,
                size: 0,
                cost: firstDevice.metadata?.cost || catalogItem?.cost || 0,
                powerWatts: firstDevice.metadata?.powerWatts || catalogItem?.powerWatts || 0,
                quantity: devicesInGroup.length,
                url: firstDevice.metadata?.purchaseUrl || catalogItem?.url || '',
                linkStatus: firstDevice.metadata?.purchaseUrl ? 'PREFERRED' : 'MARKET',
                genericRole: category,
                instances: devicesInGroup.map(d => ({
                    id: d.id,
                    location: d.roomId || 'Unknown',
                    notes: '',
                    position: d.position,
                    universe: d.busAssignment ? (parseInt(d.busAssignment.replace(/\D/g, '')) || 0) : undefined
                }))
            } as any;
        });
    }, [devices]);

    return {
        devices,
        deviceModules,
        totalCost
    };
}
