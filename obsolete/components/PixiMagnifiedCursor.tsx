import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Application } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';

// Constants
const ZOOM_CURSOR_SIZE = 250;
const ZOOM_MAGNIFICATION = 2;

interface PixiMagnifiedCursorProps {
    baseMode: string;
    borderColor?: string;
    mousePos: { x: number; y: number } | null;
    isMouseOverFloorPlan: boolean;
    enabled: boolean;
    getNaturalCoords: (screenX: number, screenY: number) => { x: number; y: number };
    naturalWidth: number;
    naturalHeight: number;
    currentScale?: number;

    // Layer data to render
    baseImageUrl: string;
    electricalImageUrl: string;
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
    };
    layers: {
        base: { visible: boolean; opacity: number };
        electrical: { visible: boolean; opacity: number };
        rooms: { visible: boolean };
        dali: { visible: boolean };
    };

    onPanStateChange: (isPanning: boolean) => void;
}

export const PixiMagnifiedCursor: React.FC<PixiMagnifiedCursorProps> = ({
    baseMode,
    borderColor = '#ef4444',
    mousePos,
    isMouseOverFloorPlan,
    enabled,
    getNaturalCoords,
    naturalWidth,
    naturalHeight,
    currentScale = 1,
    baseImageUrl,
    electricalImageUrl,
    rooms,
    daliDevices,
    overlayMasks,
    selectedMaskId,
    electricalOverlay,
    layers,
    onPanStateChange,
}) => {
    const [isPanning, setIsPanning] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const viewportRef = useRef<Viewport | null>(null);

    // Spacebar handling
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
            if (e.code === 'Space') {
                e.preventDefault();
                setIsPanning(true);
                onPanStateChange(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                setIsPanning(false);
                onPanStateChange(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [enabled, onPanStateChange]);

    // Initialize Pixi app
    const handleInit = useCallback(async (app: PIXI.Application) => {
        console.log('🔍 Magnified cursor Pixi initialized');
        console.log('🖼️  Loading images:', { baseImageUrl, electricalImageUrl });
        appRef.current = app;

        // Create viewport
        const viewport = new Viewport({
            screenWidth: ZOOM_CURSOR_SIZE,
            screenHeight: ZOOM_CURSOR_SIZE,
            worldWidth: naturalWidth,
            worldHeight: naturalHeight,
            events: app.renderer.events,
        });

        app.stage.addChild(viewport);
        viewport.sortableChildren = true;
        viewportRef.current = viewport;

        // Disable interactions (lens is view-only)
        viewport.pause = true;

        // Load layers (same as main view)
        const LAYER_Z = { BASE: 0, ROOMS: 1, ELECTRICAL: 2, DALI: 3 };

        // Base image
        const baseTexture = await PIXI.Assets.load(baseImageUrl);
        console.log('✅ Base texture loaded:', baseTexture.width, 'x', baseTexture.height);
        const baseSprite = new PIXI.Sprite(baseTexture);
        const baseContainer = new PIXI.Container();
        baseContainer.name = 'base';
        baseContainer.zIndex = LAYER_Z.BASE;
        baseContainer.addChild(baseSprite);
        viewport.addChild(baseContainer);
        console.log('✅ Base layer added to viewport');

        // Electrical overlay
        const electricalTexture = await PIXI.Assets.load(electricalImageUrl);
        console.log('✅ Electrical texture loaded:', electricalTexture.width, 'x', electricalTexture.height);
        const electricalSprite = new PIXI.Sprite(electricalTexture);
        electricalSprite.x = electricalOverlay.x;
        electricalSprite.y = electricalOverlay.y;
        electricalSprite.scale.set(electricalOverlay.scale);
        electricalSprite.angle = electricalOverlay.rotation;
        electricalSprite.alpha = electricalOverlay.opacity;
        const electricalContainer = new PIXI.Container();
        electricalContainer.name = 'electrical';
        electricalContainer.zIndex = LAYER_Z.ELECTRICAL;
        electricalContainer.addChild(electricalSprite);
        viewport.addChild(electricalContainer);

        // Rooms
        if (rooms && rooms.length > 0) {
            const roomsGraphics = new PIXI.Graphics();
            rooms.forEach(room => {
                if (!room.visible) return;
                const color = parseInt(room.fillColor.replace('#', ''), 16);
                roomsGraphics.poly(room.path.map(p => ({ x: p.x, y: p.y })));
                roomsGraphics.fill({ color, alpha: 0.3 });
                roomsGraphics.stroke({ width: 2, color: 0xffffff, alpha: 0.3 });
            });
            const roomsContainer = new PIXI.Container();
            roomsContainer.name = 'rooms';
            roomsContainer.zIndex = LAYER_Z.ROOMS;
            roomsContainer.addChild(roomsGraphics);
            viewport.addChild(roomsContainer);
        }

        // DALI devices
        if (daliDevices && daliDevices.length > 0) {
            const daliGraphics = new PIXI.Graphics();
            daliDevices.forEach(device => {
                daliGraphics.circle(device.x, device.y, 8);
                daliGraphics.fill(0x3b82f6);
                daliGraphics.stroke({ width: 2, color: 0xffffff });
            });
            const daliContainer = new PIXI.Container();
            daliContainer.name = 'dali';
            daliContainer.zIndex = LAYER_Z.DALI;
            daliContainer.addChild(daliGraphics);
            viewport.addChild(daliContainer);
        }

        // Overlay masks
        if (overlayMasks && overlayMasks.length > 0) {
            const masksGraphics = new PIXI.Graphics();
            overlayMasks.forEach(mask => {
                if (!mask.visible) return;
                const color = parseInt(mask.color.replace('#', ''), 16);
                const isSelected = selectedMaskId === mask.id;

                masksGraphics.rect(
                    mask.x - mask.width / 2,
                    mask.y - mask.height / 2,
                    mask.width,
                    mask.height
                );
                masksGraphics.fill({ color, alpha: 0.5 });
                masksGraphics.stroke({
                    width: isSelected ? 4 : 2,
                    color: isSelected ? 0xfbbf24 : 0xffffff,
                    alpha: isSelected ? 1 : 0.7
                });
            });
            const masksContainer = new PIXI.Container();
            masksContainer.name = 'masks';
            masksContainer.zIndex = 1.5; // Between rooms and electrical
            masksContainer.addChild(masksGraphics);
            viewport.addChild(masksContainer);
        }

        // Apply visibility
        const baseLayer = viewport.children.find(c => c.name === 'base');
        if (baseLayer) {
            baseLayer.visible = layers.base.visible;
            baseLayer.alpha = layers.base.opacity / 100;
            console.log('🎨 Base layer visibility:', layers.base.visible, 'opacity:', layers.base.opacity);
        }

        const electricalLayer = viewport.children.find(c => c.name === 'electrical');
        if (electricalLayer) {
            electricalLayer.visible = layers.electrical.visible;
            electricalLayer.alpha = electricalOverlay.opacity;
            console.log('🎨 Electrical layer visibility:', layers.electrical.visible, 'opacity:', electricalOverlay.opacity);
        }

        const roomsLayer = viewport.children.find(c => c.name === 'rooms');
        if (roomsLayer) {
            roomsLayer.visible = layers.rooms.visible;
            console.log('🎨 Rooms layer visibility:', layers.rooms.visible);
        }

        const daliLayer = viewport.children.find(c => c.name === 'dali');
        if (daliLayer) {
            daliLayer.visible = layers.dali.visible;
            console.log('🎨 DALI layer visibility:', layers.dali.visible);
        }

        console.log('✅ Magnified cursor layers loaded');
    }, [baseImageUrl, electricalImageUrl, rooms, daliDevices, naturalWidth, naturalHeight, electricalOverlay, layers]);

    // Update viewport position to follow cursor
    useEffect(() => {
        if (!mousePos || !viewportRef.current) return;

        const viewport = viewportRef.current;
        const naturalCoords = getNaturalCoords(mousePos.x, mousePos.y);
        const lensScale = currentScale * ZOOM_MAGNIFICATION;

        console.log('🔄 Updating viewport:', {
            mousePos,
            naturalCoords,
            lensScale,
            zoom: viewport.scale
        });

        // Center the natural coordinates in the lens
        viewport.setZoom(lensScale, true);
        viewport.moveCenter(naturalCoords.x, naturalCoords.y);
    }, [mousePos, currentScale, getNaturalCoords]);

    console.log('🔍 PixiMagnifiedCursor render check:', {
        enabled,
        mousePos,
        isMouseOverFloorPlan,
        baseMode,
        willRender: !(!enabled || !mousePos || !isMouseOverFloorPlan)
    });

    if (!enabled || !mousePos || !isMouseOverFloorPlan) return null;

    const modeLabel = isPanning ? 'PAN' : baseMode;
    const effectiveBorderColor = isPanning ? '#3b82f6' : borderColor;

    return (
        <div
            ref={containerRef}
            className="absolute z-50 pointer-events-none overflow-hidden bg-black rounded-lg shadow-2xl"
            style={{
                left: mousePos.x - (ZOOM_CURSOR_SIZE / 2),
                top: mousePos.y - (ZOOM_CURSOR_SIZE / 2),
                width: ZOOM_CURSOR_SIZE,
                height: ZOOM_CURSOR_SIZE,
                border: `3px solid ${effectiveBorderColor}`,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)',
            }}
        >
            <Application
                onInit={handleInit}
                width={ZOOM_CURSOR_SIZE}
                height={ZOOM_CURSOR_SIZE}
                backgroundAlpha={1}
                background={0xffffff}
                preference="webgl"
                antialias={true}
            />

            {/* Crosshair */}
            <div
                className="absolute w-2 h-2 bg-red-500 rounded-full shadow-sm"
                style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 60,
                }}
            />

            {/* Mode Label */}
            {modeLabel && (
                <div className="absolute bottom-1 right-1 text-white text-[10px] font-bold bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm z-60">
                    [{modeLabel}]
                </div>
            )}
        </div>
    );
};
