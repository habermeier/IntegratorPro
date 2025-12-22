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
import { Room, VectorLayerContent } from '../../editor/models/types';
import { dataService } from '../services/DataService';
import BASE_IMAGE from '../../images/floor-plan-clean.jpg';
import ELECTRICAL_IMAGE from '../../images/electric-plan-plain-full-clean-2025-12-12.jpg';

export interface EditorInitCallbacks {
  setEditor: (editor: FloorPlanEditor | null) => void;
  setLayers: (layers: any[]) => void;
  setActiveTool: (tool: any) => void;
  setIsEditMode: (mode: boolean) => void;
  setFastZoomMultiplier: (multiplier: number) => void;
  setUnitPreference: (units: 'METRIC' | 'IMPERIAL') => void;
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
  callbacks: EditorInitCallbacks
) {
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
        zIndex: 10,
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

        // Extract data from monolithic project structure
        const overlayData = project.floorPlan.electricalOverlay;
        const scaleData = project.floorPlan.scale;
        const symbolsData = { devices: project.devices };
        const polygonsData = { polygons: project.floorPlan.polygons };
        const settingsData = project.settings;

        if (scaleData && scaleData.scaleFactor) {
          editorInstance.pixelsMeter = scaleData.scaleFactor;
          console.log('📏 Restored scale from server:', scaleData.scaleFactor);
        }

        // RESTORE POSITION
        editorInstance.setLayerTransform('electrical', {
          position: { x: overlayData.x || 0, y: overlayData.y || 0 },
          scale: { x: overlayData.scale || 1, y: overlayData.scale || 1 },
          rotation: overlayData.rotation || 0
        }, true);

        // RESTORE SYMBOLS
        const electricalLayer = editorInstance.layerSystem.getLayer('electrical');
        if (electricalLayer) {
          const content = electricalLayer.content as VectorLayerContent;
          content.symbols = symbolsData.devices || [];
          lastSavedSymbolsRef.current = JSON.stringify(content.symbols);
        }

        // RESTORE POLYGONS (rooms + masks)
        if (polygonsData.polygons && Array.isArray(polygonsData.polygons)) {
          const roomLayer = editorInstance.layerSystem.getLayer('room');
          const maskLayer = editorInstance.layerSystem.getLayer('mask');

          const rooms = polygonsData.polygons.filter(p => p.type === 'room');
          const masks = polygonsData.polygons.filter(p => p.type === 'mask');

          if (roomLayer) {
            (roomLayer.content as VectorLayerContent).rooms = rooms;
          }

          if (maskLayer) {
            (maskLayer.content as VectorLayerContent).masks = masks;
          }

          console.log(`📐 Restored ${rooms.length} rooms and ${masks.length} masks from server`);
        }

        // RESTORE FURNITURE
        if (project.furniture && Array.isArray(project.furniture)) {
          const furnitureLayer = editorInstance.layerSystem.getLayer('furniture');
          if (furnitureLayer) {
            const mappedFurniture = project.furniture.map(f => ({
              ...f,
              x: f.position?.x ?? f.x ?? 0,
              y: f.position?.y ?? f.y ?? 0,
            }));
            (furnitureLayer.content as VectorLayerContent).furniture = mappedFurniture;
            console.log(`🪑 Restored ${mappedFurniture.length} furniture items from server`);
          }
        }

        // RESTORE SETTINGS & Sync UI
        callbacks.setLayers([...editorInstance.layerSystem.getAllLayers()]);
        callbacks.setActiveTool(editorInstance.toolSystem.getActiveToolType());
        callbacks.setIsEditMode(editorInstance.editMode);

        lastSavedPayloadRef.current = JSON.stringify({
          x: overlayData.x || 0,
          y: overlayData.y || 0,
          scale: overlayData.scale || 1,
          rotation: overlayData.rotation || 0,
          opacity: overlayData.opacity ?? 0.7,
          locked: !!overlayData.locked
        });

        lastSavedSymbolsRef.current = JSON.stringify(symbolsData.devices || []);
        lastSavedPolygonsRef.current = JSON.stringify(polygonsData.polygons || []);
        lastSavedFurnitureRef.current = JSON.stringify(project.furniture || []);

        if (settingsData) {
          if (settingsData.fastZoomMultiplier !== undefined) {
            callbacks.setFastZoomMultiplier(settingsData.fastZoomMultiplier);
            editorInstance.cameraSystem.setFastZoomMultiplier(settingsData.fastZoomMultiplier);
            localStorage.setItem('integrator-pro-fast-zoom-multiplier', settingsData.fastZoomMultiplier.toString());
          }
          if (settingsData.units) {
            callbacks.setUnitPreference(settingsData.units);
            localStorage.setItem('integrator-pro-units', settingsData.units);
            window.dispatchEvent(new Event('storage-units-changed'));
          }
        }

        // Mark as initialized so auto-saves can proceed
        isInitializedRef.current = true;
        console.log('✅ Editor initialized and state restored');
      } catch (err) {
        console.error('Failed to restore editor state:', err);
        // Still mark as initialized so manual edits can be saved
        isInitializedRef.current = true;
      }
    };

    setup();

    return () => {
      editorInstance.dispose();
      editorInstanceRef.current = null;
      callbacks.setEditor(null);
      if ((window as any).editor === editorInstance) {
        (window as any).editor = null;
      }
    };
  }, [editorInstanceRef, isInitializedRef, lastSavedSymbolsRef, lastSavedPayloadRef, lastSavedPolygonsRef, lastSavedFurnitureRef, callbacks]);

  return initEditor;
}
