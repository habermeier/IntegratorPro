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
import { AmpereEngine } from '../services/AmpereEngine';
import { remoteDebug } from '../utils/logger';
import catalog from '../../catalog.json';

export interface AutoSaveHookReturn {
  debouncedSaveProject: (force?: boolean) => void;
  resetAnchors: () => void;
}

export function useAutoSave(
  editorInstanceRef: React.MutableRefObject<FloorPlanEditor | null>,
  isInitializedRef: React.MutableRefObject<boolean>,
  lastSavedPayloadRef: React.MutableRefObject<string>,
  lastSavedSymbolsRef: React.MutableRefObject<string>,
  lastSavedPolygonsRef: React.MutableRefObject<string>,
  lastSavedFurnitureRef: React.MutableRefObject<string>,
  lastSavedCablesRef: React.MutableRefObject<string>,
  dataLossThreshold: number = 0.5
): AutoSaveHookReturn {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef<boolean>(false);

  // Anchor counts for data loss heuristics (Prevents incremental bypass)
  const anchorCountRef = useRef<number>(-1);

  /**
   * Monolithic Unified Save
   * Collects all project state and performs a single save if ANY part is dirty.
   * This prevents version token races caused by multiple concurrent fragmented saves.
   */
  const debouncedSaveProject = useCallback((force: boolean = false) => {
    if (!isInitializedRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    const performSave = async () => {
      const editor = editorInstanceRef.current;
      if (!editor || isSavingRef.current) return;

      // 1. Collect all data components
      const layers = editor.layerSystem.getAllLayers();

      // -- Electrical Overlay --
      const electricalLayer = layers.find(l => l.id === 'electrical');
      const overlayPayload = electricalLayer ? {
        x: electricalLayer.transform.position.x,
        y: electricalLayer.transform.position.y,
        scale: electricalLayer.transform.scale.x,
        rotation: electricalLayer.transform.rotation,
        opacity: electricalLayer.opacity,
        locked: electricalLayer.locked
      } : JSON.parse(lastSavedPayloadRef.current || '{}');
      const payloadStr = JSON.stringify(overlayPayload);
      const isOverlayDirty = payloadStr !== lastSavedPayloadRef.current;

      // -- Symbols (Devices) --
      const allDevices: any[] = [];
      layers.forEach(layer => {
        if (layer.type === 'vector') {
          const content = layer.content as VectorLayerContent;
          const symbols = content.symbols || [];
          if (symbols.length > 0) {
            // Map PlacedSymbol to Device structure for storage
            const deviceMappedSymbols = symbols.map(s => ({
              ...s,
              deviceTypeId: s.type // Align with Device model
            }));
            allDevices.push(...deviceMappedSymbols);
          }
        }
      });
      const devicesStr = JSON.stringify(allDevices);
      const isSymbolsDirty = devicesStr !== lastSavedSymbolsRef.current;

      // -- Polygons (Rooms + Masks) --
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
      const isPolygonsDirty = polygonsStr !== lastSavedPolygonsRef.current;

      // -- Furniture --
      const furnitureLayer = editor.layerSystem.getLayer('furniture');
      const furniture = (furnitureLayer?.type === 'vector') ? (furnitureLayer.content as VectorLayerContent).furniture || [] : [];
      const furnitureStr = JSON.stringify(furniture);
      const isFurnitureDirty = furnitureStr !== lastSavedFurnitureRef.current;

      // -- Cables --
      const cablesLayer = editor.layerSystem.getLayer('cables');
      const cables = (cablesLayer?.type === 'vector') ? (cablesLayer.content as VectorLayerContent).cables || [] : [];
      const cablesStr = JSON.stringify(cables);
      const isCablesDirty = cablesStr !== lastSavedCablesRef.current;

      // 2. Dirty Check: Skip if nothing changed
      if (!isOverlayDirty && !isSymbolsDirty && !isPolygonsDirty && !isFurnitureDirty && !isCablesDirty && !force) {
        return;
      }

      // 3. Safety Guards & Heuristics

      // -- Electrical Overload Check (AUTO-SAFETY-P28) --
      if (allDevices.length > 0) {
        const { circuits, buses } = AmpereEngine.calculateLoads(allDevices as any, catalog as any);
        const overloadedCircuit = circuits.find(c => c.isOverloaded);
        const overloadedBus = buses.find(b => b.isOverloaded);

        if (overloadedCircuit || overloadedBus) {
          const type = overloadedCircuit ? 'HV Circuit' : 'LV Bus';
          const name = overloadedCircuit ? overloadedCircuit.id : overloadedBus?.id;
          const current = overloadedCircuit ? overloadedCircuit.totalAmps.toFixed(2) + 'A' : overloadedBus?.totalMa.toFixed(0) + 'mA';
          const limit = overloadedCircuit ? overloadedCircuit.limit + 'A' : overloadedBus?.limit + 'mA';

          console.warn(`[useAutoSave] Electrical Overload Detected: ${type} ${name} (${current} / ${limit})`);
          window.dispatchEvent(new CustomEvent('circuit-overload-detected', {
            detail: { type, name, current, limit }
          }));
          // We still allow the save for now, but the UI will warn the user.
          // This matches the "Non-Blocking Validation" requirement.
        }
      }

      // -- Polygons Massive Loss Check --
      const lastCount = allPolygons.length;
      if (anchorCountRef.current === -1) anchorCountRef.current = lastCount;
      const dropRatio = allPolygons.length / anchorCountRef.current;
      if (dropRatio < (1 - dataLossThreshold) && anchorCountRef.current > 5) {
        console.warn(`[useAutoSave] Massive data loss detected! Blocked mono-save.`);
        window.dispatchEvent(new CustomEvent('massive-change-detected', {
          detail: { type: 'polygons', lastCount: anchorCountRef.current, currentCount: allPolygons.length, data: allPolygons }
        }));
        return;
      }

      // -- Empty Content Guards (Initialization Safety) --
      // FIXED: Only block empty saves if content is NOT dirty (i.e., unintentional)
      // If symbols/furniture ARE dirty, the user explicitly deleted them → allow save
      if (allDevices.length === 0 && lastSavedSymbolsRef.current.length > 2 && !isSymbolsDirty) {
        console.warn('⚠️ Prevented mono-save of empty symbols (initialization guard)'); return;
      }
      if (furniture.length === 0 && lastSavedFurnitureRef.current.length > 2 && !isFurnitureDirty) {
        console.warn('⚠️ Prevented mono-save of empty furniture (initialization guard)'); return;
      }
      if (cables.length === 0 && lastSavedCablesRef.current.length > 2 && !isCablesDirty) {
        console.warn('⚠️ Prevented mono-save of empty cables (initialization guard)'); return;
      }

      // 4. Perform Monolithic Save
      try {
        isSavingRef.current = true;
        remoteDebug('💾 Triggering MONOLITHIC save project', 'useAutoSave');

        // We need to fetch the current project data to merge correctly if we only have fragmentation?
        // Actually DataService.saveProject already allows us to pass a partial/full object and it merges?
        // Let's look at DataService.saveProject again. It expects a full ProjectData but then overwrites fields.

        const currentProject = dataService.getCachedProject();
        if (!currentProject) {
          console.warn('[useAutoSave] No cached project found, loading once before save');
          await dataService.loadProject();
        }

        const projectUpdate: any = {
          ...dataService.getCachedProject(),
          furniture: furniture.map(f => ({ ...f, position: { x: f.x, y: f.y } })),
          cables,
          devices: allDevices,
          floorPlan: {
            ...dataService.getCachedProject()?.floorPlan,
            electricalOverlay: overlayPayload,
            polygons: allPolygons
          }
        };

        await dataService.saveProject(projectUpdate);

        // Update all dirty refs
        lastSavedPayloadRef.current = payloadStr;
        lastSavedSymbolsRef.current = devicesStr;
        lastSavedPolygonsRef.current = polygonsStr;
        lastSavedFurnitureRef.current = furnitureStr;
        lastSavedCablesRef.current = cablesStr;

        remoteDebug('✅ Monolithic project save successful', 'useAutoSave');
      } catch (err) {
        if (err instanceof Error && err.message === 'VERSION_CONFLICT') {
          console.warn('[useAutoSave] Version conflict during monolithic save. Retrying will happen on next debounce or reload.');
        } else {
          console.error('Failed monolithic project save:', err);
        }
      } finally {
        isSavingRef.current = false;
      }
    };

    if (force) {
      performSave();
    } else {
      saveTimeoutRef.current = setTimeout(performSave, 1500);
    }
  }, [editorInstanceRef, isInitializedRef, lastSavedPayloadRef, lastSavedSymbolsRef, lastSavedPolygonsRef, lastSavedFurnitureRef, lastSavedCablesRef, dataLossThreshold]);

  const resetAnchors = useCallback(() => {
    remoteDebug('Anchors reset', 'useAutoSave');
    anchorCountRef.current = -1;
  }, []);

  return {
    debouncedSaveProject,
    resetAnchors
  };
}
