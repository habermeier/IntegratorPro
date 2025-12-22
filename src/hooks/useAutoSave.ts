/**
 * useAutoSave Hook
 *
 * Extracts auto-save functionality from FloorPlanRenderer.tsx
 * Provides debounced save functions for editor data
 *
 * Date: 2025-12-22
 */

import { useCallback, useRef } from 'react';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';
import { VectorLayerContent } from '../../editor/models/types';
import { dataService } from '../services/DataService';

export interface AutoSaveHookReturn {
  debouncedSave: () => void;
  debouncedSaveSymbols: () => void;
  debouncedSaveFurniture: () => void;
  debouncedSavePolygons: () => void;
  debouncedSaveCables: () => void;
}

export function useAutoSave(
  editorInstanceRef: React.MutableRefObject<FloorPlanEditor | null>,
  isInitializedRef: React.MutableRefObject<boolean>,
  lastSavedPayloadRef: React.MutableRefObject<string>,
  lastSavedSymbolsRef: React.MutableRefObject<string>,
  lastSavedPolygonsRef: React.MutableRefObject<string>,
  lastSavedFurnitureRef: React.MutableRefObject<string>,
  lastSavedCablesRef: React.MutableRefObject<string>
): AutoSaveHookReturn {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const symbolsSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const polygonsSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const furnitureSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cablesSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced Save (Direct Editor Access)
  const debouncedSave = useCallback(() => {
    if (!isInitializedRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      const editor = editorInstanceRef.current;
      if (!editor) return;

      const layers = editor.layerSystem.getAllLayers();
      const electricalLayer = layers.find(l => l.id === 'electrical');
      if (!electricalLayer) return;

      const payload = {
        x: electricalLayer.transform.position.x,
        y: electricalLayer.transform.position.y,
        scale: electricalLayer.transform.scale.x,
        rotation: electricalLayer.transform.rotation,
        opacity: electricalLayer.opacity,
        locked: electricalLayer.locked
      };

      const payloadStr = JSON.stringify(payload);

      // 💡 Dirty Check: Only save if state has actually changed
      if (payloadStr === lastSavedPayloadRef.current) {
        return;
      }

      try {
        await dataService.updateElectricalOverlay(payload);
        lastSavedPayloadRef.current = payloadStr;
        console.log('✅ Electrical overlay saved automatically via DataService');
      } catch (err) {
        console.error('Failed to auto-save overlay state:', err);
      }
    }, 1000);
  }, [editorInstanceRef, isInitializedRef, lastSavedPayloadRef]);

  // Debounced Save Symbols (using DataService)
  const debouncedSaveSymbols = useCallback(() => {
    if (!isInitializedRef.current) return;

    if (symbolsSaveTimeoutRef.current) clearTimeout(symbolsSaveTimeoutRef.current);

    symbolsSaveTimeoutRef.current = setTimeout(async () => {
      const editor = editorInstanceRef.current;
      if (!editor) return;

      // Collect symbols from ALL technical layers (not just 'electrical')
      const allDevices: any[] = [];
      const layers = editor.layerSystem.getAllLayers();

      layers.forEach(layer => {
        if (layer.type === 'vector') {
          const content = layer.content as VectorLayerContent;
          const symbols = content.symbols || [];
          if (symbols.length > 0) {
            allDevices.push(...symbols);
          }
        }
      });

      const devicesStr = JSON.stringify(allDevices);

      // 💡 Dirty Check: Only save if symbols have actually changed
      if (devicesStr === lastSavedSymbolsRef.current) {
        return;
      }

      try {
        await dataService.updateDevices(allDevices as any[]);
        lastSavedSymbolsRef.current = devicesStr;
        console.log(`✅ ${allDevices.length} devices saved via DataService (from all layers)`);
      } catch (err) {
        console.error('Failed to auto-save symbols:', err);
      }
    }, 1500); // Slightly longer debounce for symbols
  }, [editorInstanceRef, isInitializedRef, lastSavedSymbolsRef]);

  // Debounced Save Furniture (using DataService)
  const debouncedSaveFurniture = useCallback(() => {
    if (!isInitializedRef.current) return;
    if (furnitureSaveTimeoutRef.current) clearTimeout(furnitureSaveTimeoutRef.current);

    furnitureSaveTimeoutRef.current = setTimeout(async () => {
      const editor = editorInstanceRef.current;
      if (!editor) return;

      const furnitureLayer = editor.layerSystem.getLayer('furniture');
      if (furnitureLayer && furnitureLayer.type === 'vector') {
        const furniture = (furnitureLayer.content as VectorLayerContent).furniture || [];
        const furnitureStr = JSON.stringify(furniture);

        // 💡 Dirty Check
        if (furnitureStr === lastSavedFurnitureRef.current) {
          return;
        }

        try {
          // Map editor furniture to DataService structure
          const mappedFurniture = furniture.map(f => ({
            ...f,
            position: { x: f.x, y: f.y }
          })) as any[];

          await dataService.updateFurniture(mappedFurniture);
          lastSavedFurnitureRef.current = furnitureStr;
          console.log('✅ Furniture saved via DataService');
        } catch (err) {
          console.error('Failed to auto-save furniture:', err);
        }
      }
    }, 1200);
  }, [editorInstanceRef, isInitializedRef, lastSavedFurnitureRef]);

  // Debounced Save Polygons (Unified System)
  const debouncedSavePolygons = useCallback(() => {
    if (!isInitializedRef.current) return;
    if (polygonsSaveTimeoutRef.current) clearTimeout(polygonsSaveTimeoutRef.current);

    polygonsSaveTimeoutRef.current = setTimeout(async () => {
      const editor = editorInstanceRef.current;
      if (!editor) return;

      const roomLayer = editor.layerSystem.getLayer('room');
      const maskLayer = editor.layerSystem.getLayer('mask');

      const allPolygons: any[] = [];

      if (roomLayer && roomLayer.type === 'vector') {
        const rooms = (roomLayer.content as VectorLayerContent).rooms || [];
        rooms.forEach(r => allPolygons.push({ ...r, type: 'room' }));
      }

      if (maskLayer && maskLayer.type === 'vector') {
        const masks = (maskLayer.content as VectorLayerContent).masks || [];
        masks.forEach(m => allPolygons.push({ ...m, type: 'mask' }));
      }

      const polygonsStr = JSON.stringify(allPolygons);

      // 💡 Dirty Check: Only save if polygons have actually changed
      if (polygonsStr === lastSavedPolygonsRef.current) {
        return;
      }

      try {
        console.log('💾 Saving polygons via DataService...', allPolygons.length, 'items');
        await dataService.updatePolygons(allPolygons);
        lastSavedPolygonsRef.current = polygonsStr;
        console.log('✅ Polygons saved successfully via DataService');
      } catch (err) {
        console.error('Failed to auto-save unified polygons:', err);
      }
    }, 500); // Shorter debounce for better responsiveness
  }, [editorInstanceRef, isInitializedRef, lastSavedPolygonsRef]);

  // Debounced Save Cables
  const debouncedSaveCables = useCallback(() => {
    if (!isInitializedRef.current) return;
    if (cablesSaveTimeoutRef.current) clearTimeout(cablesSaveTimeoutRef.current);

    cablesSaveTimeoutRef.current = setTimeout(async () => {
      const editor = editorInstanceRef.current;
      if (!editor) return;

      const cablesLayer = editor.layerSystem.getLayer('cables');
      if (cablesLayer && cablesLayer.type === 'vector') {
        const cables = (cablesLayer.content as VectorLayerContent).cables || [];
        const cablesStr = JSON.stringify(cables);

        // 💡 Dirty Check: Only save if cables have actually changed
        if (cablesStr === lastSavedCablesRef.current) {
          return;
        }

        try {
          await dataService.updateCables(cables);
          lastSavedCablesRef.current = cablesStr;
          console.log('✅ Cables saved via DataService');
        } catch (err) {
          console.error('Failed to auto-save cables:', err);
        }
      }
    }, 1200); // Similar debounce to furniture
  }, [editorInstanceRef, isInitializedRef, lastSavedCablesRef]);

  return {
    debouncedSave,
    debouncedSaveSymbols,
    debouncedSaveFurniture,
    debouncedSavePolygons,
    debouncedSaveCables
  };
}
