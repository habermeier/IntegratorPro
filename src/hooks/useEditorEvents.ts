/**
 * useEditorEvents Hook
 *
 * Extracts editor event handling logic from FloorPlanRenderer.tsx
 * Sets up all editor.on() listeners and window event listeners
 *
 * Date: 2025-12-22
 */

import { useEffect } from 'react';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';
import { Layer, ToolType, VectorLayerContent } from '../../editor/models/types';
import { dataService } from '../services/DataService';

export interface EditorEventCallbacks {
  setActiveTool: (tool: ToolType) => void;
  setIsEditMode: (mode: boolean) => void;
  setActiveLayerId: (id: string | null) => void;
  setLayers: (layers: Layer[]) => void;
  setActiveSymbol: (type: string) => void;
  setIsPanning: (panning: boolean) => void;
  setIsAltPressed: (pressed: boolean) => void;
  setIsShiftPressed: (pressed: boolean) => void;
  setUnitPreference: (units: 'METRIC' | 'IMPERIAL') => void;
  setFastZoomMultiplier: (multiplier: number) => void;
  debouncedSavePolygons: () => void;
  debouncedSaveSymbols: () => void;
  debouncedSaveFurniture: () => void;
  lastSavedPayloadRef: React.MutableRefObject<string>;
  lastSavedSymbolsRef: React.MutableRefObject<string>;
  lastSavedPolygonsRef: React.MutableRefObject<string>;
  lastSavedFurnitureRef: React.MutableRefObject<string>;
}

