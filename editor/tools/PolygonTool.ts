import * as THREE from 'three';
import { Tool } from '../systems/ToolSystem';
import { ToolType, Vector2, Polygon, Room, Mask, VectorLayerContent } from '../models/types';
import { FloorPlanEditor } from '../FloorPlanEditor';
import { AddPolygonCommand } from '../commands/AddPolygonCommand';
import { DeletePolygonCommand } from '../commands/DeletePolygonCommand';

export class PolygonTool implements Tool {
    public type: ToolType;
    private editor: FloorPlanEditor;
    private points: Vector2[] = [];
    private previewGroup: THREE.Group;
    private currentMousePos: Vector2 | null = null;

    // Optimization: Reuse objects
    private lineGeometry: THREE.BufferGeometry;
    private lineMaterial: THREE.LineBasicMaterial;
    private lineMesh: THREE.Line;
    private shadowLineGeometry: THREE.BufferGeometry;
    private shadowLineMaterial: THREE.LineBasicMaterial;
    private shadowLineMeshes: THREE.Line[] = [];
    private vertexPool: THREE.Sprite[] = [];
    private shadowVertexPool: THREE.Sprite[] = [];
    private vertexMaterial: THREE.SpriteMaterial;
    private firstVertexMaterial: THREE.SpriteMaterial;
    private shadowVertexMaterial: THREE.SpriteMaterial;

    private snapThreshold = 30; // Increased for better UX

