/**
 * Device System - TypeScript Interface Definitions
 *
 * This file contains all TypeScript interfaces for the device placement and
 * specification system. These interfaces define the data models for devices,
 * device types, products, cable routes, and LCPs.
 *
 * Key Design Decisions:
 * - All positions/dimensions stored in meters (metric)
 * - ProductId stored on Device (with DeviceType providing default)
 * - Cable routes store explicit segment geometry (not just logical connections)
 * - PoE is a cable attribute, not a separate cable type
 * - LCPs are simple logical drop locations (subdivision happens in future phase)
 *
 * Reference: tickets/device-system-design-decisions.md
 * Date: 2025-12-20
 */

// ============================================================================
// CORE VECTOR TYPES
// ============================================================================

/**
 * 2D vector in world space (meters)
 * Used for device positions, room polygons, etc.
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * 3D vector in world space (meters)
 * Used for cable routing (includes vertical drops/climbs)
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// ============================================================================
// DEVICE TYPE
// ============================================================================

/**
 * DeviceType represents an abstract device category/concept
 * Examples: "Undirected Canned Light", "Focus Light", "WiFi Access Point"
 *
 * DeviceTypes define:
 * - What kind of device this is (category, name)
 * - Default product recommendation
 * - Default installation parameters (height, shorthand)
 * - Symbol type for rendering
 */
export interface DeviceType {
  /** Unique identifier */
  id: string;

  /** Human-readable name (e.g., "Undirected Canned Light") */
  name: string;

  /** Device category for grouping and layer assignment */
  category: 'lighting' | 'sensors' | 'security' | 'network' | 'controls' | 'hvac';

  /** Default product for this device type (recommended model) */
  defaultProductId: string;

  /** Default shorthand text shown on symbols (e.g., "CAN" for canned light) */
  defaultShorthand?: string;

  /** Default installation height in meters (from finished floor) */
  defaultInstallationHeight: number;

  /** Symbol identifier for rendering system */
  symbolType: string;

  /** Device-specific metadata (e.g., default range for WiFi APs) */
  metadata?: Record<string, any>;
}

// ============================================================================
// PRODUCT
// ============================================================================

/**
 * Product represents a specific manufacturer/model with specs and links
 * Examples: "Halo 6-inch Recessed Light", "Ubiquiti U6-Pro WiFi AP"
 *
 * Products can be:
 * - Simple products (single item)
 * - Multi-component assemblies (DALI-2 lights with transformer + controller)
 * - Pre-existing fixtures (minimal data - name only)
 *
 * All fields except id and name are optional (graceful degradation)
 */
export interface Product {
  /** Unique identifier */
  id: string;

  /** Product name/model (e.g., "Halo 6-inch Recessed Light") */
  name: string;

  /** Manufacturer name (optional) */
  manufacturer?: string;

  /** Product category (matches DeviceType category) */
  category?: string;

  /** Link to specification sheet PDF (optional) */
  specSheetUrl?: string;

  /** Link to purchase page (optional) */
  purchaseUrl?: string;

  /** Google search URL for product (optional) */
  googleSearchUrl?: string;

  /**
   * Physical dimensions in native units (not necessarily meters)
   * Examples: "6 inch diameter", "2×2 inches"
   * These are reference only - not used in calculations
   */
  dimensions?: {
    width: number | string;
    length: number | string;
    height?: number | string;
    units?: string;
  };

  /** Product image URL (optional) */
  imageUrl?: string;

  /** Override for DeviceType's default shorthand (optional) */
  shorthand?: string;

  /**
   * Multi-component product definition
   * For assemblies like DALI-2 lights (fixture + transformer + controller)
   * BOM will auto-expand these into individual line items
   */
  components?: Array<{
    /** Product ID of the component */
    productId: string;
    /** Quantity of this component */
    quantity: number;
    /** Optional component description */
    description?: string;
  }>;

  /** Power requirements (for load calculations and validation) */
  powerRequirement?: {
    type: 'PoE' | 'PoE+' | 'PoE++' | 'AC' | '24V LED';
    watts: number;
  };

  /** Current draw in amps (for circuit load calculations) */
  ampsRequired?: number;

  /** Default range in meters (for WiFi APs, sensors with coverage area) */
  range?: number;

  /** Product-specific metadata */
  metadata?: Record<string, any>;
}

// ============================================================================
// DEVICE
// ============================================================================

/**
 * Device represents a placed instance on the floor plan
 * Each device:
 * - References a DeviceType (what kind of device)
 * - References a Product (which specific model)
 * - Has a position, rotation, and other placement properties
 * - Can have per-instance overrides (product, height, etc.)
 */
export interface Device {
  /** Unique identifier */
  id: string;

  /** Reference to DeviceType (what kind of device this is) */
  deviceTypeId: string;

