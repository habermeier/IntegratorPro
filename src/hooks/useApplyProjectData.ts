/**
 * useApplyProjectData Hook
 * 
 * Centralized logic for applying ProjectData to the FloorPlanEditor instance.
 * Ensures that initialization and cross-tab sync use identical logic for:
 * 1. Layer data distribution (symbols, polygons, furniture)
 * 2. Transform applications
 * 3. lastSaved reference updates (to prevent recursive save loops)
 */

import { useCallback } from 'react';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';
import { ProjectData, PlacedSymbol, VectorLayerContent, Room, Furniture } from '../../editor/models/types';

export function useApplyProjectData(
    lastSavedPayloadRef: React.MutableRefObject<string>,
    lastSavedSymbolsRef: React.MutableRefObject<string>,
    lastSavedPolygonsRef: React.MutableRefObject<string>,
    lastSavedFurnitureRef: React.MutableRefObject<string>,
    lastSavedCablesRef: React.MutableRefObject<string>
) {
    const applyProjectData = useCallback((editor: FloorPlanEditor, project: ProjectData) => {
        // 1. Scale
        if (project.floorPlan.scale?.scaleFactor) {
            editor.pixelsMeter = project.floorPlan.scale.scaleFactor;
        }

        // 2. Electrical Overlay Transform
        const overlay = project.floorPlan.electricalOverlay;
        editor.setLayerTransform('electrical', {
            position: { x: overlay.x || 0, y: overlay.y || 0 },
            scale: { x: overlay.scale || 1, y: overlay.scale || 1 },
            rotation: overlay.rotation || 0
        }, true);

        // 3. Symbols (Distributed by category)
        const devices = project.devices || [];
        const devicesByCategory: { [category: string]: PlacedSymbol[] } = {};

        devices.forEach((device: any) => {
            const category = device.category || 'lighting';
            if (!devicesByCategory[category]) devicesByCategory[category] = [];
            devicesByCategory[category].push(device);
        });

        // Clear and fill thematic layers
        const thematicLayers = ['lighting', 'sensors', 'security', 'network', 'lcps', 'hvac', 'receptacles'];
        thematicLayers.forEach(id => {
            const layer = editor.layerSystem.getLayer(id);
            if (layer && layer.type === 'vector') {
                (layer.content as VectorLayerContent).symbols = devicesByCategory[id] || [];
                editor.layerSystem.markDirty(id);
            }
        });

        // 4. Polygons (Rooms + Masks)
        const allPolygons = project.floorPlan.polygons || [];
        const rooms = allPolygons.filter((p: any) => p.type === 'room') as Room[];
        const masks = allPolygons.filter((p: any) => p.type === 'mask');

        const roomLayer = editor.layerSystem.getLayer('room');
        if (roomLayer && roomLayer.type === 'vector') {
            (roomLayer.content as VectorLayerContent).rooms = rooms;
            editor.layerSystem.markDirty('room');
        }

        const maskLayer = editor.layerSystem.getLayer('mask');
        if (maskLayer && maskLayer.type === 'vector') {
            (maskLayer.content as VectorLayerContent).masks = masks;
            editor.layerSystem.markDirty('mask');
        }

        // 5. Furniture
        const furnitureData = project.furniture || [];
        const furnitureLayer = editor.layerSystem.getLayer('furniture');
        if (furnitureLayer && furnitureLayer.type === 'vector') {
            // Data format handles both flattened and nested position
            const mappedFurniture = furnitureData.map((f: any) => ({
                ...f,
                x: f.position?.x ?? f.x ?? 0,
                y: f.position?.y ?? f.y ?? 0,
            }));
            (furnitureLayer.content as VectorLayerContent).furniture = mappedFurniture as any[];
            editor.layerSystem.markDirty('furniture');
        }

        // 6. Cables
        const cablesData = project.cables || [];
        const cablesLayer = editor.layerSystem.getLayer('cables');
        if (cablesLayer && cablesLayer.type === 'vector') {
            (cablesLayer.content as VectorLayerContent).cables = cablesData;
            editor.layerSystem.markDirty('cables');
        }

        // 7. Update Cache Refs to prevent immediate re-save
        // IMPORTANT: These must match exactly what debouncedSave... strings look like
        lastSavedPayloadRef.current = JSON.stringify({
            x: overlay.x || 0,
            y: overlay.y || 0,
            scale: overlay.scale || 1,
            rotation: overlay.rotation || 0,
            opacity: overlay.opacity ?? 0.7,
            locked: !!overlay.locked
        });

        // For symbols, we collect them back to verify the aggregation matches
        const aggregatedDevices: any[] = [];
        editor.layerSystem.getAllLayers().forEach(l => {
            if (l.type === 'vector') {
                const symbols = (l.content as VectorLayerContent).symbols || [];
                if (symbols.length > 0) aggregatedDevices.push(...symbols);
            }
        });
        lastSavedSymbolsRef.current = JSON.stringify(aggregatedDevices);
        lastSavedPolygonsRef.current = JSON.stringify(allPolygons);
        lastSavedFurnitureRef.current = JSON.stringify(furnitureData);
        lastSavedCablesRef.current = JSON.stringify(cablesData);

        console.log(`[useApplyProjectData] applied ${devices.length} devices, ${allPolygons.length} polygons, ${furnitureData.length} furniture`);
    }, [lastSavedPayloadRef, lastSavedSymbolsRef, lastSavedPolygonsRef, lastSavedFurnitureRef, lastSavedCablesRef]);

    return applyProjectData;
}
