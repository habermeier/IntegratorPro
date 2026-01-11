import * as THREE from 'three';
import { LayerSystem } from './systems/LayerSystem';
import { CameraSystem } from './systems/CameraSystem';
import {
    LayerConfig,
    ToolType,
    Transform,
    VectorLayerContent,
    PlacedSymbol,
    Furniture,
    Layer,
    Room
} from './models/types';
import { ToolSystem } from './systems/ToolSystem';
import { ScaleCalibrateTool } from './tools/ScaleCalibrateTool';
import { SelectTool } from './tools/SelectTool';
import { PolygonTool } from './tools/PolygonTool';
import { PlaceSymbolTool } from './tools/PlaceSymbolTool';
import { PlaceFurnitureTool } from './tools/PlaceFurnitureTool';
import { MeasureTool } from './tools/MeasureTool';
import { DrawCableTool } from './tools/DrawCableTool';
import { CommandManager } from './systems/CommandManager';
import { DeleteSymbolCommand } from './commands/DeleteSymbolCommand';
import { DeletePolygonCommand } from './commands/DeletePolygonCommand';
import { OpacityCommand } from './commands/OpacityCommand';
import { TransformLayerCommand } from './commands/TransformLayerCommand';
import { SelectionSystem } from './systems/SelectionSystem';
import { remoteDebug } from '../src/utils/logger';
import { findRoomObjectAt } from '../utils/spatialUtils';

export class FloorPlanEditor {
    /**
     * Static helper to check if user is typing in an input field
     */
    public static isTyping(): boolean {
        const activeProp = document.activeElement?.tagName.toLowerCase();
        return activeProp === 'input' || activeProp === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable === true;
    }

    public static isUserTyping(e: KeyboardEvent): boolean {
        return FloorPlanEditor.isTyping();
    }

    public scene: THREE.Scene;
    public renderer: THREE.WebGLRenderer | null = null;
    private container: HTMLElement;

    public layerSystem: LayerSystem;
    public cameraSystem: CameraSystem;
    public toolSystem: ToolSystem;
    public commandManager: CommandManager;
    public selectionSystem: SelectionSystem;

    public isOverlayAlignmentMode: boolean = false;
    public activeLayerId: string | null = null;
    public hoveredRoom: Room | null = null;
    private lastContextRoom: Room | null = null;
    public isRoomLayoutLocked: boolean = false;
    private isSpacePressed: boolean = false;
    private isAltPressed: boolean = false;
    private isShiftPressed: boolean = false;

    public needsRender: boolean = true;
    public fastZoomMultiplier: number = 3;
    private pixelsPerMeter: number = 50; // Default calibration (approx 1m = 50px)

    // Panning State
    private isDragging: boolean = false;
    // private dragStartX: number = 0;
    // private dragStartY: number = 0;
    private lastX: number = 0;
    private lastY: number = 0;
    private spaceHoverPanInitialized: boolean = false;

    private animationFrameId: number | null = null;
    private eventListeners: Map<string, Function[]> = new Map();
    private preMaskVisibility: Map<string, boolean> = new Map();
    private preShimmyOpacity: Map<string, number> = new Map();

    // Focus Tracking
    public isMouseOverCanvas: boolean = false;

    // Persisted state key
    private readonly STORAGE_KEY = 'integrator-pro-editor-state-v1';

    public get editMode(): boolean {
        return this.isOverlayAlignmentMode;
    }

    public get activeLayer(): string | null {
        return this.activeLayerId;
    }

    public get pixelsMeter(): number {
        return this.pixelsPerMeter;
    }

    public set pixelsMeter(val: number) {
        this.pixelsPerMeter = val;
        this.emit('scale-changed', val);
    }

