import * as THREE from 'three';
import { LayerSystem } from './systems/LayerSystem';
import { CameraSystem } from './systems/CameraSystem';
import { LayerConfig, ToolType, Transform } from './models/types';
import { ToolSystem } from './systems/ToolSystem';
import { ScaleCalibrateTool } from './tools/ScaleCalibrateTool';
import { SelectTool } from './tools/SelectTool';
import { CommandManager } from './systems/CommandManager';
import { SelectionSystem } from './systems/SelectionSystem';
import { OpacityCommand } from './commands/OpacityCommand';
import { TransformLayerCommand } from './commands/TransformLayerCommand';
import { PolygonTool } from './tools/PolygonTool';
import { PlaceSymbolTool } from './tools/PlaceSymbolTool';
export class FloorPlanEditor {
    public scene: THREE.Scene;
    private renderer: THREE.WebGLRenderer;
    private container: HTMLElement;

    public layerSystem: LayerSystem;
    public cameraSystem: CameraSystem;
    public toolSystem: ToolSystem;
    public commandManager: CommandManager;
    public selectionSystem: SelectionSystem;

    private isEditMode: boolean = false;
    private activeLayerId: string | null = null;
    private isSpacePressed: boolean = false;
    private isAltPressed: boolean = false;
    private needsRender: boolean = true;

    // Panning State
    private isDragging: boolean = false;
    // private dragStartX: number = 0;
    // private dragStartY: number = 0;
    private lastX: number = 0;
    private lastY: number = 0;

    private animationFrameId: number | null = null;
    private eventListeners: Map<string, Function[]> = new Map();
    private preMaskVisibility: Map<string, boolean> = new Map();
    private STORAGE_KEY = 'integrator-pro-editor-state';

    public get editMode(): boolean {
        return this.isEditMode;
    }

    constructor(container: HTMLElement) {
        const editorId = Math.random().toString(36).substring(7);
        console.log(`[FloorPlanEditor] Initializing new instance: ${editorId}`);
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

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
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
        this.selectionSystem = new SelectionSystem(this.cameraSystem, this.layerSystem);

        // Register Tools
        this.toolSystem.registerTool(new ScaleCalibrateTool(this));
        this.toolSystem.registerTool(new SelectTool(this));
        this.toolSystem.registerTool(new PolygonTool(this, 'draw-room'));
        this.toolSystem.registerTool(new PolygonTool(this, 'draw-mask'));
        this.toolSystem.registerTool(new PlaceSymbolTool(this));
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
            isEditMode: this.isEditMode,
            visibility,
            preMaskVisibility: Object.fromEntries(this.preMaskVisibility),
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
                Object.entries(state.visibility as Record<string, boolean>).forEach(([id, visible]) => {
                    this.layerSystem.setLayerVisible(id, visible);
                });
            }

            // 2. Restore Pre-Mask Visibility Map
            if (state.preMaskVisibility) {
                this.preMaskVisibility = new Map(Object.entries(state.preMaskVisibility));
            }

            // 3. Restore Metadata
            this.isEditMode = !!state.isEditMode;
            this.activeLayerId = state.activeLayerId || null;

            // 4. Restore Tool (Triggers side effects)
            if (state.activeTool) {
                this.setActiveTool(state.activeTool as ToolType);
            }

            // 5. Restore Camera State
            if (state.camera) {
                this.cameraSystem.setState(state.camera);
                this.layerSystem.updateLabelScales(state.camera.zoom);
            }

