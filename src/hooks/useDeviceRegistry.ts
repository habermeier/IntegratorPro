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

        const catalogV2 = catalog as any; // Cast as V2 for now
        const { registry, blueprints } = catalogV2;

        const flattenedItems: any[] = [];

        devices.forEach(device => {
            const blueprint = blueprints.find((bp: any) => bp.id === device.deviceTypeId);
            if (!blueprint) {
                // Fallback for legacy/non-blueprint devices
                flattenedItems.push({
                    sku: device.productId || 'generic-hardware',
                    name: device.name,
                    manufacturer: (device.metadata as any)?.manufacturer || 'Generic',
                    description: (device.metadata as any)?.description || 'Unidentified Component',
                    cost: (device.metadata as any)?.cost || 0,
                    wattage: (device.metadata as any)?.powerWatts || 0,
                    busDrawMa: 0,
                    category: device.layerId || 'lighting',
                    instance: device
                });
                return;
            }

            // 1. Resolve Load
            const load = registry.loads.find((l: any) => l.id === blueprint.components.loadId);
            if (load) {
                flattenedItems.push({
                    sku: load.id,
                    name: `${blueprint.name} - ${load.name}`,
                    manufacturer: load.manufacturer,
                    description: load.description,
                    cost: load.cost,
                    wattage: load.efficiency
                        ? load.wattage * (1 + (1 - load.efficiency)) // Simple loss approximation
                        : load.wattage,
                    busDrawMa: load.busDrawMa || 0,
                    category: blueprint.category,
                    instance: device
                });
            }

            // 2. Resolve Driver
            if (blueprint.components.driverId) {
                const driver = registry.drivers.find((d: any) => d.id === blueprint.components.driverId);
                if (driver) {
                    flattenedItems.push({
                        sku: driver.id,
                        name: driver.name,
                        manufacturer: driver.manufacturer,
                        description: driver.description,
                        cost: driver.cost,
                        wattage: driver.maxWatts * (1 - driver.efficiency), // Loss as heat
                        busDrawMa: driver.busDrawMa || 0,
                        category: 'lcps',
                        instance: device
                    });
                }
            }

            // 3. Resolve Logic (Pucks)
            blueprint.components.logicIds.forEach((logicId: string) => {
                const logic = registry.logic.find((l: any) => l.id === logicId);
                if (logic) {
                    flattenedItems.push({
                        sku: logic.id,
                        name: logic.name,
                        manufacturer: logic.manufacturer,
                        description: logic.description,
                        cost: logic.cost,
                        wattage: 1, // Logic draw is negligible but non-zero
                        busDrawMa: logic.busDrawMa,
                        category: 'lcps',
                        instance: device
                    });
                }
            });
        });

        // Group flattened items by SKU for BOM view
        const groupedMap = new Map<string, any[]>();
        flattenedItems.forEach(item => {
            if (!groupedMap.has(item.sku)) groupedMap.set(item.sku, []);
            groupedMap.get(item.sku)!.push(item);
        });

        return Array.from(groupedMap.entries()).map(([sku, items]) => {
            const first = items[0];
            return {
                id: `bom-${sku}`,
                name: first.name,
                manufacturer: first.manufacturer,
                description: first.description || sku,
                type: first.category.toUpperCase(),
                mountType: MountType.NA,
                size: 0,
                cost: first.cost,
                powerWatts: first.wattage || 0,
                busDrawMa: first.busDrawMa || 0,
                quantity: items.length,
                url: '',
                linkStatus: 'MARKET',
                genericRole: first.category,
                instances: items.map(i => ({
                    id: i.instance.id,
                    location: i.instance.roomId || 'Unknown',
                    position: i.instance.position,
                    universe: i.instance.busAssignment ? (parseInt(i.instance.busAssignment.replace(/\D/g, '')) || 0) : undefined
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
