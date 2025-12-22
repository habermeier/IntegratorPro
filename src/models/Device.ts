/**
 * Device System - Data Models
 *
 * TypeScript interfaces for the device placement and specification system.
 * These interfaces define the data models for devices, device types, and products.
 *
 * Reference: docs/device-system-interfaces.ts
 * Date: 2025-12-22
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
   * Bus/Universe assignment (logical connectivity group)
   * Examples: "DALI Universe 1", "KNX Line 1", "Bus 1"
   * Used for grouping devices by their communication bus
   */
  busAssignment: string | null;

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
