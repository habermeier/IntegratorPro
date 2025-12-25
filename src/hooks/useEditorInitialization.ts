/**
 * useEditorInitialization Hook
 *
 * Extracts editor initialization logic from FloorPlanRenderer.tsx
 * Handles layer setup, image loading, and state restoration
 *
 * Date: 2025-12-22
 */

import { useCallback, useRef } from 'react';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';
import { dataService } from '../services/DataService';
import { useApplyProjectData } from './useApplyProjectData';
import { Room } from '../../editor/models/types';
import BASE_IMAGE from '../../images/floor-plan-clean.jpg';
import ELECTRICAL_IMAGE from '../../images/electric-plan-plain-full-clean-2025-12-12.jpg';

export interface EditorInitCallbacks {
  setEditor: (editor: FloorPlanEditor | null) => void;
  setLayers: (layers: any[]) => void;
  setActiveTool: (tool: any) => void;
  setIsEditMode: (mode: boolean) => void;
  setFastZoomMultiplier: (multiplier: number) => void;
  setUnitPreference: (units: 'METRIC' | 'IMPERIAL') => void;
  setDataLossThreshold: (threshold: number) => void;
  onCursorMove: (x: number, y: number) => void;
  onKeydown: (key: string) => void;
  onCalibrationNeeded: (data: any) => void;
  onSelectionChanged: (ids: string[]) => void;
  onMeasureChanged: (measurement: any) => void;
  onRoomCompletionPending: (room: Room) => void;
}

