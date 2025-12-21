import { Command } from './Command';
import { LayerSystem } from '../systems/LayerSystem';
import { Furniture, VectorLayerContent } from '../models/types';

export class AddFurnitureCommand implements Command {
    public type = 'Add Furniture';
    public description: string;
    public timestamp = Date.now();
    private layerId: string;
    private furniture: Furniture;
    private layerSystem: LayerSystem;

    constructor(layerId: string, furniture: Furniture, layerSystem: LayerSystem) {
        this.layerId = layerId;
        this.furniture = furniture;
        this.layerSystem = layerSystem;
        this.description = `Placed ${furniture.label || 'Furniture'} in ${layerId}`;
    }

    public execute(): void {
        const layer = this.layerSystem.getLayer(this.layerId);
        if (layer && layer.type === 'vector') {
            const content = layer.content as VectorLayerContent;
            if (!content.furniture) {
                content.furniture = [];
            }
            content.furniture.push(this.furniture);
            this.layerSystem.markDirty(this.layerId);
        }
    }

    public undo(): void {
        const layer = this.layerSystem.getLayer(this.layerId);
        if (layer && layer.type === 'vector') {
            const content = layer.content as VectorLayerContent;
            if (content.furniture) {
                const index = content.furniture.findIndex(f => f.id === this.furniture.id);
                if (index !== -1) {
                    content.furniture.splice(index, 1);
                    this.layerSystem.markDirty(this.layerId);
                }
            }
        }
    }
}
