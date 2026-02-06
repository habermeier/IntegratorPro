import * as THREE from 'three';
import { Tool } from '../systems/ToolSystem';
import { ToolType, Vector2 } from '../models/types';
import { FloorPlanEditor } from '../FloorPlanEditor';

export class ScaleCalibrateTool implements Tool {
    public type: ToolType = 'scale-calibrate';
    private editor: FloorPlanEditor;
    private points: Vector2[] = [];
    private markerGroup: THREE.Group;
    private previewGroup: THREE.Group;
    private lineGeometry: THREE.BufferGeometry;
    private lineMaterial: THREE.LineBasicMaterial;
    private lineMesh: THREE.Line;
    private vertexMaterial: THREE.SpriteMaterial;

    constructor(editor: FloorPlanEditor) {
        this.editor = editor;
        this.markerGroup = new THREE.Group();
        this.markerGroup.name = 'scale-calibrate-markers';
        this.editor.scene.add(this.markerGroup);

        this.previewGroup = new THREE.Group();
        this.previewGroup.name = 'scale-calibrate-preview';
        this.editor.scene.add(this.previewGroup);

        const loader = new THREE.TextureLoader();
        const glowTexture = loader.load('/assets/glow-circle.png');

        this.lineGeometry = new THREE.BufferGeometry();
        this.lineMaterial = new THREE.LineBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 1.0,
            depthTest: false
        });
        this.lineMesh = new THREE.Line(this.lineGeometry, this.lineMaterial);
        this.lineMesh.renderOrder = 9999;
        this.lineMesh.frustumCulled = false;
        this.lineMesh.layers.enable(31);
        this.lineMesh.visible = false;
        this.previewGroup.add(this.lineMesh);

        this.vertexMaterial = new THREE.SpriteMaterial({
            map: glowTexture,
            color: 0x22c55e, // emerald-500
            transparent: true,
            opacity: 1.0,
            depthTest: false
        });
    }

    public activate(): void {
        this.points = [];
        this.markerGroup.clear();
        this.markerGroup.visible = true;
        this.previewGroup.visible = true;
        this.lineMesh.visible = false;
    }

    public deactivate(): void {
        this.markerGroup.visible = false;
        this.previewGroup.visible = false;
        this.lineMesh.visible = false;
    }

    public onMouseDown(x: number, y: number, event: MouseEvent): void {
        if (event.button !== 0) return; // Left click only

        const worldPos = this.editor.cameraSystem.screenToWorld(x, y);
        this.points.push(worldPos);

        this.addPointMarker(worldPos);

        if (this.points.length === 2) {
            this.finishCalibration();
        } else {
            this.lineMesh.visible = true;
            this.updatePreview(worldPos);
        }

        this.editor.setDirty();
    }

    public onKeyDown(key: string, event: KeyboardEvent): void {
        if (key === 'Escape' && this.points.length === 1) {
            this.points = [];
            this.markerGroup.clear();
            this.lineMesh.visible = false;
            this.editor.setDirty();
            return;
        }
    }

    public onMouseMove(x: number, y: number, event: MouseEvent): void {
        if (this.points.length === 1) {
            const worldPos = this.editor.cameraSystem.screenToWorld(x, y);
            this.updatePreview(worldPos);
            this.editor.setNeedsRender();
        }
    }

    private updatePreview(mouseWorld: Vector2): void {
        if (this.points.length === 0) return;

        const start = this.points[0];
        const positions = new Float32Array([
            start.x, start.y, 100.2,
            mouseWorld.x, mouseWorld.y, 100.2
        ]);
        this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.lineGeometry.attributes.position.needsUpdate = true;
    }

    private addPointMarker(pos: Vector2): void {
        const sprite = new THREE.Sprite(this.vertexMaterial);
        sprite.scale.set(12, 12, 1);
        sprite.position.set(pos.x, pos.y, 100.5);
        sprite.renderOrder = 10000;
        sprite.frustumCulled = false;
        sprite.layers.enable(31);
        this.markerGroup.add(sprite);
    }

    private finishCalibration(): void {
        const p1 = this.points[0];
        const p2 = this.points[1];
        const pixelDist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

        console.log(`ScaleCalibrateTool: Emitting calibration-needed with pixelDist: ${pixelDist}`);
        this.editor.emit('calibration-needed', { pixelDist });
        this.points = [];
        this.markerGroup.clear();
        this.lineMesh.visible = false;
        this.editor.setDirty();
    }
}
