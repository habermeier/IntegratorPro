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
import { useApplyProjectData } from './useApplyProjectData';

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
  debouncedSaveCables: () => void;
  lastSavedPayloadRef: React.MutableRefObject<string>;
  lastSavedSymbolsRef: React.MutableRefObject<string>;
  lastSavedPolygonsRef: React.MutableRefObject<string>;
  lastSavedFurnitureRef: React.MutableRefObject<string>;
  lastSavedCablesRef: React.MutableRefObject<string>;
}

export function useEditorEvents(
  editor: FloorPlanEditor | null,
  callbacks: EditorEventCallbacks
) {
  const applyProjectData = useApplyProjectData(
    callbacks.lastSavedPayloadRef,
    callbacks.lastSavedSymbolsRef,
    callbacks.lastSavedPolygonsRef,
    callbacks.lastSavedFurnitureRef,
    callbacks.lastSavedCablesRef
  );

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
      callbacks.debouncedSaveCables();
    };

    // Auto-activate layer when device/symbol is selected
    const onSelectionChanged = (selectedIds: string[]) => {
      if (selectedIds.length === 0) return;

      // Find the layer containing the selected object
      const layers = editor.layerSystem.getAllLayers();
      for (const layer of layers) {
        if (layer.type !== 'vector') continue;

        const content = layer.content as VectorLayerContent;

        // Check if any selected ID matches an object in this layer
        const isMatched =
          (content.symbols || []).some(s => selectedIds.includes(s.id)) ||
          (content.rooms || []).some(r => selectedIds.includes(r.id)) ||
          (content.masks || []).some(m => selectedIds.includes(m.id)) ||
          (content.furniture || []).some(f => selectedIds.includes(f.id)) ||
          (content.cables || []).some(c => selectedIds.includes(c.id));

        if (isMatched) {
          // Auto-activate and show this layer
          if (!layer.visible) {
            editor.setLayerVisible(layer.id, true);
          }
          // Set as active layer (for editing) as requested by Worker 3
          editor.setActiveLayer(layer.id);
          break; // Found the layer, no need to continue
        }
      }
    };

    editor.on('tool-changed', onToolChanged);
    editor.on('mode-changed', onModeChanged);
    editor.on('edit-mode-changed', onEditModeChanged);
    editor.on('layers-changed', onLayersChanged);
    editor.on('active-symbol-changed', (type: string) => callbacks.setActiveSymbol(type));
    editor.on('panning-changed', (panning: boolean) => callbacks.setIsPanning(panning));
    editor.on('selection-changed', onSelectionChanged);

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

    // Smooth Handover: Claim baton on interaction
    const handleInteraction = () => {
      if (!dataService.isPrimary()) {
        console.log('[useEditorEvents] User interaction detected, claiming Master Baton');
        dataService.claimBaton();
      }
    };

    window.addEventListener('mousedown', handleInteraction, { capture: true });
    window.addEventListener('keydown', handleInteraction, { capture: true });

    // Wakeup: Check for updates on window focus
    const handleFocus = () => {
      console.log('[useEditorEvents] Tab focused, checking for external updates');
      // Trigger a check via project-data-changed logic if needed, 
      // or just trust the storage event which should have fired.
      // Actually, if we've been in the background, we might have missed storage events?
      // No, they are queued/processed when resumed.
      // But we can force a sync check here if we wanted to be robust.
    };
    window.addEventListener('focus', handleFocus);

    // Listen for cross-tab data changes
    const handleProjectChange = async (e?: any) => {
      const isExternal = e?.detail?.external;
      const wasRequestedByMaster = e?.detail?.isMaster;

      if (dataService.isPrimary() && isExternal) {
        console.log('[useEditorEvents] Ignoring external change event because we are the Master tab');
        return;
      }

      console.log('[useEditorEvents] Detected project change, performing SILENT sync');
      if (!editor) return;

      try {
        // Force reload from server, bypassing cache
        const project = await dataService.loadProject(undefined, true);

        if (project) {
          applyProjectData(editor, project);
        }

        // Update layers state to trigger re-render
        callbacks.setLayers([...editor.layerSystem.getAllLayers()]);

        console.log('✅ Editor state synchronized silently');
      } catch (error) {
        console.error('Failed to reload project silently:', error);
      }
    };

    window.addEventListener('project-data-changed', handleProjectChange);

    return () => {
      editor.off('tool-changed', onToolChanged);
      editor.off('mode-changed', onModeChanged);
      editor.off('edit-mode-changed', onEditModeChanged);
      editor.off('layers-changed', onLayersChanged);
      editor.off('modifier-changed', onModifierChanged);
      editor.off('selection-changed', onSelectionChanged);
      window.removeEventListener('storage-units-changed', handleUnitsChanged);
      window.removeEventListener('storage-settings-changed', handleSettingsChanged);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('project-data-changed', handleProjectChange);
      window.removeEventListener('mousedown', handleInteraction, { capture: true });
      window.removeEventListener('keydown', handleInteraction, { capture: true });
      window.removeEventListener('focus', handleFocus);
    };
  }, [editor, callbacks, applyProjectData]);
}
