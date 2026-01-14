
import fs from 'fs';
import path from 'path';

// This script migrates the old catalog.json and project.json to the new V2 Component-First Architecture.

const OLD_CATALOG_PATH = path.join(process.cwd(), 'catalog.json.v1.bak');
const OLD_PROJECT_PATH = path.join(process.cwd(), 'projects/270-boll-ave/project.json.v1.bak');
const NEW_CATALOG_PATH = path.join(process.cwd(), 'catalog_v2.json');
const NEW_PROJECT_PATH = path.join(process.cwd(), 'projects/270-boll-ave/project_v2.json');

const oldCatalog = JSON.parse(fs.readFileSync(OLD_CATALOG_PATH, 'utf8'));
const oldProject = JSON.parse(fs.readFileSync(OLD_PROJECT_PATH, 'utf8'));

const registry = {
    logic: [
        {
            id: 'lunt-dali-010',
            name: 'DALI-2 0-10V Interface',
            manufacturer: 'Lunatone',
            mpn: '86458668',
            description: 'Precision PWM to 0-10V control',
            cost: 82.50,
            type: 'logic',
            busDrawMa: 3.1,
            addresses: 1,
            protocol: 'DALI'
        },
        {
            id: 'lunt-dali-rm8',
            name: 'DALI-2 RM8 Power Relay',
            manufacturer: 'Lunatone',
            description: '8A Power Relay with Zero-Cross Switching',
            cost: 95.00,
            type: 'logic',
            busDrawMa: 2.7,
            addresses: 1,
            protocol: 'DALI'
        }
    ],
    drivers: [
        {
            id: 'eldo-powerdrive-100',
            name: 'POWERdrive 100W DALI-2',
            manufacturer: 'eldoLED',
            description: 'Studio Grade LED Driver (90% Efficiency)',
            cost: 145.00,
            type: 'driver',
            efficiency: 0.90,
            maxWatts: 100,
            inputVoltage: 'UNV',
            outputVoltage: 'CV',
            busDrawMa: 2.0
        }
    ],
    loads: [] as any[]
};

const blueprints = [] as any[];

// Helper to calculate blueprint stats
function createBlueprint(id: string, name: string, category: string, symbolType: string, loadId: string, driverId?: string, logicIds: string[] = []) {
    const load = registry.loads.find(l => l.id === loadId);
    const driver = registry.drivers.find(d => d.id === driverId);
    const logics = logicIds.map(lid => registry.logic.find(l => l.id === lid));

    const totalCost = (load?.cost || 0) + (driver?.cost || 0) + logics.reduce((sum, l) => sum + (l?.cost || 0), 0);
    const wattage = load?.wattage || 0;
    const efficiency = driver?.efficiency || 1.0;
    const hvAmps = wattage / (120 * efficiency);
    const lvMa = (driver?.busDrawMa || 0) + logics.reduce((sum, l) => sum + (l?.busDrawMa || 0), 0);
    const totalAddresses = logics.reduce((sum, l) => sum + (l?.addresses || 0), 0);

    return {
        id,
        name,
        category,
        symbolType,
        components: {
            loadId,
            driverId,
            logicIds
        },
        calculatedStats: {
            totalCost,
            hvAmps,
            lvMa,
            totalAddresses
        }
    };
}

// 1. Convert old products to loads
oldCatalog.forEach((p: any) => {
    // Skip old complex entries that we are hardcoding
    if (['eldo-dali-dim', 'lunt-dali-010'].includes(p.id)) return;

    registry.loads.push({
        id: p.id,
        name: p.name,
        manufacturer: p.manufacturer,
        description: p.description,
        cost: p.cost,
        url: p.url,
        type: 'load',
        wattage: p.powerWatts || 15, // Default wattage
        category: p.type?.toLowerCase() || 'lighting'
    });
});

// 2. Create standard Blueprints
blueprints.push(createBlueprint('bp-haiku-fan', 'Haiku Fan (Smart)', 'hvac', 'haiku-fan', 'BAF-HAIKU', undefined, ['lunt-dali-010']));
blueprints.push(createBlueprint('bp-he-williams-2ds', 'HE Williams 2DS Downlight', 'lighting', 'recessed-light', '2DS-L9', 'eldo-powerdrive-100'));
blueprints.push(createBlueprint('bp-towel-warmer', 'DALI Towel Warmer', 'lifestyle', 'recessed-light', 'amb-radiant-150', undefined, ['lunt-dali-rm8']));
blueprints.push(createBlueprint('bp-generic-light', 'Generic Light', 'lighting', 'recessed-light', 'generic-light'));

// 3. Migrate project devices
const migratedDevices = oldProject.devices.map((d: any) => {
    let blueprintId = 'bp-generic-light';

    if (d.productId === 'BAF-HAIKU') blueprintId = 'bp-haiku-fan';
    else if (d.productId === '2DS-L9' || d.name?.includes('2DS')) blueprintId = 'bp-he-williams-2ds';

    const blueprint = blueprints.find(bp => bp.id === blueprintId);

    return {
        ...d,
        deviceTypeId: blueprintId, // Direct reference to blueprint
        productId: blueprintId,    // Use blueprint ID as the source
        symbolType: blueprint?.symbolType || 'recessed-light',
        metadata: {
            ...d.metadata,
            _migratedFrom: d.deviceTypeId
        }
    };
});

const catalogV2 = {
    version: '2.0',
    registry,
    blueprints
};

const projectV2 = {
    ...oldProject,
    devices: migratedDevices,
    version: '2.0'
};

fs.writeFileSync(NEW_CATALOG_PATH, JSON.stringify(catalogV2, null, 2));
fs.writeFileSync(NEW_PROJECT_PATH, JSON.stringify(projectV2, null, 2));

console.log('✅ Migration complete!');
console.log(`Created ${NEW_CATALOG_PATH}`);
console.log(`Created ${NEW_PROJECT_PATH}`);
