/**
 * DataService - Centralized project data management
 *
 * Provides abstraction layer for loading and saving project data.
 * Migrates from fragmented multi-endpoint pattern to monolithic project.json.
 */

import { Device } from '../models/Device';
import { DeviceRegistry } from './DeviceRegistry';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

export interface Polygon {
  id: string;
  points: Point[];
  name: string;
  roomType?: string;
  type: string;
  color?: number;
}

export interface LayoutModule {
  id: string;
  type: string;
  pxPerMeter?: number;
  [key: string]: unknown;
}

export interface ScaleData {
  scaleFactor: number;
}

export interface ElectricalOverlay {
  scale: number;
  rotation: number;
  x: number;
  y: number;
  opacity: number;
  locked: boolean;
}

export interface DaliDevice {
  id: string;
  [key: string]: unknown;
}

export interface Settings {
  units: 'IMPERIAL' | 'METRIC';
  fastZoomMultiplier?: number;
  dataLossThreshold?: number; // 0.0 to 1.0 (e.g., 0.1 for 10%)
  [key: string]: unknown;
}

export interface Furniture {
  id: string;
  type: string;
  position: Point;
  rotation: number;
  [key: string]: unknown;
}

export interface FloorPlan {
  scale: ScaleData;
  layout: LayoutModule[];
  polygons: Polygon[];
  electricalOverlay: ElectricalOverlay;
}

export interface ProjectMetadata {
  name: string;
  status: string;
  created: string;
  modified: string;
}

export interface ProjectData {
  version: string;
  timestamp: string;
  metadata: ProjectMetadata;
  floorPlan: FloorPlan;
  furniture: Furniture[];
  devices: Device[];
  cables: unknown[];
  lcps: unknown[];
  settings: Settings;
}

export interface VersionHistoryEntry {
  filename: string;
  timestamp: string;
  size: number;
}

// ============================================================================
// DataService Class
// ============================================================================

class DataService {
  private projectId: string = '270-boll-ave';
  private cache: ProjectData | null = null;
  private cacheTimestamp: number | null = null;
  private versionToken: string | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private baseUrl: string = '/api';