    constructor(container: HTMLElement) {
        const editorId = Math.random().toString(36).substring(7);
        remoteDebug(`Initializing new instance: ${editorId} `, 'FloorPlanEditor');
        this.container = container;

        // Initialize Three.js
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.scene = new THREE.Scene();
        // this.scene.background = new THREE.Color(0x0f172a); // REMOVED: Replaced by Mesh for Zoom Transparency

        // Background Mesh (Layer 31)
        // This allows Main Camera to see it, but Zoom Camera to ignore it (via layers).
        const bgGeo = new THREE.PlaneGeometry(100000, 100000); // Massive plane
        const bgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, depthTest: false, depthWrite: false });
        const bgMesh = new THREE.Mesh(bgGeo, bgMat);
        bgMesh.position.z = -500; // Behind everything
        bgMesh.renderOrder = -999;
        bgMesh.layers.set(31); // Reserved for background
        bgMesh.name = 'viewport-background';
        this.scene.add(bgMesh);

        this.scene.userData.editor = this; // Link for systems polling
        (window as any).editor = this; // Global access for CameraSystem cursor logic

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            stencil: true  // Enable stencil buffer for room clipping
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.autoClear = false;

        this.renderer.domElement.tabIndex = 0; // Make focusable
        container.appendChild(this.renderer.domElement);

        // Initialize Systems
        this.layerSystem = new LayerSystem(this.scene);
        this.cameraSystem = new CameraSystem(width, height);
        this.toolSystem = new ToolSystem();
        this.commandManager = new CommandManager();
        this.commandManager.setOnChanged(() => {
            this.setDirty();
            this.emit('layers-changed', this.layerSystem.getAllLayers());
        });
        this.selectionSystem = new SelectionSystem(this.cameraSystem, this.layerSystem);

        // Register Tools
        this.toolSystem.registerTool(new ScaleCalibrateTool(this));
        this.toolSystem.registerTool(new SelectTool(this));
        this.toolSystem.registerTool(new PolygonTool(this, 'draw-room'));
        this.toolSystem.registerTool(new PolygonTool(this, 'draw-mask'));
        this.toolSystem.registerTool(new PlaceSymbolTool(this));
        this.toolSystem.registerTool(new PlaceFurnitureTool(this));
        this.toolSystem.registerTool(new MeasureTool(this));
        this.toolSystem.registerTool(new DrawCableTool(this));
        this.toolSystem.setActiveTool('select');

        this.setupEventListeners();
        this.startRenderLoop();
    }

    public savePersistentState(): void {
        const visibility: Record<string, boolean> = {};
        this.layerSystem.getAllLayers().forEach(l => {
            visibility[l.id] = l.visible;
        });

        const state = {
            activeTool: this.toolSystem.getActiveToolType(),
            activeLayerId: this.activeLayerId,
            visibility,
            isRoomLayoutLocked: this.isRoomLayoutLocked,
            preMaskVisibility: this.preMaskVisibility.size > 0
                ? Object.fromEntries(this.preMaskVisibility)
                : (JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}').preMaskVisibility || {}),
            camera: this.cameraSystem.getState()
        };

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    }

    public loadPersistentState(): void {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (!saved) return;

        try {
            const state = JSON.parse(saved);

            // 1. Restore Visibility
            if (state.visibility) {
                remoteDebug('Restoring visibility from persistence', 'FloorPlanEditor', { visibility: state.visibility });
                const entries = Object.entries(state.visibility as Record<string, boolean>);
                entries.forEach(([id, visible], index) => {
                    // We batch updates by skipping emit. The final state verification 
                    // in enforceTechnicalLayerMutex will emit the correct final state.
                    this.setLayerVisible(id, visible, true, true);
                });
            }

            // Defense in Depth: Explicitly enforce mutex after restoration to catch any race conditions
            this.enforceTechnicalLayerMutex();

            // 2. Restore Pre-Mask Visibility Map
            if (state.preMaskVisibility) {
                this.preMaskVisibility = new Map(Object.entries(state.preMaskVisibility));
            }

            // 3. Restore Metadata
            this.activeLayerId = state.activeLayerId || null;

            // 4. Restore Tool (Triggers side effects)
            if (state.activeTool) {
                this.setActiveTool(state.activeTool as ToolType);
            }

            // 5. Restore Camera State
            if (state.camera) {
                remoteDebug('Restoring camera from localStorage', 'FloorPlanEditor');
                this.cameraSystem.setState(state.camera);
                this.layerSystem.updateLabelScales(state.camera.zoom);
                this.cameraSystem.logViewportDebug('After loadPersistentState');
            } else {
                remoteDebug('No camera state in localStorage, using defaults', 'FloorPlanEditor');
                this.cameraSystem.logViewportDebug('Default state (no saved camera)');
            }

            if (state.isRoomLayoutLocked !== undefined) {
                this.isRoomLayoutLocked = state.isRoomLayoutLocked;
            }

            this.emit('layers-changed', this.layerSystem.getAllLayers());
            this.emit('edit-mode-changed', { isEditMode: this.isOverlayAlignmentMode, activeLayerId: this.activeLayerId });
        } catch (err) {
            console.error('[FloorPlanEditor] Failed to load persistent state:', err);
        }
    }

    private handleKeyDown = (e: KeyboardEvent) => {
        // GLOBAL GUARD: Skip all editor shortcuts if user is typing in an input/textarea
        // EXCEPTION: If mouse is over canvas, we assume user WANTS to interact with canvas (e.g. Nudge, Rotate)
        // even if a button has focus. But we MUST still respect text inputs.
        const isTyping = FloorPlanEditor.isUserTyping(e);

        if (this.isMouseOverCanvas && !isTyping) {
            // Smart Focus: If over canvas and NOT typing, we claim the event.
            // Aggressively prevent default for navigation keys to stop scrolling 
            // and ensure the editor gets the event without interference.
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyR'].includes(e.code)) {
                e.preventDefault();
                // remoteDebug(`[SmartFocus] Prevented default for ${e.code}`, 'FloorPlanEditor');
            }
        } else if (isTyping) {
            return;
        }

        // Spacebar Panning State (Skip repeats)
        if (e.code === 'Space') {
            if (e.repeat) return;
            this.isSpacePressed = true;
            this.updateCursor();
            this.emit('panning-changed', true);
            return;
        }

        // System-level toggles/history (Skip repeats to avoid rapid-fire noise)
        // Except for Undo/Redo which can be held
        const repeatableKeys = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'z', 'y', 'r'];
        const isRepeatable = repeatableKeys.includes(e.key.toLowerCase());

        if (e.repeat && !isRepeatable) {
            return;
        }

        // Undo/Redo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            if (e.shiftKey) {
                this.commandManager.redo();
            } else {
                this.commandManager.undo();
            }
            this.setDirty();
        }

        // Delete / Backspace - Delete selected items
        if (e.key === 'Delete' || e.key === 'Backspace') {
            // Prevent backspace from navigating back in browser
            e.preventDefault();
            this.deleteSelection();
            return;
        }

        // Overlay Alignment Mode Toggle (Skip repeats)
        if (!e.repeat && e.key.toLowerCase() === 'l' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            this.toggleEditMode();
            this.setDirty();
        }

        // Opacity Adjustment (+/- keys)
        // Works on active layer when in edit mode, or any visible layer otherwise
        if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd' || e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
            e.preventDefault();

            // Determine target layer: prefer activeLayerId, fallback to first visible layer
            let targetLayerId = this.activeLayerId;
            if (!targetLayerId) {
                const visibleLayers = this.layerSystem.getAllLayers().filter(l => l.visible);
                if (visibleLayers.length > 0) {
                    targetLayerId = visibleLayers[0].id;
                }
            }

            if (targetLayerId) {
                const layer = this.layerSystem.getLayer(targetLayerId);
                if (layer) {
                    const opacityStep = 0.1;
                    const isIncrease = e.key === '+' || e.key === '=' || e.code === 'NumpadAdd';
                    const newOpacity = isIncrease
                        ? Math.min(1, layer.opacity + opacityStep)
                        : Math.max(0, layer.opacity - opacityStep);

                    this.setLayerOpacity(targetLayerId, newOpacity);
                    remoteDebug(`Adjusted ${layer.name} opacity: ${(newOpacity * 100).toFixed(0)}% `, 'FloorPlanEditor');
                }
            }
            return;
        }

        // Arrow Key Scooting / Scaling / Rotation (ONLY for alignable layers in Alignment Mode)
        if (this.isOverlayAlignmentMode && this.activeLayerId) {
            const layer = this.layerSystem.getLayer(this.activeLayerId);
            if (!layer) return;

            // Prevent default scrolling when editing
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }

            const step = e.shiftKey ? 10 : 2; // Precise nudge
            const scaleStep = 0.01;
            const rotStep = (Math.PI / 180) * 0.25; // 0.25 degree

            if (e.ctrlKey || e.metaKey) {
                // Scale / Rotation
                if (e.key === 'ArrowUp') this.setLayerTransform(layer.id, { scale: { x: layer.transform.scale.x + scaleStep, y: layer.transform.scale.y + scaleStep } });
                if (e.key === 'ArrowDown') this.setLayerTransform(layer.id, { scale: { x: Math.max(0.1, layer.transform.scale.x - scaleStep), y: Math.max(0.1, layer.transform.scale.y - scaleStep) } });
                if (e.key === 'ArrowLeft') this.setLayerTransform(layer.id, { rotation: layer.transform.rotation - rotStep });
                if (e.key === 'ArrowRight') this.setLayerTransform(layer.id, { rotation: layer.transform.rotation + rotStep });
            } else {
                // Translation (Unified world space: Y increases UP)
                if (e.key === 'ArrowUp') this.setLayerTransform(layer.id, { position: { x: layer.transform.position.x, y: layer.transform.position.y + step } });
                if (e.key === 'ArrowDown') this.setLayerTransform(layer.id, { position: { x: layer.transform.position.x, y: layer.transform.position.y - step } });
                if (e.key === 'ArrowLeft') this.setLayerTransform(layer.id, { position: { x: layer.transform.position.x - step, y: layer.transform.position.y } });
                if (e.key === 'ArrowRight') this.setLayerTransform(layer.id, { position: { x: layer.transform.position.x + step, y: layer.transform.position.y } });
            }
            this.emit('layers-changed', this.layerSystem.getAllLayers());
            this.setDirty();
        }

        // Tool Shortcuts
        const key = e.key.toLowerCase();
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            switch (key) {
                case 'v': this.setActiveTool('select'); break;
                case 'r': {
                    const activeType = this.toolSystem.getActiveToolType();
                    const hasSelection = this.selectionSystem.getSelectedIds().length > 0;
                    const isPlacing = activeType === 'place-symbol';
                    const isSelecting = activeType === 'select' && hasSelection;

                    remoteDebug('[KEY] Pressed R', 'FloorPlanEditor', { activeType, hasSelection, isPlacing, isSelecting });

                    // Priority:
                    // 1. Placing a symbol -> 'r' rotates it
                    // 2. Selecting a symbol -> 'r' rotates it (if selection exists)
                    // 3. Otherwise -> Switch to Room Tool

                    if (!isPlacing && !isSelecting) {
                        remoteDebug('[KEY] Switching to Room Tool', 'FloorPlanEditor');
                        this.setActiveTool('draw-room');
                    } else {
                        remoteDebug('[KEY] Skipping tool switch (Pass-through)', 'FloorPlanEditor');
                    }
                    break;
                }
                case 'm': this.setActiveTool('draw-mask'); break;
                case 'p':
                    this.setActiveLayer('lighting', true);
                    this.setActiveTool('place-symbol');
                    break;
                case 'f': this.setActiveTool('place-furniture'); break;
                case 's': this.setActiveTool('scale-calibrate'); break;
                case 'd': this.setActiveTool('measure'); break;
                case '[': this.cycleDevices('prev'); break;
                case ']': this.cycleDevices('next'); break;
            }
        }

        // Alt Key tracking
        if (e.altKey) {
            e.preventDefault(); // Suppress browser menu (Chrome/Linux/Windows)
            if (!this.isAltPressed) {
                this.isAltPressed = true;
                this.emit('modifier-changed', { isAltPressed: true, isShiftPressed: this.isShiftPressed });
            }
        }

        // Shift Key tracking
        if (e.shiftKey) {
            if (!this.isShiftPressed) {
                this.isShiftPressed = true;
                this.emit('modifier-changed', { isAltPressed: this.isAltPressed, isShiftPressed: true });
            }
        }

        if (e.key.startsWith('Arrow')) {
            remoteDebug(`[FloorPlanEditor] Dispatching ${e.key} to ToolSystem`, 'FloorPlanEditor');
        }

        this.toolSystem.handleKeyDown(e.key, e);
        this.emit('keydown', e.key);
    };

    private handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            this.isSpacePressed = false;
            this.spaceHoverPanInitialized = false;
            this.updateCursor();
            this.emit('panning-changed', false);
        }

        if (!e.altKey && this.isAltPressed) {
            this.isAltPressed = false;
            this.emit('modifier-changed', { isAltPressed: false, isShiftPressed: this.isShiftPressed });
        }

        if (!e.shiftKey && this.isShiftPressed) {
            this.isShiftPressed = false;
            this.emit('modifier-changed', { isAltPressed: this.isAltPressed, isShiftPressed: false });
        }
    };

    private handleResize = () => {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.renderer.setSize(width, height);
        this.cameraSystem.resize(width, height);
        this.emit('zoom-changed', this.cameraSystem.getState().zoom);
        this.setDirty();
    };

    private setupEventListeners(): void {
        const el = this.renderer.domElement;

        el.addEventListener('mouseleave', () => {
            this.isDragging = false;
            el.style.cursor = 'default';
        });
        el.addEventListener('mousedown', this.handleMouseDown);
        el.addEventListener('mousemove', this.handleMouseMove);
        el.addEventListener('mouseup', this.handleMouseUp);
        el.addEventListener('dblclick', this.handleDoubleClick);
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        el.addEventListener('wheel', this.handleWheel, { passive: false });
        window.addEventListener('resize', this.handleResize);

        // Prevent context menu
        this.container.addEventListener('contextmenu', (e) => e.preventDefault());

        // Resize observer? Already handled via resize() method typically called by React
    }

    private getMouseCoords(event: MouseEvent): { x: number, y: number } {
        const rect = this.container.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    private handleMouseDown = (e: MouseEvent) => {
        const { x, y } = this.getMouseCoords(e);

        const isPanInput = e.button === 1 || (e.button === 0 && (e.shiftKey || this.isSpacePressed));

        if (isPanInput) {
            this.isDragging = true;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
            this.updateCursor();
            this.setDirty();
        } else {
            this.toolSystem.handleMouseDown(x, y, e);
            this.setDirty();
        }
    };

    private lastMouseMoveTime: number = 0;
    private readonly MOUSE_MOVE_THROTTLE_MS = 32; // ~30fps (AUTO-ULTIMATE-UX-P26)

    private handleMouseMove = (e: MouseEvent) => {
        // We need coords relative to container even if mouse is outside (for drag)
        // ensure rect is valid
        if (!this.container) return;

        // Throttle check (AUTO-ULTIMATE-UX-P26: Performance optimization)
        // Only throttle when spacebar is pressed (auto-pan mode)
        const now = Date.now();
        if (this.isSpacePressed && now - this.lastMouseMoveTime < this.MOUSE_MOVE_THROTTLE_MS) {
            return;
        }
        this.lastMouseMoveTime = now;

        const { x, y } = this.getMouseCoords(e);

        if (this.isDragging) {
            // Click-drag panning (existing behavior)
            const deltaX = e.clientX - this.lastX;
            const deltaY = e.clientY - this.lastY;
            this.cameraSystem.pan(deltaX, deltaY);
            this.lastX = e.clientX;
            this.lastY = e.clientY;
            this.setDirty();
        } else if (this.isSpacePressed) {
            // Spacebar hover-pan (new auto-pan behavior)
            if (!this.spaceHoverPanInitialized) {
                // First move with spacebar - initialize position tracking
                this.lastX = e.clientX;
                this.lastY = e.clientY;
                this.spaceHoverPanInitialized = true;
                this.updateCursor(); // Update to grabbing cursor
            } else {
                // Subsequent moves - pan based on delta
                const deltaX = e.clientX - this.lastX;
                const deltaY = e.clientY - this.lastY;
                this.cameraSystem.pan(deltaX, deltaY);
                this.lastX = e.clientX;
                this.lastY = e.clientY;
                this.setDirty();
            }
        } else {
            // Normal tool mode
            this.toolSystem.handleMouseMove(x, y, e);
            // Mouse move tool handles might need render
            const activeTool = this.toolSystem.getActiveToolType();
            if (activeTool === 'scale-calibrate' || activeTool === 'measure' || activeTool === 'place-symbol' || activeTool === 'place-furniture') {
                this.setDirty();
            }
        }

        this.cameraSystem.updateZoomCursor(x, y);

        // Trigger re-render if zoom cursor is active
        if (this.cameraSystem.getZoomCursorEnabled()) {
            this.setDirty();
        }

        // Only trigger dirty if zoom cursor is visible or moving
        // But since it's world-space attached, we usually need it.
        // Let's at least emit move.
        this.emit('cursor-move', { x, y });
    };

    private handleMouseUp = (e: MouseEvent) => {
        const { x, y } = this.getMouseCoords(e);

        if (this.isDragging) {
            this.isDragging = false;
            this.updateCursor();
            this.savePersistentState(); // Save after Pan
            this.setDirty();
        } else {
            this.toolSystem.handleMouseUp(x, y, e);
            this.setDirty();
        }
    };

    private handleDoubleClick = (e: MouseEvent) => {
        const { x, y } = this.getMouseCoords(e);
        const handled = this.toolSystem.handleDoubleClick(x, y, e);

        // Fallback: If tool didn't handle it, try to find a room to edit
        // Global rule: Only allow double-click editing if clicking the LABEL.
        // This prevents accidental vertex clicks from triggering edits.

        // We allow SelectTool to override this (it calls getRoomAt with false),
        // but for the global fallback (Draw modes etc), we enforce labels only.

        if (this.toolSystem.getActiveToolType() !== 'select') {
            const room = this.selectionSystem.getRoomAt(x, y, true); // true = Only Labels
            if (room) {
                remoteDebug('Fallback Double Click: Edit Room via Label', 'FloorPlanEditor', { roomName: room.name });
                this.emit('room-edit-requested', room);
            }
        }
    };

    private saveTimeout: number | undefined;

    private handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const { x, y } = this.getMouseCoords(e);

        // Multiplier: user-defined if Shift is held
        const delta = e.shiftKey ? e.deltaY * this.fastZoomMultiplier : e.deltaY;
        this.cameraSystem.zoom(delta, x, y);

        // Update label scales dynamically
        const newZoom = this.cameraSystem.getState().zoom;
        this.layerSystem.updateLabelScales(newZoom);

        this.emit('zoom-changed', newZoom);
        this.setDirty();

        // Debounce save for zoom
        window.clearTimeout(this.saveTimeout);
        this.saveTimeout = window.setTimeout(() => this.savePersistentState(), 500);
    };

    // Public API
    public async loadImage(id: string, url: string): Promise<void> {
        await this.layerSystem.loadImage(id, url);
        this.setDirty();
    }

    public toggleEditMode(): void {
        this.setEditMode(!this.isOverlayAlignmentMode);
    }

    public setEditMode(enabled: boolean): void {
        if (this.isOverlayAlignmentMode === enabled) return;
        this.isOverlayAlignmentMode = enabled;

        if (this.isOverlayAlignmentMode) {
            this.renderer.domElement.focus();
            // Automatically select 'electrical' layer if none selected or if current is not alignable
            const layer = this.activeLayerId ? this.layerSystem.getLayer(this.activeLayerId) : null;
            if (!layer || layer.allowLayerEditing === false) {
                this.setActiveLayer('electrical', true); // Internal set to avoid alert
            }

            // Auto-dim room layer for better visibility during alignment
            const roomLayer = this.layerSystem.getLayer('room');
            if (roomLayer) {
                this.preShimmyOpacity.set('room', roomLayer.opacity);
                this.layerSystem.setLayerOpacity('room', 0.5);
            }
        } else {
            // Exit Alignment Mode: Restore room opacity
            const originalOpacity = this.preShimmyOpacity.get('room');
            if (originalOpacity !== undefined) {
                this.layerSystem.setLayerOpacity('room', originalOpacity);
                this.preShimmyOpacity.delete('room'); // Clear it
            }
        }

        if (this.activeLayerId) {
            this.layerSystem.setLayerLocked(this.activeLayerId, !this.isOverlayAlignmentMode);
        }

        this.updateFocusMode();
        this.savePersistentState();
        this.emit('mode-changed', this.isOverlayAlignmentMode);
        this.emit('edit-mode-changed', { isEditMode: this.isOverlayAlignmentMode, activeLayerId: this.activeLayerId });
        this.setDirty();
    }

    public setActiveLayer(id: string | null, internal: boolean = false, isEditMode: boolean = false): void {
        const forceShimmy = isEditMode;
        // Toggle off if clicking the already active layer in alignment mode
        if (id === this.activeLayerId && !internal && this.isOverlayAlignmentMode && !forceShimmy) {
            this.setEditMode(false);
            this.activeLayerId = null;
            this.updateFocusMode();
            this.emit('edit-mode-changed', { isEditMode: this.isOverlayAlignmentMode, activeLayerId: this.activeLayerId });
            return;
        }

        // Check if layer allows editing (only if NOT internal)
        if (id && !internal) {
            const layer = this.layerSystem.getLayer(id);

            // If we are selecting a shimmy-able layer from the UI with an explicit SHIMMY request
            if (forceShimmy && !this.isOverlayAlignmentMode) {
                if (layer && layer.allowLayerEditing === false) {
                    console.warn(`[FloorPlanEditor] Cannot shimmy layer "${layer.name}" - locked to base coordinates`);
                    return;
                }
                this.setEditMode(true);
            }
        }

        // Clear previous state if any
        if (this.activeLayerId) {
            this.layerSystem.setLayerLocked(this.activeLayerId, true);
        }

        this.activeLayerId = id;

        // If in alignment mode, apply new lock and ENSURE FOCUS
        if (this.isOverlayAlignmentMode && id) {
            this.renderer.domElement.focus();
            this.layerSystem.setLayerLocked(id, false);
        }

        this.updateFocusMode();
        this.savePersistentState();
        this.emit('edit-mode-changed', { isEditMode: this.isOverlayAlignmentMode, activeLayerId: this.activeLayerId });
        this.setDirty();
    }

    public addLayer(config: LayerConfig): void {
        this.layerSystem.addLayer({ ...config, locked: true }); // Default to locked

        // Ensure mutex if added as visible
        if (config.visible) {
            this.setLayerVisible(config.id, true, true);
        }

        this.emit('layers-changed', this.layerSystem.getAllLayers());
        this.setDirty();
    }

    public setLayerVisible(id: string, visible: boolean, skipSave: boolean = false, skipEmit: boolean = false): void {
        const layer = this.layerSystem.getLayer(id);
        remoteDebug(`setLayerVisible called for ${id}: ${visible} `, 'FloorPlanEditor', { id, visible, skipSave });

        // Enforce mutual exclusivity for technical layers
        if (visible && layer?.category === 'technical') {
            const allLayers = this.layerSystem.getAllLayers();
            allLayers.forEach(l => {
                if (l.category === 'technical' && l.id !== id) {
                    // Check if other technical layer is currently visible
                    if (l.visible) {
                        remoteDebug(`Mutex Check: Disabling ${l.id} because ${id} is becoming visible`, 'FloorPlanEditor', { disabled: l.id, enabled: id });
                        this.layerSystem.setLayerVisible(l.id, false);
                    }
                }
            });
        }

        this.layerSystem.setLayerVisible(id, visible);
        if (!skipSave) {
            this.savePersistentState();
        }

        if (!skipEmit) {
            // Force a fresh array reference and ensure objects are treated as updated
            const currentLayers = this.layerSystem.getAllLayers().map(l => ({ ...l }));
            this.emit('layers-changed', currentLayers);
        }
        this.setDirty();
    }

    public enforceTechnicalLayerMutex(): void {
        remoteDebug('🛡️ STARTING MUTEX ENFORCEMENT 🛡️', 'FloorPlanEditor');
        const layers = this.layerSystem.getAllLayers();
        const techLayers = layers.filter(l => l.category === 'technical' && l.visible);

        remoteDebug('Enforcing Mutex. Visible Tech Layers', 'FloorPlanEditor', { visibleLayers: techLayers.map(l => l.id) });

        if (techLayers.length > 1) {
            console.warn('[FloorPlanEditor] Mutex violation detected. Enforcing single technical layer.');
            // Identify which one should stay active.
            // Preference: Lighting > HVAC > First available
            // Or just keep the last one (most likely user intent from restoration loop)
            // Let's keep the last one found in the list (simplest heuristic for now) or specific priority?

            // Heuristic: If multiple are active, keep the one with the highest zIndex (topmost) or just pick one.
            // Let's match the user's report: they saw "All 3".
            // Let's keep the one that appears *last* in the list (highest z-index usually) as the "active" one, disable others.

            // Actually, let's look for known types to prioritize: 'lighting' is a good default if active.
            let keptLayerId = techLayers[techLayers.length - 1].id;
            const lighting = techLayers.find(l => l.id === 'lighting');
            if (lighting) keptLayerId = 'lighting';

            remoteDebug(`Keeping ${keptLayerId} active, disabling others`, 'FloorPlanEditor', { keptLayer: keptLayerId });

            techLayers.forEach(l => {
                if (l.id !== keptLayerId) {
                    remoteDebug(`Auto - disabling layer ${l.id} `, 'FloorPlanEditor', { layerId: l.id });
                    this.layerSystem.setLayerVisible(l.id, false);
                }
            });
            this.savePersistentState();
            // Force fresh array for React
            this.emit('layers-changed', this.layerSystem.getAllLayers().map(l => ({ ...l })));
        } else {
            remoteDebug('No mutex violation found', 'FloorPlanEditor');
        }
    }

    public setRoomLayoutLocked(locked: boolean): void {
        this.isRoomLayoutLocked = locked;
        this.savePersistentState();
        this.emit('room-layout-locked-changed', locked);
        this.setDirty();
    }

    public setLayerSolo(id: string): void {
        const layers = this.layerSystem.getAllLayers();
        const targetLayer = layers.find(l => l.id === id);
        if (!targetLayer) return;

        layers.forEach(l => {
            // Foundational layers stay visible
            if (l.category === 'foundation') {
                this.layerSystem.setLayerVisible(l.id, true);
                return;
            }

            // Solo target stays visible
            if (l.id === id) {
                this.layerSystem.setLayerVisible(l.id, true);
                return;
            }

            // Other technical/utility layers are hidden
            if (l.category === 'technical' || l.category === 'utility') {
                this.layerSystem.setLayerVisible(l.id, false);
            }
        });

        this.savePersistentState();
        this.emit('layers-changed', this.layerSystem.getAllLayers());
        this.setDirty();
    }

    public focusOnDevice(id: string): void {
        // Find device in all layers
        const layers = this.layerSystem.getAllLayers();
        let foundDevice: PlacedSymbol | Furniture | null = null;
        let foundLayer: Layer | null = null;

        for (const layer of layers) {
            if (layer.type === 'vector') {
                const content = layer.content as VectorLayerContent;
                const dev = (content.symbols || []).find(s => s.id === id)
                    || (content.furniture || []).find(f => f.id === id); // Check furniture too
                if (dev) {
                    foundDevice = dev;
                    foundLayer = layer;
                    break;
                }
            }
        }

        if (foundDevice && foundLayer) {
            remoteDebug(`Focusing on device ${id} in layer ${foundLayer.id} `, 'FloorPlanEditor', { deviceId: id, layerId: foundLayer.id });

            // 1. Auto-show and activate layer (but don't shimmy)
            this.layerSystem.setLayerVisible(foundLayer.id, true);
            this.setActiveLayer(foundLayer.id, true); // internal=true prevents auto-shimmy logic

            // 2. Calculate World Position
            // Important: symbols are children of the layer container, which has its own transform
            const localPos = new THREE.Vector3(foundDevice.x, foundDevice.y, 0);
            const worldPos = localPos.applyMatrix4(foundLayer.container.matrixWorld);

            // 3. Center camera with progressive zoom
            const currentZoom = this.cameraSystem.getState().zoom;
            const targetZoom = Math.max(currentZoom, 2.5); // Focus zoom
            this.cameraSystem.centerOn(worldPos.x, worldPos.y, targetZoom);

            // 4. Selection highlight
            this.selectionSystem.select(id);
            this.emit('selection-changed', [id]);

            this.setDirty();
        } else {
            console.warn(`[FloorPlanEditor] Could not find device to focus: ${id} `);
        }
    }

    public focusOnRoom(roomId: string): void {
        const roomLayer = this.layerSystem.getLayer('room');
        if (!roomLayer || roomLayer.type !== 'vector') return;

        const rooms = (roomLayer.content as any).rooms || [];
        const room = rooms.find((r: any) => r.id === roomId);

        if (room && room.points && room.points.length > 0) {
            // Simple bounding box center
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            room.points.forEach((p: any) => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            this.cameraSystem.centerOn(centerX, centerY, 1.5);
            this.emit('camera-changed', this.cameraSystem.getState());
        }
    }


    public deleteDevice(id: string): void {
        // Find device and its layer
        const layers = this.layerSystem.getAllLayers();
        let foundDevice: PlacedSymbol | Furniture | null = null;
        let foundLayerId: string | null = null;

        for (const layer of layers) {
            if (layer.type === 'vector') {
                const content = layer.content as VectorLayerContent;
                const dev = (content.symbols || []).find(s => s.id === id)
                    || (content.furniture || []).find(f => f.id === id);
                if (dev) {
                    foundDevice = dev;
                    foundLayerId = layer.id;
                    break;
                }
            }
        }

        if (foundDevice && foundLayerId) {
            const command = new DeleteSymbolCommand(foundLayerId, foundDevice, this.layerSystem);
            this.commandManager.execute(command);

            this.selectionSystem.clearSelection();
            this.emit('selection-changed', []);
            this.emit('layers-changed', this.layerSystem.getAllLayers());
            this.setDirty();
        }
    }

    /**
     * Delete all currently selected items (devices, furniture, etc.)
     * Triggered by Delete or Backspace keys
     */
    public deleteSelection(): void {
        const selectedIds = this.selectionSystem.getSelectedIds();
        if (selectedIds.length === 0) {
            return; // Nothing selected
        }

        // Create a copy because we'll be clearing selection as we go
        const idsToDelete = [...selectedIds];

        idsToDelete.forEach(id => {
            // Priority 1: Check for Rooms/Masks (Polygons)
            const layers = this.layerSystem.getAllLayers();
            let polyFound = false;
            for (const layer of layers) {
                if (layer.type !== 'vector') continue;
                const content = layer.content as VectorLayerContent;
                const poly = (content.rooms || []).find(r => r.id === id)
                    || (content.masks || []).find(m => m.id === id);

                if (poly) {
                    const command = new DeletePolygonCommand(layer.id, poly, this.layerSystem);
                    this.commandManager.execute(command);
                    polyFound = true;
                    break;
                }
            }

            // Priority 2: Check for Symbols/Furniture
            if (!polyFound) {
                this.deleteDevice(id);
            }
        });

        // Final cleanup of UI state
        this.selectionSystem.clearSelection();
        this.emit('selection-changed', []);
        this.emit('layers-changed', this.layerSystem.getAllLayers());
        this.setDirty();
    }

    public cycleDevices(direction: 'next' | 'prev'): void {
        const layers = this.layerSystem.getAllLayers();
        const allDevices: { id: string, name: string, roomId: string, x: number, y: number }[] = [];

        // Collect all devices from all vector layers
        layers.forEach(layer => {
            if (layer.type === 'vector') {
                const content = layer.content as VectorLayerContent;
                const symbols = (content.symbols || []).map(s => ({
                    id: s.id,
                    name: s.label || s.type,
                    roomId: s.room || 'Unassigned',
                    x: s.x,
                    y: s.y
                }));
                const furniture = (content.furniture || []).map(f => ({
                    id: f.id,
                    name: f.label || f.type,
                    roomId: f.room || 'Unassigned',
                    x: f.x,
                    y: f.y
                }));
                allDevices.push(...symbols, ...furniture);
            }
        });

        if (allDevices.length === 0) return;

        // Sort by room (alphabetical), then by geometry (y, then x)
        allDevices.sort((a, b) => {
            // Unassigned always goes last
            if (a.roomId === 'Unassigned' && b.roomId !== 'Unassigned') return 1;
            if (a.roomId !== 'Unassigned' && b.roomId === 'Unassigned') return -1;

            // Sort by room first
            const roomComp = a.roomId.localeCompare(b.roomId);
            if (roomComp !== 0) return roomComp;

            // Within same room, sort by y (top to bottom)
            const yComp = a.y - b.y;
            if (Math.abs(yComp) > 1) return yComp; // Use threshold for "same row"

            // For same row, sort by x (left to right)
            return a.x - b.x;
        });

        // Find current index
        const selectedIds = this.selectionSystem.getSelectedIds();
        let currentIndex = -1;
        if (selectedIds.length > 0) {
            currentIndex = allDevices.findIndex(d => d.id === selectedIds[0]);
        }

        let nextIndex: number;
        if (direction === 'next') {
            nextIndex = (currentIndex + 1) % allDevices.length;
        } else {
            nextIndex = (currentIndex - 1 + allDevices.length) % allDevices.length;
        }

        const targetDevice = allDevices[nextIndex];
        if (targetDevice) {
            this.focusOnDevice(targetDevice.id);
        }
    }

    public getSortedDevices(productId: string): Array<{ id: string, name: string, roomId: string, x: number, y: number }> {
        const layers = this.layerSystem.getAllLayers();
        const filteredDevices: { id: string, name: string, roomId: string, x: number, y: number, productId?: string }[] = [];

        // Collect all devices from all vector layers
        layers.forEach(layer => {
            if (layer.type === 'vector') {
                const content = layer.content as VectorLayerContent;
                const symbols = (content.symbols || [])
                    .filter(s => s.productId === productId)
                    .map(s => ({
                        id: s.id,
                        name: s.label || s.type,
                        roomId: s.room || 'Unassigned',
                        x: s.x,
                        y: s.y,
                        productId: s.productId
                    }));
                const furniture = (content.furniture || [])
                    .filter(f => f.productId === productId)
                    .map(f => ({
                        id: f.id,
                        name: f.label || f.type,
                        roomId: f.room || 'Unassigned',
                        x: f.x,
                        y: f.y,
                        productId: f.productId
                    }));
                filteredDevices.push(...symbols, ...furniture);
            }
        });

        // Sort by room (alphabetical), then by geometry (y, then x)
        filteredDevices.sort((a, b) => {
            // Unassigned always goes last
            if (a.roomId === 'Unassigned' && b.roomId !== 'Unassigned') return 1;
            if (a.roomId !== 'Unassigned' && b.roomId === 'Unassigned') return -1;

            // Sort by room first
            const roomComp = a.roomId.localeCompare(b.roomId);
            if (roomComp !== 0) return roomComp;

            // Within same room, sort by y (top to bottom)
            const yComp = a.y - b.y;
            if (Math.abs(yComp) > 1) return yComp; // Use threshold for "same row"

            // For same row, sort by x (left to right)
            return a.x - b.x;
        });

        return filteredDevices;
    }

    public cycleDevicesByType(productId: string, direction: 'next' | 'prev'): void {
        const devices = this.getSortedDevices(productId);

        if (devices.length === 0) {
            console.warn(`[FloorPlanEditor] No devices found with productId: ${productId} `);
            return;
        }

        // Find current index
        const selectedIds = this.selectionSystem.getSelectedIds();
        let currentIndex = -1;
        if (selectedIds.length > 0) {
            currentIndex = devices.findIndex(d => d.id === selectedIds[0]);
        }

        let nextIndex: number;
        if (direction === 'next') {
            nextIndex = (currentIndex + 1) % devices.length;
        } else {
            nextIndex = (currentIndex - 1 + devices.length) % devices.length;
        }

        const targetDevice = devices[nextIndex];
        if (targetDevice) {
            this.focusOnDevice(targetDevice.id);
        }
    }

    public setLayerOpacity(id: string, opacity: number): void {
        const layer = this.layerSystem.getLayer(id);
        if (layer) {
            const command = new OpacityCommand(id, this.layerSystem, layer.opacity, opacity);
            this.commandManager.execute(command);
            this.emit('layers-changed', this.layerSystem.getAllLayers());
            this.setDirty();
        }
    }

    public setLayerTransform(id: string, transform: Partial<Transform>, force: boolean = false): void {
        const layer = this.layerSystem.getLayer(id);
        if (layer) {
            const oldTransform = { ...layer.transform };
            const newTransform = { ...layer.transform, ...transform };
            const command = new TransformLayerCommand(id, this.layerSystem, oldTransform, newTransform);
            this.commandManager.execute(command);
            this.layerSystem.setLayerTransform(id, transform, force); // Apply the force
            this.emit('layers-changed', this.layerSystem.getAllLayers());
            this.setDirty();
        }
    }

    public setActiveTool(type: ToolType, attributes?: any): void {
        this.hoveredRoom = null;
        this.toolSystem.setActiveTool(type, attributes);
        this.emit('tool-changed', type);

        // Auto-activate Focus Mode for specific tools
        if (type === 'draw-mask') {
            this.setActiveLayer('mask', true);
        } else if (type === 'draw-room') {
            this.setActiveLayer('room', true);
        } else if (type === 'scale-calibrate' || type === 'measure') {
            this.setActiveLayer('base', true);
        }

        this.updateFocusMode();
        this.savePersistentState();
        this.emit('tool-changed', type);
        this.emit('edit-mode-changed', { isEditMode: this.isOverlayAlignmentMode, activeLayerId: this.activeLayerId });
        this.updateCursor();
        this.setDirty();
    }

    private updateFocusMode(): void {
        const activeTool = this.toolSystem.getActiveToolType();
        // Focus Mode (Isolation) is active if we are using specific vector-critical tools
        const isIsolationRequired = activeTool === 'draw-mask' || activeTool === 'draw-room' || activeTool === 'scale-calibrate' || activeTool === 'measure';

        // Alignment Mode is explicitly toggled
        const isFocusActive = isIsolationRequired || this.isOverlayAlignmentMode;

        // Special case for symbol placement: show context but don't isolate
        const isSymbolPlacement = activeTool === 'place-symbol' || activeTool === 'place-furniture';

        // Update specific Mask Edit Mode flag for LayerSystem styling
        const isMaskFocus = isFocusActive && this.activeLayerId === 'mask';
        this.layerSystem.setMaskEditMode(isMaskFocus);

        if (isFocusActive) {
            // ENTERING Focus Mode
            // 1. Snapshot current state if we haven't already (and aren't just switching focus layers)
            if (this.preMaskVisibility.size === 0) {
                this.layerSystem.getAllLayers().forEach(l => {
                    this.preMaskVisibility.set(l.id, l.visible);
                });
            }

            // 2. Apply Isolation Rules
            this.layerSystem.getAllLayers().forEach(layer => {
                const isTarget = layer.id === this.activeLayerId;

                if (layer.id === 'base') {
                    this.layerSystem.setLayerVisible(layer.id, true); // Always show base
                } else if (isTarget) {
                    this.layerSystem.setLayerVisible(layer.id, true); // Show target
                    // Only unlock if we are in ALIGNMENT mode
                    this.layerSystem.setLayerLocked(layer.id, !this.isOverlayAlignmentMode);
                } else if (this.isOverlayAlignmentMode && layer.id === 'electrical') {
                    // Always show electrical during alignment mode even if not the active layer
                    // (facilitates multi-image alignment if ever supported, but mandatory for overlay)
                    this.layerSystem.setLayerVisible(layer.id, true);
                    this.layerSystem.setLayerLocked(layer.id, true);
                } else if (layer.type === 'vector' && (layer.id === 'room' || layer.id === 'mask')) {
                    // KEEP Rooms and Masks visible even if not the active focus layer
                    this.layerSystem.setLayerVisible(layer.id, true);
                    this.layerSystem.setLayerLocked(layer.id, true);
                } else if (isSymbolPlacement && layer.type === 'vector') {
                    // During symbol placement, show other technical layers for context
                    this.layerSystem.setLayerVisible(layer.id, true);
                    this.layerSystem.setLayerLocked(layer.id, true);
                } else if (this.isOverlayAlignmentMode) {
                    // During alignment, hide other irrelevant layers to reduce noise
                    if (layer.type === 'vector') {
                        this.layerSystem.setLayerVisible(layer.id, false);
                    }
                } else {
                    // Default Isolation (e.g. Draw Mask hides Furniture)
                    this.layerSystem.setLayerVisible(layer.id, false);
                    this.layerSystem.setLayerLocked(layer.id, true);
                }
            });

        } else {
            // EXITING Focus Mode
            // Restore visibility from snapshot
            if (this.preMaskVisibility.size > 0) {
                this.preMaskVisibility.forEach((visible, id) => {
                    this.layerSystem.setLayerVisible(id, visible);
                });
                this.preMaskVisibility.clear();
            }

            // Re-lock ONLY foundational image layers by default
            // Technical and Utility layers should remain interactive
            this.layerSystem.getAllLayers().forEach(layer => {
                if (layer.category === 'foundation' && layer.type === 'image') {
                    this.layerSystem.setLayerLocked(layer.id, true);
                } else if (layer.type === 'vector') {
                    // Vector layers are locked only if global room layout lock is ON
                    // Exception: Cables/Lighting usually stay unlocked for device interaction
                    const shouldLock = this.isRoomLayoutLocked && (layer.id === 'room' || layer.id === 'mask');
                    this.layerSystem.setLayerLocked(layer.id, shouldLock);
                }
            });
        }
        this.savePersistentState();
        this.emit('layers-changed', this.layerSystem.getAllLayers());
    }

    private startRenderLoop(): void {
        const animate = () => {
            this.animationFrameId = requestAnimationFrame(animate);

            // Continuous Pulse for selections
            if (this.selectionSystem.getSelectedIds().length > 0) {
                this.needsRender = true;
            }

            if (this.needsRender) {
                this.update();
                this.render();
                this.needsRender = false;

                // Update context room automatically based on view
                this.updateContextRoom();
            }
        };
        animate();
    }

    public updateContextRoom(): void {
        const roomLayer = this.layerSystem.getLayer('room');
        const rooms = roomLayer?.content ? ((roomLayer.content as VectorLayerContent).rooms || []) : [];

        let newContext: Room | null = null;

        // Priority 1: Hovered Room (from PlaceSymbolTool etc)
        if (this.hoveredRoom) {
            newContext = this.hoveredRoom;
        } else {
            // Priority 2: Center of Screen
            const cameraState = this.cameraSystem.getState();
            newContext = findRoomObjectAt({ x: cameraState.x, y: cameraState.y }, rooms);
        }

        if (newContext !== this.lastContextRoom) {
            this.lastContextRoom = newContext;
            this.emit('context-room-changed', newContext);
        }
    }

    public setDirty(): void {
        this.needsRender = true;
    }

    public setZoomCursorRef(ref: React.RefObject<HTMLDivElement | null>): void {
        this.cameraSystem.zoomCursorRef = ref;
    }

    private update(): void {
        this.layerSystem.update();
    }

    private render(): void {
        this.cameraSystem.render(this.renderer, this.scene);
    }

    private updateCursor(): void {
        const el = this.renderer.domElement;

        // Panning in progress (click-drag or spacebar hover-pan)
        if (this.isDragging || (this.isSpacePressed && this.spaceHoverPanInitialized)) {
            el.style.cursor = 'grabbing';
            return;
        }

        // Spacebar held but not moving yet
        if (this.isSpacePressed) {
            el.style.cursor = 'grab';
            return;
        }

        const activeTool = this.toolSystem.getActiveToolType();
        if (activeTool === 'scale-calibrate' || activeTool === 'measure') {
            // No crosshair anymore per user request
            el.style.cursor = 'none';
            return;
        }

        el.style.cursor = 'none';
    }

    public on(event: string, callback: Function): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)?.push(callback);
    }

    public off(event: string, callback: Function): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            this.eventListeners.set(event, listeners.filter(cb => cb !== callback));
        }
    }

    public emit(event: string, data: any): void {
        if (event === 'layers-changed') {
            console.trace(`[FloorPlanEditor] Emitting 'layers-changed'`);
            // remoteDebug(`[FloorPlanEditor] Emitting 'layers-changed'`, 'FloorPlanEditor', { event });
        }
        this.eventListeners.get(event)?.forEach(cb => cb(data));
    }

    public dispose(): void {
        this.container.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        this.renderer.dispose();
        // remove dom element
        if (this.container && this.renderer.domElement.parentElement === this.container) {
            this.container.removeChild(this.renderer.domElement);
        }
    }
}
