import { Command } from './Command';
import { LayerSystem } from '../systems/LayerSystem';
import { PlacedSymbol, Furniture, VectorLayerContent, Vector2 } from '../models/types';
import { deviceRegistry } from '../../src/services/DeviceRegistry';

export interface TransformState {
    x: number;
    y: number;
    rotation: number;
}

export class ModifySymbolCommand implements Command {
    public type = 'Modify Symbol';
    public description: string;
    public timestamp = Date.now();

    private layerId: string;
    private itemId: string;
    private oldState: TransformState;
    private newState: TransformState;
    private layerSystem: LayerSystem;

    constructor(
        layerId: string,
        itemId: string,
        oldState: TransformState,
        newState: TransformState,
        layerSystem: LayerSystem
    ) {
        this.layerId = layerId;
        this.itemId = itemId;
        this.oldState = oldState;
        this.newState = newState;
        this.layerSystem = layerSystem;
        this.description = `Modified transform of ${itemId}`;
    }

    public execute(): void {
        this.applyTransform(this.newState);
    }

    public undo(): void {
        this.applyTransform(this.oldState);
    }

    private applyTransform(state: TransformState): void {
        const layer = this.layerSystem.getLayer(this.layerId);
        if (layer && layer.type === 'vector') {
            const content = layer.content as VectorLayerContent;

            // 1. Update in LayerSystem (for rendering)
            let found = false;

            // Try Symbols
            const symbol = (content.symbols || []).find(s => s.id === this.itemId);
            if (symbol) {
                symbol.x = state.x;
                symbol.y = state.y;
                symbol.rotation = state.rotation;
                found = true;
            }

            // Try Furniture if not found in symbols
            if (!found) {
                const furniture = (content.furniture || []).find(f => f.id === this.itemId);
                if (furniture) {
                    furniture.x = state.x;
                    furniture.y = state.y;
                    furniture.rotation = state.rotation;
                    found = true;
                }
            }

            if (found) {
                // 2. Sync with Registry (for data persistence)
                deviceRegistry.updateDevice(this.itemId, {
                    position: { x: state.x, y: state.y },
                    rotation: state.rotation
                });

                this.layerSystem.markDirty(this.layerId);
            }
        }
    }
}
