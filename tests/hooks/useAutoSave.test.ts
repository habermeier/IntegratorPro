/**
 * Unit tests for useAutoSave hook
 *
 * Tests mount protection guards to prevent empty-save-on-mount bug
 *
 * Date: 2026-01-02
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAutoSave } from '../../src/hooks/useAutoSave';
import { dataService } from '../../src/services/DataService';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';

// Mock dependencies
vi.mock('../../src/services/DataService', () => ({
  dataService: {
    saveProject: vi.fn(),
    getCachedProject: vi.fn(),
    loadProject: vi.fn(),
  }
}));

vi.mock('../../src/utils/logger', () => ({
  remoteDebug: vi.fn()
}));

vi.mock('../../editor/FloorPlanEditor');

describe('useAutoSave', () => {
  // Create mock refs for the hook
  let editorInstanceRef: React.MutableRefObject<FloorPlanEditor | null>;
  let isInitializedRef: React.MutableRefObject<boolean>;
  let lastSavedPayloadRef: React.MutableRefObject<string>;
  let lastSavedSymbolsRef: React.MutableRefObject<string>;
  let lastSavedPolygonsRef: React.MutableRefObject<string>;
  let lastSavedFurnitureRef: React.MutableRefObject<string>;
  let lastSavedCablesRef: React.MutableRefObject<string>;

  // Mock editor instance
  let mockEditor: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock editor with required structure
    mockEditor = {
      layerSystem: {
        getAllLayers: vi.fn(() => [
          {
            id: 'electrical',
            type: 'image',
            transform: {
              position: { x: 0, y: 0 },
              scale: { x: 1, y: 1 },
              rotation: 0
            },
            opacity: 1,
            locked: false
          },
          {
            id: 'room',
            type: 'vector',
            content: {
              rooms: []
            }
          },
          {
            id: 'mask',
            type: 'vector',
            content: {
              masks: []
            }
          },
          {
            id: 'furniture',
            type: 'vector',
            content: {
              furniture: []
            }
          },
          {
            id: 'cables',
            type: 'vector',
            content: {
              cables: []
            }
          }
        ]),
        getLayer: vi.fn((id: string) => {
          const layers = mockEditor.layerSystem.getAllLayers();
          return layers.find((l: any) => l.id === id);
        })
      }
    };

    // Initialize refs
    editorInstanceRef = { current: mockEditor };
    isInitializedRef = { current: false }; // Start uninitialized
    lastSavedPayloadRef = { current: '' };
    lastSavedSymbolsRef = { current: '' };
    lastSavedPolygonsRef = { current: '' };
    lastSavedFurnitureRef = { current: '' };
    lastSavedCablesRef = { current: '' };

    // Mock dataService methods
    vi.mocked(dataService.getCachedProject).mockReturnValue({
      id: 'test-project',
      name: 'Test Project',
      devices: [],
      furniture: [],
      cables: [],
      floorPlan: {
        electricalOverlay: {},
        polygons: []
      }
    } as any);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Mount Protection Guard', () => {
    it('should NOT save when isInitializedRef is false (early return guard)', async () => {
      // ARRANGE: Hook is not initialized
      isInitializedRef.current = false;

      const { result } = renderHook(() =>
        useAutoSave(
          editorInstanceRef,
          isInitializedRef,
          lastSavedPayloadRef,
          lastSavedSymbolsRef,
          lastSavedPolygonsRef,
          lastSavedFurnitureRef,
          lastSavedCablesRef
        )
      );

      // ACT: Trigger save with force=true (bypasses debounce)
      result.current.debouncedSaveProject(true);

      // Wait for any async operations
      await waitFor(() => {
        // ASSERT: dataService.saveProject should NOT have been called
        expect(dataService.saveProject).not.toHaveBeenCalled();
      }, { timeout: 100 });

      // Additional verification: getCachedProject should also not be called
      expect(dataService.getCachedProject).not.toHaveBeenCalled();
    });

    it('should NOT save when isInitializedRef is false even with dirty data', async () => {
      // ARRANGE: Hook is not initialized, but has "dirty" data
      isInitializedRef.current = false;

      // Simulate dirty state by having different saved refs vs current data
      lastSavedSymbolsRef.current = JSON.stringify([{ id: 'device-1', type: 'outlet' }]);

      // Update mock editor to have empty symbols (simulating mount state)
      mockEditor.layerSystem.getAllLayers = vi.fn(() => [
        {
          id: 'electrical',
          type: 'vector',
          content: {
            symbols: [] // Empty on mount!
          }
        }
      ]);

      const { result } = renderHook(() =>
        useAutoSave(
          editorInstanceRef,
          isInitializedRef,
          lastSavedPayloadRef,
          lastSavedSymbolsRef,
          lastSavedPolygonsRef,
          lastSavedFurnitureRef,
          lastSavedCablesRef
        )
      );

      // ACT: Trigger save
      result.current.debouncedSaveProject(true);

      // Wait for any async operations
      await waitFor(() => {
        // ASSERT: Mount guard should prevent save regardless of dirty state
        expect(dataService.saveProject).not.toHaveBeenCalled();
      }, { timeout: 100 });
    });
  });

  describe('Initialized State Behavior', () => {
    it('should save when isInitializedRef is true and data is dirty', async () => {
      // ARRANGE: Hook IS initialized
      isInitializedRef.current = true;

      // Set up dirty data (different from last saved)
      lastSavedSymbolsRef.current = '[]';

      // Mock editor with new symbols (dirty data)
      mockEditor.layerSystem.getAllLayers = vi.fn(() => [
        {
          id: 'electrical',
          type: 'image',
          transform: {
            position: { x: 0, y: 0 },
            scale: { x: 1, y: 1 },
            rotation: 0
          },
          opacity: 1,
          locked: false
        },
        {
          id: 'vector-layer',
          type: 'vector',
          content: {
            symbols: [{ id: 'device-1', type: 'outlet', x: 100, y: 100 }]
          }
        },
        {
          id: 'room',
          type: 'vector',
          content: { rooms: [] }
        },
        {
          id: 'mask',
          type: 'vector',
          content: { masks: [] }
        },
        {
          id: 'furniture',
          type: 'vector',
          content: { furniture: [] }
        },
        {
          id: 'cables',
          type: 'vector',
          content: { cables: [] }
        }
      ]);

      const { result } = renderHook(() =>
        useAutoSave(
          editorInstanceRef,
          isInitializedRef,
          lastSavedPayloadRef,
          lastSavedSymbolsRef,
          lastSavedPolygonsRef,
          lastSavedFurnitureRef,
          lastSavedCablesRef
        )
      );

      // Mock successful save
      vi.mocked(dataService.saveProject).mockResolvedValue(undefined);

      // ACT: Trigger save with force=true
      result.current.debouncedSaveProject(true);

      // ASSERT: dataService.saveProject should be called
      await waitFor(() => {
        expect(dataService.saveProject).toHaveBeenCalledTimes(1);
      }, { timeout: 500 });

      // Verify the save was called with correct structure
      const saveCall = vi.mocked(dataService.saveProject).mock.calls[0][0];
      expect(saveCall).toHaveProperty('devices');
      expect(saveCall.devices).toEqual([{ id: 'device-1', type: 'outlet', x: 100, y: 100 }]);
    });

    it('should NOT save when isInitializedRef is true but no data is dirty', async () => {
      // ARRANGE: Hook IS initialized, but no changes
      isInitializedRef.current = true;

      // Create consistent data structures
      const overlayData = {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        locked: false
      };

      // Set refs to match current state (no changes)
      lastSavedPayloadRef.current = JSON.stringify(overlayData);
      lastSavedSymbolsRef.current = JSON.stringify([]);
      lastSavedPolygonsRef.current = JSON.stringify([]);
      lastSavedFurnitureRef.current = JSON.stringify([]);
      lastSavedCablesRef.current = JSON.stringify([]);

      // Ensure mock editor returns data that matches exactly when stringified
      mockEditor.layerSystem.getAllLayers = vi.fn(() => [
        {
          id: 'electrical',
          type: 'image',
          transform: {
            position: { x: 0, y: 0 },
            scale: { x: 1, y: 1 },
            rotation: 0
          },
          opacity: 1,
          locked: false
        },
        {
          id: 'room',
          type: 'vector',
          content: { rooms: [] }
        },
        {
          id: 'mask',
          type: 'vector',
          content: { masks: [] }
        },
        {
          id: 'furniture',
          type: 'vector',
          content: { furniture: [] }
        },
        {
          id: 'cables',
          type: 'vector',
          content: { cables: [] }
        }
      ]);

      const { result } = renderHook(() =>
        useAutoSave(
          editorInstanceRef,
          isInitializedRef,
          lastSavedPayloadRef,
          lastSavedSymbolsRef,
          lastSavedPolygonsRef,
          lastSavedFurnitureRef,
          lastSavedCablesRef
        )
      );

      // ACT: Trigger save WITHOUT force (respect dirty check)
      result.current.debouncedSaveProject(false);

      // Wait for debounce to complete (1500ms) + extra buffer
      await new Promise(resolve => setTimeout(resolve, 1600));

      // ASSERT: No save because nothing is dirty
      expect(dataService.saveProject).not.toHaveBeenCalled();
    });
  });

  describe('Empty Content Guards', () => {
    it('should allow save of empty symbols if they were intentionally deleted (dirty)', async () => {
      // ARRANGE: Hook IS initialized
      isInitializedRef.current = true;

      // Simulate scenario: had symbols before
      lastSavedSymbolsRef.current = JSON.stringify([
        { id: 'device-1', type: 'outlet', x: 100, y: 100 }
      ]);

      // Other refs match (not dirty)
      const overlayData = {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        locked: false
      };
      lastSavedPayloadRef.current = JSON.stringify(overlayData);
      lastSavedPolygonsRef.current = JSON.stringify([]);
      lastSavedFurnitureRef.current = JSON.stringify([]);
      lastSavedCablesRef.current = JSON.stringify([]);

      // Current state: empty symbols (user deleted them - IS dirty)
      mockEditor.layerSystem.getAllLayers = vi.fn(() => [
        {
          id: 'electrical',
          type: 'image',
          transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 },
          opacity: 1,
          locked: false
        },
        {
          id: 'vector-layer',
          type: 'vector',
          content: { symbols: [] } // Empty now (dirty!)
        },
        {
          id: 'room',
          type: 'vector',
          content: { rooms: [] }
        },
        {
          id: 'mask',
          type: 'vector',
          content: { masks: [] }
        },
        {
          id: 'furniture',
          type: 'vector',
          content: { furniture: [] }
        },
        {
          id: 'cables',
          type: 'vector',
          content: { cables: [] }
        }
      ]);

      const { result } = renderHook(() =>
        useAutoSave(
          editorInstanceRef,
          isInitializedRef,
          lastSavedPayloadRef,
          lastSavedSymbolsRef,
          lastSavedPolygonsRef,
          lastSavedFurnitureRef,
          lastSavedCablesRef
        )
      );

      vi.mocked(dataService.saveProject).mockResolvedValue(undefined);

      // ACT: Force save
      result.current.debouncedSaveProject(true);

      // ASSERT: Should allow save because user intentionally deleted (dirty)
      await waitFor(() => {
        expect(dataService.saveProject).toHaveBeenCalled();
      }, { timeout: 500 });

      // Verify empty symbols were saved (intentional deletion)
      const saveCall = vi.mocked(dataService.saveProject).mock.calls[0][0];
      expect(saveCall.devices).toEqual([]);
    });
  });

  describe('resetAnchors', () => {
    it('should provide resetAnchors function', () => {
      const { result } = renderHook(() =>
        useAutoSave(
          editorInstanceRef,
          isInitializedRef,
          lastSavedPayloadRef,
          lastSavedSymbolsRef,
          lastSavedPolygonsRef,
          lastSavedFurnitureRef,
          lastSavedCablesRef
        )
      );

      expect(result.current.resetAnchors).toBeDefined();
      expect(typeof result.current.resetAnchors).toBe('function');

      // Should not throw when called
      expect(() => result.current.resetAnchors()).not.toThrow();
    });
  });
});
