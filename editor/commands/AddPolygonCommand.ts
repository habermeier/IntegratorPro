import { Command } from './Command';
import { LayerSystem } from '../systems/LayerSystem';
import { Polygon, VectorLayerContent, Room, Mask } from '../models/types';

export class AddPolygonCommand implements Command {
    public type = 'add-polygon';
    public description: string;
    public timestamp: number;

    private layerId: string;
    private polygon: Polygon | Room | Mask;
    private layerSystem: LayerSystem;

    constructor(layerId: string, polygon: Polygon | Room | Mask, layerSystem: LayerSystem) {
        this.layerId = layerId;
        this.polygon = polygon;
        this.layerSystem = layerSystem;
        this.description = `Add polygon to ${layerId}`;
        this.timestamp = Date.now();
    }

    public execute(): void {
        const layer = this.layerSystem.getLayer(this.layerId);
        if (layer) {
            if (!layer.content) {
                layer.content = { polygons: [], rooms: [], masks: [] } as VectorLayerContent;
            }

            const content = layer.content as VectorLayerContent;

            if (this.layerId === 'room') {
                if (!content.rooms) content.rooms = [];
                content.rooms.push(this.polygon as Room);
            } else if (this.layerId === 'mask') {
                if (!content.masks) content.masks = [];
                content.masks.push(this.polygon as Mask);
            } else {
                if (!content.polygons) content.polygons = [];
                content.polygons.push(this.polygon);
            }

            this.layerSystem.markDirty(this.layerId);
        }
    }

    public undo(): void {
        const layer = this.layerSystem.getLayer(this.layerId);
        if (layer && layer.content) {
            const content = layer.content as VectorLayerContent;

            if (this.layerId === 'room' && content.rooms) {
                content.rooms = content.rooms.filter(p => p.id !== this.polygon.id);
            } else if (this.layerId === 'mask' && content.masks) {
                content.masks = content.masks.filter(p => p.id !== this.polygon.id);
            } else if (content.polygons) {
                content.polygons = content.polygons.filter(p => p.id !== this.polygon.id);
            }

            this.layerSystem.markDirty(this.layerId);
        }
    }
}
