export enum ModuleType {
  CONTROLLER = 'CONTROLLER',
  LIGHTING = 'LIGHTING',
  HVAC = 'HVAC',
  SECURITY = 'SECURITY',
  SENSOR = 'SENSOR',
  NETWORK = 'NETWORK',
  ACCESSORY = 'ACCESSORY',
  ENCLOSURE = 'ENCLOSURE',
  POWER = 'POWER',
  UI = 'UI' // Added for Switches/Keypads
}

export enum MountType {
  RACK_UNIT = 'RU', // 19" Rack Unit
  DIN_RAIL = 'DIN',  // DIN Rail (measured in TE units)
  WALL_MOUNT = 'WALL', // Keypads, Touch panels
  CEILING_MOUNT = 'CEILING', // Sensors, APs
  SURFACE = 'SURFACE', // Surface mount enclosures
  FLUSH = 'FLUSH', // In-wall enclosures
  NA = 'N/A' // Bulk items, cabling
}

export enum ConnectionType {
  MAINS = 'MAINS',       // 120V/240V AC
  LOW_VOLTAGE = 'LV',    // 12V/24V DC (Steady Power)
  KNX = 'KNX',           // Bus
  DALI = 'DALI',         // Bus
  ETHERNET = 'ETHERNET', // Data
  SIGNAL = 'SIGNAL'      // CONTROL: Dry Contact, Wiegand, OSDP, Switched Loads (Strikes)
}

export interface ModuleInstance {
  id: string; // Unique Instance ID e.g. "lcp1-dim-kit"
  location: string; // Physical location e.g. "LCP-1"
  notes?: string;   // Instance specific notes
  universe?: number; // DALI/KNX Universe
  position?: { x: number, y: number }; // Floorplan coordinates
  address?: string; // Digital Address e.g. "A01"
}

export interface HardwareModule {
  // Product Data (Static SKU info)
  id: string; // SKU ID
  name: string;
  manufacturer: string;
  description: string;
  type: ModuleType;
  mountType: MountType;
  size: number;
  cost: number;

  powerWatts: number; // Max power consumption
  quantity: number;

  // URL Structure
  url: string;        // Verified Purchase Link
  backupUrl?: string; // Optional search/backup
  linkStatus?: 'PREFERRED' | 'MARKET'; // PREFERRED = Verified Vendor (Green), MARKET = General Search (Amber)
  dimensions?: {
    width: number;
    height: number;
    depth: number;
    unit: 'mm' | 'in';
  };
  heatDissipation?: number;

  // Connectivity Requirements (Static)
  requiresMains?: boolean;
  requiresPoE?: boolean;
  requiresBus?: ConnectionType[];

  // The List of Physical Devices (Relational)
  instances?: ModuleInstance[];

  // Systems Membership (Tagging)
  systemIds?: string[]; // e.g. ['lighting', 'hvac']
  genericRole?: string; // e.g. 'DALI Gateway' (Classification)

  // Legacy support / Flat overrides
  location?: string;
  notes?: string;
  position?: { x: number, y: number };
  universe?: number;
}

export interface Connection {
  id: string;
  fromId: string; // Instance ID
  toId: string;   // Instance ID
  type: ConnectionType;
  isPoE?: boolean;
  cableType?: string; // "Cat6", "14/2 Romex", "18/2", "22/4 Shielded"
  notes?: string;
}

export interface ProjectState {
  name: string;
  modules: HardwareModule[];
  connections: Connection[];
  totalBudget: number;
  currency: string;
}

export type ViewMode = 'DASHBOARD' | 'VISUALIZER' | 'TOPOLOGY' | 'ADVISOR' | 'FLOORPLAN' | 'ROUGH_IN' | 'BOM' | 'SYSTEMS';

export interface SystemDefinition {
  id: string;         // e.g. 'lighting'
  title: string;      // e.g. 'Lighting & Control'
  description: string; // The "Goal"
  technicalDetails: string; // The "Implementation"
  warning?: string;
  visuals?: string[]; // Optional URLs to diagrams/images
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  description: string;
  items: string[];
  url?: string;
  tier: 1 | 2 | 3; // 1 = Authorized/Prime, 2 = Specialty, 3 = Niche
}