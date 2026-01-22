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

        const catalogV2 = catalog as any;
        const { registry, blueprints } = catalogV2;

        const flattenedItems: any[] = [];

        devices.forEach(device => {
            const rawTypeId = (device.deviceTypeId || '').trim();
            const blueprint = blueprints.find((bp: any) =>
                bp.id.toLowerCase() === rawTypeId.toLowerCase()
            );

            if (!blueprint) {
                // Fallback for legacy/non-blueprint devices
                const sku = (device.deviceTypeId || device.productId || 'generic-hardware').trim();
                flattenedItems.push({
                    sku: sku,
                    name: device.name || sku,
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

            // --- RESOLVE COMPONENTS (New Modular Pattern or Legacy Load/Driver/Logic) ---
            if (Array.isArray(blueprint.components)) {
                // MODULAR SYSTEM (e.g. DMF X-Series)
                blueprint.components.forEach((comp: any) => {
                    const load = registry.loads.find((l: any) => l.id === comp.productId);
                    if (load) {
                        for (let i = 0; i < (comp.quantity || 1); i++) {
                            flattenedItems.push({
                                sku: load.id,
                                name: load.name,
                                manufacturer: load.manufacturer,
                                description: comp.description || load.description,
                                cost: load.cost,
                                wattage: load.wattage || 0,
                                busDrawMa: load.metadata?.daliMaDraw || 0,
                                category: load.category || blueprint.category,
                                url: load.url,
                                instance: device
                            });
                        }
                    }
                });
            } else {
                // LEGACY SYSTEM (loadId, driverId, logicIds)
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
                            ? load.wattage * (1 + (1 - load.efficiency))
                            : load.wattage,
                        busDrawMa: load.busDrawMa || 0,
                        category: blueprint.category,
                        url: load.url,
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
                            wattage: driver.maxWatts * (1 - driver.efficiency),
                            busDrawMa: driver.busDrawMa || 0,
                            category: 'lcps',
                            instance: device
                        });
                    }
                }

                // 3. Resolve Logic (Pucks)
                (blueprint.components.logicIds || []).forEach((logicId: string) => {
                    const logic = registry.logic.find((l: any) => l.id === logicId);
                    if (logic) {
                        flattenedItems.push({
                            sku: logic.id,
                            name: logic.name,
                            manufacturer: logic.manufacturer,
                            description: logic.description,
                            cost: logic.cost,
                            wattage: 1,
                            busDrawMa: logic.busDrawMa,
                            category: 'lcps',
                            instance: device
                        });
                    }
                });
            }
        });

        // Group flattened items by SKU for BOM view
        const groupedMap = new Map<string, any[]>();
        flattenedItems.forEach(item => {
            const key = (item.sku || 'unknown').trim().toLowerCase();
            if (!groupedMap.has(key)) groupedMap.set(key, []);
            groupedMap.get(key)!.push(item);
        });

        const result = Array.from(groupedMap.entries()).map(([skuKey, items]) => {
            const first = items[0];
            return {
                id: `bom-${skuKey}`,
                name: first.name,
                manufacturer: first.manufacturer,
                description: first.description || first.sku,
                type: (first.category || 'lighting').toUpperCase(),
                mountType: MountType.NA,
                size: 0,
                cost: first.cost,
                powerWatts: first.wattage || 0,
                busDrawMa: first.busDrawMa || 0,
                quantity: items.length,
                url: first.url || '',
                linkStatus: first.url ? 'MARKET' : 'NONE',
                genericRole: first.category,
                instances: items.map(i => ({
                    id: i.instance.id,
                    location: i.instance.roomId || 'Unknown',
                    position: i.instance.position,
                    universe: i.instance.busAssignment ? (parseInt(i.instance.busAssignment.replace(/\D/g, '')) || 0) : undefined
                }))
            } as any;
        });

        console.debug(`[BOM-DIAG] Grouped ${flattenedItems.length} items into ${result.length} modules. SKUs:`, Array.from(groupedMap.keys()));
        return result;
    }, [devices]);

    return {
        devices,
        deviceModules,
        totalCost
    };
}
