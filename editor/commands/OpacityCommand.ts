import { Command } from './Command';
import { LayerSystem } from '../systems/LayerSystem';

export class OpacityCommand implements Command {
    public type = 'set-opacity';
    public description: string;
    public timestamp = Date.now();

    private layerId: string;
    private layerSystem: LayerSystem;
    private oldOpacity: number;
    private newOpacity: number;

    constructor(
        layerId: string,
        layerSystem: LayerSystem,
        oldOpacity: number,
        newOpacity: number
    ) {
        this.layerId = layerId;
        this.layerSystem = layerSystem;
        this.oldOpacity = oldOpacity;
        this.newOpacity = newOpacity;
        this.description = `Set opacity of layer ${layerId} to ${newOpacity}`;
    }

    public execute(): void {
        this.layerSystem.setLayerOpacity(this.layerId, this.newOpacity);
    }

    public undo(): void {
        this.layerSystem.setLayerOpacity(this.layerId, this.oldOpacity);
    }
}
