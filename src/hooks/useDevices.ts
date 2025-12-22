/**
 * useDevices Hook
 *
 * Provides a reactive interface to the DeviceRegistry.
 * Components using this hook will re-render whenever devices are
 * added, removed, or updated in the registry.
 *
 * Date: 2025-12-22
 */

import { useState, useEffect, useCallback } from 'react';
import { Device } from '../models/Device';
import { deviceRegistry } from '../services/DeviceRegistry';

/**
 * Hook to access and observe devices in the registry.
 * Note: Filtering should be done in the component using useMemo 
 * to avoid circular re-render loops.
 * 
 * @returns Array of devices and registry operations
 */
export function useDevices() {
  const [devices, setDevices] = useState<Device[]>(() => deviceRegistry.getAllDevices());

  const handleRegistryChange = useCallback(() => {
    setDevices(deviceRegistry.getAllDevices());
  }, []);

  useEffect(() => {
    // Subscribe to registry changes
    deviceRegistry.on('change', handleRegistryChange);

    return () => {
      // Unsubscribe on unmount
      deviceRegistry.off('change', handleRegistryChange);
    };
  }, [handleRegistryChange]);

  return {
    devices,
    addDevice: (device: Device) => deviceRegistry.addDevice(device),
    removeDevice: (id: string) => deviceRegistry.removeDevice(id),
    updateDevice: (id: string, updates: Partial<Device>) => deviceRegistry.updateDevice(id, updates),
    getDevice: (id: string) => deviceRegistry.getDevice(id),
    refresh: handleRegistryChange
  };
}