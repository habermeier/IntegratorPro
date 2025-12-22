import * as THREE from 'three';
import { Tool } from '../systems/ToolSystem';
import { ToolType, Vector2, Cable, VectorLayerContent } from '../models/types';
import { FloorPlanEditor } from '../FloorPlanEditor';
import { AddCableCommand } from '../commands/AddCableCommand';

export class DrawCableTool implements Tool {
    public type: ToolType = 'draw-cable';
    private editor: FloorPlanEditor;
    private points: Vector2[] = [];
    private previewGroup: THREE.Group;
    private currentMousePos: Vector2 | null = null;
    private lastClickTime: number = 0;
    private cableType: string = 'Cat6';

    // Rendering materials
    private lineGeometry: THREE.BufferGeometry;
    private lineMaterial: THREE.LineBasicMaterial;
    private lineMesh: THREE.Line;
    private vertexPool: THREE.Sprite[] = [];
    private vertexMaterial: THREE.SpriteMaterial;

    constructor(editor: FloorPlanEditor) {
        this.editor = editor;
        this.previewGroup = new THREE.Group();
        this.previewGroup.name = 'cable-preview';
        this.editor.scene.add(this.previewGroup);

        // Pre-initialize reusable objects
        const loader = new THREE.TextureLoader();
        const glowTexture = loader.load('/assets/glow-circle.png');

        this.lineGeometry = new THREE.BufferGeometry();
        this.lineMaterial = new THREE.LineBasicMaterial({
            color: 0x000000, // Black for cables
            transparent: true,
            opacity: 1.0,
            depthTest: false
        });
        this.lineMesh = new THREE.Line(this.lineGeometry, this.lineMaterial);
        this.lineMesh.position.z = 100.6;
        this.lineMesh.renderOrder = 9999;
        this.lineMesh.frustumCulled = false;

        this.vertexMaterial = new THREE.SpriteMaterial({
            map: glowTexture,
            color: 0x0000ff, // Blue vertices
            transparent: true,
            opacity: 1.0,
            depthTest: false
        });
    }

    public activate(): void {
        this.reset();
        this.previewGroup.visible = true;
    }

    public deactivate(): void {
        this.reset();
        this.previewGroup.visible = false;
    }

    private reset(): void {
        this.points = [];
        this.currentMousePos = null;
        this.lastClickTime = 0;
        this.updatePreview();
    }

    public setCableType(type: string): void {
        this.cableType = type;
    }

    public onMouseDown(x: number, y: number, event: MouseEvent): void {
        const now = Date.now();
        const timeSinceLastClick = now - this.lastClickTime;

        // Right-click: Undo last vertex
        if (event.button === 2) {
            event.preventDefault();
            if (this.points.length > 0) {
                this.points.pop();
                this.updatePreview();
            }
            return;
        }

        // Left-click only from here
        if (event.button !== 0) return;

        const worldPos = this.editor.cameraSystem.screenToWorld(x, y);

        // Double-click detection (within 300ms)
        if (timeSinceLastClick < 300 && this.points.length >= 2) {
            // Don't add this click as a point, just finalize
            this.finalizeCable();
            return;
        }

        // Add point
        this.points.push(worldPos);
        this.lastClickTime = now;
        this.updatePreview();
    }

    public onMouseMove(x: number, y: number, event: MouseEvent): void {
        const worldPos = this.editor.cameraSystem.screenToWorld(x, y);
        this.currentMousePos = worldPos;
        this.updatePreview();
    }

    public onMouseUp(x: number, y: number, event: MouseEvent): void {
        // Not needed for cable drawing
    }

    public onKeyDown(key: string, event: KeyboardEvent): void {
        if (key === 'Enter' && this.points.length >= 2) {
            // Include current mouse position as the last point
            if (this.currentMousePos) {
                this.points.push(this.currentMousePos);
            }
            this.finalizeCable();
        } else if (key === 'Escape') {
            if (this.points.length > 0) {
                // Undo last vertex
                this.points.pop();
                this.updatePreview();
            }
        } else if (key === 'Backspace' || key === 'Delete') {
            // Cancel entire cable
            this.reset();
        }
    }

    private updatePreview(): void {
        this.previewGroup.clear();
        if (this.points.length === 0) return;

        const allPoints = [...this.points];
        if (this.currentMousePos && this.points.length > 0) {
            allPoints.push(this.currentMousePos);
        }

        // Render line
        if (allPoints.length >= 2) {
            const positions = new Float32Array(allPoints.length * 3);

            allPoints.forEach((p, i) => {
                positions[i * 3] = p.x;
                positions[i * 3 + 1] = p.y;
                positions[i * 3 + 2] = 0;
            });

            this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            this.previewGroup.add(this.lineMesh);
        }

        // Render vertices
        allPoints.forEach((p, i) => {
            let vertex = this.vertexPool[i];
            if (!vertex) {
                vertex = new THREE.Sprite(this.vertexMaterial);
                this.vertexPool[i] = vertex;
            }
            vertex.scale.set(12, 12, 1);
            vertex.position.set(p.x, p.y, 101);
            vertex.frustumCulled = false;

            this.previewGroup.add(vertex);
        });

        this.editor.setDirty();
    }

    private finalizeCable(): void {
        if (this.points.length < 2) {
            console.warn('[DrawCableTool] Cannot finalize cable: < 2 points');
            return;
        }

        const id = Math.random().toString(36).substring(7);
        const cable: Cable = {
            id,
            points: [...this.points],
            cableType: this.cableType,
            color: '#000000', // Black
            label: ''
        };

        // Get or create cables layer
        let cablesLayer = this.editor.layerSystem.getLayer('cables');
        if (!cablesLayer) {
            console.warn('[DrawCableTool] Cables layer not found, cannot save cable');
            this.reset();
            return;
        }

        const command = new AddCableCommand('cables', cable, this.editor.layerSystem);
        this.editor.commandManager.execute(command);
        this.editor.emit('layers-changed', this.editor.layerSystem.getAllLayers());
        this.editor.setDirty();

        this.reset();
        console.log('[DrawCableTool] Cable finalized:', cable);
    }
}
