import * as THREE from 'three';
import { CameraState, Vector2 } from '../models/types';
import { screenToWorld, worldToScreen } from '../utils/math';

export class CameraSystem {
    public mainCamera: THREE.OrthographicCamera;
    public zoomCamera: THREE.OrthographicCamera;

    private viewportWidth: number = 0;
    private viewportHeight: number = 0;

    private state: CameraState = {
        position: { x: 0, y: 0 },
        zoom: 1,
        zoomCursorEnabled: true,
        zoomCursorMagnification: 2,
        zoomCursorSize: 250
    };

    private lastMousePos: Vector2 = { x: 0, y: 0 };

    constructor(width: number, height: number) {
        this.viewportWidth = width;
        this.viewportHeight = height;

        // Main Camera: Inverted Y (top=height, bottom=0)
        this.mainCamera = new THREE.OrthographicCamera(
            0, width,
            height, 0,
            0.1, 1000
        );
        this.mainCamera.position.set(0, 0, 500);
        this.mainCamera.updateProjectionMatrix();

        // Zoom Camera
        const zSize = this.state.zoomCursorSize;
        this.zoomCamera = new THREE.OrthographicCamera(
            0, zSize,
            zSize, 0,
            0.1, 1000
        );
        this.zoomCamera.position.z = 500;
    }

    public resize(width: number, height: number): void {
        const oldWidth = this.viewportWidth;
        const oldHeight = this.viewportHeight;

        this.viewportWidth = width;
        this.viewportHeight = height;

        // Update main camera bounds while preserving world center and zoom
        const widthDelta = width - oldWidth;
        const heightDelta = height - oldHeight;

        this.mainCamera.right = this.mainCamera.left + width / this.state.zoom;
        this.mainCamera.top = this.mainCamera.bottom + height / this.state.zoom;

        this.mainCamera.updateProjectionMatrix();
    }

    public pan(deltaX: number, deltaY: number): void {
        // Delta is in screen pixels, convert to world units
        const worldDeltaX = deltaX / this.state.zoom;
        const worldDeltaY = deltaY / this.state.zoom;

        this.mainCamera.left -= worldDeltaX;
        this.mainCamera.right -= worldDeltaX;
        this.mainCamera.top += worldDeltaY; // Y is inverted in screen space vs world
        this.mainCamera.bottom += worldDeltaY;

        this.mainCamera.updateProjectionMatrix();
        this.updateZoomCamera();
    }

    public zoom(delta: number, centerX: number, centerY: number): void {
        const zoomSpeed = 0.002;
        const factor = Math.pow(1.1, -delta * zoomSpeed);
        const oldZoom = this.state.zoom;
        const newZoom = Math.max(0.01, Math.min(100, oldZoom * factor));

        if (oldZoom === newZoom) return;

        // World position of the zoom center before zoom change
        const worldCenter = this.screenToWorld(centerX, centerY);

        this.state.zoom = newZoom;

        // Adjust camera bounds to keep worldCenter at the same screen position
        // Screen width in world units = viewportWidth / zoom
        const halfWidth = (this.viewportWidth / newZoom) * (centerX / this.viewportWidth);
        const halfHeight = (this.viewportHeight / newZoom) * (1 - centerY / this.viewportHeight);

        this.mainCamera.left = worldCenter.x - halfWidth;
        this.mainCamera.right = this.mainCamera.left + (this.viewportWidth / newZoom);
        this.mainCamera.bottom = worldCenter.y - halfHeight;
        this.mainCamera.top = this.mainCamera.bottom + (this.viewportHeight / newZoom);

        this.mainCamera.updateProjectionMatrix();
        this.updateZoomCamera();
    }

    public updateZoomCursor(screenX: number, screenY: number): void {
        this.lastMousePos = { x: screenX, y: screenY };
        this.updateZoomCamera();
    }

    private updateZoomCamera(): void {
        const { x, y } = this.lastMousePos;
        const worldPos = this.screenToWorld(x, y);

        // Zoom camera view size affected by magnification
        const viewSize = this.state.zoomCursorSize / (this.state.zoomCursorMagnification * this.state.zoom);

        this.zoomCamera.left = worldPos.x - viewSize / 2;
        this.zoomCamera.right = worldPos.x + viewSize / 2;
        this.zoomCamera.top = worldPos.y + viewSize / 2;
        this.zoomCamera.bottom = worldPos.y - viewSize / 2;
        this.zoomCamera.updateProjectionMatrix();
    }

    public screenToWorld(sx: number, sy: number): Vector2 {
        const width = this.mainCamera.right - this.mainCamera.left;
        const height = this.mainCamera.top - this.mainCamera.bottom;

        const normalizedX = sx / this.viewportWidth;
        const normalizedY = sy / this.viewportHeight;

        const worldX = this.mainCamera.left + width * normalizedX;
        const worldY = this.mainCamera.top - height * normalizedY;

        return { x: worldX, y: worldY };
    }

    public worldToScreen(wx: number, wy: number): Vector2 {
        const width = this.mainCamera.right - this.mainCamera.left;
        const height = this.mainCamera.top - this.mainCamera.bottom;

        const normalizedX = (wx - this.mainCamera.left) / width;
        const normalizedY = (this.mainCamera.top - wy) / height;

        return {
            x: normalizedX * this.viewportWidth,
            y: normalizedY * this.viewportHeight
        };
    }

    public render(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
        renderer.clear();

        // Main viewport
        renderer.setViewport(0, 0, this.viewportWidth, this.viewportHeight);
        renderer.setScissor(0, 0, this.viewportWidth, this.viewportHeight);
        renderer.setScissorTest(true);
        renderer.clearDepth();
        renderer.render(scene, this.mainCamera);

        // Zoom cursor viewport
        if (this.state.zoomCursorEnabled) {
            const size = this.state.zoomCursorSize;
            const x = Math.max(0, Math.min(this.viewportWidth - size, this.lastMousePos.x - size / 2));
            const y = Math.max(0, Math.min(this.viewportHeight - size, this.viewportHeight - this.lastMousePos.y - size / 2));

            renderer.setViewport(x, y, size, size);
            renderer.setScissor(x, y, size, size);
            renderer.clearDepth();
            renderer.render(scene, this.zoomCamera);
        }

        renderer.setScissorTest(false);
    }
}