  /**
   * Reference to Product (which specific model)
   * Initially from DeviceType.defaultProductId, but can be overridden per-instance
   * Visual indicator shown when device product differs from type default
   */
  productId: string;

  /** User-assigned name (optional, defaults to product name + number) */
  name: string;

  /** Position in world space (meters) */
  position: Vector2;

  /** Rotation in degrees (0 = north, 90 = east, etc.) */
  rotation: number;

  /**
   * Room assignment (UUID of room polygon)
   * Auto-detected on placement via point-in-polygon
   * Can be manually overridden
   */
  roomId: string | null;

  /** Layer assignment (for visibility and organization) */
  layerId: string;

  /**
   * Installation height from finished floor (meters)
   * Defaults to DeviceType.defaultInstallationHeight
   * Can be overridden per-instance
   */
  installationHeight: number;

  /**
   * Network connections (array of cable IDs or device IDs)
   * For tracking daisy-chain topology, network connections, etc.
   */
  networkConnections: string[];

  /**
   * LCP assignment (which LCP/panel controls this device)
   * Assigned when cable routing connects device to LCP
   */
  lcpAssignment: string | null;

  /**
   * Device-specific metadata
   * Examples:
   * - range: number (custom range override for WiFi AP)
   * - ampsRequired: number (for circuit load calculation)
   * - universe: number (DALI universe assignment)
   * - address: number (DALI device address)
   */
  metadata: Record<string, any>;

  /** Creation timestamp (Unix epoch milliseconds) */
  createdAt: number;
}

// ============================================================================
// CABLE ROUTE
// ============================================================================

/**
 * CableRoute represents a physical cable with explicit segment geometry
 *
 * Key design decisions:
 * - Store explicit segment geometry (not just logical device connections)
 * - Enables accurate length calculation including routing around walls
 * - Supports both daisy-chain (multiple devices) and home-run (point-to-point)
 * - PoE is an attribute of Cat6/Cat6a cables (not a separate type)
 */
export interface CableRoute {
  /** Unique identifier */
  id: string;

  /** Cable type (physical cable specification) */
  type: 'Cat6' | 'Cat6a' | 'DALI-2' | 'KNX' | 'Fiber' | 'LED-24V' | 'Shade-16/4';

  /**
   * Power over Ethernet specification (for Cat6/Cat6a only)
   * PoE is not a separate cable type - it's power delivery over Cat6
   */
  poe?: {
    /** PoE standard (determines max wattage) */
    standard: 'PoE' | 'PoE+' | 'PoE++';
    /** Actual watts delivered (≤ standard max: 15W / 25W / 60W) */
    watts: number;
  };

  /**
   * Explicit cable route segments (array of 3D line segments)
   * Each segment has a from/to point in world coordinates (meters)
   * Includes horizontal ceiling runs, vertical drops, and climbs
   */
  segments: Array<{
    from: Vector3;
    to: Vector3;
  }>;

  /**
   * Total cable length in meters
   * Computed from: sum(segment lengths) + vertical drops + buffer/slack
   * Includes service loops and per-device connection buffer
   */
  totalLength: number;

  /**
   * Devices connected along this cable route
   * For daisy-chain topologies (DALI-2, KNX): array of device IDs in order
   * For home-run (Cat6, LED): single device ID
   */
  devices: string[];

  /**
   * LCP termination point (if applicable)
   * Which LCP/panel does this cable terminate at
   */
  lcpId?: string;

  /**
   * Cable-specific metadata
   * Examples:
   * - amperage: number (sum of device loads on circuit)
   * - universe: number (DALI universe ID)
   * - serviceLoops: Array<{type, position}> (spare cable loops)
   * - parallelGroup: string (for bundled parallel routing)
   */
  metadata: Record<string, any>;

  /** Visual color override (optional - defaults based on cable type) */
  color?: string;
}

// ============================================================================
// LCP (LOCAL CONTROL PANEL)
// ============================================================================

/**
 * LCP represents a logical drop location / control panel
 *
 * Phase 1 (this ticket): Simple placement and naming
 * - LCPs are placed on walls as logical termination points
 * - Simple sequential naming: LCP-1, LCP-2, LCP-3
 * - Cables terminate at these logical locations
 *
 * Phase 2 (future ticket): Physical panel design
 * - Subdivision into physical panels (LCP-2-1, LCP-2-2)
 * - DIN rail module layout
 * - Wire-to-terminal assignment
 */
export interface LCP {
  /** Unique identifier */
  id: string;

  /** User-assigned name (default: "LCP-1", "LCP-2", etc.) */
  name: string;

  /** Position in world space (meters) - wall location */
  position: Vector2;

  /** Room where LCP is located */
  roomId: string;

