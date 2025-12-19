import { Command } from './Command';
import { LayerSystem } from '../systems/LayerSystem';
import { Polygon, Room, Mask } from '../models/types';

export class DeletePolygonCommand implements Command {
    public type = 'Delete Polygon';
    public description: string;
    public timestamp = Date.now();

    private layerId: string;
    private polygon: Polygon | Room | Mask;
    private layerSystem: LayerSystem;

    constructor(
        layerId: string,
        polygon: Polygon | Room | Mask,
        layerSystem: LayerSystem
    ) {
        this.layerId = layerId;
        this.polygon = polygon;
        this.layerSystem = layerSystem;
        this.description = `Deleted polygon ${polygon.id} from ${layerId}`;
    }

    public execute(): void {
        this.remove();
    }

    public undo(): void {
        this.restore();
    }

    private remove(): void {
        const layer = this.layerSystem.getLayer(this.layerId);
        if (layer && layer.type === 'vector') {
            const content = layer.content;
            if (content.rooms) {
                content.rooms = content.rooms.filter((p: any) => p.id !== this.polygon.id);
            }
            if (content.masks) {
                content.masks = content.masks.filter((p: any) => p.id !== this.polygon.id);
            }
            this.layerSystem.markDirty(this.layerId);
        }
    }

    private restore(): void {
        const layer = this.layerSystem.getLayer(this.layerId);
        if (layer && layer.type === 'vector') {
            const content = layer.content;
            if ((this.polygon as any).roomType && content.rooms) {
                content.rooms.push(this.polygon as Room);
            } else if (content.masks) {
                content.masks.push(this.polygon as Mask);
            }
            this.layerSystem.markDirty(this.layerId);
        }
    }
}