export function useEditorInitialization(
  editorInstanceRef: React.MutableRefObject<FloorPlanEditor | null>,
  isInitializedRef: React.MutableRefObject<boolean>,
  lastSavedSymbolsRef: React.MutableRefObject<string>,
  lastSavedPayloadRef: React.MutableRefObject<string>,
  lastSavedPolygonsRef: React.MutableRefObject<string>,
  lastSavedFurnitureRef: React.MutableRefObject<string>,
  lastSavedCablesRef: React.MutableRefObject<string>,
  callbacks: EditorInitCallbacks
) {
  const applyProjectData = useApplyProjectData(
    lastSavedPayloadRef,
    lastSavedSymbolsRef,
    lastSavedPolygonsRef,
    lastSavedFurnitureRef,
    lastSavedCablesRef
  );

  const initEditor = useCallback((container: HTMLDivElement) => {
    if (editorInstanceRef.current) return;

    const editorInstance = new FloorPlanEditor(container);
    editorInstanceRef.current = editorInstance;
    callbacks.setEditor(editorInstance);
    (window as any).editor = editorInstance;

    // Setup event callbacks
    editorInstance.on('cursor-move', ({ x, y }: { x: number, y: number }) => {
      callbacks.onCursorMove(x, y);
    });

    editorInstance.on('keydown', (key: string) => {
      callbacks.onKeydown(key);
    });

    editorInstance.on('calibration-needed', callbacks.onCalibrationNeeded);
    editorInstance.on('selection-changed', callbacks.onSelectionChanged);
    editorInstance.on('measure-changed', callbacks.onMeasureChanged);
    editorInstance.on('room-completion-pending', (room: Room) => {
      callbacks.onRoomCompletionPending(room);
    });

    // Initial Layers & Persistence Setup
    const setup = async () => {
      // 1. Define Layers
      editorInstance.addLayer({
        id: 'base',
        name: 'Base Floor Plan',
        type: 'image',
        zIndex: 0,
        visible: true,
        locked: true,
        opacity: 1,
        transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 },
        allowLayerEditing: true // Image layer - can be adjusted
      });

      editorInstance.addLayer({
        id: 'mask',
        name: 'Masking',
        type: 'vector',
        zIndex: 25, // Above electrical (20), below rooms (30)
        visible: true,
        locked: true,
        opacity: 1,
        transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 },
        allowLayerEditing: false // Data layer - locked to base coordinates
      });

      editorInstance.addLayer({
        id: 'electrical',
        name: 'Electrical Overlay',
        type: 'image',
        zIndex: 20,
        visible: true,
        locked: true,
        opacity: 0.7,
        transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 },
        allowLayerEditing: true // Image layer - can be adjusted for alignment
      });

      editorInstance.addLayer({
        id: 'room',
        name: 'Rooms',
        type: 'vector',
        zIndex: 30,
        visible: true,
        locked: false,
        opacity: 1,
        transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 },
        allowLayerEditing: false // Data layer - locked to base coordinates
      });

      editorInstance.addLayer({
        id: 'cables',
        name: 'Cables',
        type: 'vector',
        zIndex: 40,
        visible: true,
        locked: false,
        opacity: 1,
        transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 },
        allowLayerEditing: false // Data layer - locked to base coordinates
      });

      editorInstance.addLayer({
        id: 'lighting',
        name: 'Lighting',
        type: 'vector',
        zIndex: 50,
        visible: true,
        locked: false,
        opacity: 1,
        transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 },
        allowLayerEditing: false // Data layer - locked to base coordinates
      });

      editorInstance.addLayer({
        id: 'sensors',
        name: 'Sensors',
        type: 'vector',
        zIndex: 51,
        visible: true,
        locked: false,
        opacity: 1,
        transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 },
        allowLayerEditing: false // Data layer - locked to base coordinates
      });

      editorInstance.addLayer({
        id: 'security',
        name: 'Security',
        type: 'vector',
        zIndex: 52,
        visible: true,
        locked: false,
        opacity: 1,
        transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 },
        allowLayerEditing: false // Data layer - locked to base coordinates
      });

      editorInstance.addLayer({
        id: 'network',
        name: 'Network',
        type: 'vector',
        zIndex: 53,
        visible: true,
        locked: false,
        opacity: 1,
        transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 },
        allowLayerEditing: false // Data layer - locked to base coordinates
      });

      editorInstance.addLayer({
        id: 'lcps',
        name: 'LCPs',
        type: 'vector',
        zIndex: 54,
        visible: true,
        locked: false,
        opacity: 1,
        transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 },
        allowLayerEditing: false // Data layer - locked to base coordinates
      });

      editorInstance.addLayer({
        id: 'hvac',
        name: 'HVAC',
        type: 'vector',
        zIndex: 55,
        visible: true,
        locked: false,
        opacity: 1,
        transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 },
        allowLayerEditing: false // Data layer - locked to base coordinates
      });

      editorInstance.addLayer({
        id: 'receptacles',
        name: 'Receptacles',
        type: 'vector',
        zIndex: 56,
        visible: true,
        locked: false,
        opacity: 1,
        transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 },
        allowLayerEditing: false // Data layer - locked to base coordinates
      });

      editorInstance.addLayer({
        id: 'furniture',
        name: 'Furniture',
        type: 'vector',
        zIndex: 60,
        visible: true,
        locked: false,
        opacity: 1,
        transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0 },
        allowLayerEditing: false // Data layer - locked to base coordinates
      });

      // 2. Load Images
      await editorInstance.loadImage('base', BASE_IMAGE);
      await editorInstance.loadImage('electrical', ELECTRICAL_IMAGE);

      // 3. Load Persistence (Editor knows best)
      editorInstance.loadPersistentState();

      // 4. Load Saved State from Server (using DataService)
      try {
        const project = await dataService.loadProject();
        console.log('📦 Loaded project data from DataService');

        if (project) {
          applyProjectData(editorInstance, project);

          const settingsData = project.settings;
          if (settingsData) {
            if (settingsData.fastZoomMultiplier !== undefined) {
              callbacks.setFastZoomMultiplier(settingsData.fastZoomMultiplier);
              editorInstance.cameraSystem.setFastZoomMultiplier(settingsData.fastZoomMultiplier);
              localStorage.setItem('integrator-pro-fast-zoom-multiplier', settingsData.fastZoomMultiplier.toString());
            }
            if (settingsData.units) {
              callbacks.setUnitPreference(settingsData.units as 'METRIC' | 'IMPERIAL');
              localStorage.setItem('integrator-pro-units', settingsData.units);
              window.dispatchEvent(new Event('storage-units-changed'));
            }
            if (settingsData.dataLossThreshold !== undefined) {
              callbacks.setDataLossThreshold(settingsData.dataLossThreshold);
              localStorage.setItem('integrator-pro-data-loss-threshold', settingsData.dataLossThreshold.toString());
            }
          }

          // Mark as initialized so auto-saves can proceed
          isInitializedRef.current = true;
          console.log('✅ Editor initialized and state restored');
        }
      } catch (err) {
        console.error('Failed to restore editor state:', err);
        // Still mark as initialized so manual edits can be saved
        isInitializedRef.current = true;
      }
    };

    setup();
  }, [editorInstanceRef, isInitializedRef, lastSavedSymbolsRef, lastSavedPayloadRef, lastSavedPolygonsRef, lastSavedFurnitureRef, lastSavedCablesRef, callbacks, applyProjectData]);

  return initEditor;
}
