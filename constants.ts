import { HardwareModule, ModuleType, MountType, ConnectionType, Vendor } from './types';

export const INITIAL_MODULES: HardwareModule[] = [
  // --- ENCLOSURES & RACKS ---
  {
    id: 'lcp1-enc',
    name: 'Saginaw SCE-24H2408LP',
    manufacturer: 'Saginaw',
    description: '24x24x8 NEMA 4/12 Hinged',
    type: ModuleType.ENCLOSURE,
    mountType: MountType.SURFACE,
    size: 0,
    cost: 394.30,
    powerWatts: 0,
    quantity: 1,
    url: 'https://www.google.com/search?q=site:saginawcontrol.com+Saginaw+SCE-24H2408LP',
    dimensions: { width: 24, height: 24, depth: 8, unit: 'in' },
    notes: 'FIRE CODE: Surface mount. NEMA 4/12 Sealed.',
    location: 'LCP-1',
    position: { x: 72, y: 60 }
  },
  {
    id: 'lcp2-enc-top',
    name: 'Legrand On-Q ENP4280-NA',
    manufacturer: 'Legrand',
    description: '42" Plastic Enclosure Kit (Automation / KNX / DALI)',
    type: ModuleType.ENCLOSURE,
    mountType: MountType.FLUSH,
    size: 0,
    cost: 240.00,
    powerWatts: 0,
    quantity: 1,
    url: 'https://www.google.com/search?q=Legrand+ENP4280-NA',
    location: 'LCP-2 (Automation)',
    notes: 'Top box in double-stack. DIN rails only via AC1055 brackets. Drill 2" pass-through to lower box.',
    position: { x: 35, y: 55 }
  },
  {
    id: 'lcp2-enc-bottom',
    name: 'Legrand On-Q ENP3050-NA',
    manufacturer: 'Legrand',
    description: '30" Plastic Enclosure Kit (Network)',
    type: ModuleType.ENCLOSURE,
    mountType: MountType.FLUSH,
    size: 0,
    cost: 165.00,
    powerWatts: 0,
    quantity: 1,
    url: 'https://www.google.com/search?q=Legrand+ENP3050-NA',
    location: 'LCP-2 (Network)',
    notes: 'Bottom box in double-stack. Houses UniFi switch, fiber, UPS. Connect to upper via 2" pass-through.',
    position: { x: 35, y: 56 }
  },
  {
    id: 'lcp2-din-bracket',
    name: 'Legrand AC1055 DIN Rail Kit',
    manufacturer: 'Legrand',
    description: 'DIN Rail Mounting Bracket for On-Q',
    type: ModuleType.ACCESSORY,
    mountType: MountType.FLUSH,
    size: 0,
    cost: 12.00,
    powerWatts: 0,
    quantity: 4,
    url: 'https://www.google.com/search?q=Legrand+AC1055',
    location: 'LCP-2 (Automation)',
    notes: 'Buy extra. Required to mount DIN gateways/drivers in On-Q enclosure.'
  },

  // --- CONTROLLERS & GATEWAYS (CONSOLIDATED) ---
  {
    id: 'siemens-dali-gw', // Replaced ABB DG/S for UL Compliance
    name: 'KNX/DALI Gateway Twin N 141/03',
    manufacturer: 'Siemens',
    description: 'N 141/03 (UL Listed)',
    type: ModuleType.LIGHTING,
    mountType: MountType.DIN_RAIL,
    size: 4,
    cost: 550.00,
    powerWatts: 2,
    quantity: 2, // Consolidated: 1 per LCP (2 Universes each)
    requiresMains: true,
    requiresBus: [ConnectionType.KNX, ConnectionType.DALI],
    // Strategy: Industrial Automation Distributor
    systemIds: ['lighting'],
    url: 'https://www.google.com/search?q=site:eibabo.com+Siemens+5WG1+141-1AB03+N+141/03',
    linkStatus: 'PREFERRED',
    backupUrl: 'https://mall.industry.siemens.com/mall/en/us/Catalog/Product/5WG1141-1AB03',
    genericRole: 'DALI Gateway',
    instances: [
      { id: 'lcp1-gw', location: 'LCP-1', notes: 'Universes 1 & 2' },
      { id: 'lcp2-gw', location: 'LCP-2', notes: 'Universes 3 & 4' }
    ]
  },
  {
    id: 'abb-ip-router', // Replaced MDT SCN-IP100.03
    name: 'KNX IP Router Secure',
    manufacturer: 'ABB',
    description: 'IPR/S 3.1.1',
    type: ModuleType.NETWORK,
    mountType: MountType.DIN_RAIL,
    size: 2,
    cost: 252.64, // Verified eibabo
    powerWatts: 2,
    quantity: 2,
    requiresMains: true,
    requiresBus: [ConnectionType.KNX, ConnectionType.ETHERNET],
    url: 'https://www.google.com/search?q=site:eibabo.com+ABB+KNX+IP+Router+Secure',
    genericRole: 'KNX IP Router',
    instances: [
      { id: 'lcp1-sys', location: 'LCP-1' },
      { id: 'lcp2-sys', location: 'LCP-2' }
    ]
  },

  // --- LIGHTING ACTUATORS (CONSOLIDATED) ---
  {
    id: 'eldo-dali-dim',
    name: 'POWERdrive 1060/A',
    manufacturer: 'eldoLED',
    description: '100W DALI-2 Driver (UL Class 2)',
    type: ModuleType.LIGHTING,
    mountType: MountType.DIN_RAIL,
    size: 4,
    cost: 145.00,
    powerWatts: 5,
    quantity: 12, // Increased quantity for split Class 2 loads
    requiresMains: true,
    requiresBus: [ConnectionType.DALI],
    systemIds: ['lighting', 'outdoor'],
    url: 'https://www.google.com/search?q=site:ballastshop.com+eldoLED+POWERdrive+1060/A',
    linkStatus: 'PREFERRED',
    genericRole: 'LED Driver (CV)',
    instances: [
      { id: 'lcp1-dim-gar', location: 'LCP-1', universe: 1, notes: 'Garage LED Tape' },
      { id: 'lcp1-dim-kit', location: 'LCP-1', universe: 1, notes: 'Kitchen LED Tape' },
      { id: 'lcp1-dim-din', location: 'LCP-1', universe: 1, notes: 'Dining Room Coves' },
      { id: 'lcp1-dim-liv', location: 'LCP-1', universe: 1, notes: 'Living Room Coves' },
      { id: 'lcp2-dim-head', location: 'LCP-2', universe: 3, notes: 'Master Bed Headboard' },
      { id: 'lcp2-dim-per', location: 'LCP-2', universe: 3, notes: 'Master Bed Perimeter' }
    ]
  },
  {
    id: 'lunt-dali-010',
    name: 'DALI 0-10V Interface',
    manufacturer: 'Lunatone',
    description: '86458668 (PWM)',
    type: ModuleType.HVAC, // Used for Fans usually
    mountType: MountType.DIN_RAIL,
    size: 2,
    cost: 82.50,
    powerWatts: 1,
    quantity: 5,
    requiresBus: [ConnectionType.DALI],
    systemIds: ['hvac'],
    url: 'https://www.google.com/search?q=Lunatone+86458668+DALI+0-10V+Interface',
    instances: [
      { id: 'lcp1-fan-pdr', location: 'LCP-1', universe: 2, notes: 'Powder Room Fan' },
      { id: 'lcp2-fan-toilet', location: 'LCP-2', universe: 3, notes: 'Master Toilet Fan' },
      { id: 'lcp2-fan-shower', location: 'LCP-2', universe: 3, notes: 'Master Shower Fan' },
      { id: 'lcp2-fan-lau', location: 'LCP-2', universe: 3, notes: 'Laundry Fan' },
      { id: 'lcp2-fan-b2', location: 'LCP-2', universe: 4, notes: 'Bed 2 Bath Fan' } // Added Bed 3 back too? List had 5
    ]
  },

  // --- POWER SUPPLIES ---
  // --- POWER SUPPLIES (THE GOLDEN ROUTE) ---
  {
    id: 'mw-sdr-480',
    name: 'SDR-480-24 PSU',
    manufacturer: 'Mean Well',
    description: '480W 24V (UL 508 Listed)',
    type: ModuleType.POWER,
    mountType: MountType.DIN_RAIL,
    size: 5,
    cost: 158.00,
    powerWatts: 480,
    quantity: 1,
    requiresMains: true,
    url: 'https://www.google.com/search?q=site:mouser.com+Mean+Well+SDR-480-24',
    location: 'LCP-1',
    notes: 'Main Plant Power. Output must go to ECP for Class 2.'
  },
  {
    id: 'phoenix-cbm',
    name: 'CBM E4 24DC',
    manufacturer: 'Phoenix Contact',
    description: 'Electronic Circuit Protector (Class 2 Outputs)',
    type: ModuleType.POWER,
    mountType: MountType.DIN_RAIL,
    size: 2,
    cost: 110.00,
    powerWatts: 0,
    quantity: 1,
    requiresMains: false,
    requiresBus: [],
    url: 'https://www.google.com/search?q=site:mouser.com+Phoenix+Contact+CBM+E4+24DC',
    location: 'LCP-1',
    notes: 'NEC 2023 Compliance. Splits 480W into 4x Class 2 Circuits.'
  },
  {
    id: 'light-fix-dali',
    name: 'HE Williams 2DS Square',
    manufacturer: 'HE Williams',
    description: '2" Tunable White Fixed Trimless Downlight (DALI-2)',
    type: ModuleType.LIGHTING,
    mountType: MountType.CEILING_MOUNT,
    size: 0,
    cost: 200.00,
    powerWatts: 15, // Est for 2" High Output
    quantity: 43,
    requiresBus: [ConnectionType.DALI],
    specUrl: 'https://hew.com/specifications/2DS_tunable-white.pdf',
    url: 'https://www.google.com/search?q=site:hewilliams.com+2DS+Tunable+White+Square+Trimless',
    linkStatus: 'PREFERRED',
    systemIds: ['lighting'],
    genericRole: 'Fixed Downlight',
    instances: [
      { id: 'dl-hall', location: 'Hallways', notes: 'Ambient (Qty 3)' },
      { id: 'dl-closet', location: 'Closets/Pantry', notes: 'High CRI (Qty 4)' },
      { id: 'dl-laundry', location: 'Laundry', notes: 'Task (Qty 2)' },
      { id: 'dl-guest', location: 'Guest Bath', notes: 'General (Qty 3)' },
      { id: 'dl-foyer', location: 'Foyer', notes: 'Welcome (Qty 2)' },
      { id: 'dl-fam', location: 'Family Room', notes: 'General (Qty 6)' },
      { id: 'dl-ext', location: 'Exterior', notes: 'Soffit (Qty 10)' }
    ]
  },
  {
    id: 'light-adj-dali',
    name: 'HE Williams 2AS Adjustable',
    manufacturer: 'HE Williams',
    description: '2" Tunable White Adjustable Trimless (DALI-2)',
    type: ModuleType.LIGHTING,
    mountType: MountType.CEILING_MOUNT,
    size: 0,
    cost: 250.00,
    powerWatts: 15,
    quantity: 29,
    requiresBus: [ConnectionType.DALI],
    specUrl: 'https://hew.com/specifications/2AS_tunable-white.pdf',
    url: 'https://www.google.com/search?q=site:hewilliams.com+2AS+Tunable+White+Adjustable',
    linkStatus: 'PREFERRED',
    systemIds: ['lighting'],
    genericRole: 'Accent Downlight',
    instances: [
      { id: 'adj-master', location: 'Master Bed/Bath', notes: 'Task/Art (Qty 8)' },
      { id: 'adj-office', location: 'Offices', notes: 'Video/Work (Qty 8)' },
      { id: 'adj-bed2', location: 'Bed 2', notes: 'General (Qty 4)' },
      { id: 'adj-dining', location: 'Dining', notes: 'Table Accent (Qty 4)' },
      { id: 'adj-liv', location: 'Living', notes: 'Art/Wall (Qty 5)' }
    ]
  },
  {
    id: 'light-adj-dali-4',
    name: 'HE Williams 4DS Adjustable (Alt)',
    manufacturer: 'HE Williams',
    description: '4.5" Tunable White Adjustable (Alternative Option)',
    type: ModuleType.LIGHTING,
    mountType: MountType.CEILING_MOUNT,
    size: 0,
    cost: 280.00, // Estimated slightly higher
    powerWatts: 20, // Higher output
    quantity: 0, // Option only
    requiresBus: [ConnectionType.DALI],
    specUrl: 'https://hew.com/specifications/4DS_tunable-white.pdf',
    url: 'https://www.google.com/search?q=site:hewilliams.com+4DS+Tunable+White+Adjustable',
    linkStatus: 'PREFERRED',
    systemIds: ['lighting'],
    genericRole: 'Accent Downlight (Large)',
    notes: 'ALTERNATIVE: 4.5" Aperture for less busy ceiling. Higher lumens allows fewer fixtures.'
  },
  {
    id: 'led-strip-runs-tbd',
    name: 'LED Strip Runs (TBD)',
    manufacturer: 'Project Input',
    description: 'Placeholder for all linear LED tape runs; lengths and watt/ft TBD.',
    type: ModuleType.LIGHTING,
    mountType: MountType.NA,
    size: 0,
    cost: 0,
    powerWatts: 0,
    quantity: 0,
    systemIds: ['lighting'],
    url: '',
    notes: 'Collect per-run data: location, length, watt/ft, channel mapping, and voltage (24V). Use totals to size HDR-150 supplies; remove any other PSUs from LCP-2.'
  },
  {
    id: 'mw-hdr-150',
    name: 'HDR-150-24 PSU',
    manufacturer: 'Mean Well',
    description: '150W 24V',
    type: ModuleType.POWER,
    mountType: MountType.DIN_RAIL,
    size: 6,
    cost: 52.00,
    powerWatts: 150,
    quantity: 2,
    requiresMains: true,
    url: 'https://www.google.com/search?q=site:mouser.com+Mean+Well+HDR-150-24',
    instances: [
      { id: 'lcp1-psu2', location: 'LCP-1', notes: 'Kitchen LEDs' },
      { id: 'lcp2-psu', location: 'LCP-2 (Automation)', notes: 'Depth-critical. Only HDR-150 allowed; remove/relocate any other LED PSU from LCP-2.' }
    ]
  },
  {
    id: 'altronix-eflow',
    name: 'Altronix eFlow6N',
    manufacturer: 'Altronix',
    description: 'Access Power Controller',
    type: ModuleType.POWER,
    mountType: MountType.WALL_MOUNT,
    size: 0,
    cost: 320.00,
    powerWatts: 10,
    quantity: 1, // Centralized Power
    requiresMains: true,
    systemIds: ['access', 'security'],
    url: 'https://www.google.com/search?q=site:jmac.com+Altronix+eFlow6N',
    linkStatus: 'PREFERRED',
    notes: 'Central Security Power (LCP-2). Backup Battery Required.',
    instances: [
      { id: 'psu-sec-main', location: 'LCP-2', notes: 'Powers All Strikes' }
    ]
  },
  {
    id: 'acc-batt-7ah',
    name: '12V 7Ah SLA Battery',
    manufacturer: 'Yuasa / Generic',
    description: 'Backup Battery for Altronix',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 25.00,
    powerWatts: 0,
    quantity: 2, // 24V System requires 2x12V
    systemIds: ['access', 'security'],
    url: 'https://www.google.com/search?q=12V+7Ah+SLA+Battery',
    linkStatus: 'MARKET',
    location: 'LCP-2'
  },
  {
    id: 'sec-intercom-main',
    name: 'Akuvox X915S',
    manufacturer: 'Akuvox',
    description: '8" Touch Screen Entry',
    type: ModuleType.SECURITY,
    mountType: MountType.WALL_MOUNT,
    size: 0,
    cost: 2800.00,
    powerWatts: 15,
    quantity: 1,
    requiresPoE: true,
    systemIds: ['access', 'security'],
    url: 'https://www.google.com/search?q=site:akuvox.com+X915S',
    linkStatus: 'PREFERRED',
    genericRole: 'Video Intercom (Main)',
    instances: [
      { id: 'int-front', location: 'Front Door', notes: 'Main Entry' }
    ]
  },
  {
    id: 'sec-intercom-sub',
    name: 'Akuvox E16C',
    manufacturer: 'Akuvox',
    description: 'Face Recognition Entry (5")',
    type: ModuleType.SECURITY,
    mountType: MountType.WALL_MOUNT,
    size: 0,
    cost: 550.00, // Est Market Price
    powerWatts: 15,
    quantity: 3, // User requested 3 "other" units
    requiresPoE: true,
    systemIds: ['access', 'security'],
    url: 'https://www.google.com/search?q=site:akuvox.com+E16C+Face+Recognition',
    linkStatus: 'PREFERRED',
    genericRole: 'Video Intercom (Sub)',
    notes: 'Dual Camera (Starlight/IR) + 3D Face Recognition. Mid-tier option.',
    instances: [
      { id: 'int-gar', location: 'Garage', notes: 'Staff/Delivery Entry' },
      { id: 'int-rear', location: 'Rear Door', notes: 'Patio Entry' },
      { id: 'int-side', location: 'Side Gate', notes: 'Service Entry' }
    ]
  },
  {
    id: 'sec-indoor-s567g',
    name: 'Akuvox S567G',
    manufacturer: 'Akuvox',
    description: '10" Android Indoor Monitor (GMS)',
    type: ModuleType.SECURITY,
    mountType: MountType.WALL_MOUNT,
    size: 0,
    cost: 1200.00,
    powerWatts: 12,
    quantity: 1,
    requiresPoE: true,
    systemIds: ['access', 'security'],
    url: 'https://akuvox.com/productsDispParameter?pid=82',
    linkStatus: 'PREFERRED',
    backupUrl: 'https://akuvoxdealer.com/products/akuvox-s567',
    specUrl: 'https://www.globalvisionsinc.com/wp-content/uploads/2024/05/Akuvox-S567-Datasheet.pdf',
    dimensions: { width: 278, height: 164, depth: 22.8, unit: 'mm' },
    genericRole: 'Indoor Monitor',
    notes: 'Android 12 OS, Wi-Fi 6, GMS Certified. Dual mics, quad speakers. Fallback: S567W if G unavailable.',
    instances: [
      { id: 'int-indoor-main', location: 'Main Floor', notes: 'Primary answering station' }
    ]
  },

  // --- SENSORS & INPUTS ---
  {
    id: 'abb-bin-inp', // Replaced MDT BE-16000.02
    name: 'Binary Input 16-fold',
    manufacturer: 'ABB',
    description: 'BE/S 16.20.2.1', // Standard ABB Contact Scanning
    type: ModuleType.SENSOR,
    mountType: MountType.DIN_RAIL,
    size: 8,
    cost: 450.00,
    powerWatts: 0.5,
    quantity: 2,
    requiresBus: [ConnectionType.KNX],
    url: 'https://www.google.com/search?q=site:eibabo.com+ABB+Binary+Input+16-fold',
    instances: [
      { id: 'lcp1-inp', location: 'LCP-1', notes: 'Door Sensors (Main)' },
      { id: 'lcp2-inp', location: 'LCP-2', notes: 'Door Sensors (Master)' }
    ]
  },
  {
    id: 'steinel-tp',
    name: 'True Presence KNX',
    manufacturer: 'Steinel',
    description: 'Breathing-level mmWave Presence Sensor',
    type: ModuleType.SENSOR,
    mountType: MountType.CEILING_MOUNT,
    size: 0,
    cost: 265.00,
    powerWatts: 2,
    quantity: 4,
    requiresBus: [ConnectionType.KNX],
    systemIds: ['lighting', 'hvac'],
    url: 'https://www.google.com/search?q=Steinel+True+Presence+KNX',
    notes: 'Use in walk-in closets, office, and primary bath. Higher bus load—only where true presence needed.',
    instances: [
      { id: 'tp-office', location: 'Office', notes: 'mmWave true presence' },
      { id: 'tp-master-closet', location: 'Master Closet', notes: 'mmWave true presence' },
      { id: 'tp-master-bath', location: 'Master Bath', notes: 'mmWave true presence' },
      { id: 'tp-laundry', location: 'Laundry', notes: 'mmWave true presence' }
    ]
  },

  // --- MDF CORE ---
  {
    id: 'mdf-nuc',
    name: 'ASUS NUC 13 Pro',
    manufacturer: 'ASUS',
    description: 'Home Assistant Server',
    location: 'MDF',
    type: ModuleType.CONTROLLER,
    mountType: MountType.RACK_UNIT,
    size: 1,
    cost: 620.00,
    powerWatts: 45,
    quantity: 1,
    requiresMains: true,
    requiresPoE: false,
    systemIds: ['infra', 'network', 'lighting', 'access', 'security', 'hvac', 'irrigation', 'outdoor'],
    genericRole: 'Automation Server',
    url: 'https://www.google.com/search?q=ASUS+NUC+13+Pro+Kit+Buy', // Broad search
    position: { x: 62, y: 38 }
  },
  {
    id: 'mdf-sw',
    name: 'UniFi Pro Max 24 PoE',
    manufacturer: 'Ubiquiti',
    description: 'Core Switch',
    location: 'MDF',
    type: ModuleType.NETWORK,
    mountType: MountType.RACK_UNIT,
    size: 1,
    cost: 799.00, // Verified UI Store
    powerWatts: 50,
    quantity: 1,
    requiresMains: true,
    systemIds: ['infra', 'network'],
    genericRole: 'PoE Switch',
    url: 'https://www.google.com/search?q=site:store.ui.com+UniFi+Pro+Max+24+PoE',
    position: { x: 62, y: 39 }
  },
  {
    id: 'lcp2-sw',
    name: 'UniFi Pro Max 16 PoE',
    manufacturer: 'Ubiquiti',
    description: 'Edge Switch for LCP-2 Network Box',
    location: 'LCP-2 (Network)',
    type: ModuleType.NETWORK,
    mountType: MountType.SURFACE,
    size: 0,
    cost: 599.00,
    powerWatts: 45,
    quantity: 1,
    requiresMains: true,
    systemIds: ['infra', 'network'],
    url: 'https://www.google.com/search?q=UniFi+Pro+Max+16+PoE',
    notes: 'Lives in lower 30" On-Q. Allow clearance for power brick/UPS.'
  },
  {
    id: 'lcp2-ups',
    name: 'CyberPower SL750U',
    manufacturer: 'CyberPower',
    description: 'Slimline 750VA UPS',
    location: 'LCP-2 (Network)',
    type: ModuleType.POWER,
    mountType: MountType.SURFACE,
    size: 0,
    cost: 99.00,
    powerWatts: 0,
    quantity: 1,
    requiresMains: true,
    systemIds: ['infra', 'network'],
    url: 'https://www.google.com/search?q=CyberPower+SL750U',
    notes: 'Mount low in 30" On-Q. Provides ride-through for switch and fiber.'
  },
  {
    id: 'lcp2-sfp',
    name: '10G SFP+ Module Pair',
    manufacturer: 'Ubiquiti',
    description: '2x SFP+ SR Modules + Duplex Fiber Patch',
    location: 'LCP-2 (Network)',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 140.00,
    powerWatts: 0,
    quantity: 1,
    systemIds: ['infra', 'network'],
    url: 'https://www.google.com/search?q=Ubiquiti+UF-MM-10G+pair',
    notes: 'Pair for MDF <-> LCP-2 link. Include duplex LC fiber patch; keep radius gentle in On-Q.'
  },

  // --- FIELD DEVICES ---
  {
    id: 'field-ak-x915',
    name: 'X915 Door Phone',
    manufacturer: 'Akuvox',
    description: 'Flagship Touchscreen',
    type: ModuleType.SECURITY,
    mountType: MountType.WALL_MOUNT,
    size: 0,
    cost: 2995.00, // Verified akuvoxdealer.com
    powerWatts: 12,
    quantity: 1,
    requiresPoE: true,
    systemIds: ['access'],
    genericRole: 'Video Intercom',
    url: 'https://www.google.com/search?q=site:akuvoxdealer.com+Akuvox+X915',
    location: 'Field',
    position: { x: 40, y: 80 }
  },
  {
    id: 'field-ak-e16',
    name: 'E16 Door Phone',
    manufacturer: 'Akuvox',
    description: 'Face Recognition',
    type: ModuleType.SECURITY,
    mountType: MountType.WALL_MOUNT,
    size: 0,
    cost: 1195.00, // Verified akuvoxdealer.com
    powerWatts: 10,
    quantity: 3,
    requiresPoE: true,
    url: 'https://www.google.com/search?q=site:akuvoxdealer.com+Akuvox+E16',
    linkStatus: 'PREFERRED',
    genericRole: 'Video Intercom (Sub)',
    notes: 'Dual Camera (Starlight/IR) + 3D Face Recognition. Flush mounted in Garage (Fire Rated) & Mandoor.',
    instances: [
      { id: 'int-gar', location: 'Garage', notes: 'Flush Mount + Fire Pad' },
      { id: 'int-rear', location: 'Rear Door', notes: 'Flush Mount' },
      { id: 'int-side', location: 'Side Gate', notes: 'Surface + Hood (No Wall Depth)' }
    ]
  },
  {
    id: 'acc-mount-x915',
    name: 'X915 Flush Mount Kit',
    manufacturer: 'Akuvox',
    description: 'In-Wall Box + Rain Cover',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 150.00,
    powerWatts: 0,
    quantity: 1,
    systemIds: ['access'],
    url: 'https://www.google.com/search?q=site:akuvox.com+AK-X915S-RCFlush',
    linkStatus: 'PREFERRED',
    location: 'Front Door'
  },
  {
    id: 'acc-mount-e16',
    name: 'E16 Flush Mount Kit',
    manufacturer: 'Akuvox',
    description: 'In-Wall Backbox',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 80.00,
    powerWatts: 0,
    quantity: 2, // Garage + Rear
    systemIds: ['access'],
    url: 'https://www.google.com/search?q=site:akuvox.com+E16+Flush+Mount+Kit',
    linkStatus: 'PREFERRED',
    location: 'Field'
  },
  {
    id: 'acc-fire-pad',
    name: 'STI SpecSeal Putty Pad',
    manufacturer: 'STI',
    description: 'Fire Rated Box Pad',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 15.00,
    powerWatts: 0,
    quantity: 1,
    systemIds: ['access'],
    url: 'https://www.google.com/search?q=STI+SpecSeal+Putty+Pad+SSP4S',
    linkStatus: 'MARKET',
    notes: 'CRITICAL: Required for Garage flush mount to maintain firewall rating.',
    location: 'Garage'
  },
  {
    id: 'sec-sr01',
    name: 'Akuvox SR01',
    manufacturer: 'Akuvox',
    description: 'Secure Relay Module',
    type: ModuleType.SECURITY,
    mountType: MountType.DIN_RAIL, // Can be DIN or Box
    size: 2,
    cost: 35.00,
    powerWatts: 1,
    quantity: 4, // 1 per Intercom (Main + 3 Subs)
    requiresMains: false, // 12V DC
    systemIds: ['access', 'security'],
    url: 'https://www.google.com/search?q=site:akuvox.com+SR01+Security+Relay',
    linkStatus: 'PREFERRED',
    genericRole: 'Security Relay',
    notes: 'CRITICAL: Prevents door hotwiring if intercom is removed. Installed inside secure perimeter (LCP-2/Safe Side).'
  },
  {
    id: 'field-str',
    name: '1006 Electric Strike',
    manufacturer: 'HES',
    description: 'Heavy Duty Fail Secure',
    type: ModuleType.SECURITY,
    mountType: MountType.WALL_MOUNT,
    size: 0,
    cost: 385.00,
    powerWatts: 8,
    quantity: 4,
    notes: 'Requires 12/24V Switched from Altronix.',
    url: 'https://www.google.com/search?q=site:jmac.com+HES+1006+Electric+Strike',
  },
  {
    id: 'cam-g5-pro',
    name: 'G5 Professional',
    manufacturer: 'Ubiquiti',
    description: '4K PoE Camera',
    type: ModuleType.SECURITY,
    mountType: MountType.WALL_MOUNT,
    size: 0,
    cost: 379.00, // Verified
    powerWatts: 10,
    quantity: 12,
    requiresPoE: true,
    systemIds: ['security'],
    genericRole: 'IP Camera',
    url: 'https://www.google.com/search?q=site:store.ui.com+Ubiquiti+G5+Professional',
    location: 'Field'
  },
  {
    id: 'velux-klf',
    name: 'Velux KLF 200',
    manufacturer: 'Velux',
    description: 'Skylight Gateway (KNX Integ)',
    type: ModuleType.HVAC,
    mountType: MountType.WALL_MOUNT,
    size: 0,
    cost: 350.00,
    powerWatts: 5,
    quantity: 1,
    requiresMains: true,
    systemIds: ['hvac'],
    location: 'MDF',
    url: 'https://www.velux.com/products/smart-home/klf200'
  },

  // --- UI / SWITCHES ---
  {
    id: 'mdt-glass-smart',
    name: 'MDT Glass Tactile Smart',
    manufacturer: 'MDT',
    description: '6-Fold / Color Display',
    type: ModuleType.UI,
    mountType: MountType.WALL_MOUNT,
    size: 0,
    cost: 180.00,
    powerWatts: 0.5,
    quantity: 12,
    requiresBus: [ConnectionType.KNX],
    systemIds: ['lighting', 'hvac', 'audio'],
    url: 'https://www.google.com/search?q=site:knxsupply.com+MDT+Glass+Tactile+Smart+II',
    genericRole: 'Smart Switch',
    notes: 'Primary User Interface. Temperature sensor built-in.',
    instances: [
      { id: 'sw-master', location: 'Master Bed', notes: 'Bedside' },
      { id: 'sw-kit', location: 'Kitchen', notes: 'Entry' },
      { id: 'sw-liv', location: 'Living', notes: 'Main' }
    ]
  },

  // --- ACCESSORIES ---
  {
    id: 'acc-patch',
    name: 'Patch Panel',
    manufacturer: 'Generic',
    description: '24-Port Keystone',
    type: ModuleType.ACCESSORY,
    mountType: MountType.RACK_UNIT,
    size: 1,
    cost: 25.00,
    powerWatts: 0,
    quantity: 2,
    systemIds: ['infra'],
    url: 'https://www.google.com/search?q=site:amazon.com+Patch+Panel+24-Port+Keystone',
    location: 'MDF',
    position: { x: 62, y: 40 }
  },
  {
    id: 'acc-pdu',
    name: 'PDU',
    manufacturer: 'CyberPower',
    description: '1U Rack PDU',
    type: ModuleType.ACCESSORY,
    mountType: MountType.RACK_UNIT,
    size: 1,
    cost: 50.00,
    powerWatts: 0,
    quantity: 1,
    systemIds: ['infra'],
    url: 'https://www.google.com/search?q=site:amazon.com+CyberPower+PDU+1U',
    location: 'MDF',
    position: { x: 62, y: 37 }
  },

  // --- BULK ITEMS ---
  // --- POWER & CONTROL (HYBRID) ---
  {
    id: 'cable-romex-pcs',
    name: 'Romex SIMpull PCS Duo',
    manufacturer: 'Southwire',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 1450.00, // Est for 1000ft
    powerWatts: 0,
    quantity: 1, // 1000ft Spool
    systemIds: ['infra', 'lighting'],
    url: 'https://www.google.com/search?q=Southwire+67962802+Romex+PCS+Duo+12/2+16/2',
    linkStatus: 'PREFERRED',
    description: '12/2 Power + 16/2 Control (NM-B-PCS)',
    notes: 'CORE STRATEGY: "Code Hack" for NEC. Bundles Class 1 (120V) + Class 2 (0-10V/DALI) in one cable. Saves dual pulls.',
    location: 'Infra'
  },
  {
    id: 'cable-cat6',
    name: 'Cat6 / Cat6a Riser',
    manufacturer: 'TrueCable',
    description: '3000 ft Bulk',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 550.00,
    powerWatts: 0,
    quantity: 1,
    systemIds: ['infra'],
    url: 'https://www.google.com/search?q=site:truecable.com+Cat6+Riser',
    location: 'Infra'
  },
  {
    id: 'cable-knx',
    name: 'Syston 18/4 Solid Shielded FPLR',
    manufacturer: 'Syston Cable',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 203.00,
    powerWatts: 0,
    quantity: 1, // 500ft roll
    systemIds: ['infra', 'lighting', 'hvac', 'irrigation'],
    url: 'https://www.walmart.com/ip/Syston-Fire-Alarm-Cable-Security-Burglar-Station-Wire-18-4-500-ft-100-Solid-Copper-Shielded-FPLP-CL3P-FT6-CMP-Plenum-Rated-UL-and-or-ETL-Listed-18-Ga/10245316771',
    linkStatus: 'PREFERRED',
    backupUrl: 'https://www.google.com/search?q=Southwire+F40567-1A+18/4+Shielded+FPLR',
    description: '18 AWG 4-Conductor Solid Core Shielded Fire Alarm Cable (FPLR Rated)',
    notes: 'US-LEGAL KNX CABLE. 18 AWG Solid Core pushes directly into KNX terminals (no ferrules). FPLR = Fire Power Limited Riser (UL Listed). COLOR MAPPING: Red=Bus+, Black=Bus-, Yellow/White=Aux (spares). CRITICAL: Use Wago 221 pigtails at switches (see conn-wago-221). Alternative: Southwire F40567-1A (~$0.50/ft from Platt Electric).',
    location: 'Infra'
  },
  {
    id: 'cable-sec-184',
    name: '18/4 Shielded Security Wire',
    manufacturer: 'Belden / Generic',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 180.00,
    powerWatts: 0,
    quantity: 1, // 500ft
    systemIds: ['infra', 'access'],
    url: 'https://www.google.com/search?q=18/4+Shielded+Security+Cable+Plenum',
    linkStatus: 'MARKET',
    description: '18 AWG 4-Conductor Shielded (Strikes/RS485)',
    notes: 'For connecting Intercoms to SR01 (RS485) and SR01 to Strikes (Power).',
    location: 'Infra'
  },
  {
    id: 'conn-wago',
    name: 'Wago KNX Connectors',
    manufacturer: 'Wago',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 45.00,
    powerWatts: 0,
    quantity: 2, // Pack of 50
    url: 'https://www.google.com/search?q=site:knxsupply.com+Wago+KNX+Connectors',
    description: 'Red/Black Push-Wire (Box of 50)',
    location: 'Infra'
  },
  {
    id: 'conn-wago-221',
    name: 'Wago 221-412 Lever Nuts',
    manufacturer: 'Wago',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 18.00,
    powerWatts: 0,
    quantity: 2, // 2 boxes (50 pcs total)
    systemIds: ['infra', 'lighting', 'hvac', 'irrigation'],
    url: 'https://www.amazon.com/Wago-221-412-LEVER-NUTS-Conductor-Connectors/dp/B00J3WTEOQ',
    linkStatus: 'PREFERRED',
    description: '2-Conductor Compact Splicing Connectors (25 pack)',
    notes: 'PIGTAIL TECHNIQUE (CRITICAL): 18 AWG wire is too thick for KNX switch terminals. At each switch box: (1) Join incoming Red + outgoing Red + 6" pigtail (20-22 AWG thin wire) in Wago 221. (2) Plug pigtail into switch. (3) Repeat for Black. This passes inspection, fits in box, and ensures perfect connection. Buy extra for field changes.',
    location: 'Infra'
  },
  {
    id: 'wire-pigtail-22awg',
    name: '22 AWG Solid Hook-Up Wire',
    manufacturer: 'Generic',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 25.00,
    powerWatts: 0,
    quantity: 2, // 100ft each Red + Black
    systemIds: ['infra', 'lighting', 'hvac', 'irrigation'],
    url: 'https://www.google.com/search?q=22+AWG+Solid+Tinned+Copper+Hook-Up+Wire',
    linkStatus: 'MARKET',
    description: '22 AWG Solid Core (Red + Black spools)',
    notes: 'For KNX switch pigtails. Cut 6" lengths. Thin enough to fit KNX terminals, thick enough for Wago 221. Buy red and black spools (100ft each). Can substitute 20 AWG if 22 unavailable.',
    location: 'Infra'
  },

  // --- OUTDOOR DMX LIGHTING SYSTEM (PHASE 1: ROUGH-IN) ---
  {
    id: 'dmx-weinzierl-544',
    name: 'Weinzierl 544 KNX DMX Gateway',
    manufacturer: 'Weinzierl',
    description: 'KNX to DMX Gateway (DIN Rail)',
    type: ModuleType.LIGHTING,
    mountType: MountType.DIN_RAIL,
    size: 4,
    cost: 260.00,
    powerWatts: 2,
    quantity: 1,
    requiresMains: false,
    requiresBus: [ConnectionType.KNX],
    systemIds: ['outdoor', 'lighting'],
    url: 'https://www.google.com/search?q=Weinzierl+KNX+DMX+Gateway+544',
    linkStatus: 'PREFERRED',
    genericRole: 'KNX to DMX Gateway',
    location: 'LCP-1',
    notes: 'PHASE 1: Maps KNX Group Addresses to DMX512 Universe. Requires 24V DC power from HDR-30-24.'
  },
  {
    id: 'dmx-enttec-rds4',
    name: 'Enttec DIN RDS4',
    manufacturer: 'Enttec',
    description: '4-Port Isolated DMX/RDM Splitter (DIN Rail)',
    type: ModuleType.LIGHTING,
    mountType: MountType.DIN_RAIL,
    size: 4,
    cost: 215.00,
    powerWatts: 2,
    quantity: 1,
    requiresMains: false,
    systemIds: ['outdoor', 'lighting'],
    url: 'https://www.google.com/search?q=Enttec+DIN+RDS4+DMX+Splitter',
    linkStatus: 'PREFERRED',
    genericRole: 'DMX Splitter',
    location: 'LCP-1',
    notes: 'PHASE 1: Provides surge isolation + 4 isolated DMX outputs. Requires 12-24V DC. Protects LCP-1 from outdoor surges.'
  },
  {
    id: 'dmx-psu-hdr30',
    name: 'Mean Well HDR-30-24',
    manufacturer: 'Mean Well',
    description: '24V DC / 30W DIN Rail Power Supply',
    type: ModuleType.POWER,
    mountType: MountType.DIN_RAIL,
    size: 2,
    cost: 20.00,
    powerWatts: 30,
    quantity: 1,
    requiresMains: true,
    systemIds: ['outdoor', 'lighting'],
    url: 'https://www.google.com/search?q=site:mouser.com+Mean+Well+HDR-30-24',
    linkStatus: 'PREFERRED',
    location: 'LCP-1',
    notes: 'PHASE 1: Logic power ONLY for DMX Gateway + Splitter. Does NOT power field fixtures.'
  },
  {
    id: 'cable-cat5e-db',
    name: 'Shielded Cat5e Direct Burial',
    manufacturer: 'Southwire / Generic',
    description: '500ft Spool Shielded Cat5e Direct Burial',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 85.00,
    powerWatts: 0,
    quantity: 1,
    systemIds: ['outdoor', 'infra'],
    url: 'https://www.google.com/search?q=Shielded+Cat5e+Direct+Burial+500ft',
    linkStatus: 'MARKET',
    notes: 'PHASE 1: USE BLUE PAIR ONLY for DMX+/DMX-. Foil shield provides noise immunity. Terminate unused pairs. Tape with 14/2 power wire every 3ft.'
  },
  {
    id: 'cable-142-landscape',
    name: '14/2 Landscape Wire Direct Burial',
    manufacturer: 'Southwire / Generic',
    description: '500ft Spool 14/2 Direct Burial Landscape Wire',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 120.00,
    powerWatts: 0,
    quantity: 1,
    systemIds: ['outdoor', 'infra'],
    url: 'https://www.google.com/search?q=14/2+Landscape+Wire+Direct+Burial+500ft',
    linkStatus: 'MARKET',
    notes: 'PHASE 1: For fixture runs ≤100ft from driver. Bundle with Cat5e using electrical tape every 3ft (hybrid cable method).'
  },
  {
    id: 'cable-102-landscape',
    name: '10/2 Landscape Wire Direct Burial',
    manufacturer: 'Southwire / Generic',
    description: '250ft Spool 10/2 Direct Burial Landscape Wire',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 180.00,
    powerWatts: 0,
    quantity: 1,
    systemIds: ['outdoor', 'infra'],
    url: 'https://www.google.com/search?q=10/2+Landscape+Wire+Direct+Burial+250ft',
    linkStatus: 'MARKET',
    notes: 'PHASE 1: For runs >100ft (deep backyard/front curb). Reduces voltage drop on 24V DC. Bundle with Cat5e.'
  },
  {
    id: 'acc-bell-5320',
    name: 'Bell 5320-0 Weatherproof Box',
    manufacturer: 'Bell',
    description: 'Single Gang Weatherproof Box (Grey PVC)',
    type: ModuleType.ACCESSORY,
    mountType: MountType.WALL_MOUNT,
    size: 0,
    cost: 8.00,
    powerWatts: 0,
    quantity: 3,
    systemIds: ['outdoor'],
    url: 'https://www.google.com/search?q=Bell+5320-0+Weatherproof+Box',
    linkStatus: 'MARKET',
    notes: 'PHASE 1: Strategic splice points (mid-yard, facade wall, front gate). Bury with 6" clearance above grade.'
  },
  {
    id: 'acc-bell-blank',
    name: 'Bell Blank Weatherproof Cover',
    manufacturer: 'Bell',
    description: 'Metal Blank Cover with Gasket',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 6.00,
    powerWatts: 0,
    quantity: 3,
    systemIds: ['outdoor'],
    url: 'https://www.google.com/search?q=Bell+Metal+Blank+Weatherproof+Cover',
    linkStatus: 'MARKET',
    notes: 'PHASE 1: Secure all splices inside boxes. Use gasket to maintain NEMA 3R rating.'
  },
  {
    id: 'acc-dryconn',
    name: 'DryConn Waterproof Wire Nuts',
    manufacturer: 'DryConn',
    description: 'Gel-Filled Waterproof Wire Nuts (100pc Assorted)',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 25.00,
    powerWatts: 0,
    quantity: 1,
    systemIds: ['outdoor'],
    url: 'https://www.google.com/search?q=DryConn+Gel+Filled+Wire+Nuts',
    linkStatus: 'MARKET',
    notes: 'PHASE 1: MANDATORY for all outdoor splices. Standard wire nuts WILL fail outdoors.'
  },
  {
    id: 'acc-3m-tape',
    name: '3M Temflex 1700 Electrical Tape',
    manufacturer: '3M',
    description: 'Heavy-Duty Electrical Tape (10-pack)',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 30.00,
    powerWatts: 0,
    quantity: 1,
    systemIds: ['outdoor', 'infra'],
    url: 'https://www.google.com/search?q=3M+Temflex+1700+Electrical+Tape',
    linkStatus: 'MARKET',
    notes: 'PHASE 1: Tape Cat5e + Power wire every 3ft to create \'hybrid cable\'. Label DMX runs with flags.'
  },

  // --- OUTDOOR DMX LIGHTING SYSTEM (PHASE 2: FIXTURES & DRIVERS) ---
  {
    id: 'fix-lumenpulse-lbx',
    name: 'Lumenpulse Lumenbeam Small (LBX-S)',
    manufacturer: 'Lumenpulse',
    description: '24V DC RGBW Uplight, Narrow Spot (10°), DMX/RDM',
    type: ModuleType.LIGHTING,
    mountType: MountType.SURFACE,
    size: 0,
    cost: 550.00,
    powerWatts: 15,
    quantity: 0, // TBD
    requiresMains: false,
    systemIds: ['outdoor'],
    url: 'https://www.google.com/search?q=Lumenpulse+Lumenbeam+Small+LBX-S',
    linkStatus: 'PREFERRED',
    genericRole: 'Tree Uplight / Accent Spot',
    notes: 'PHASE 2: Stake mount for trees/specimen plants. High CRI (90+). Quantity TBD based on design plan.'
  },
  {
    id: 'fix-lumenpulse-facade',
    name: 'Lumenpulse Facade Logic',
    manufacturer: 'Lumenpulse',
    description: '24V DC Linear Wall Grazer, DMX512, Asymmetric Spread',
    type: ModuleType.LIGHTING,
    mountType: MountType.SURFACE,
    size: 0,
    cost: 450.00,
    powerWatts: 20,
    quantity: 0, // TBD
    requiresMains: false,
    systemIds: ['outdoor'],
    url: 'https://www.google.com/search?q=Lumenpulse+Facade+Logic',
    linkStatus: 'PREFERRED',
    genericRole: 'Wall Grazer / Architecture',
    notes: 'PHASE 2: Mounts at grade to graze stone/brick walls. Quantity TBD based on design plan.'
  },
  {
    id: 'fix-pureedge-bollard',
    name: 'PureEdge Outdoor Bollard (24V DMX)',
    manufacturer: 'PureEdge',
    description: 'Tunable White (2200K-5700K) via DMX, Architectural Bollard',
    type: ModuleType.LIGHTING,
    mountType: MountType.SURFACE,
    size: 0,
    cost: 500.00,
    powerWatts: 12,
    quantity: 0, // TBD
    requiresMains: false,
    systemIds: ['outdoor'],
    url: 'https://www.google.com/search?q=PureEdge+Outdoor+Bollard+DMX',
    linkStatus: 'PREFERRED',
    genericRole: 'Path Light / Bollard',
    notes: 'PHASE 2: Die-cast aluminum. ADA compliant height options. Quantity TBD based on design plan.'
  },
  {
    id: 'drv-hlg-320',
    name: 'Mean Well HLG-320H-24B',
    manufacturer: 'Mean Well',
    description: '320W / 24V DC Constant Voltage Driver (IP67)',
    type: ModuleType.POWER,
    mountType: MountType.SURFACE,
    size: 0,
    cost: 110.00,
    powerWatts: 320,
    quantity: 0, // TBD
    requiresMains: true,
    systemIds: ['outdoor'],
    url: 'https://www.google.com/search?q=site:mouser.com+Mean+Well+HLG-320H-24B',
    linkStatus: 'PREFERRED',
    notes: 'PHASE 2: Field power driver. Dimmable via 0-10V or PWM. Mount in weatherproof NEMA box buried in landscape. Quantity TBD.'
  },
  {
    id: 'drv-hlg-150',
    name: 'Mean Well HLG-150H-24A',
    manufacturer: 'Mean Well',
    description: '150W / 24V DC Constant Voltage Driver (IP67)',
    type: ModuleType.POWER,
    mountType: MountType.SURFACE,
    size: 0,
    cost: 65.00,
    powerWatts: 150,
    quantity: 0, // TBD
    requiresMains: true,
    systemIds: ['outdoor'],
    url: 'https://www.google.com/search?q=site:mouser.com+Mean+Well+HLG-150H-24A',
    linkStatus: 'PREFERRED',
    notes: 'PHASE 2: Secondary zones or backup. Same specs as HLG-320H but lower wattage. Quantity TBD.'
  },
  {
    id: 'acc-nema-box',
    name: 'Bud Industries NBF-32026 NEMA 4X',
    manufacturer: 'Bud Industries',
    description: 'Outdoor Enclosure (NEMA 4X Polycarbonate)',
    type: ModuleType.ACCESSORY,
    mountType: MountType.SURFACE,
    size: 0,
    cost: 75.00,
    powerWatts: 0,
    quantity: 0, // TBD
    systemIds: ['outdoor'],
    url: 'https://www.google.com/search?q=Bud+Industries+NBF-32026+NEMA+4X',
    linkStatus: 'MARKET',
    notes: 'PHASE 2: Must fit HLG-320H + terminal blocks. Include cable glands for sealed entries. Quantity TBD.'
  },
  {
    id: 'dmx-decoder-ltech',
    name: 'LTech LT-DMX-1809',
    manufacturer: 'LTech',
    description: '4-Channel 24V DMX Decoder (IP67)',
    type: ModuleType.LIGHTING,
    mountType: MountType.SURFACE,
    size: 0,
    cost: 45.00,
    powerWatts: 1,
    quantity: 0, // TBD
    requiresMains: false,
    systemIds: ['outdoor'],
    url: 'https://www.google.com/search?q=LTech+LT-DMX-1809+DMX+Decoder',
    linkStatus: 'MARKET',
    genericRole: 'DMX Decoder',
    notes: 'PHASE 2: Converts DMX512 to 4x PWM channels for non-DMX-native fixtures. Weatherproof housing. Quantity TBD.'
  }
];

