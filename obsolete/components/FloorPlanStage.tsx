import React from 'react';
import { Application } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';

interface FloorPlanStageProps {
    width: number;
    height: number;
    baseImageUrl: string;
    electricalImageUrl: string;
    naturalWidth: number;
    naturalHeight: number;
    layers: {
        base: { visible: boolean; opacity: number };
        electrical: { visible: boolean; opacity: number };
        rooms: { visible: boolean };
        dali: { visible: boolean };
        annotations: { visible: boolean };
    };

    // Polygon drawing (in-progress path)
    polygonPath?: Array<{ x: number; y: number }> | null;
    polygonColor?: string;
    onPolygonClick?: (x: number, y: number) => void;
    rooms?: Array<{
        id: string;
        path: { x: number; y: number }[];
        fillColor: string;
        visible: boolean;
    }>;
    daliDevices?: Array<{
        id: string;
        x: number;
        y: number;
        deviceType: string;
    }>;
    overlayMasks?: Array<{
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        rotation: number;
        color: string;
        visible: boolean;
    }>;
    selectedMaskId?: string | null;
    electricalOverlay: {
        x: number;
        y: number;
        scale: number;
        rotation: number;
        opacity: number;
        visible?: boolean;
    };
    onElectricalOverlayChange?: (updates: Partial<{
        x: number;
        y: number;
        scale: number;
        rotation: number;
    }>) => void;
}

// Layer configuration types
type LayerConfig =
    | { type: 'image'; imageUrl: string; x?: number; y?: number; scale?: number; rotation?: number; alpha?: number }
    | { type: 'graphics'; draw: (g: PIXI.Graphics) => void }
    | { type: 'custom'; create: () => PIXI.DisplayObject };

// Layer manager class - DRY abstraction for all layer types
class LayerManager {
    private layers = new Map<string, PIXI.Container>();
    private viewport: Viewport;

    constructor(viewport: Viewport) {
        this.viewport = viewport;
    }

    // Single method to add any layer type
    async add(name: string, config: LayerConfig, zIndex: number = 0): Promise<void> {
        const container = this.getOrCreateLayer(name, zIndex);
        container.removeChildren(); // Clear existing content

        switch (config.type) {
            case 'image': {
                const texture = await PIXI.Assets.load(config.imageUrl);
                const sprite = new PIXI.Sprite(texture);
                sprite.x = config.x ?? 0;
                sprite.y = config.y ?? 0;
                sprite.scale.set(config.scale ?? 1);
                sprite.angle = config.rotation ?? 0;
                sprite.alpha = config.alpha ?? 1;
                container.addChild(sprite);
                break;
            }
            case 'graphics': {
                const graphics = new PIXI.Graphics();
                config.draw(graphics);
                container.addChild(graphics);
                break;
            }
            case 'custom': {
                const displayObject = config.create();
                container.addChild(displayObject);
                break;
            }
        }
    }

    // Get or create a layer container
    private getOrCreateLayer(name: string, zIndex: number = 0): PIXI.Container {
        if (!this.layers.has(name)) {
            const container = new PIXI.Container();
            container.name = name;
            container.zIndex = zIndex;
            this.viewport.addChild(container);
            this.layers.set(name, container);
        }
        return this.layers.get(name)!;
    }

    // Update layer visibility and opacity
    update(name: string, visible: boolean, opacity: number = 1) {
        const layer = this.layers.get(name);
        if (layer) {
            layer.visible = visible;
            layer.alpha = opacity;
        }
    }

    // Get layer container for direct manipulation
    get(name: string): PIXI.Container | undefined {
        return this.layers.get(name);
    }

    // Clear all layers
    clear() {
        this.layers.forEach(layer => layer.removeChildren());
        this.layers.clear();
    }
}

