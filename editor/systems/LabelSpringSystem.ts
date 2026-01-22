import * as THREE from 'three';

/**
 * LabelSpringSystem handles physics-based collision avoidance for labels.
 * Hyper-stabilized version: Extreme damping, velocity caps, and timeout-based settling.
 */
export class LabelSpringSystem {
    private labels: THREE.Sprite[] = [];
    private obstacles: THREE.Object3D[] = [];

    private anchors: Map<string, THREE.Vector3> = new Map();
    private velocities: Map<string, THREE.Vector3> = new Map();

    // Physics Constants (HYPER-STABLE)
    private readonly K_REPEL_LABEL = 8;        // Reduced from 15
    private readonly K_REPEL_OBSTACLE = 40;    // Reduced from 180 (Preventing explosive overshoot)
    private readonly K_ATTRACT = 0.08;         // Slightly stronger to snap back efficiently
    private readonly DAMPING = 0.2;            // Extreme damping (80% energy loss per frame)
    private readonly MAX_VELOCITY = 10.0;      // Lower cap
    private readonly EPSILON = 0.2;            // Higher convergence threshold
    private readonly MIN_FORCE = 0.01;         // Ignore tiny forces

    private isActive: boolean = false;
    private isDirty: boolean = true;
    private lastZoom: number = -1;
    private activeFrames: number = 0;
    private readonly MAX_ACTIVE_FRAMES = 120; // Hard limit for any single "simulation run"

    // Temporal vectors to avoid GC pressure
    private _tempVecA = new THREE.Vector3();
    private _tempVecB = new THREE.Vector3();
    private _worldPos = new THREE.Vector3();
    private _otherWorldPos = new THREE.Vector3();
    private _anchorWorld = new THREE.Vector3();

    /**
     * Updates the physics for all visible labels.
     * @returns boolean true if the system is still computing/moving
     */
    public update(zoom: number, scene: THREE.Scene): boolean {
        // 1. Wake triggers
        const zoomDelta = Math.abs(zoom - this.lastZoom);
        if (zoomDelta > 0.01) {
            this.wakeUp();
            this.lastZoom = zoom;
        }

        if (this.isDirty) {
            this.syncElements(scene);
            this.isDirty = false;
        }

        // 2. Hard cutoff for stability
        if (!this.isActive || this.activeFrames > this.MAX_ACTIVE_FRAMES) {
            if (this.isActive) this.sleep();
            return false;
        }

        let totalMotion = 0;
        this.activeFrames++;

        const forces = new Map<string, THREE.Vector3>();

        // 3. Calculate Forces
        for (const label of this.labels) {
            const id = label.uuid;
            const force = new THREE.Vector3();

            label.updateMatrixWorld(true);
            label.getWorldPosition(this._worldPos);
            const anchorLocal = this.anchors.get(id);
            if (!anchorLocal || !label.parent) continue;

            this._anchorWorld.copy(anchorLocal);
            label.parent.localToWorld(this._anchorWorld);
            const toAnchor = this._tempVecA.copy(this._anchorWorld).sub(this._worldPos);
            toAnchor.z = 0;

            if (toAnchor.length() > 0.001) {
                force.add(toAnchor.multiplyScalar(this.K_ATTRACT));
            }

            for (const obstacle of this.obstacles) {
                obstacle.updateMatrixWorld(true);
                obstacle.getWorldPosition(this._otherWorldPos);
                const diff = this._tempVecB.copy(this._worldPos).sub(this._otherWorldPos);
                diff.z = 0;
                const distSq = diff.lengthSq();

                const obsBound = obstacle.scale.x * 12;
                const labelBound = label.scale.x * 0.5;
                const combinedRadius = (obsBound + labelBound) * 1.1; // Add 10% padding
                const minDistanceSq = combinedRadius * combinedRadius;

                if (distSq < minDistanceSq && distSq > 0.1) {
                    const repulsion = (minDistanceSq - distSq) / minDistanceSq;
                    force.add(diff.normalize().multiplyScalar(repulsion * this.K_REPEL_OBSTACLE));
                }
            }

            for (const other of this.labels) {
                if (label === other) continue;
                other.getWorldPosition(this._otherWorldPos);
                const diff = this._tempVecB.copy(this._worldPos).sub(this._otherWorldPos);
                diff.z = 0;
                const distSq = diff.lengthSq();
                const combinedRadius = (label.scale.x + other.scale.x) * 0.45;
                const minDistanceSq = combinedRadius * combinedRadius;

                if (distSq < minDistanceSq && distSq > 0.1) {
                    const repulsion = (minDistanceSq - distSq) / minDistanceSq;
                    force.add(diff.normalize().multiplyScalar(repulsion * this.K_REPEL_LABEL));
                }
            }
            forces.set(id, force);
        }

        // 4. Apply Forces and Integrate
        for (const label of this.labels) {
            const id = label.uuid;
            const force = forces.get(id);
            if (!force || !label.parent) continue;

            if (force.length() < this.MIN_FORCE) {
                this.velocities.get(id)?.set(0, 0, 0);
                continue;
            }

            const velocity = this.velocities.get(id) || new THREE.Vector3();
            velocity.add(force);

            if (velocity.length() > this.MAX_VELOCITY) {
                velocity.normalize().multiplyScalar(this.MAX_VELOCITY);
            }

            velocity.multiplyScalar(this.DAMPING);

            if (velocity.length() < this.EPSILON) {
                velocity.set(0, 0, 0);
            } else {
                label.getWorldPosition(this._worldPos);
                this._worldPos.add(velocity);
                label.position.copy(label.parent.worldToLocal(this._worldPos));
                totalMotion += velocity.length();
            }
            this.velocities.set(id, velocity);
        }

        this.isActive = totalMotion > (this.EPSILON * this.labels.length * 0.5);
        if (!this.isActive) this.sleep();

        return this.isActive;
    }

    public wakeUp(): void {
        this.isDirty = true;
        this.isActive = true;
        this.activeFrames = 0;
    }

    private sleep(): void {
        this.isActive = false;
        this.activeFrames = 0;
        this.velocities.clear();
    }

    public isMoving(): boolean {
        return this.isActive;
    }

    private syncElements(scene: THREE.Scene): void {
        const currentLabels: THREE.Sprite[] = [];
        const currentObstacles: THREE.Object3D[] = [];

        scene.traverse((object) => {
            if (!object.visible) return;
            if (object.parent?.visible === false) return;

            if (object instanceof THREE.Sprite &&
                (object.name === 'label' || object.name === 'shorthand-label')) {
                currentLabels.push(object);
                if (!this.anchors.has(object.uuid)) {
                    const anchor = object.userData.anchor?.clone() || object.position.clone();
                    this.anchors.set(object.uuid, anchor);
                    object.userData.anchor = anchor.clone();
                }
            }
            else if (object.name.startsWith('symbol-') || object.name.startsWith('furniture-')) {
                currentObstacles.push(object);
            }
        });

        this.labels = currentLabels;
        this.obstacles = currentObstacles;

        const activeUuids = new Set(currentLabels.map(l => l.uuid));
        for (const id of Array.from(this.anchors.keys())) {
            if (!activeUuids.has(id)) {
                this.anchors.delete(id);
                this.velocities.delete(id);
            }
        }
    }
}