export const INITIAL_CONNECTIONS = [
  // --- NETWORK / POE ---
  { id: 'c-nuc', fromId: 'mdf-sw', toId: 'mdf-nuc', type: ConnectionType.ETHERNET, cableType: 'Cat6' },
  { id: 'c-x915', fromId: 'mdf-sw', toId: 'field-ak-x915', type: ConnectionType.ETHERNET, isPoE: true, cableType: 'Cat6a' },
  // Link to LCPs
  { id: 'c-lcp1', fromId: 'mdf-sw', toId: 'lcp1-sys', type: ConnectionType.ETHERNET, cableType: 'Cat6' },
  { id: 'c-lcp2', fromId: 'mdf-sw', toId: 'lcp2-sys', type: ConnectionType.ETHERNET, cableType: 'Cat6' },

  // --- POWER (MAINS) ---
  { id: 'c-p-lcp1', fromId: 'lcp1-enc', toId: 'mw-sdr-480', type: ConnectionType.MAINS, notes: '120V Feed to Main Plant' },

  // --- POWER (DC CLASS 1 -> CLASS 2) ---
  { id: 'c-p-ecp', fromId: 'mw-sdr-480', toId: 'phoenix-cbm', type: ConnectionType.MAINS, notes: '24V High Current (Class 1)' },

  // --- POWER (CLASS 2 DISTRIBUTION) ---
  { id: 'c-p-d1', fromId: 'phoenix-cbm', toId: 'eldo-dali-dim', type: ConnectionType.MAINS, notes: '96W Class 2 Branch 1' },
  { id: 'c-p-d2', fromId: 'phoenix-cbm', toId: 'siemens-dali-gw', type: ConnectionType.MAINS, notes: 'Aux Power' },

  // --- SIGNAL (STRIKES) ---
  { id: 'c-str-1', fromId: 'lcp2-acc-main', toId: 'field-str', type: ConnectionType.SIGNAL, cableType: '18/4 Shielded', notes: 'Secure Power via SR01' },

  // --- BUS (KNX) ---
  { id: 'c-k-1', fromId: 'lcp1-sys', toId: 'lcp1-gw1', type: ConnectionType.KNX },
  { id: 'c-k-2', fromId: 'lcp1-sys', toId: 'lcp1-inp', type: ConnectionType.KNX },

  // --- BUS (DALI) ---
  { id: 'c-d-1', fromId: 'lcp1-gw1', toId: 'lcp1-dim-gar', type: ConnectionType.DALI, notes: 'Universe 1' }
];

