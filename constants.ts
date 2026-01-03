import { ModuleType, MountType, ConnectionType, HardwareModule, Connection, Vendor } from './types';
import INITIAL_MODULES_JSON from './catalog.json';
import INITIAL_CONNECTIONS_JSON from './src/data/initial-connections.json';

/**
 * INITIAL_MODULES
 * Loaded from catalog.json as the source of truth for available hardware.
 */
export const INITIAL_MODULES: HardwareModule[] = INITIAL_MODULES_JSON as any as HardwareModule[];

/**
 * INITIAL_CONNECTIONS
 * Loaded from src/data/initial-connections.json.
 */
export const INITIAL_CONNECTIONS: Connection[] = INITIAL_CONNECTIONS_JSON as any as Connection[];

export const MOCK_CONNECTIONS = INITIAL_CONNECTIONS;

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
