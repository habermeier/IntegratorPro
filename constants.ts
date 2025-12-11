import { HardwareModule, ModuleType, MountType, ConnectionType } from './types';

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
    id: 'lcp2-enc',
    name: 'Leviton 47605-21E',
    manufacturer: 'Leviton',
    description: '21" Structured Media Enclosure',
    type: ModuleType.ENCLOSURE,
    mountType: MountType.FLUSH,
    size: 0,
    cost: 92.45,
    powerWatts: 0,
    quantity: 1,
    url: 'https://www.google.com/search?q=site:amazon.com+Leviton+47605-21E',
    location: 'LCP-2',
    notes: 'FRAMING ALERT: Stud bay is 18". Block down to 14.5".',
    position: { x: 35, y: 55 }
  },

  // --- CONTROLLERS & GATEWAYS (CONSOLIDATED) ---
  {
    id: 'abb-dali-gw', // Replaced Mean Well DLC-02-KN (which replaced MDT)
    name: 'DALI Gateway Premium 2-fold',
    manufacturer: 'ABB',
    description: 'DG/S 2.64.5.1', // The "Gold Standard" Premium Gateway (2-fold)
    type: ModuleType.LIGHTING,
    mountType: MountType.DIN_RAIL,
    size: 4,
    cost: 425.75, // Verified eibabo
    powerWatts: 2,
    quantity: 2, // Consolidated: 1 per LCP (2 Universes each)
    requiresMains: true,
    requiresBus: [ConnectionType.KNX, ConnectionType.DALI],
    // Strategy: Search-First (Manufacturer + Name)
    url: 'https://www.google.com/search?q=site:eibabo.com+ABB+DALI+Gateway+Premium+2-fold',
    systemIds: ['lighting'],
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
    id: 'lunt-dali-dim',
    name: 'DALI DT8 Dimmer 16A',
    manufacturer: 'Lunatone',
    description: '89453841-HS',
    type: ModuleType.LIGHTING,
    mountType: MountType.DIN_RAIL,
    size: 4,
    cost: 118.00,
    powerWatts: 5,
    quantity: 6,
    requiresMains: true,
    requiresBus: [ConnectionType.DALI],
    systemIds: ['lighting', 'outdoor'],
    url: 'https://www.google.com/search?q=Lunatone+DALI+DT8+Dimmer+16A', // Official site usually ranks first
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
    url: 'https://www.google.com/search?q=Lunatone+DALI+0-10V+Interface',
    instances: [
      { id: 'lcp1-fan-pdr', location: 'LCP-1', universe: 2, notes: 'Powder Room Fan' },
      { id: 'lcp2-fan-toilet', location: 'LCP-2', universe: 3, notes: 'Master Toilet Fan' },
      { id: 'lcp2-fan-shower', location: 'LCP-2', universe: 3, notes: 'Master Shower Fan' },
      { id: 'lcp2-fan-lau', location: 'LCP-2', universe: 3, notes: 'Laundry Fan' },
      { id: 'lcp2-fan-b2', location: 'LCP-2', universe: 4, notes: 'Bed 2 Bath Fan' } // Added Bed 3 back too? List had 5
    ]
  },

  // --- POWER SUPPLIES ---
  {
    id: 'mw-sdr-480',
    name: 'SDR-480-24 PSU',
    manufacturer: 'Mean Well',
    description: '480W 24V',
    type: ModuleType.POWER,
    mountType: MountType.DIN_RAIL,
    size: 5,
    cost: 158.00,
    powerWatts: 480,
    quantity: 1,
    requiresMains: true,
    url: 'https://www.google.com/search?q=site:mouser.com+Mean+Well+SDR-480-24', // Mouser preferred
    location: 'LCP-1',
    notes: 'Dedicated for Garage LEDs.'
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
      { id: 'lcp2-psu', location: 'LCP-2', notes: 'Master LEDs' }
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
    quantity: 3, // Fixed as requested
    requiresMains: true,
    systemIds: ['access'],
    url: 'https://www.google.com/search?q=site:jmac.com+Altronix+eFlow6N',
    instances: [
      { id: 'lcp1-acc-psu', location: 'LCP-1', notes: 'Main House Strikes' },
      { id: 'lcp2-acc-psu', location: 'LCP-2', notes: 'Rear Strikes' }, // Hypothesized location
      { id: 'gar-acc-psu', location: 'LCP-1', notes: 'Garage Strike' } // Hypothesized
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
    systemIds: ['lighting', 'access', 'security', 'hvac', 'irrigation', 'outdoor'],
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
    genericRole: 'PoE Switch',
    url: 'https://www.google.com/search?q=site:store.ui.com+UniFi+Pro+Max+24+PoE',
    position: { x: 62, y: 39 }
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
    location: 'Field',
    notes: 'Side/Garage. Needs PoE.'
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
    url: 'https://www.google.com/search?q=site:amazon.com+CyberPower+PDU+1U',
    location: 'MDF',
    position: { x: 62, y: 37 }
  },

  // --- BULK ITEMS ---
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
    url: 'https://www.google.com/search?q=site:truecable.com+Cat6+Riser',
    location: 'Infra'
  },
  {
    id: 'cable-knx',
    name: 'KNX Bus Cable (UL)',
    manufacturer: 'KNX Supply',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 850.00,
    powerWatts: 0,
    quantity: 1,
    url: 'https://www.google.com/search?q=site:knxsupply.com+KNX+Bus+Cable+UL',
    description: '2500 ft (UL Listed)',
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
  { id: 'c-p-lcp1', fromId: 'lcp1-enc', toId: 'lcp1-psu2', type: ConnectionType.MAINS, notes: '120V Feed' },

  // --- SIGNAL (STRIKES) ---
  { id: 'c-str-1', fromId: 'lcp1-acc-psu', toId: 'field-str', type: ConnectionType.SIGNAL, cableType: '18/2', notes: 'Switched Power' },

  // --- BUS (KNX) ---
  { id: 'c-k-1', fromId: 'lcp1-sys', toId: 'lcp1-gw1', type: ConnectionType.KNX },
  { id: 'c-k-2', fromId: 'lcp1-sys', toId: 'lcp1-inp', type: ConnectionType.KNX },

  // --- BUS (DALI) ---
  { id: 'c-d-1', fromId: 'lcp1-gw1', toId: 'lcp1-dim-gar', type: ConnectionType.DALI, notes: 'Universe 1' }
];

export const MOCK_CONNECTIONS = INITIAL_CONNECTIONS; // Alias for backward compat if needed