    constructor(editor: FloorPlanEditor, type: ToolType) {
        this.editor = editor;
        this.type = type;
        this.previewGroup = new THREE.Group();
        this.previewGroup.name = `polygon-preview-${type}`;
        this.editor.scene.add(this.previewGroup);

        // Pre-initialize reusable objects
        const loader = new THREE.TextureLoader();
        const glowTexture = loader.load('/assets/glow-circle.png');

        this.lineGeometry = new THREE.BufferGeometry();
        this.lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 });
        this.lineMesh = new THREE.Line(this.lineGeometry, this.lineMaterial);
        this.lineMesh.position.z = 100.6;

        this.shadowLineGeometry = new THREE.BufferGeometry();
        this.shadowLineMaterial = new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.2 }); // Softer

        this.shadowLineMeshes = [];
        const offsets = [{ x: 2, y: 0 }, { x: -2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 }, { x: 1.4, y: 1.4 }, { x: -1.4, y: -1.4 }, { x: 0, y: 0 }];
        offsets.forEach(() => {
            const mesh = new THREE.Line(this.shadowLineGeometry, this.shadowLineMaterial);
            mesh.position.z = 100.4;
            this.shadowLineMeshes.push(mesh);
        });

        this.vertexMaterial = new THREE.SpriteMaterial({ map: glowTexture, color: 0xffffff, transparent: true, opacity: 1.0 });
        this.firstVertexMaterial = new THREE.SpriteMaterial({ map: glowTexture, color: 0x22c55e, transparent: true, opacity: 1.0 });
        this.shadowVertexMaterial = new THREE.SpriteMaterial({ map: glowTexture, color: 0x000000, transparent: true, opacity: 0.5 });
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
        this.updatePreview();
    }

    public onMouseDown(x: number, y: number, event: MouseEvent): void {
        if (event.button !== 0) return; // Left click only

        // 1. Contextual Selection: If user clicks an existing polygon, select it instead of adding vertex
        // We only do this if we haven't started drawing yet (or if drawing, maybe we still want to select?)
        // User said "instead of adding anew vertex", implies even if drawing it might switch.
        // But if drawing, normally clicks add vertices. Let's say if clicks in empty space -> add vertex.
        // If clicks in polygon -> select.

        const isMulti = event.shiftKey || event.ctrlKey || event.metaKey;
        const selectedIds = this.editor.selectionSystem.selectAt(x, y, isMulti);

        if (selectedIds.length > 0) {
            // Something was selected!
            this.editor.emit('selection-changed', selectedIds);
            // Mark vector layers dirty to update colors
            this.editor.layerSystem.markDirty('room');
            this.editor.layerSystem.markDirty('mask');
            this.editor.setDirty();

            // Auto-switch to Select Tool to enable editing (dragging vertices)
            // Only if we are not currently drawing a new polygon
            if (this.points.length === 0) {
                this.editor.setActiveTool('select');
            }

            return; // EXIT: Don't add vertex if we selected something
        }

        const worldPos = this.editor.cameraSystem.screenToWorld(x, y);

        // Check for snapping to first point (close polygon)
        if (this.points.length >= 3) {
            const firstPoint = this.points[0];
            const dist = Math.sqrt(Math.pow(worldPos.x - firstPoint.x, 2) + Math.pow(worldPos.y - firstPoint.y, 2));
            if (dist < this.snapThreshold) {
                this.finishPolygon();
                return;
            }
        }

        this.points.push(worldPos);
        this.updatePreview();
    }

    public onMouseMove(x: number, y: number, event: MouseEvent): void {
        this.currentMousePos = this.editor.cameraSystem.screenToWorld(x, y);
        this.updatePreview();
    }

    public onKeyDown(key: string, event: KeyboardEvent): void {
        if (key === 'Enter' && this.points.length >= 2) {
            // Include current mouse position as the last point if we have enough points
            if (this.currentMousePos) {
                this.points.push(this.currentMousePos);
            }
            if (this.points.length >= 3) {
                this.finishPolygon();
            }
        } else if (key === 'Escape') {
            if (this.points.length > 0) {
                // Escape: Undo last vertex
                this.points.pop();
                this.updatePreview();
            } else {
                // Clear selection if not drawing
                this.editor.selectionSystem.clearSelection();
                this.editor.emit('selection-changed', []);
                this.editor.layerSystem.markDirty('room');
                this.editor.layerSystem.markDirty('mask');
                this.editor.setDirty();
            }
        } else if (key === 'Backspace' || key === 'Delete') {
            if (this.points.length > 0) {
                // Delete: Cancel entire run
                this.reset();
            } else {
                // Delete selected polygons
                this.deleteSelected();
            }
        }
    }

    private deleteSelected(): void {
        const selectedIds = this.editor.selectionSystem.getSelectedIds();
        if (selectedIds.length === 0) return;

        selectedIds.forEach(id => {
            const layers = this.editor.layerSystem.getAllLayers();
            for (const layer of layers) {
                if (layer.type !== 'vector') continue;
                const content = layer.content as VectorLayerContent;
                const room = (content.rooms || []).find(r => r.id === id);
                const mask = (content.masks || []).find(m => m.id === id);
                const poly = room || mask;

                if (poly) {
                    const command = new DeletePolygonCommand(layer.id, poly, this.editor.layerSystem);
                    this.editor.commandManager.execute(command);
                    this.editor.selectionSystem.clearSelection();
                    this.editor.emit('selection-changed', []);
                    this.editor.emit('layers-changed', this.editor.layerSystem.getAllLayers());
                    this.editor.setDirty();
                    break;
                }
            }
        });
    }

    private updatePreview(): void {
        this.previewGroup.clear();
        if (this.points.length === 0) return;

        const allPoints = [...this.points];
        if (this.currentMousePos) {
            allPoints.push(this.currentMousePos);
        }

        const shadowOffset = 0; // Centered glow for preview

        // 1. Update Line Geometries
        if (allPoints.length >= 2) {
            const positions = new Float32Array(allPoints.length * 3);
            const shadowPositions = new Float32Array(allPoints.length * 3);

            allPoints.forEach((p, i) => {
                positions[i * 3] = p.x;
                positions[i * 3 + 1] = p.y;
                positions[i * 3 + 2] = 0;

                shadowPositions[i * 3] = p.x;
                shadowPositions[i * 3 + 1] = p.y;
                shadowPositions[i * 3 + 2] = 0;
            });

            this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            this.shadowLineGeometry.setAttribute('position', new THREE.BufferAttribute(shadowPositions, 3));

            this.previewGroup.add(this.lineMesh);
            const offsets = [{ x: 2, y: 0 }, { x: -2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 }, { x: 1.4, y: 1.4 }, { x: -1.4, y: -1.4 }, { x: 0, y: 0 }];
            this.shadowLineMeshes.forEach((mesh, idx) => {
                if (offsets[idx]) {
                    mesh.position.set(offsets[idx].x, offsets[idx].y, 100.4);
                    this.previewGroup.add(mesh);
                }
            });
        }

        // 2. Update Vertices (using pool)
        allPoints.forEach((p, i) => {
            const isFirst = i === 0 && this.points.length >= 3;

            // Get or create vertex sprite
            let vertex = this.vertexPool[i];
            if (!vertex) {
                vertex = new THREE.Sprite(this.vertexMaterial);
                this.vertexPool[i] = vertex;
            }
            vertex.material = isFirst ? this.firstVertexMaterial : this.vertexMaterial;
            vertex.scale.set(isFirst ? 20 : 12, isFirst ? 20 : 12, 1);
            vertex.position.set(p.x, p.y, 101);
            this.previewGroup.add(vertex);

            // Get or create shadow vertex sprite
            let shadowVertex = this.shadowVertexPool[i];
            if (!shadowVertex) {
                shadowVertex = new THREE.Sprite(this.shadowVertexMaterial);
                this.shadowVertexPool[i] = shadowVertex;
            }
            shadowVertex.scale.set(isFirst ? 24 : 16, isFirst ? 24 : 16, 1);
            shadowVertex.position.set(p.x, p.y, 100.5); // Centered
            this.previewGroup.add(shadowVertex);
        });

        this.editor.setDirty();
    }

    private finishPolygon(): void {
        const id = Math.random().toString(36).substring(7);
        const layerId = this.type === 'draw-room' ? 'room' : 'mask';

        let poly: Polygon;

        if (this.type === 'draw-room') {
            poly = {
                id,
                points: [...this.points],
                name: '',
                roomType: 'other'
            } as Room;

            // Emit event to enter room naming mode
            this.editor.emit('room-completion-pending', poly);
        } else {
            poly = {
                id,
                points: [...this.points]
            } as Mask;

            const command = new AddPolygonCommand(layerId, poly, this.editor.layerSystem);
            this.editor.commandManager.execute(command);
            this.editor.emit('layers-changed', this.editor.layerSystem.getAllLayers());
        }

        this.reset();
        console.timeEnd('[PolygonTool] finishPolygon');
    }
}