export const MOCK_CONNECTIONS = INITIAL_CONNECTIONS; // Alias for backward compat if needed

export const PREFERRED_VENDORS: Vendor[] = [
  {
    id: 'mouser',
    name: 'Mouser Electronics',
    category: 'Industrial Power',
    tier: 1,
    description: 'Premier authorized distributor for UL 508A components. Fast US shipping.',
    items: ['Mean Well SDR Series', 'Phoenix Contact CBM', 'Wago Terminals'],
    url: 'https://www.mouser.com'
  },
  {
    id: 'galco',
    name: 'Galco Industrial',
    category: 'Automation',
    tier: 1,
    description: 'Specialists in heavy industrial automation and Siemens authorized dealer.',
    items: ['Siemens KNX/DALI Gateways', 'Legacy Industrial PLC'],
    url: 'https://www.galco.com'
  },
  {
    id: '1000bulbs',
    name: '1000Bulbs / Polar-Ray',
    category: 'Lighting',
    tier: 2,
    description: 'Deep inventory of architectural LED drivers and commercial fixtures.',
    items: ['eldoLED POWERdrive', 'Lutron Ecosystem'],
    url: 'https://www.1000bulbs.com'
  },
  {
    id: 'jmac',
    name: 'JMAC Supply',
    category: 'Security & LV',
    tier: 2,
    description: 'Go-to for US security hardware, enclosures, and strikers.',
    items: ['Saginaw Enclosures', 'HES Electric Strikes', 'Altronix Power'],
    url: 'https://www.jmac.com'
  },
  {
    id: 'knx-supply',
    name: 'KNX Supply (USA)',
    category: 'Specialty Controls',
    tier: 3,
    description: 'Miami-based importer for European KNX sensors.',
    items: ['Steinel Connect Sensors', 'MDT Glass Tactile'],
    url: 'https://www.knxsupply.com'
  },
  {
    id: 'akuvox',
    name: 'Akuvox Dealer',
    category: 'Security',
    tier: 3,
    description: 'Authorized distributor for Video Intercoms & Licensing.',
    items: ['X915 Door Phone', 'E16 Access Unit', 'SmartPlus App'],
    url: 'https://akuvoxdealer.com'
  }
];
