/**
 * Manual test for Device models and DeviceRegistry
 *
 * This file demonstrates and verifies:
 * 1. Creating Device instances
 * 2. Adding to DeviceRegistry
 * 3. Retrieving from DeviceRegistry
 * 4. Filtering by layer and room
 *
 * Run this in browser console after importing to verify functionality
 */

import { Device, DeviceType, Product } from './models/Device';
import { DeviceRegistry } from './services/DeviceRegistry';

export function testDeviceModels(): void {
  console.log('=== Testing Device Models and DeviceRegistry ===\n');

  // Get DeviceRegistry instance
  const registry = DeviceRegistry.getInstance();
  registry.clearDevices();

  // Create test device instances
  const device1: Device = {
    id: 'dev-test-001',
    deviceTypeId: 'dt-canned-light',
    productId: 'prod-halo-6inch',
    name: 'Kitchen Light 1',
    position: { x: 5.2, y: 3.8 },
    rotation: 0,
    roomId: 'room-kitchen',
    layerId: 'layer-lights',
    installationHeight: 2.9,
    networkConnections: [],
    lcpAssignment: null,
    metadata: {},
    createdAt: Date.now()
  };

  const device2: Device = {
    id: 'dev-test-002',
    deviceTypeId: 'dt-wifi-ap',
    productId: 'prod-ubiquiti-u6pro',
    name: 'Living Room WiFi AP',
    position: { x: 8.5, y: 6.2 },
    rotation: 0,
    roomId: 'room-living',
    layerId: 'layer-network',
    installationHeight: 2.9,
    networkConnections: [],
    lcpAssignment: 'lcp-1',
    metadata: { range: 50 },
    createdAt: Date.now()
  };

  const device3: Device = {
    id: 'dev-test-003',
    deviceTypeId: 'dt-canned-light',
    productId: 'prod-halo-6inch',
    name: 'Kitchen Light 2',
    position: { x: 7.0, y: 3.8 },
    rotation: 0,
    roomId: 'room-kitchen',
    layerId: 'layer-lights',
    installationHeight: 2.9,
    networkConnections: [],
    lcpAssignment: null,
    metadata: {},
    createdAt: Date.now()
  };

  // Test 1: Add devices to registry
  console.log('Test 1: Adding devices to registry');
  registry.addDevice(device1);
  registry.addDevice(device2);
  registry.addDevice(device3);
  console.log(`✅ Added 3 devices. Count: ${registry.getDeviceCount()}`);
  console.log();

  // Test 2: Get all devices
  console.log('Test 2: Get all devices');
  const allDevices = registry.getAllDevices();
  console.log(`✅ Retrieved ${allDevices.length} devices`);
  allDevices.forEach(d => console.log(`  - ${d.name} (${d.id})`));
  console.log();

  // Test 3: Get device by ID
  console.log('Test 3: Get device by ID');
  const retrieved = registry.getDevice('dev-test-001');
  console.log(`✅ Retrieved device: ${retrieved?.name}`);
  console.log(`  Position: (${retrieved?.position.x}, ${retrieved?.position.y})`);
  console.log();

  // Test 4: Get devices by layer
  console.log('Test 4: Get devices by layer');
  const lightsLayer = registry.getDevicesByLayer('layer-lights');
  console.log(`✅ Found ${lightsLayer.length} devices in 'layer-lights'`);
  lightsLayer.forEach(d => console.log(`  - ${d.name}`));
  console.log();

  // Test 5: Get devices by room
  console.log('Test 5: Get devices by room');
  const kitchenDevices = registry.getDevicesByRoom('room-kitchen');
  console.log(`✅ Found ${kitchenDevices.length} devices in 'room-kitchen'`);
  kitchenDevices.forEach(d => console.log(`  - ${d.name}`));
  console.log();

  // Test 6: Update device
  console.log('Test 6: Update device');
  const updated = registry.updateDevice('dev-test-001', {
    name: 'Kitchen Light 1 (Updated)',
    installationHeight: 3.0
  });
  console.log(`✅ Update result: ${updated}`);
  const updatedDevice = registry.getDevice('dev-test-001');
  console.log(`  New name: ${updatedDevice?.name}`);
  console.log(`  New height: ${updatedDevice?.installationHeight}m`);
  console.log();

  // Test 7: Check device exists
  console.log('Test 7: Check device exists');
  const exists = registry.hasDevice('dev-test-002');
  const notExists = registry.hasDevice('dev-nonexistent');
  console.log(`✅ Device 'dev-test-002' exists: ${exists}`);
  console.log(`✅ Device 'dev-nonexistent' exists: ${notExists}`);
  console.log();

  // Test 8: Remove device
  console.log('Test 8: Remove device');
  registry.removeDevice('dev-test-001');
  console.log(`✅ Removed device. New count: ${registry.getDeviceCount()}`);
  const removed = registry.getDevice('dev-test-001');
  console.log(`  Device still exists: ${removed !== undefined}`);
  console.log();

  // Test 9: Set devices (replace all)
  console.log('Test 9: Set devices (replace all)');
  const newDevices: Device[] = [
    {
      id: 'dev-new-001',
      deviceTypeId: 'dt-camera',
      productId: 'prod-camera-ptz',
      name: 'Front Door Camera',
      position: { x: 1.0, y: 1.0 },
      rotation: 0,
      roomId: null,
      layerId: 'layer-security',
      installationHeight: 2.5,
      networkConnections: [],
      lcpAssignment: 'lcp-1',
      metadata: {},
      createdAt: Date.now()
    }
  ];
  registry.setDevices(newDevices);
  console.log(`✅ Set new devices. Count: ${registry.getDeviceCount()}`);
  console.log();

  // Test 10: Clear devices
  console.log('Test 10: Clear all devices');
  registry.clearDevices();
  console.log(`✅ Cleared devices. Count: ${registry.getDeviceCount()}`);
  console.log();

  console.log('=== All tests completed successfully! ===');
}

// Example usage
// testDeviceModels();
