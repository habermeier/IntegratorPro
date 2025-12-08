export enum ModuleType {
  NETWORK = 'NETWORK',
  POWER = 'POWER',
  CONTROLLER = 'CONTROLLER',
  SECURITY = 'SECURITY',
  AUDIO_VIDEO = 'AUDIO_VIDEO',
  ACCESSORY = 'ACCESSORY',
  LIGHTING = 'LIGHTING',
  SENSOR = 'SENSOR',
  HVAC = 'HVAC',
  ENCLOSURE = 'ENCLOSURE'
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

export interface HardwareModule {
  id: string;
  name: string;
  manufacturer: string;
  description: string;
  location?: string; // e.g., "LCP-1", "LCP-2", "MDF"
  type: ModuleType;
  mountType: MountType;
  size: number; // RU height for RACK, Width (TE) for DIN. 0 for others if N/A
  cost: number;
  powerWatts: number; // Consumption
  quantity: number;
  url?: string;
  backupUrl?: string; // Secondary/Search link for robustness
  dimensions?: {
    width: number;
    height: number;
    depth: number;
    unit: 'mm' | 'in';
  };
  heatDissipation?: number; // Watts of heat generated (thermal load)
  notes?: string; // Installation notes or specifics
  position?: { // Normalized coordinates (0-100%) on floor plan
    x: number;
    y: number;
  };
  universe?: number; // DALI Universe ID (1-4)
}

export interface Connection {
  id: string;
  fromModuleId: string;
  toModuleId: string;
  type: string; // e.g., "KNX Bus", "DALI", "Mains"
  notes?: string;
}

export interface ProjectState {
  name: string;
  modules: HardwareModule[];
  connections: Connection[];
  totalBudget: number;
  currency: string;
}

export type ViewMode = 'DASHBOARD' | 'VISUALIZER' | 'TOPOLOGY' | 'ADVISOR' | 'FLOORPLAN';