            this.emit('layers-changed', this.layerSystem.getAllLayers());
            this.emit('edit-mode-changed', { isEditMode: this.isEditMode, activeLayerId: this.activeLayerId });
        } catch (err) {
            console.error('[FloorPlanEditor] Failed to load persistent state:', err);
        }
    }

    private handleKeyDown = (e: KeyboardEvent) => {
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
        const repeatableKeys = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'z', 'y'];
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

        // Edit Mode Toggle (Skip repeats)
        if (!e.repeat && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
            e.preventDefault();
            this.toggleEditMode();
            this.setDirty();
        }

        // Arrow Key Scooting / Scaling / Rotation
        if (this.isEditMode && this.activeLayerId) {
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
                case 'r': this.setActiveTool('draw-room'); break;
                case 'm': this.setActiveTool('draw-mask'); break;
                case 'p': this.setActiveTool('place-symbol'); break;
                case 's': this.setActiveTool('scale-calibrate'); break;
                case 'd': this.setActiveTool('measure'); break;
            }
        }

        // Alt Key tracking
        if (e.altKey) {
            e.preventDefault(); // Suppress browser menu (Chrome/Linux/Windows)
            if (!this.isAltPressed) {
                this.isAltPressed = true;
                this.emit('modifier-changed', { isAltPressed: true });
            }
        }

        this.toolSystem.handleKeyDown(e.key, e);
        this.emit('keydown', e.key);
    };

    private handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            this.isSpacePressed = false;
            this.updateCursor();
            this.emit('panning-changed', false);
        }

        if (!e.altKey && this.isAltPressed) {
            this.isAltPressed = false;
            this.emit('modifier-changed', { isAltPressed: false });
        }
    };

    private handleResize = () => {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.renderer.setSize(width, height);
        this.cameraSystem.resize(width, height);
        this.setDirty();
    };

    private setupEventListeners(): void {
        const el = this.renderer.domElement;
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;

        el.addEventListener('mousedown', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const isPanInput = e.button === 1 || (e.button === 0 && (e.shiftKey || this.isSpacePressed));

            if (isPanInput) {
                isDragging = true;
                lastX = e.clientX;
                lastY = e.clientY;
                this.updateCursor();
                this.setDirty();
            } else {
                this.toolSystem.handleMouseDown(x, y, e);
                this.setDirty();
            }
        });

        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (isDragging) {
                const deltaX = e.clientX - lastX;
                const deltaY = e.clientY - lastY;
                this.cameraSystem.pan(deltaX, deltaY);
                lastX = e.clientX;
                lastY = e.clientY;
                this.setDirty();
            } else {
                this.toolSystem.handleMouseMove(x, y, e);
                // Mouse move tool handles might need render
                if (this.toolSystem.getActiveToolType() === 'scale-calibrate') {
                    this.setDirty();
                }
            }

            this.cameraSystem.updateZoomCursor(x, y);
            this.setDirty(); // Zoom cursor follows mouse, must re-render
            this.emit('cursor-move', { x, y });
        });

        el.addEventListener('mouseup', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (isDragging) {
                isDragging = false;
                this.updateCursor();
                this.setDirty();
            } else {
                this.toolSystem.handleMouseUp(x, y, e);
                this.setDirty();
            }
        });

        el.addEventListener('mouseleave', () => {
            isDragging = false;
            el.style.cursor = 'default';
        });
        this.container.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mouseup', this.handleMouseUp);
        this.container.addEventListener('dblclick', this.handleDoubleClick);
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        this.container.addEventListener('wheel', this.handleWheel, { passive: false });
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

    private handleMouseMove = (e: MouseEvent) => {
        // We need coords relative to container even if mouse is outside (for drag)
        // ensure rect is valid
        if (!this.container) return;
        const { x, y } = this.getMouseCoords(e);

        if (this.isDragging) {
            const deltaX = e.clientX - this.lastX;
            const deltaY = e.clientY - this.lastY;
            this.cameraSystem.pan(deltaX, deltaY);
            this.lastX = e.clientX;
            this.lastY = e.clientY;
            this.setDirty();
        } else {
            this.toolSystem.handleMouseMove(x, y, e);
            // Mouse move tool handles might need render
            if (this.toolSystem.getActiveToolType() === 'scale-calibrate') {
                this.setDirty();
            }
        }

        // Update Spacebar Panning cursor
        if (this.isSpacePressed) {
            // ...
        }

        this.cameraSystem.updateZoomCursor(x, y);
        this.setDirty(); // Zoom cursor follows mouse, must re-render
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
                console.log(`[FloorPlanEditor] Fallback Double Click: Edit Room via Label`, room.name);
                this.emit('room-edit-requested', room);
            }
        }
    };

    private saveTimeout: number | undefined;

    private handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const { x, y } = this.getMouseCoords(e);
        this.cameraSystem.zoom(e.deltaY, x, y);

        // Update label scales dynamically
        const newZoom = this.cameraSystem.getState().zoom;
        this.layerSystem.updateLabelScales(newZoom);

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
        this.setEditMode(!this.isEditMode);
    }

    public setEditMode(enabled: boolean): void {
        if (this.isEditMode === enabled) return;
        this.isEditMode = enabled;

        if (this.isEditMode) {
            this.container.focus();
            this.renderer.domElement.focus();
        }

        if (this.activeLayerId) {
            this.layerSystem.setLayerLocked(this.activeLayerId, !this.isEditMode);
        }

        this.updateFocusMode();
        this.savePersistentState();
        this.emit('mode-changed', this.isEditMode);
        this.emit('edit-mode-changed', { isEditMode: this.isEditMode, activeLayerId: this.activeLayerId });
        this.setDirty();
    }

    public setActiveLayer(id: string | null): void {
        // Clear previous state if any
        if (this.activeLayerId) {
            this.layerSystem.setLayerLocked(this.activeLayerId, true);
        }

        this.activeLayerId = id;

        // If in edit mode, apply new lock and tint
        if (this.isEditMode && id) {
            this.container.focus();
            this.layerSystem.setLayerLocked(id, false);
        }

        this.updateFocusMode();
        this.savePersistentState();
        this.emit('edit-mode-changed', { isEditMode: this.isEditMode, activeLayerId: this.activeLayerId });
        this.setDirty();
    }

    public addLayer(config: LayerConfig): void {
        this.layerSystem.addLayer({ ...config, locked: true }); // Default to locked
        this.emit('layers-changed', this.layerSystem.getAllLayers());
        this.setDirty();
    }

    public setLayerVisible(id: string, visible: boolean): void {
        this.layerSystem.setLayerVisible(id, visible);
        this.savePersistentState();
        this.emit('layers-changed', this.layerSystem.getAllLayers());
        this.setDirty();
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

    public setActiveTool(type: ToolType): void {
        this.toolSystem.setActiveTool(type);

        // Auto-activate Focus Mode for specific tools
        if (type === 'draw-mask') {
            this.activeLayerId = 'mask';
            this.isEditMode = true;
        } else if (type === 'draw-room') {
            this.activeLayerId = 'room';
            this.isEditMode = true;
        }

        this.updateFocusMode();
        this.savePersistentState();
        this.emit('tool-changed', type);
        this.emit('edit-mode-changed', { isEditMode: this.isEditMode, activeLayerId: this.activeLayerId });
        this.updateCursor();
        this.setDirty();
    }

    private updateFocusMode(): void {
        // Focus Mode is active if we have an active layer AND are in Edit Mode
        const isFocusActive = !!(this.activeLayerId && this.isEditMode);

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
                if (layer.id === 'base') {
                    this.layerSystem.setLayerVisible(layer.id, true); // Always show base
                } else if (layer.id === this.activeLayerId) {
                    this.layerSystem.setLayerVisible(layer.id, true); // Show target
                    this.layerSystem.setLayerLocked(layer.id, false); // Unlock target
                } else {
                    // Hide everything else (Room, Mask, Electrical, etc.)
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

            // Re-lock all layers
            this.layerSystem.getAllLayers().forEach(layer => {
                this.layerSystem.setLayerLocked(layer.id, true);
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
            }
        };
        animate();
    }

    public setDirty(): void {
        this.needsRender = true;
    }

    private update(): void {
        this.layerSystem.update();
    }

    private render(): void {
        this.cameraSystem.render(this.renderer, this.scene);
    }

    private updateCursor(): void {
        const el = this.renderer.domElement;

        // Manual drag in progress (Panning)
        // We check for actual dragging or just the spacebar intent
        if (this.isSpacePressed) {
            el.style.cursor = 'grab';
            // If mouse is down and we are dragging, it's grabbing
            // But 'isDragging' is local to setupEventListeners...
            // Let's rely on CSS and state for now.
            return;
        }

        if (this.toolSystem.getActiveToolType() === 'scale-calibrate') {
            el.style.cursor = 'crosshair';
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
