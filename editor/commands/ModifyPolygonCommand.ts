import { Command } from './Command';
import { LayerSystem } from '../systems/LayerSystem';
import { Vector2 } from '../models/types';

export class ModifyPolygonCommand implements Command {
    public type = 'Modify Polygon';
    public description: string;
    public timestamp = Date.now();

    private layerId: string;
    private polygonId: string;
    private oldPoints: Vector2[];
    private newPoints: Vector2[];
    private layerSystem: LayerSystem;

    constructor(
        layerId: string,
        polygonId: string,
        oldPoints: Vector2[],
        newPoints: Vector2[],
        layerSystem: LayerSystem
    ) {
        this.layerId = layerId;
        this.polygonId = polygonId;
        this.oldPoints = [...oldPoints.map(p => ({ ...p }))];
        this.newPoints = [...newPoints.map(p => ({ ...p }))];
        this.layerSystem = layerSystem;
        this.description = `Adjusted shape of ${polygonId} in ${layerId}`;
    }

    public execute(): void {
        this.applyPoints(this.newPoints);
    }

    public undo(): void {
        this.applyPoints(this.oldPoints);
    }

    private applyPoints(points: Vector2[]): void {
        const layer = this.layerSystem.getLayer(this.layerId);
        if (layer && layer.type === 'vector') {
            const content = layer.content;
            if (content.rooms) {
                const room = content.rooms.find((r: any) => r.id === this.polygonId);
                if (room) {
                    room.points = [...points.map(p => ({ ...p }))];
                }
            }
            if (content.masks) {
                const mask = content.masks.find((m: any) => m.id === this.polygonId);
                if (mask) {
                    mask.points = [...points.map(p => ({ ...p }))];
                }
            }
            this.layerSystem.markDirty(this.layerId);
        }
    }
}
