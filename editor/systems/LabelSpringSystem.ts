import * as THREE from 'three';
import { LayerSystem } from './LayerSystem';
import { VectorLayerContent } from '../models/types';

/**
 * LabelSpringSystem handles physics-based collision avoidance for labels.
 * Hyper-stabilized version: Extreme damping, velocity caps, and timeout-based settling.
 */
export class LabelSpringSystem {
    private labels: THREE.Object3D[] = [];
    private obstacles: THREE.Object3D[] = [];

    private anchors: Map<string, THREE.Vector3> = new Map();
    private velocities: Map<string, THREE.Vector3> = new Map();

    // Physics Constants (HYPER-STABLE)
    private readonly K_REPEL_LABEL = 30;        // Was 8
    private readonly K_REPEL_OBSTACLE = 80;    // Was 40
    private readonly K_ATTRACT_START = 0.05;   // Initial weak pull
    private readonly K_ATTRACT_END = 0.3;      // Final strong tension (settling)
    private readonly DAMPING_START = 0.8;      // Fluid initially
    private readonly DAMPING_END = 0.05;       // High resistance at the end
    private readonly MAX_VELOCITY = 15.0;      // Was 10
    private readonly EPSILON = 0.1;            // Lower threshold for finer settling
    private readonly MIN_FORCE = 0.005;        // Was 0.01

    private isActive: boolean = false;
    private isDirty: boolean = true;
    private lastZoom: number = -1;
    private activeFrames: number = 0;
    private readonly MAX_ACTIVE_FRAMES = 450; // Increased to allow for break-out and re-settle
    private readonly ENTROPY_START_FRAME = 150; // When to start the jitter
    private readonly K_ENTROPY = 8.0;          // Magnitude of random break-out force
    private lastSyncTime: number = 0;
    private readonly SYNC_THROTTLE = 1000; // ms

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
    public update(zoom: number, layerSystem: LayerSystem): boolean {
        const now = Date.now();
        // 1. Wake triggers
        const zoomDelta = Math.abs(zoom - this.lastZoom);
        if (zoomDelta > 0.01) {
            this.wakeUp();
            this.lastZoom = zoom;
        }

        if (this.isDirty || (this.isActive && now - this.lastSyncTime > this.SYNC_THROTTLE)) {
            this.syncElements(layerSystem);
            this.isDirty = false;
            this.lastSyncTime = now;
        }

        // 2. Hard cutoff for stability
        if (!this.isActive || this.activeFrames > this.MAX_ACTIVE_FRAMES) {
            if (this.isActive) this.sleep();
            return false;
        }

        let totalMotion = 0;
        this.activeFrames++;

        // --- CALCULATE PHYSICS PARAMETERS (Annealing Model) ---
        let tightness = 0;
        let entropy = 0;

        if (this.activeFrames <= this.ENTROPY_START_FRAME) {
            // Phase 1: Initial stabilization attempt (0 -> 1)
            tightness = this.activeFrames / this.ENTROPY_START_FRAME;
            entropy = 0;
        } else {
            // Phase 2: Break-out and Re-settle (Multi-stage)
            const breakoutProgress = (this.activeFrames - this.ENTROPY_START_FRAME) / (this.MAX_ACTIVE_FRAMES - this.ENTROPY_START_FRAME);

            // Dip tightness in the middle (creating fluidity) and then tighten back up at the very end
            // tightness: 1.0 -> 0.3 -> 1.0
            tightness = 1.0 - (Math.sin(breakoutProgress * Math.PI) * 0.7);

            // Increase entropy jitter during the loose phase
            entropy = Math.sin(breakoutProgress * Math.PI);
        }

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
                const currentAttract = this.K_ATTRACT_START + (this.K_ATTRACT_END - this.K_ATTRACT_START) * tightness;
                force.add(toAnchor.multiplyScalar(currentAttract));

                // Add Entropy Jitter to break local minima
                if (entropy > 0.01) {
                    force.x += (Math.random() - 0.5) * this.K_ENTROPY * entropy;
                    force.y += (Math.random() - 0.5) * this.K_ENTROPY * entropy;
                }
            }

