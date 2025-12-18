import { Command } from './Command';
import { LayerSystem } from '../systems/LayerSystem';
import { Transform } from '../models/types';

export class TransformLayerCommand implements Command {
    public type = 'transform-layer';
    public description: string;
    public timestamp = Date.now();

    private layerId: string;
    private layerSystem: LayerSystem;
    private oldTransform: Transform;
    private newTransform: Transform;

    constructor(
        layerId: string,
        layerSystem: LayerSystem,
        oldTransform: Transform,
        newTransform: Transform
    ) {
        this.layerId = layerId;
        this.layerSystem = layerSystem;
        this.oldTransform = { ...oldTransform };
        this.newTransform = { ...newTransform };
        this.description = `Transform layer ${layerId}`;
    }

    public execute(): void {
        this.layerSystem.setLayerTransform(this.layerId, this.newTransform);
    }

    public undo(): void {
        this.layerSystem.setLayerTransform(this.layerId, this.oldTransform);
    }
}
