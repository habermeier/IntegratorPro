
import { Device } from '../models/Device';
import { CatalogV2, Blueprint } from '../models/Blueprint';

export interface CircuitLoad {
    id: string;
    totalAmps: number;
    limit: number; // 12A continuous
    isOverloaded: boolean;
    devices: string[];
}

export interface BusLoad {
    id: string;
    totalMa: number;
    limit: number; // 250mA for DALI
    isOverloaded: boolean;
    devices: string[];
}

export class AmpereEngine {
    private static HV_LIMIT = 12.0; // 12A continuous for 14 AWG
    private static LV_LIMIT = 250.0; // 250mA for DALI Universe

    /**
     * Calculate loads for all circuits and buses
     */
    public static calculateLoads(devices: Device[], catalog: CatalogV2): { circuits: CircuitLoad[], buses: BusLoad[] } {
        const circuitMap = new Map<string, CircuitLoad>();
        const busMap = new Map<string, BusLoad>();

        devices.forEach(device => {
            const blueprint = catalog.blueprints.find(bp => bp.id === device.deviceTypeId);
            if (!blueprint) return;

            // 1. HV Amps (Circuit)
            const circuitId = device.lcpAssignment || 'Unassigned';
            const hvAmps = blueprint.calculatedStats.hvAmps || 0;

            if (!circuitMap.has(circuitId)) {
                circuitMap.set(circuitId, {
                    id: circuitId,
                    totalAmps: 0,
                    limit: this.HV_LIMIT,
                    isOverloaded: false,
                    devices: []
                });
            }
            const circuit = circuitMap.get(circuitId)!;
            circuit.totalAmps += hvAmps;
            circuit.devices.push(device.id);
            circuit.isOverloaded = circuit.totalAmps > circuit.limit;

            // 2. LV mA (Bus)
            const busId = device.busAssignment || 'Unassigned';
            const lvMa = blueprint.calculatedStats.lvMa || 0;

            if (!busMap.has(busId)) {
                busMap.set(busId, {
                    id: busId,
                    totalMa: 0,
                    limit: this.LV_LIMIT,
                    isOverloaded: false,
                    devices: []
                });
            }
            const bus = busMap.get(busId)!;
            bus.totalMa += lvMa;
            bus.devices.push(device.id);
            bus.isOverloaded = bus.totalMa > bus.limit;
        });

        return {
            circuits: Array.from(circuitMap.values()),
            buses: Array.from(busMap.values())
        };
    }
}