  /** Rotation in degrees (wall orientation) */
  rotation: number;

  /** LCP-specific metadata */
  metadata?: Record<string, any>;
}

// ============================================================================
// PROJECT DATA STRUCTURE
// ============================================================================

/**
 * Complete project data structure (single monolithic blob)
 * Stored as: projects/{projectId}/project.json
 */
export interface ProjectData {
  /** Schema version for migration compatibility */
  version: string;

  /** Last save timestamp (ISO 8601) */
  timestamp: string;

  /** Project metadata */
  metadata: {
    name: string;
    status: 'Draft' | 'In Progress' | 'Complete';
    description?: string;
    createdAt: string;
    modifiedAt: string;
  };

  /** Floor plan data (rooms, masks, polygons, scale) */
  floorPlan: {
    rooms: any[]; // Existing room polygon system
    masks: any[]; // Existing mask system
    scale?: any;  // Existing scale data
    baseImage?: any; // Base floor plan image
  };

  /** All devices placed on floor plan */
  devices: Device[];

  /** Device type registry */
  deviceTypes: DeviceType[];

  /** Product catalog */
  products: Product[];

  /** Cable routing */
  cables: CableRoute[];

  /** LCP/control panel locations */
  lcps: LCP[];

  /** Furniture items (existing system) */
  furniture?: any[];

  /** Project settings */
  settings: {
    /** Unit preference for display (storage always in meters) */
    unitSystem: 'Imperial' | 'Metric';

    /** Default ceiling height in meters */
    ceilingHeight: number;

    /** Default wall switch height in meters */
    switchHeight: number;

    /** Global symbol size multiplier (0.5 - 2.0) */
    symbolSize: number;

    /** Show installation height annotations */
    showHeights: boolean;

    /** Show range indicators (WiFi APs, sensors) */
    showRanges: boolean;

    /** Show cable routing */
    showCables: boolean;

    /** Cable parallel routing spacing in meters */
    cableSpacing: number;

    /** DALI device count warning thresholds */
    daliWarningThresholds: {
      green: number;   // 0-50 (or custom)
      orange: number;  // 51-62
      red: number;     // 63-64
    };

    /** Circuit amperage limit (default 15A) */
    circuitAmperageLimit: number;

    /** Default WiFi AP range in meters */
    defaultWifiRange: number;

    /** Default sensor range in meters */
    defaultSensorRange: number;

    /** Layer visibility and order */
    layers?: {
      order: string[];
      visibility: Record<string, boolean>;
    };
  };
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

/**
 * Cable type color mapping (for visualization)
 * Industry standard colors where applicable
 */
export const CABLE_COLORS: Record<string, string> = {
  'KNX': '#00AA00',        // Green (industry standard)
  'DALI-2': '#0066CC',     // Blue
  'Cat6': '#FF9900',       // Orange
  'Cat6a': '#FFCC00',      // Yellow
  'Fiber': '#9933CC',      // Purple
  'LED-24V': '#CC0000',    // Red
  'Shade-16/4': '#996633', // Brown/Tan
};

/**
 * Device category layer mapping
 */
export const CATEGORY_LAYERS: Record<string, string> = {
  'lighting': 'Lights',
  'sensors': 'Sensors',
  'security': 'Security',
  'network': 'Network',
  'controls': 'Controls',
  'hvac': 'HVAC',
};

/**
 * Default symbol sizes in meters (world-space)
 * These are base sizes - scaled by global symbolSize multiplier
 */
export const SYMBOL_SIZES: Record<string, number> = {
  'canned-light': 0.3,
  'outdoor-sconce': 0.25,
  'camera': 0.4,
  'wifi-ap': 0.35,
  'sensor': 0.2,
  'lcp': 0.6,
  'chandelier': 0.5,
  'fan': 0.6,
};

/**
 * Range visualization precedence
 * Determines which range value to use for a device
 */
export function getDeviceRange(
  device: Device,
  product: Product | null,
  deviceType: DeviceType,
  globalDefault: number
): number | null {
  // 1. Per-device override (highest priority)
  if (device.metadata?.range != null) {
    return device.metadata.range;
  }

  // 2. Product default
  if (product?.range != null) {
    return product.range;
  }

  // 3. DeviceType default
  if (deviceType.metadata?.defaultRange != null) {
    return deviceType.metadata.defaultRange;
  }

  // 4. Global setting (lowest priority)
  return globalDefault;
}

/**
 * Shorthand text precedence
 * Determines which shorthand text to display for a device symbol
 */
export function getDeviceShorthand(
  product: Product | null,
  deviceType: DeviceType
): string | null {
  // Product override takes precedence
  if (product?.shorthand) {
    return product.shorthand;
  }

  // Fall back to DeviceType default
  return deviceType.defaultShorthand || null;
}