  constructor() {
    // Listen for cross-tab changes via storage events
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.onStorageChange);
    }
  }

  private onStorageChange = (e: StorageEvent): void => {
    if (e.key === 'integrator-pro-last-save') {
      console.log('[DataService] Detected external change, clearing cache');
      this.clearCache();
      // Dispatch event for components to reload
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('project-data-changed'));
      }
    }
  };

  /**
   * Load entire project data
   * @param projectId Optional project ID (defaults to current project)
   * @param forceReload If true, bypass cache and force reload from server
   * @returns Complete project data
   */
  async loadProject(projectId?: string, forceReload = false): Promise<ProjectData> {
    const id = projectId || this.projectId;
    const now = Date.now();

    // Check if cache is valid
    const cacheValid = this.cache &&
      this.cacheTimestamp &&
      (now - this.cacheTimestamp < this.CACHE_TTL);

    if (!forceReload && cacheValid) {
      console.log('[DataService] Using cached project data (TTL valid)');
      return this.cache;
    }

    try {
      if (forceReload) {
        console.log('[DataService] Force reload - bypassing cache');
      } else if (this.cache && !cacheValid) {
        console.log('[DataService] Cache expired (TTL exceeded) - reloading');
      } else {
        console.log('[DataService] Loading project from server (no cache)');
      }

      const response = await fetch(`${this.baseUrl}/project/${id}`);

      if (!response.ok) {
        throw new Error(`Failed to load project: ${response.statusText}`);
      }

      const projectData = await response.json();

      // Capture version token
      if (projectData.versionToken) {
        this.versionToken = projectData.versionToken;
        console.log(`[DataService] Project version token: ${this.versionToken}`);
      }

      // Apply migration if needed
      if (projectData.devices && projectData.devices.length > 0) {
        projectData.devices = this.migrateDaliDevices(projectData.devices);
      }

      this.cache = projectData;
      this.cacheTimestamp = now;

      // Populate DeviceRegistry from loaded data
      const deviceRegistry = DeviceRegistry.getInstance();
      deviceRegistry.setDevices(this.cache.devices || []);
      console.log(`[DataService] Loaded ${this.cache.devices?.length || 0} devices into registry`);

      return this.cache;
    } catch (error) {
      console.error('Error loading project:', error);
      throw error;
    }
  }

  /**
   * Save entire project data with automatic versioning
   * @param data Complete project data to save
   */
  async saveProject(data: ProjectData, force: boolean = false): Promise<void> {
    try {
      // Get devices from DeviceRegistry
      const deviceRegistry = DeviceRegistry.getInstance();
      const devices = deviceRegistry.getAllDevices();

      // Update timestamp and include devices from registry
      const projectData = {
        ...data,
        devices, // Use devices from registry
        timestamp: new Date().toISOString(),
        metadata: {
          ...data.metadata,
          modified: new Date().toISOString()
        }
      };

      const response = await fetch(`${this.baseUrl}/project/${this.projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projectData,
          versionToken: this.versionToken, // Include token for optimistic locking
          force // Force bypass for user-confirmed overwrites
        })
      });

      if (response.status === 409) {
        const errorData = await response.json();
        console.warn('[DataService] Save conflict detected:', errorData);
        // Dispatch event for UI to show conflict resolution
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('project-collision-detected', {
            detail: errorData
          }));
        }
        throw new Error('VERSION_CONFLICT');
      }

      if (!response.ok) {
        throw new Error(`Failed to save project: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.versionToken) {
        this.versionToken = result.versionToken;
      }

      this.cache = projectData;
      this.cacheTimestamp = Date.now();

      // Update localStorage to notify other tabs
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem('integrator-pro-last-save', Date.now().toString());
      }

      console.log('✅ Project saved successfully with versioning');
    } catch (error) {
      console.error('Error saving project:', error);
      throw error;
    }
  }

  /**
   * Update polygons (convenience method)
   */
  async updatePolygons(polygons: Polygon[]): Promise<void> {
    if (!this.cache) await this.loadProject();
    this.cache!.floorPlan.polygons = polygons;
    await this.saveProject(this.cache!);
  }

  /**
   * Update scale factor (convenience method)
   */
  async updateScale(scaleFactor: number): Promise<void> {
    if (!this.cache) await this.loadProject();
    this.cache!.floorPlan.scale = { scaleFactor };
    await this.saveProject(this.cache!);
  }

  /**
   * Update layout modules (convenience method)
   */
  async updateLayout(layout: LayoutModule[]): Promise<void> {
    if (!this.cache) await this.loadProject();
    this.cache!.floorPlan.layout = layout;
    await this.saveProject(this.cache!);
  }

  /**
   * Update electrical overlay (convenience method)
   */
  async updateElectricalOverlay(overlay: ElectricalOverlay): Promise<void> {
    if (!this.cache) await this.loadProject();
    this.cache!.floorPlan.electricalOverlay = overlay;
    await this.saveProject(this.cache!);
  }

  /**
   * Update furniture (convenience method)
   */
  async updateFurniture(furniture: Furniture[]): Promise<void> {
    if (!this.cache) await this.loadProject();
    this.cache!.furniture = furniture;
    await this.saveProject(this.cache!);
  }

  /**
   * Update devices (convenience method)
   * Updates both the DeviceRegistry and saves to project
   * @param devices Array of devices to save
   */
  async updateDevices(devices: Device[]): Promise<void> {
    if (!this.cache) await this.loadProject();

    // Update DeviceRegistry
    const deviceRegistry = DeviceRegistry.getInstance();
    deviceRegistry.setDevices(devices);

    // Cache will be updated in saveProject from DeviceRegistry
    await this.saveProject(this.cache!);
  }

  /**
   * Update cables (convenience method)
   */
  async updateCables(cables: any[]): Promise<void> {
    if (!this.cache) await this.loadProject();
    this.cache!.cables = cables;
    await this.saveProject(this.cache!);
  }

  /**
   * Update settings (convenience method)
   */
  async updateSettings(settings: Settings): Promise<void> {
    if (!this.cache) await this.loadProject();
    this.cache!.settings = settings;
    await this.saveProject(this.cache!);
  }

  /**
   * Get version history for current project
   * @returns List of available versions
   */
  async getVersionHistory(): Promise<VersionHistoryEntry[]> {
    try {
      const response = await fetch(`${this.baseUrl}/project/${this.projectId}/history`);

      if (!response.ok) {
        throw new Error(`Failed to load history: ${response.statusText}`);
      }

      const data = await response.json();
      return data.versions || [];
    } catch (error) {
      console.error('Error loading version history:', error);
      throw error;
    }
  }

  /**
   * Load a specific version from history
   * @param versionFilename Filename of the version to load
   * @returns Project data from that version
   */
  async loadVersion(versionFilename: string): Promise<ProjectData> {
    try {
      const response = await fetch(
        `${this.baseUrl}/project/${this.projectId}/history/${versionFilename}`
      );

      if (!response.ok) {
        throw new Error(`Failed to load version: ${response.statusText}`);
      }

      const versionData = await response.json();

      // Apply migration if needed
      if (versionData.devices && versionData.devices.length > 0) {
        versionData.devices = this.migrateDaliDevices(versionData.devices);
      }

      return versionData;
    } catch (error) {
      console.error('Error loading version:', error);
      throw error;
    }
  }

  /**
   * List all available projects
   * @returns Array of project summaries
   */
  async listProjects(): Promise<Array<{ id: string; name: string; status: string; modified: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/projects`);

      if (!response.ok) {
        throw new Error(`Failed to list projects: ${response.statusText}`);
      }

      const data = await response.json();
      return data.projects || [];
    } catch (error) {
      console.error('Error listing projects:', error);
      throw error;
    }
  }

  /**
   * Get cached project data (if available)
   */
  getCachedProject(): ProjectData | null {
    return this.cache;
  }

  /**
   * Clear cache (manual invalidation)
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = null;
    this.versionToken = null;
    console.log('[DataService] Cache cleared');
  }

  /**
   * Set current project ID
   */
  setProjectId(projectId: string): void {
    this.projectId = projectId;
    this.clearCache();
  }

  /**
   * Migrate legacy DALI devices to new Device structure
   * @param legacyDevices Array of legacy device objects
   * @returns Array of properly structured Device objects
   */
  private migrateDaliDevices(legacyDevices: any[]): Device[] {
    if (!legacyDevices || legacyDevices.length === 0) {
      return [];
    }

    return legacyDevices.map((legacy, index) => {
      // Check if this is already a migrated Device (has required fields)
      const isAlreadyMigrated =
        legacy.deviceTypeId !== undefined &&
        legacy.position !== undefined &&
        typeof legacy.position === 'object' &&
        legacy.position.x !== undefined &&
        legacy.position.y !== undefined &&
        legacy.layerId !== undefined;

      if (isAlreadyMigrated) {
        // Already in new format, return as-is
        return legacy as Device;
      }

      // Legacy device detected - perform migration
      console.log(`[DataService] Migrating legacy device ${legacy.id || index}`);

      // Extract position from legacy x/y or position object
      const position = {
        x: legacy.x ?? legacy.position?.x ?? 0,
        y: legacy.y ?? legacy.position?.y ?? 0
      };

      // Build migrated device
      const migratedDevice: Device = {
        id: legacy.id || `migrated-device-${Date.now()}-${index}`,
        deviceTypeId: legacy.deviceTypeId || 'generic-lighting',
        productId: legacy.productId || 'generic-legacy',
        name: legacy.name || `Device ${index + 1}`,
        position,
        rotation: legacy.rotation ?? 0,
        roomId: legacy.roomId ?? null,
        layerId: legacy.layerId || 'lighting',
        installationHeight: legacy.installationHeight ?? 2.4,
        networkConnections: legacy.networkConnections || [],
        lcpAssignment: legacy.lcpAssignment ?? null,
        busAssignment: legacy.busAssignment ?? null,
        metadata: {
          // Preserve all legacy fields in metadata for reference
          ...legacy,
          _migratedFrom: 'DaliDevice',
          _migrationTimestamp: Date.now()
        },
        createdAt: legacy.createdAt ?? Date.now()
      };

      return migratedDevice;
    });
  }
}

// Export singleton instance
export const dataService = new DataService();
