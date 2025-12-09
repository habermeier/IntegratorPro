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
    url: 'https://www.mecampbell.com/saginaw-control-sce-24h2408lp-single-hinged-door-enclosure-with-door-cllamps-carbon-steel-gray-nema-4-12-13-iec-ip66-24x24x8-sub-panel-ordered-separately.html',
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
    url: 'https://www.jmac.com/Leviton_47605_21E_p/leviton-47605-21e.htm',
    location: 'LCP-2',
    notes: 'FRAMING ALERT: Stud bay is 18". Block down to 14.5".',
    position: { x: 35, y: 55 }
  },

  // --- CONTROLLERS & GATEWAYS (CONSOLIDATED) ---
  {
    id: 'mdt-dali-gw',
    name: 'DALI Control Gateway',
    manufacturer: 'MDT',
    description: 'SCN-DALI64.03',
    type: ModuleType.LIGHTING,
    mountType: MountType.DIN_RAIL,
    size: 4,
    cost: 385.00,
    powerWatts: 2,
    quantity: 4, // Derived from instances
    requiresMains: true,
    requiresBus: [ConnectionType.KNX, ConnectionType.DALI],
    url: 'https://www.mdt.de/en/products/product-detail/actuators/dali-gateways/dali-control-ip-gateway.html',
    systemIds: ['lighting'],
    genericRole: 'DALI Gateway',
    instances: [
      { id: 'lcp1-gw1', location: 'LCP-1', universe: 1, notes: 'Universe 1 (Garage/Ext)' },
      { id: 'lcp1-gw2', location: 'LCP-1', universe: 2, notes: 'Universe 2 (Main Floor)' },
      { id: 'lcp2-gw1', location: 'LCP-2', universe: 3, notes: 'Universe 3 (Master Suite)' },
      { id: 'lcp2-gw2', location: 'LCP-2', universe: 4, notes: 'Universe 4 (Bedrooms)' }
    ]
  },
  {
    id: 'mdt-ip-router',
    name: 'IP Router / Bus Pwr',
    manufacturer: 'MDT',
    description: 'SCN-IPR300.03',
    type: ModuleType.NETWORK,
    mountType: MountType.DIN_RAIL,
    size: 2,
    cost: 445.00,
    powerWatts: 3,
    quantity: 2,
    requiresMains: true, // actually usually bus powered but acts as PSU often
    requiresBus: [ConnectionType.KNX, ConnectionType.ETHERNET],
    url: 'https://www.mdt.de/en/products/product-detail/system-components/system-devices/ip-router.html',
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
    url: 'https://www.lunatone.com/en/product/dali-dt8-dimmer-cv-16a/',
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
    url: 'https://www.lunatone.com/en/product/dali-0-10v-pwm-interface/',
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
    url: 'https://www.amazon.com/s?k=MEAN+WELL+SDR-480-24',
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
    url: 'https://www.meanwell.com/productWebApp/product/view/HDR-150',
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
    url: 'https://www.jmac.com/search.php?search_query=eFlow6N',
    instances: [
      { id: 'lcp1-acc-psu', location: 'LCP-1', notes: 'Main House Strikes' },
      { id: 'lcp2-acc-psu', location: 'LCP-2', notes: 'Rear Strikes' }, // Hypothesized location
      { id: 'gar-acc-psu', location: 'LCP-1', notes: 'Garage Strike' } // Hypothesized
    ]
  },

  // --- SENSORS & INPUTS ---
  {
    id: 'mdt-bin-inp',
    name: 'Binary Input 16-fold',
    manufacturer: 'MDT',
    description: 'BE-16000.02',
    type: ModuleType.SENSOR,
    mountType: MountType.DIN_RAIL,
    size: 8,
    cost: 285.00,
    powerWatts: 0.5,
    quantity: 2,
    requiresBus: [ConnectionType.KNX],
    url: 'https://www.mdt.de/en/products/product-detail/sensors/binary-inputs/binary-input-potential-free.html',
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
    url: 'https://www.asus.com/us/displays-desktops/nucs/nuc-kits/asus-nuc-13-pro-kit/',
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
    cost: 799.00,
    powerWatts: 50,
    quantity: 1,
    requiresMains: true,
    genericRole: 'PoE Switch',
    url: 'https://store.ui.com/us/en/pro/category/all-switching/products/usw-pro-max-24-poe',
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
    cost: 2800.00,
    powerWatts: 12,
    quantity: 1,
    requiresPoE: true,
    systemIds: ['access'],
    genericRole: 'Video Intercom',
    url: 'https://akuvoxdealer.com/?s=x915',
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
    cost: 620.00,
    powerWatts: 10,
    quantity: 3,
    requiresPoE: true,
    url: 'https://akuvoxdealer.com/products/akuvox-e16c-facial-recognition-door-phone',
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
    notes: 'Requires 12/24V Switched from Altronix.'
  },
  {
    id: 'cam-g5-pro',
    name: 'UniFi G5 Pro',
    manufacturer: 'Ubiquiti',
    description: '4K PoE Camera',
    type: ModuleType.SECURITY,
    mountType: MountType.CEILING_MOUNT,
    size: 0,
    cost: 379.00,
    powerWatts: 10,
    quantity: 6,
    requiresPoE: true,
    systemIds: ['security'],
    genericRole: 'IP Camera',
    url: 'https://store.ui.com/us/en/pro/category/all-cameras-nvrs/products/uvc-g5-pro',
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
    location: 'MDF'
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
    location: 'Infra'
  },
  {
    id: 'cable-knx',
    name: 'KNX Bus Cable',
    manufacturer: 'Belden',
    type: ModuleType.ACCESSORY,
    mountType: MountType.NA,
    size: 0,
    cost: 850.00,
    powerWatts: 0,
    quantity: 1,
    description: '2500 ft',
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