/**
 * Cable Library
 *
 * Centralizes cable type definitions for the application.
 * Used by DevicePanel and DrawCableTool for cable selection and properties.
 */

export interface CableDefinition {
    id: string;
    name: string;
    description: string;
    category: 'data' | 'power' | 'control' | 'av';
    gauge?: string; // e.g., "12 AWG", "14 AWG"
    conductor?: string; // e.g., "DUO" (2-conductor), "TRIO" (3-conductor)
    color: number; // Default line color for rendering
    specifications?: {
        voltage?: string;
        bandwidth?: string;
        maxDistance?: string;
        shielding?: string;
    };
}

export const CABLE_CATEGORIES = [
    { id: 'data', name: 'Data', color: 0x0055FF },
    { id: 'power', name: 'Power', color: 0xFF0000 },
    { id: 'control', name: 'Control', color: 0x00FF00 },
    { id: 'av', name: 'Audio/Video', color: 0xFF00FF }
];

/**
 * Cable Library - Comprehensive list of cable types
 */
export const CABLE_LIBRARY: Record<string, CableDefinition> = {
    // --- DATA CABLES ---
    'Cat6': {
        id: 'Cat6',
        name: 'Cat6 - Data',
        description: 'Category 6 Ethernet cable',
        category: 'data',
        color: 0x0055FF,
        specifications: {
            bandwidth: '250 MHz',
            maxDistance: '100m',
            shielding: 'UTP'
        }
    },
    'Cat6A': {
        id: 'Cat6A',
        name: 'Cat6A - Data',
        description: 'Category 6A Ethernet cable (augmented)',
        category: 'data',
        color: 0x0055FF,
        specifications: {
            bandwidth: '500 MHz',
            maxDistance: '100m',
            shielding: 'STP/UTP'
        }
    },
    'RG6': {
        id: 'RG6',
        name: 'RG6 - Coax',
        description: 'RG6 Coaxial cable',
        category: 'av',
        color: 0xFF00FF,
        specifications: {
            shielding: 'Quad Shield'
        }
    },

    // --- POWER CABLES ---
    'DUO-12-AWG': {
        id: 'DUO-12-AWG',
        name: 'DUO 12 AWG',
        description: '2-conductor 12 AWG power cable',
        category: 'power',
        gauge: '12 AWG',
        conductor: 'DUO',
        color: 0xFF0000,
        specifications: {
            voltage: '120V/240V',
            maxDistance: 'Varies by load'
        }
    },
    '18/2': {
        id: '18/2',
        name: '18/2 - Power',
        description: '18 AWG 2-conductor power cable',
        category: 'power',
        gauge: '18 AWG',
        conductor: '2-conductor',
        color: 0xFF0000,
        specifications: {
            voltage: '120V',
            maxDistance: 'Limited by voltage drop'
        }
    },
    '14/2': {
        id: '14/2',
        name: '14/2 - Power',
        description: '14 AWG 2-conductor power cable',
        category: 'power',
        gauge: '14 AWG',
        conductor: '2-conductor',
        color: 0xFF0000,
        specifications: {
            voltage: '120V/240V',
            maxDistance: 'Limited by voltage drop'
        }
    },

    // --- CONTROL/BUS CABLES ---
    'DALI': {
        id: 'DALI',
        name: 'DALI Bus',
        description: 'Digital Addressable Lighting Interface bus cable',
        category: 'control',
        color: 0x00FF00,
        specifications: {
            voltage: '16V DC',
            maxDistance: '300m'
        }
    },
    'KNX': {
        id: 'KNX',
        name: 'KNX Bus',
        description: 'KNX building automation bus cable',
        category: 'control',
        color: 0x00FF00,
        specifications: {
            voltage: '29V DC',
            maxDistance: '1000m'
        }
    },

    // --- AUDIO/VIDEO ---
    'Speaker': {
        id: 'Speaker',
        name: 'Speaker Wire',
        description: 'Speaker wire for audio distribution',
        category: 'av',
        color: 0xFF00FF,
        specifications: {
            shielding: 'None/Unshielded'
        }
    }
};

/**
 * Get all cable types as an array
 */
export function getAllCableTypes(): CableDefinition[] {
    return Object.values(CABLE_LIBRARY);
}

/**
 * Get cable types filtered by category
 */
export function getCablesByCategory(category: string): CableDefinition[] {
    return Object.values(CABLE_LIBRARY).filter(cable => cable.category === category);
}

/**
 * Get cable definition by ID
 */
export function getCableDefinition(id: string): CableDefinition | undefined {
    return CABLE_LIBRARY[id];
}
