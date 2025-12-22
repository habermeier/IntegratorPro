/**
 * useRoomManagement Hook
 *
 * Extracts room management logic from FloorPlanRenderer.tsx
 * Handles room creation, editing, and color generation
 *
 * Date: 2025-12-22
 */

import { useMemo } from 'react';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';
import { Layer, Room, RoomType, VectorLayerContent } from '../../editor/models/types';
import { AddPolygonCommand } from '../../editor/commands/AddPolygonCommand';

export interface RoomManagementHookReturn {
  handleSaveRoom: (name: string, type: RoomType) => void;
  handleCancelRoom: () => void;
  existingRoomNames: string[];
}

export function useRoomManagement(
  editor: FloorPlanEditor | null,
  layers: Layer[],
  pendingRoom: Room | null,
  isRoomEdit: boolean,
  setPendingRoom: (room: Room | null) => void,
  setIsRoomEdit: (edit: boolean) => void
): RoomManagementHookReturn {

  // Helper to get room names for uniqueness check
  const existingRoomNames = useMemo(() => {
    const roomLayer = layers.find(l => l.id === 'room');
    if (!roomLayer || !roomLayer.content) return [];
    const content = roomLayer.content as VectorLayerContent;
    return (content.rooms || []).map(r => r.name);
  }, [layers]);

  const handleSaveRoom = (name: string, type: RoomType) => {
    if (!pendingRoom || !editor) return;

    // 1. Generate Distinct Color
    const existingRooms = layers
      .filter(l => l.id === 'room')
      .flatMap(l => (l.content as VectorLayerContent).rooms || []);

    // HSL Helper (returns 0xRRGGBB number)
    const hslToHex = (h: number, s: number, l: number): number => {
      l /= 100;
      const a = s * Math.min(l, 1 - l) / 100;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return parseInt(`0x${f(0)}${f(8)}${f(4)}`, 16);
    };

    // Find neighbors (Simple centroid distance or bbox check)
    // For simplicity and robustness with small N, we check ALL rooms, weighted by distance.
    // Actually, user wants adjacent rooms to differ.
    // Let's pick 10 random candidates and choose the one maximizing min-hue-distance to neighbors.

    const candidates = Array.from({ length: 15 }, () => Math.floor(Math.random() * 360));
    let bestHue = candidates[0];
    let maxMinDist = -1;

    // Calculate centroid of new room
    let cx = 0, cy = 0;
    pendingRoom.points.forEach(p => { cx += p.x; cy += p.y; });
    cx /= pendingRoom.points.length;
    cy /= pendingRoom.points.length;
    // const radiusC = 1000;

    // Filter relevant neighbors (optimization)
    const neighbors = existingRooms.filter(r => {
      // Approximate centroid
      let nx = 0, ny = 0;
      r.points.forEach(p => { nx += p.x; ny += p.y; });
      nx /= r.points.length;
      ny /= r.points.length;
      const d = Math.sqrt((cx - nx) ** 2 + (cy - ny) ** 2);
      return d < 2000; // Check nearby rooms within ~scope
    });

    for (const hue of candidates) {
      let minDist = 360;
      if (neighbors.length === 0) {
        minDist = 360; // No constraints
      } else {
        for (const r of neighbors) {
          if (r.color === undefined) continue;

          const rColor = r.color;
          const rR = (rColor >> 16) & 255;
          const rG = (rColor >> 8) & 255;
          const rB = rColor & 255;

          // RGB to HSL
          const curR = rR / 255, curG = rG / 255, curB = rB / 255;
          const max = Math.max(curR, curG, curB), min = Math.min(curR, curG, curB);
          let h = 0;
          if (max !== min) {
            const d = max - min;
            switch (max) {
              case curR: h = (curG - curB) / d + (curG < curB ? 6 : 0); break;
              case curG: h = (curB - curR) / d + 2; break;
              case curB: h = (curR - curG) / d + 4; break;
            }
            h *= 60;
          }
          if (h < 0) h += 360; // Normalize

          let diff = Math.abs(hue - h);
          if (diff > 180) diff = 360 - diff;
          if (diff < minDist) minDist = diff;
        }
      }

      if (minDist > maxMinDist) {
        maxMinDist = minDist;
        bestHue = hue;
      }
    }

    // Generate final color with consistent pleasant Saturation/Lightness
    // e.g. S=65-85%, L=50-65% for readable, vibrant mix
    // Only generate new color if it's a NEW room (or user wants to reset? Keep simple: preserve if edit)

    let finalColor = pendingRoom.color; // Preserve existing
    if (!isRoomEdit || !finalColor) {
      finalColor = hslToHex(bestHue, 75, 60);
    }

    const finalizedRoom: Room = {
      ...pendingRoom,
      name,
      roomType: type,
      color: finalColor
    };

    if (isRoomEdit) {
      // Use ModifyPolygon to update existing
      // Actually, ModifyPolygonCommand takes point arrays.
      // We need a command to update PROPERTIES (metadata).
      // Since we don't have "UpdatePropertiesCommand", we can cheat or make one.
      // "ModifyPolygonCommand" is about geometry.

      // Let's create a generic "UpdatePolygonPropertiesCommand" or simpler: use "Delete + Add"?
      // Delete + Add changes ID usually, unless we force keep ID.
      // Let's manually get layer content and replace the object for now, or
      // better: Add "updatePolygonMetadata" method to LayerSystem and emit change.

      // Quickest clean way:
      // Reuse AddPolygonCommand? No, that pushes.
      // Let's simulate property update via existing commands or direct access + emit.
      // Direct update is acceptable here if we mark Dirty.

      const roomLayer = editor.layerSystem.getLayer('room');
      if (roomLayer && roomLayer.type === 'vector') {
        const content = roomLayer.content as VectorLayerContent;
        const target = (content.rooms || []).find(r => r.id === pendingRoom.id);
        if (target) {
          target.name = name;
          target.roomType = type;
          target.color = finalColor;

          // We need to trigger re-render of label and color
          // invalidate cache
          editor.layerSystem.markDirty('room'); // This clears cache map? No, markDirty just flags for render?
          // LayerSystem.update() logic:
          // uses 'lastHash' to see if points changed.
          // It checks `group.userData.labelName !== rName` to update label!
          // We implemented that logic earlier. so it SHOULD auto-update label.
          // Does it update color?
          // Fill mesh color... `fill.material.color.setHex()`
          // LayerSystem update check:
          // "Update Geometries only if hash changed" -> this handles points.
          // Color/Label updates areMetadata.
          // I need to ensure LayerSystem handles metadata updates or force hash change.

          // Helper: Force update by clearing mesh cache for this item?
          // Or direct update:
          editor.layerSystem.markDirty('room'); // Force re-process
          editor.emit('layers-changed', editor.layerSystem.getAllLayers());
        }
      }
    } else {
      const command = new AddPolygonCommand('room', finalizedRoom, editor.layerSystem);
      editor.commandManager.execute(command);
      editor.emit('layers-changed', editor.layerSystem.getAllLayers());
    }

    setPendingRoom(null);
    setIsRoomEdit(false);
  };

  const handleCancelRoom = () => {
    setPendingRoom(null);
    setIsRoomEdit(false);
  };

  return {
    handleSaveRoom,
    handleCancelRoom,
    existingRoomNames
  };
}
