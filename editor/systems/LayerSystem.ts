import * as THREE from 'three';
import { Layer, LayerConfig, Transform } from '../models/types';

export class LayerSystem {
    private layers: Map<string, Layer> = new Map();
    private scene: THREE.Scene;
    private dirtyLayers: Set<string> = new Set();

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public addLayer(config: LayerConfig): Layer {
        const container = new THREE.Group();
        container.name = `layer-${config.name}`;
        container.renderOrder = config.zIndex;

        const layer: Layer = {
            ...config,
            container,
            content: {}
        };

        if (config.type === 'image') {
            layer.content = {
                textureUrl: '',
            };
        }


        this.applyTransform(layer);
        this.scene.add(container);
        this.layers.set(layer.id, layer);
        this.markDirty(layer.id);

        return layer;
    }

    public async loadImage(id: string, url: string): Promise<void> {
        const layer = this.layers.get(id);
        if (!layer || layer.type !== 'image') return;

        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(url, (texture) => {
                const { width, height } = texture.image;
                const geometry = new THREE.PlaneGeometry(width, height);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    opacity: layer.opacity
                });
                const mesh = new THREE.Mesh(geometry, material);

                // Remove old content
                while (layer.container.children.length > 0) {
                    layer.container.remove(layer.container.children[0]);
                }

                layer.container.add(mesh);

                layer.content = {
                    textureUrl: url,
                    texture,
                    mesh
                };

                this.markDirty(id);
                resolve();
            }, undefined, reject);
        });
    }

    public removeLayer(id: string): void {
        const layer = this.layers.get(id);
        if (layer) {
            this.scene.remove(layer.container);
            this.layers.delete(id);
        }
    }

    public getLayer(id: string): Layer | undefined {
        return this.layers.get(id);
    }

    public getAllLayers(): Layer[] {
        return Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex);
    }

    public setLayerVisible(id: string, visible: boolean): void {
        const layer = this.layers.get(id);
        if (layer) {
            layer.visible = visible;
            layer.container.visible = visible;
        }
    }

    public setLayerLocked(id: string, locked: boolean): void {
        const layer = this.layers.get(id);
        if (layer) {
            layer.locked = locked;
            console.log(`[LayerSystem] Layer ${id} locked status: ${locked}`);
        }
    }

    public setLayerTint(id: string, color: THREE.Color | null): void {
        const layer = this.layers.get(id);
        if (layer) {
            layer.container.traverse((object) => {
                if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial) {
                    object.material.color = color || new THREE.Color(0xffffff);
                }
            });
        }
    }

    public setLayerOpacity(id: string, opacity: number): void {
        const layer = this.layers.get(id);
        if (layer) {
            layer.opacity = opacity;
            layer.container.traverse((object) => {
                if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial) {
                    object.material.transparent = true;
                    object.material.opacity = opacity;
                }
            });
        }
    }

    public setLayerTransform(id: string, transform: Partial<Transform>, force: boolean = false): void {
        const layer = this.layers.get(id);
        if (!layer) return;

        if (force || !layer.locked) {
            layer.transform = { ...layer.transform, ...transform };
            this.applyTransform(layer);
            this.markDirty(id);
        }
    }

    public markDirty(id: string): void {
        this.dirtyLayers.add(id);
    }

    public update(): void {
        if (this.dirtyLayers.size === 0) return;
        // Layer-specific updates would go here
        this.dirtyLayers.clear();
    }

    private applyTransform(layer: Layer): void {
        const { position, scale, rotation } = layer.transform;
        layer.container.position.set(position.x, position.y, layer.zIndex);
        layer.container.scale.set(scale.x, scale.y, 1);
        layer.container.rotation.z = rotation;

        layer.container.updateMatrixWorld(true);
    }
}
