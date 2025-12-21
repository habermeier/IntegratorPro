import * as THREE from 'three';
import { Tool } from '../systems/ToolSystem';
import { ToolType, Vector2, Furniture, VectorLayerContent, Room } from '../models/types';
import { FloorPlanEditor } from '../FloorPlanEditor';
import { AddFurnitureCommand } from '../commands/AddFurnitureCommand';
import { snapToWalls, snapToFurniture, getNearestWalls, getNearestFurniture, checkRectangleCollision, checkPolygonLineIntersection, getKeyPoints } from '../../utils/spatialUtils';

export class PlaceFurnitureTool implements Tool {
    public type: ToolType = 'place-furniture';
    private editor: FloorPlanEditor;
    private previewGroup: THREE.Group;

    // Default furniture state
    private currentRotation: number = 0;
    private currentWidth: number = 24; // Default 2 feet (24 inches)
    private currentLength: number = 24;
    private furnitureName: string = 'Chair';
    private isBlocking: boolean = false;

    private furnitureColor: number = 0xaaaaaa;
    private canPlace: boolean = true;

    // Snapping state
    private lastSnap: { x: number, y: number, snapped: boolean } = { x: 0, y: 0, snapped: false };
    private annotationGroup: THREE.Group;

    constructor(editor: FloorPlanEditor) {
        this.editor = editor;
        this.previewGroup = new THREE.Group();
        this.previewGroup.name = 'furniture-placement-preview';

        this.annotationGroup = new THREE.Group();
        this.annotationGroup.name = 'furniture-annotations';
    }

    public activate(): void {
        this.editor.scene.add(this.previewGroup);
        this.editor.scene.add(this.annotationGroup);
        this.previewGroup.visible = false;
        this.annotationGroup.visible = false;
        this.updatePreviewMesh();
        console.log('[PlaceFurnitureTool] Activated');
    }

    public deactivate(): void {
        this.editor.scene.remove(this.previewGroup);
        this.editor.scene.remove(this.annotationGroup);
        console.log('[PlaceFurnitureTool] Deactivated');
    }

    public setPrototype(name: string, width: number, length: number, isBlocking: boolean, color: number): void {
        this.furnitureName = name;
        this.currentWidth = width;
        this.currentLength = length;
        this.isBlocking = isBlocking;
        this.furnitureColor = color;
        this.updatePreviewMesh();
    }

