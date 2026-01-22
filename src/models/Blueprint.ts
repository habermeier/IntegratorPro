
import { SymbolDefinition } from '../../editor/models/symbolLibrary';

export type ComponentType = 'logic' | 'driver' | 'load';

export interface BaseComponent {
    id: string;
    name: string;
    manufacturer?: string;
    mpn?: string;
    description?: string;
    cost: number;
    url?: string;
}

export interface LogicComponent extends BaseComponent {
    type: 'logic';
    busDrawMa: number;
    addresses: number;
    protocol: 'DALI' | 'KNX' | '0-10V' | 'Relay' | 'Other';
}

export interface DriverComponent extends BaseComponent {
    type: 'driver';
    efficiency: number; // 0-1 (e.g. 0.90 for 90%)
    maxWatts: number;
    inputVoltage: 'UNV' | '120V' | '240V' | '24VDC';
    outputVoltage: 'CC' | 'CV' | string;
    busDrawMa?: number; // Some drivers have native DALI
}

export interface LoadComponent extends BaseComponent {
    type: 'load';
    wattage: number;
    category: string;

    /** 
     * Integrated Attributes (for 'Smart' or Integrated fixtures)
     * If these are set, the Load behaves like a Driver/Logic combined.
     */
    busDrawMa?: number;
    efficiency?: number;
    addresses?: number;
    protocol?: 'DALI' | '0-10V' | 'DMX' | 'Standard';
}

export interface Blueprint {
    id: string;
    name: string;
    manufacturer?: string;
    category: string;
    symbolType: string;
    components: {
        loadId: string;
        driverId?: string;
        logicIds: string[]; // Can be multiple (e.g. Fan + Light)
    };
    calculatedStats: {
        totalCost: number;
        hvAmps: number; // Watts / (120 * Efficiency)
        lvMa: number;   // Sum of logic busDrawMa
        totalAddresses: number;
    };
    metadata?: Record<string, any>;
}

export interface CatalogV2 {
    version: '2.0';
    registry: {
        logic: LogicComponent[];
        drivers: DriverComponent[];
        loads: LoadComponent[];
    };
    blueprints: Blueprint[];
}