export function useEditorEvents(
  editor: FloorPlanEditor | null,
  callbacks: EditorEventCallbacks
) {
  useEffect(() => {
    if (!editor) return;

    // Editor -> React changes
    const onToolChanged = (tool: ToolType) => {
      callbacks.setActiveTool(tool);
    };

    const onModeChanged = (mode: boolean) => {
      callbacks.setIsEditMode(mode);
    };

    const onEditModeChanged = ({ isEditMode, activeLayerId }: { isEditMode: boolean, activeLayerId: string | null }) => {
      callbacks.setIsEditMode(isEditMode);
      callbacks.setActiveLayerId(activeLayerId);
    };

    const onLayersChanged = (newLayers: Layer[]) => {
      callbacks.setLayers([...newLayers]);
      callbacks.debouncedSavePolygons();
      callbacks.debouncedSaveSymbols();
      callbacks.debouncedSaveFurniture();
    };

    editor.on('tool-changed', onToolChanged);
    editor.on('mode-changed', onModeChanged);
    editor.on('edit-mode-changed', onEditModeChanged);
    editor.on('layers-changed', onLayersChanged);
    editor.on('active-symbol-changed', (type: string) => callbacks.setActiveSymbol(type));
    editor.on('panning-changed', (panning: boolean) => callbacks.setIsPanning(panning));

    const onModifierChanged = ({ isAltPressed, isShiftPressed }: { isAltPressed: boolean, isShiftPressed: boolean }) => {
      callbacks.setIsAltPressed(isAltPressed);
      callbacks.setIsShiftPressed(isShiftPressed);
    };
    editor.on('modifier-changed', onModifierChanged);

    // Sync units & settings
    const handleUnitsChanged = () => {
      callbacks.setUnitPreference((localStorage.getItem('integrator-pro-units') as 'METRIC' | 'IMPERIAL') || 'IMPERIAL');
    };

    const handleSettingsChanged = () => {
      const multiplier = parseFloat(localStorage.getItem('integrator-pro-fast-zoom-multiplier') || '3');
      callbacks.setFastZoomMultiplier(multiplier);
      if (editor) {
        editor.fastZoomMultiplier = multiplier;
      }
    };

    window.addEventListener('storage-units-changed', handleUnitsChanged);
    window.addEventListener('storage-settings-changed', handleSettingsChanged);

    // FLUSH ON UNLOAD
    const handleBeforeUnload = () => {
      // We can't easily wait for async fetch in beforeunload,
      // but we can try to use sendBeacon if we had a dedicated endpoint.
      // For now, let's just hope the 500ms debounce hits before the user closes.
      // A more robust way is to use sync flush if possible (deprecated) or beacon.
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Listen for cross-tab data changes
    const handleProjectChange = async () => {
      console.log('[useEditorEvents] Detected external project change, reloading data');
      if (!editor) return;

      try {
        // Force reload from server, bypassing cache
        const project = await dataService.loadProject(undefined, true);
        console.log('📦 Reloaded project data after external change');

        // Update editor with fresh data
        const scaleData = project.floorPlan.scale;
        const symbolsData = { devices: project.devices };
        const polygonsData = { polygons: project.floorPlan.polygons };
        const overlayData = project.floorPlan.electricalOverlay;

        // Update scale
        if (scaleData && scaleData.scaleFactor) {
          editor.pixelsMeter = scaleData.scaleFactor;
        }

        // Update electrical layer transform
        editor.setLayerTransform('electrical', {
          position: { x: overlayData.x || 0, y: overlayData.y || 0 },
          scale: { x: overlayData.scale || 1, y: overlayData.scale || 1 },
          rotation: overlayData.rotation || 0
        }, true);

        // Update symbols
        const electricalLayer = editor.layerSystem.getLayer('electrical');
        if (electricalLayer) {
          electricalLayer.content = {
            ...electricalLayer.content,
            symbols: symbolsData.devices || []
          };
          editor.layerSystem.markDirty('electrical');
        }

        // Update polygons
        const roomLayer = editor.layerSystem.getLayer('room');
        const maskLayer = editor.layerSystem.getLayer('mask');
        const allPolygons = polygonsData.polygons || [];

        if (roomLayer) {
          roomLayer.content = {
            ...roomLayer.content,
            rooms: allPolygons.filter((p: any) => p.type === 'room')
          };
          editor.layerSystem.markDirty('room');
        }

        if (maskLayer) {
          maskLayer.content = {
            ...maskLayer.content,
            masks: allPolygons.filter((p: any) => p.type === 'mask')
          };
          editor.layerSystem.markDirty('mask');
        }

        // Update furniture
        const furnitureLayer = editor.layerSystem.getLayer('furniture');
        const furnitureData = project.furniture || [];
        if (furnitureLayer) {
          furnitureLayer.content = {
            ...furnitureLayer.content,
            furniture: furnitureData
          };
          editor.layerSystem.markDirty('furniture');
        }

        // Update layers state to trigger re-render
        callbacks.setLayers([...editor.layerSystem.getAllLayers()]);

        // 💡 Update Cache Refs to prevent immediate re-save after reload
        callbacks.lastSavedPayloadRef.current = JSON.stringify({
          x: overlayData.x || 0,
          y: overlayData.y || 0,
          scale: overlayData.scale || 1,
          rotation: overlayData.rotation || 0,
          opacity: overlayData.opacity ?? 0.7,
          locked: !!overlayData.locked
        });
        callbacks.lastSavedSymbolsRef.current = JSON.stringify(symbolsData.devices || []);
        callbacks.lastSavedPolygonsRef.current = JSON.stringify(allPolygons);
        callbacks.lastSavedFurnitureRef.current = JSON.stringify(furnitureData);

        console.log('✅ Editor state synchronized with external changes');
      } catch (error) {
        console.error('Failed to reload project after external change:', error);
      }
    };

    window.addEventListener('project-data-changed', handleProjectChange);

    return () => {
      editor.off('tool-changed', onToolChanged);
      editor.off('mode-changed', onModeChanged);
      editor.off('edit-mode-changed', onEditModeChanged);
      editor.off('layers-changed', onLayersChanged);
      editor.off('modifier-changed', onModifierChanged);
      window.removeEventListener('storage-units-changed', handleUnitsChanged);
      window.removeEventListener('storage-settings-changed', handleSettingsChanged);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('project-data-changed', handleProjectChange);
    };
  }, [editor, callbacks]);
}
