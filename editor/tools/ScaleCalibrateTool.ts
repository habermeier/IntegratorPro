import * as THREE from 'three';
import { Tool } from '../systems/ToolSystem';
import { ToolType, Vector2 } from '../models/types';
import { FloorPlanEditor } from '../FloorPlanEditor';

export class ScaleCalibrateTool implements Tool {
    public type: ToolType = 'scale-calibrate';
    private editor: FloorPlanEditor;
    private points: Vector2[] = [];
    private markerGroup: THREE.Group;

    constructor(editor: FloorPlanEditor) {
        this.editor = editor;
        this.markerGroup = new THREE.Group();
        this.markerGroup.name = 'scale-calibrate-markers';
        this.editor.scene.add(this.markerGroup);
    }

    public activate(): void {
        this.points = [];
        this.markerGroup.clear();
        this.markerGroup.visible = true;
    }

    public deactivate(): void {
        this.markerGroup.visible = false;
    }

    public onMouseDown(x: number, y: number, event: MouseEvent): void {
        if (event.button !== 0) return; // Left click only

        console.log(`ScaleCalibrateTool: Mouse down at ${x}, ${y}`);
        const worldPos = this.editor.cameraSystem.screenToWorld(x, y);
        console.log(`ScaleCalibrateTool: World position: ${worldPos.x}, ${worldPos.y}`);
        this.points.push(worldPos);

        this.addPointMarker(worldPos);

        if (this.points.length === 2) {
            console.log('ScaleCalibrateTool: Finishing calibration');
            this.finishCalibration();
        }
    }

    private addPointMarker(pos: Vector2): void {
        const geometry = new THREE.CircleGeometry(5, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0x22c55e }); // emerald-500
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(pos.x, pos.y, 100); // On top of everything
        this.markerGroup.add(mesh);
    }

    private finishCalibration(): void {
        const p1 = this.points[0];
        const p2 = this.points[1];
        const pixelDist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

        console.log(`ScaleCalibrateTool: Emitting calibration-needed with pixelDist: ${pixelDist}`);
        this.editor.emit('calibration-needed', { pixelDist });
        this.points = [];
        this.markerGroup.clear();
    }
}
