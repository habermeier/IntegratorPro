import { Command } from './Command';
import { LayerSystem } from '../systems/LayerSystem';
import { Cable, VectorLayerContent } from '../models/types';

export class AddCableCommand implements Command {
    public type = 'add-cable';
    public description: string;
    public timestamp: number;

    private layerId: string;
    private cable: Cable;
    private layerSystem: LayerSystem;

    constructor(layerId: string, cable: Cable, layerSystem: LayerSystem) {
        this.layerId = layerId;
        this.cable = cable;
        this.layerSystem = layerSystem;
        this.description = `Add cable to ${layerId}`;
        this.timestamp = Date.now();
    }

    public execute(): void {
        const layer = this.layerSystem.getLayer(this.layerId);
        if (layer) {
            if (!layer.content) {
                layer.content = { polygons: [], rooms: [], masks: [], cables: [] } as VectorLayerContent;
            }

            const content = layer.content as VectorLayerContent;

            if (!content.cables) content.cables = [];
            content.cables.push(this.cable);

            this.layerSystem.markDirty(this.layerId);
        }
    }

    public undo(): void {
        const layer = this.layerSystem.getLayer(this.layerId);
        if (layer && layer.content) {
            const content = layer.content as VectorLayerContent;

            if (content.cables) {
                content.cables = content.cables.filter(c => c.id !== this.cable.id);
            }

            this.layerSystem.markDirty(this.layerId);
        }
    }
}