            // OBSTACLE AVOIDANCE
            for (const obstacle of this.obstacles) {
                obstacle.updateMatrixWorld(true);
                obstacle.getWorldPosition(this._otherWorldPos);
                const diff = this._tempVecB.copy(this._worldPos).sub(this._otherWorldPos);
                diff.z = 0;
                let distSq = diff.lengthSq();

                // Nudge perfect overlaps with a real kick to break symmetry
                if (distSq < 0.0001) {
                    diff.set(Math.random() - 0.5, Math.random() - 0.5, 0).normalize().multiplyScalar(0.5);
                    distSq = diff.lengthSq();
                }

                // ROBUST RADIUS LOGIC
                let obsRadius = obstacle.userData.physicsRadius;
                if (obsRadius === undefined) {
                    obsRadius = obstacle.scale.x * 12; // Fallback
                }

                let labelRadius = label.userData.physicsRadius;
                if (labelRadius === undefined) {
                    labelRadius = label.scale.x * 0.5; // Fallback for Sprites
                }

                const combinedRadius = (obsRadius + labelRadius) * 1.5; // Was 1.1
                const minDistanceSq = combinedRadius * combinedRadius;

                if (distSq < minDistanceSq) {
                    const repulsion = (minDistanceSq - distSq) / minDistanceSq;
                    force.add(diff.normalize().multiplyScalar(repulsion * this.K_REPEL_OBSTACLE));
                }
            }

            // LABEL-LABEL AVOIDANCE
            for (const other of this.labels) {
                if (label === other) continue;
                other.getWorldPosition(this._otherWorldPos);
                const diff = this._tempVecB.copy(this._worldPos).sub(this._otherWorldPos);
                diff.z = 0;
                let distSq = diff.lengthSq();

                if (distSq < 0.0001) {
                    diff.set(Math.random() - 0.5, Math.random() - 0.5, 0).normalize().multiplyScalar(0.5);
                    distSq = diff.lengthSq();
                }

                const r1 = label.userData.physicsRadius || (label.scale.x * 0.5);
                const r2 = other.userData.physicsRadius || (other.scale.x * 0.5);
                const combinedRadius = (r1 + r2) * 1.5; // Was 1.05 (MUCH more padding)
                const minDistanceSq = combinedRadius * combinedRadius;

                if (distSq < minDistanceSq) {
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

            const currentDamping = this.DAMPING_START + (this.DAMPING_END - this.DAMPING_START) * tightness;
            velocity.multiplyScalar(currentDamping);

            if (velocity.length() < this.EPSILON) {
                velocity.set(0, 0, 0);
            } else {
                label.getWorldPosition(this._worldPos);
                this._worldPos.add(velocity);
                this._worldPos.add(velocity);
                const localPos = label.parent.worldToLocal(this._worldPos.clone()); // Need clone to preserve _worldPos? worldToLocal modifies in place usually.
                label.position.copy(localPos);

                // LEADER LINE UPDATE
                // Update the visual line connecting Symbol Center (0,0,0) to Label Center (localPos)
                const leaderLine = label.parent.getObjectByName('leader-line') as THREE.Line;
                if (leaderLine) {
                    const positions = leaderLine.geometry.attributes.position;
                    // Point 0 is always 0,0,0 (Symbol Center)
                    // Point 1 tracks the label
                    positions.setXYZ(1, localPos.x, localPos.y, 0);
                    positions.needsUpdate = true;

                    // Dynamic Opacity: Fade out when close to anchor (optional, or just keep visible)
                    // User wanted "thin line".
                }

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

    private syncElements(layerSystem: LayerSystem): void {
        const currentLabels: THREE.Object3D[] = [];
        const currentObstacles: THREE.Object3D[] = [];

        // Monitor all device-containing layers for obstacles and labels
        const targetLayerIds = ['lighting', 'room', 'furniture', 'technical', 'infrastructure', 'lcps', 'network', 'security', 'sensors', 'hvac'];

        targetLayerIds.forEach(id => {
            const layer = layerSystem.getLayer(id);
            if (!layer || !layer.visible) return;

            layer.container.traverse(object => {
                if (!object.visible) return;

                // LOGIC UPDATE: Handle both Sprites (old labels) and Groups (new infrastructure labels with icons)
                const isSpriteLabel = object instanceof THREE.Sprite && (object.name === 'label' || object.name === 'shorthand-label');
                const isGroupLabel = object instanceof THREE.Group && object.name === 'label';

                if (isSpriteLabel || isGroupLabel) {
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