    private updatePreviewMesh(): void {
        this.previewGroup.clear();

        // 1. Create Rectangle
        const geometry = new THREE.PlaneGeometry(this.currentWidth, this.currentLength);
        const material = new THREE.MeshBasicMaterial({
            color: this.canPlace ? this.furnitureColor : 0xff0000,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, material);

        // 2. Create Border
        const borderGeo = new THREE.EdgesGeometry(geometry);
        const borderMat = new THREE.LineBasicMaterial({ color: 0x333333 });
        const border = new THREE.LineSegments(borderGeo, borderMat);

        // 3. Label (Simplified for preview)
        // We can skip label for preview performance or add a simple sprite later

        this.previewGroup.add(mesh);
        this.previewGroup.add(border);

        // Blocking Indicator (Yellow dot in center if blocking)
        if (this.isBlocking) {
            const dot = new THREE.Mesh(
                new THREE.CircleGeometry(2, 8),
                new THREE.MeshBasicMaterial({ color: 0xffff00 })
            );
            dot.position.z = 0.1;
            this.previewGroup.add(dot);
        }

        this.previewGroup.visible = true;
        this.updatePreviewTransform();
    }

    private updatePreviewTransform(): void {
        this.previewGroup.rotation.z = (this.currentRotation * Math.PI) / 180;
        this.editor.setDirty();
    }

    public onMouseMove(x: number, y: number, event: MouseEvent): void {
        let worldPos = this.editor.cameraSystem.screenToWorld(x, y);
        this.previewGroup.visible = true;
        this.annotationGroup.visible = true;
        this.annotationGroup.clear();

        // --- Snapping Logic ---
        if (!event.ctrlKey) {
            const furnitureLayer = this.editor.layerSystem.getLayer('furniture');
            const roomLayer = this.editor.layerSystem.getLayer('room');

            const furnitureList = furnitureLayer && furnitureLayer.content
                ? (furnitureLayer.content as VectorLayerContent).furniture || []
                : [];

            const rooms = roomLayer && roomLayer.content
                ? (roomLayer.content as VectorLayerContent).rooms || []
                : [];

            // 1. Snap to Furniture
            const furnitureSnap = snapToFurniture(worldPos, furnitureList, null, 3); // 3 inch threshold
            if (furnitureSnap.snapped) {
                worldPos = { x: furnitureSnap.x, y: furnitureSnap.y };
            } else {
                // 2. Snap to Walls
                const wallSnap = snapToWalls(worldPos, rooms, 6); // 6 inch threshold
                if (wallSnap.snapped) {
                    worldPos = { x: wallSnap.x, y: wallSnap.y };
                }
            }
        }

        // --- Collision Detection ---
        this.canPlace = true; // Reset

        // 1. Check Furniture Collision
        const furnitureLayer = this.editor.layerSystem.getLayer('furniture');
        const furnitureList = furnitureLayer && furnitureLayer.content
            ? (furnitureLayer.content as VectorLayerContent).furniture || []
            : [];

        const currentRect = {
            x: worldPos.x,
            y: worldPos.y,
            width: this.currentWidth,
            length: this.currentLength,
            rotation: this.currentRotation
        };

        for (const item of furnitureList) {
            if (item.isBlocking) {
                if (checkRectangleCollision(currentRect, item)) {
                    this.canPlace = false;
                    break;
                }
            }
        }

        // 2. Check Wall Collision
        if (this.canPlace) {
            const currentPoly = getKeyPoints(currentRect).corners;
            const roomLayer = this.editor.layerSystem.getLayer('room');
            const rooms = roomLayer && roomLayer.content ? (roomLayer.content as VectorLayerContent).rooms || [] : [];

            for (const room of rooms) {
                const points = room.points;
                for (let i = 0; i < points.length; i++) {
                    const p1 = points[i];
                    const p2 = points[(i + 1) % points.length];

                    if (checkPolygonLineIntersection(currentPoly, p1, p2)) {
                        this.canPlace = false;
                        break;
                    }
                }
                if (!this.canPlace) break;
            }
        }

        // Update Preview Color
        const mesh = this.previewGroup.children[0] as THREE.Mesh;
        if (mesh && mesh.material instanceof THREE.MeshBasicMaterial) {
            mesh.material.color.setHex(this.canPlace ? this.furnitureColor : 0xff0000);
        }

        this.previewGroup.position.set(worldPos.x, worldPos.y, 1); // Layer above everything for preview
        this.lastSnap.x = worldPos.x;
        this.lastSnap.y = worldPos.y;

        // --- Distance Annotations ---
        const roomLayer = this.editor.layerSystem.getLayer('room');
        const rooms = roomLayer && roomLayer.content ? (roomLayer.content as VectorLayerContent).rooms || [] : [];
        const nearestWalls = getNearestWalls(worldPos, rooms, 200); // 200 unit radius

        nearestWalls.forEach(info => {
            // 1. Draw Line
            const points = [
                new THREE.Vector3(worldPos.x, worldPos.y, 1),
                new THREE.Vector3(info.pointOnTarget.x, info.pointOnTarget.y, 1)
            ];
            const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
            const lineMat = new THREE.LineBasicMaterial({
                color: info.distance < 18 ? 0xff0000 : 0x00ccff, // Red if too close (e.g. < 18 inches)
                depthTest: false
            });
            const line = new THREE.Line(lineGeo, lineMat);
            this.annotationGroup.add(line);

            // 2. Draw Text Label
            // TODO: Use a proper label sprite helper (reusing the one from LayerSystem would be ideal but it's private)
            // For now, simple canvas sprite
            const distLabel = this.createDistanceLabel(info.distance);
            distLabel.position.set(
                (worldPos.x + info.pointOnTarget.x) / 2,
                (worldPos.y + info.pointOnTarget.y) / 2,
                1.1
            );
            this.annotationGroup.add(distLabel);
        });

        const nearestFurniture = getNearestFurniture(worldPos, furnitureList, null, 200);
        nearestFurniture.forEach(info => {
            // 1. Draw Line
            const points = [
                new THREE.Vector3(worldPos.x, worldPos.y, 1),
                new THREE.Vector3(info.pointOnTarget.x, info.pointOnTarget.y, 1)
            ];
            const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
            const lineMat = new THREE.LineDashedMaterial({
                color: info.distance < 3 ? 0xff0000 : 0x00ff00, // Green for furniture distance
                depthTest: false,
                dashSize: 4,
                gapSize: 2
            });
            const line = new THREE.Line(lineGeo, lineMat);
            line.computeLineDistances(); // Required for dashed lines
            this.annotationGroup.add(line);

            // 2. Draw Text Label
            const distLabel = this.createDistanceLabel(info.distance);
            distLabel.position.set(
                (worldPos.x + info.pointOnTarget.x) / 2,
                (worldPos.y + info.pointOnTarget.y) / 2,
                1.1
            );
            // Optional: Tint label green?
            distLabel.material.color.set(0xccffcc); // Light green tint
            this.annotationGroup.add(distLabel);
        });

        this.editor.setDirty();
    }

    private createDistanceLabel(dist: number): THREE.Sprite {
        const key = `dist-${Math.round(dist)}`;
        // Optimization: Cache textures? For MVP, create fresh.

        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, 128, 64);
            ctx.font = 'bold 24px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Format: Inches or Ft/In? 
            // Let's assume input is inches for now based on spatialUtils defaults
            const ft = Math.floor(dist / 12);
            const inch = Math.round(dist % 12);
            const text = ft > 0 ? `${ft}' ${inch}"` : `${inch}"`;

            ctx.fillText(text, 64, 32);
        }

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(60, 30, 1);
        return sprite;
    }

    public onMouseDown(x: number, y: number, event: MouseEvent): void {
        if (event.button !== 0) return;
        if (!this.canPlace) return;

        // Use the snapped position from mouse move
        const worldX = this.lastSnap.x;
        const worldY = this.lastSnap.y;

        const roomLayer = this.editor.layerSystem.getLayer('room');
        const rooms = roomLayer && roomLayer.content ? (roomLayer.content as VectorLayerContent).rooms || [] : [];
        const roomName = this.findRoomAt(worldX, worldY, rooms);

        const newFurniture: Furniture = {
            id: `furn-${Date.now()}`,
            type: 'furniture',
            category: 'furniture',
            x: worldX,
            y: worldY,
            width: this.currentWidth,
            length: this.currentLength,
            rotation: this.currentRotation,
            scale: 1,
            color: this.furnitureColor,
            isBlocking: this.isBlocking,
            room: roomName,
            label: this.furnitureName,
            createdAt: new Date().toISOString()
        };

        const command = new AddFurnitureCommand('furniture', newFurniture, this.editor.layerSystem);
        this.editor.commandManager.execute(command);
        this.editor.emit('layers-changed', this.editor.layerSystem.getAllLayers());
        this.editor.setDirty();
    }

    public onKeyDown(key: string, event: KeyboardEvent): void {
        const step = event.shiftKey ? 1 : 45; // Rotate step
        const nudge = event.shiftKey ? 12 : (event.ctrlKey ? 0.1 : 1); // Nudge step (inches)

        if (key.toLowerCase() === 'r') {
            if (event.shiftKey) {
                this.currentRotation -= 45;
            } else {
                this.currentRotation += 45;
            }
            this.updatePreviewTransform();
        }

        // Nudge with Arrows (We need to update preview position manually if mouse isn't moving)
        // This is tricky because onMouseMove updates position based on screen coord. 
        // For accurate keyboard nudging, we might need to store "virtual cursor pos" separate from mouse.
        // For MVP, we'll skip arrow nudging updates to preview position unless we implement a full state.
    }

    private findRoomAt(x: number, y: number, rooms: Room[]): string {
        for (const room of rooms) {
            if (this.isPointInPolygon({ x, y }, room.points)) {
                return room.name;
            }
        }
        return 'external';
    }

    private isPointInPolygon(point: Vector2, polygon: Vector2[]): boolean {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
}