export const FloorPlanStage: React.FC<FloorPlanStageProps> = (props) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const appRef = React.useRef<PIXI.Application | null>(null);
    const layerManagerRef = React.useRef<LayerManager | null>(null);

    console.log('FloorPlanStage render');

    // Initialization function - called when app is ready
    const handleInit = React.useCallback(async (app: PIXI.Application) => {
        console.log('✅ PIXI APP INITIALIZED!', app);

        await new Promise(resolve => requestAnimationFrame(resolve));

        // Create viewport for pan/zoom
        const viewport = new Viewport({
            screenWidth: app.canvas.width,
            screenHeight: app.canvas.height,
            worldWidth: props.naturalWidth,
            worldHeight: props.naturalHeight,
            events: app.renderer.events
        });

        app.stage.addChild(viewport);
        viewport.sortableChildren = true; // Enable z-index sorting

        // Enable pan and zoom
        viewport.drag().pinch().wheel().decelerate();

        // Click handler for polygon drawing
        viewport.on('click', (event: any) => {
            if (props.onPolygonClick) {
                const localPos = event.data.global;
                const worldPos = viewport.toWorld(localPos);
                props.onPolygonClick(worldPos.x, worldPos.y);
            }
        });

        // Create layer manager
        const layerManager = new LayerManager(viewport);
        layerManagerRef.current = layerManager;

        // Layer z-indices (rendering order)
        const LAYER_Z = {
            BASE: 0,
            ROOMS: 1,
            ELECTRICAL: 2,
            DALI: 3,
            ANNOTATIONS: 4,
        };

        // Load base floor plan (z-index 0)
        console.log('Loading base layer...');
        await layerManager.add('base', {
            type: 'image',
            imageUrl: props.baseImageUrl,
        }, LAYER_Z.BASE);
        console.log('✅ Base floor plan loaded');

        // Load electrical overlay (z-index 2)
        console.log('Loading electrical layer...');
        await layerManager.add('electrical', {
            type: 'image',
            imageUrl: props.electricalImageUrl,
            x: props.electricalOverlay?.x ?? 0,
            y: props.electricalOverlay?.y ?? 0,
            scale: props.electricalOverlay?.scale ?? 1,
            rotation: props.electricalOverlay?.rotation ?? 0,
            alpha: props.electricalOverlay?.opacity ?? 0.7,
        }, LAYER_Z.ELECTRICAL);
        console.log('✅ Electrical overlay loaded');

        // Create rooms layer (z-index 1) - vector graphics
        if (props.rooms && props.rooms.length > 0) {
            await layerManager.add('rooms', {
                type: 'graphics',
                draw: (g) => {
                    props.rooms?.forEach(room => {
                        if (!room.visible) return;

                        g.poly(room.path.map(p => ({ x: p.x, y: p.y })));
                        g.fill(room.fillColor);
                        g.stroke({ width: 2, color: 0xffffff, alpha: 0.3 });
                    });
                }
            }, LAYER_Z.ROOMS);
            console.log(`✅ Rooms layer loaded (${props.rooms.length} rooms)`);
        }

        // Create DALI devices layer (z-index 3) - vector graphics
        if (props.daliDevices && props.daliDevices.length > 0) {
            await layerManager.add('dali', {
                type: 'graphics',
                draw: (g) => {
                    props.daliDevices?.forEach(device => {
                        // Simple circle representation for now
                        g.circle(device.x, device.y, 8);
                        g.fill(0x3b82f6);
                        g.stroke({ width: 2, color: 0xffffff });
                    });
                }
            }, LAYER_Z.DALI);
            console.log(`✅ DALI devices layer loaded (${props.daliDevices.length} devices)`);
        }

        // Create overlay masks layer (z-index 1.5, between rooms and electrical) - vector graphics
        if (props.overlayMasks && props.overlayMasks.length > 0) {
            await layerManager.add('masks', {
                type: 'graphics',
                draw: (g) => {
                    props.overlayMasks?.forEach(mask => {
                        if (!mask.visible) return;

                        // Parse color (assuming hex string like "#RRGGBB")
                        const color = parseInt(mask.color.replace('#', ''), 16);
                        const isSelected = props.selectedMaskId === mask.id;

                        // Draw rectangle centered at (x, y)
                        g.rect(
                            mask.x - mask.width / 2,
                            mask.y - mask.height / 2,
                            mask.width,
                            mask.height
                        );
                        g.fill({ color, alpha: 0.5 });

                        // Selected mask gets bright yellow border, others get white
                        g.stroke({
                            width: isSelected ? 4 : 2,
                            color: isSelected ? 0xfbbf24 : 0xffffff,
                            alpha: isSelected ? 1 : 0.7
                        });

                        // Apply rotation around center
                        const lastChild = g.children[g.children.length - 1];
                        if (lastChild) {
                            lastChild.pivot.set(mask.x, mask.y);
                            lastChild.angle = mask.rotation;
                        }
                    });
                }
            }, 1.5); // Between rooms (1) and electrical (2)
            console.log(`✅ Overlay masks layer loaded (${props.overlayMasks.length} masks)`);
        }

        // Apply initial visibility states
        layerManager.update('base', props.layers.base.visible, props.layers.base.opacity / 100);
        layerManager.update('electrical', props.layers.electrical.visible, props.electricalOverlay.opacity);
        layerManager.update('rooms', props.layers.rooms.visible);
        layerManager.update('dali', props.layers.dali.visible);

        // Fit the floor plan in view
        viewport.fit();
        viewport.moveCenter(props.naturalWidth / 2, props.naturalHeight / 2);

        console.log('✅ All layers initialized with pan/zoom enabled');

        // Create in-progress polygon layer (highest z-index)
        const polygonGraphics = new PIXI.Graphics();
        const polygonContainer = new PIXI.Container();
        polygonContainer.name = 'polygon-drawing';
        polygonContainer.zIndex = 999; // Above everything
        polygonContainer.addChild(polygonGraphics);
        viewport.addChild(polygonContainer);

        // Store references
        (app as any).viewport = viewport;
        (app as any).layerManager = layerManager;
        (app as any).polygonGraphics = polygonGraphics;
        appRef.current = app;
    }, [props.baseImageUrl, props.electricalImageUrl, props.naturalWidth, props.naturalHeight, props.rooms, props.daliDevices, props.overlayMasks, props.selectedMaskId]);

    // Update all layer visibility and properties when props change
    React.useEffect(() => {
        const layerManager = layerManagerRef.current;
        if (!layerManager) return;

        // Update base layer
        layerManager.update(
            'base',
            props.layers.base.visible,
            props.layers.base.opacity / 100
        );

        // Update electrical layer
        layerManager.update(
            'electrical',
            props.layers.electrical.visible,
            props.electricalOverlay.opacity
        );

        // Update electrical transform
        const electricalLayer = layerManager.get('electrical');
        if (electricalLayer?.children[0]) {
            const sprite = electricalLayer.children[0] as PIXI.Sprite;
            sprite.x = props.electricalOverlay.x ?? 0;
            sprite.y = props.electricalOverlay.y ?? 0;
            sprite.scale.set(props.electricalOverlay.scale ?? 1);
            sprite.angle = props.electricalOverlay.rotation ?? 0;
        }

        // Update rooms layer
        layerManager.update('rooms', props.layers.rooms.visible);

        // Update DALI layer
        layerManager.update('dali', props.layers.dali.visible);

        // Update annotations layer
        layerManager.update('annotations', props.layers.annotations.visible);

    }, [props.layers, props.electricalOverlay]);

    // Update in-progress polygon drawing
    React.useEffect(() => {
        const app = appRef.current;
        if (!app) return;

        const polygonGraphics = (app as any).polygonGraphics as PIXI.Graphics | undefined;
        if (!polygonGraphics) return;

        // Clear previous drawing
        polygonGraphics.clear();

        // Draw in-progress polygon
        if (props.polygonPath && props.polygonPath.length > 0) {
            const color = props.polygonColor ? parseInt(props.polygonColor.replace('#', ''), 16) : 0x22c55e;

            // Draw shadow/outline for lines (thicker dark line underneath)
            polygonGraphics.moveTo(props.polygonPath[0].x, props.polygonPath[0].y);
            for (let i = 1; i < props.polygonPath.length; i++) {
                polygonGraphics.lineTo(props.polygonPath[i].x, props.polygonPath[i].y);
            }
            polygonGraphics.stroke({ width: 7, color: 0x000000, alpha: 0.5 });

            // Draw main lines on top
            polygonGraphics.moveTo(props.polygonPath[0].x, props.polygonPath[0].y);
            for (let i = 1; i < props.polygonPath.length; i++) {
                polygonGraphics.lineTo(props.polygonPath[i].x, props.polygonPath[i].y);
            }
            polygonGraphics.stroke({ width: 4, color, alpha: 1 });

            // Draw points with drop shadow effect
            props.polygonPath.forEach((point, i) => {
                const radius = i === 0 ? 10 : 6;

                // Shadow circle (larger, dark)
                polygonGraphics.circle(point.x, point.y, radius + 2);
                polygonGraphics.fill({ color: 0x000000, alpha: 0.5 });

                // Main circle
                polygonGraphics.circle(point.x, point.y, radius);
                polygonGraphics.fill(i === 0 ? 0xffffff : color);

                // Bright outline for visibility
                polygonGraphics.circle(point.x, point.y, radius);
                polygonGraphics.stroke({ width: 3, color: 0x000000, alpha: 0.8 });
            });

            // Draw snap circle around first point if 3+ points
            if (props.polygonPath.length >= 3) {
                const firstPoint = props.polygonPath[0];

                // Shadow for snap circle
                polygonGraphics.circle(firstPoint.x, firstPoint.y, 22);
                polygonGraphics.stroke({ width: 4, color: 0x000000, alpha: 0.3 });

                // Main snap circle
                polygonGraphics.circle(firstPoint.x, firstPoint.y, 20);
                polygonGraphics.stroke({ width: 3, color, alpha: 0.8 });
            }

            console.log('🎨 Rendered in-progress polygon:', props.polygonPath.length, 'points');
        }
    }, [props.polygonPath, props.polygonColor]);

    // Keyboard controls for electrical overlay
    React.useEffect(() => {
        if (!props.onElectricalOverlayChange) {
            console.log('⚠️ Keyboard controls disabled - no onElectricalOverlayChange callback');
            return;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

            console.log('🎹 Keyboard event:', e.key, 'shift:', e.shiftKey);

            const overlay = props.electricalOverlay || { x: 0, y: 0, scale: 1, rotation: 0 };
            const step = 1;
            const scaleStep = 0.01;
            const rotationStep = 0.1;

            let updates: any = null;

            if (e.shiftKey) {
                switch (e.key) {
                    case 'ArrowUp':
                        updates = { scale: Math.max(0.1, (overlay.scale || 1) + scaleStep) };
                        break;
                    case 'ArrowDown':
                        updates = { scale: Math.max(0.1, (overlay.scale || 1) - scaleStep) };
                        break;
                    case 'ArrowLeft':
                        updates = { rotation: (overlay.rotation || 0) - rotationStep };
                        break;
                    case 'ArrowRight':
                        updates = { rotation: (overlay.rotation || 0) + rotationStep };
                        break;
                }
            } else {
                switch (e.key) {
                    case 'ArrowUp':
                        updates = { y: (overlay.y || 0) - step };
                        break;
                    case 'ArrowDown':
                        updates = { y: (overlay.y || 0) + step };
                        break;
                    case 'ArrowLeft':
                        updates = { x: (overlay.x || 0) - step };
                        break;
                    case 'ArrowRight':
                        updates = { x: (overlay.x || 0) + step };
                        break;
                }
            }

            if (updates) {
                e.preventDefault();
                console.log('✅ Applying overlay updates:', updates);
                props.onElectricalOverlayChange!(updates);
            }
        };

        console.log('🎯 Keyboard controls registered for electrical overlay');
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            console.log('🔴 Keyboard controls unregistered');
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [props.electricalOverlay, props.onElectricalOverlayChange]);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
            }}
        >
            <Application
                onInit={handleInit}
                resizeTo={containerRef}
                backgroundAlpha={1}
                background={0x1a1a1a}
                preference="webgl"
                antialias={true}
            />
        </div>
    );
};
