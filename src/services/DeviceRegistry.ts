/**
 * Device Registry - Singleton Service
 *
 * Manages all device instances in memory for the application.
 * Provides CRUD operations and filtering methods for devices.
 *
 * Date: 2025-12-22
 */

import { Device } from '../models/Device';

/**
 * DeviceRegistry singleton class
 * Manages the in-memory collection of all device instances
 */
export class DeviceRegistry {
  private static instance: DeviceRegistry;
  private devices: Map<string, Device>;

  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    this.devices = new Map<string, Device>();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): DeviceRegistry {
    if (!DeviceRegistry.instance) {
      DeviceRegistry.instance = new DeviceRegistry();
    }
    return DeviceRegistry.instance;
  }

  /**
   * Add a device to the registry
   * @param device - Device instance to add
   */
  public addDevice(device: Device): void {
    this.devices.set(device.id, device);
  }

  /**
   * Remove a device from the registry
   * @param deviceId - ID of device to remove
   */
  public removeDevice(deviceId: string): void {
    this.devices.delete(deviceId);
  }

  /**
   * Get a device by ID
   * @param deviceId - ID of device to retrieve
   * @returns Device instance or undefined if not found
   */
  public getDevice(deviceId: string): Device | undefined {
    return this.devices.get(deviceId);
  }

  /**
   * Get all devices
   * @returns Array of all device instances
   */
  public getAllDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  /**
   * Get devices by layer ID
   * @param layerId - Layer ID to filter by
   * @returns Array of devices in the specified layer
   */
  public getDevicesByLayer(layerId: string): Device[] {
    return this.getAllDevices().filter(device => device.layerId === layerId);
  }

  /**
   * Get devices by room ID
   * @param roomId - Room ID to filter by
   * @returns Array of devices in the specified room
   */
  public getDevicesByRoom(roomId: string): Device[] {
    return this.getAllDevices().filter(device => device.roomId === roomId);
  }

  /**
   * Clear all devices from the registry
   */
  public clearDevices(): void {
    this.devices.clear();
  }

  /**
   * Get the count of devices in the registry
   * @returns Number of devices
   */
  public getDeviceCount(): number {
    return this.devices.size;
  }

  /**
   * Check if a device exists in the registry
   * @param deviceId - ID of device to check
   * @returns true if device exists, false otherwise
   */
  public hasDevice(deviceId: string): boolean {
    return this.devices.has(deviceId);
  }

  /**
   * Update an existing device
   * @param deviceId - ID of device to update
   * @param updates - Partial device data to update
   * @returns true if device was updated, false if not found
   */
  public updateDevice(deviceId: string, updates: Partial<Device>): boolean {
    const device = this.devices.get(deviceId);
    if (!device) {
      return false;
    }

    // Merge updates into existing device
    const updatedDevice = { ...device, ...updates, id: device.id }; // Preserve ID
    this.devices.set(deviceId, updatedDevice);
    return true;
  }

  /**
   * Replace all devices in the registry
   * Useful for loading devices from saved state
   * @param devices - Array of devices to set
   */
  public setDevices(devices: Device[]): void {
    this.clearDevices();
    devices.forEach(device => this.addDevice(device));
  }
}

// Export singleton instance for convenience
export const deviceRegistry = DeviceRegistry.getInstance();
