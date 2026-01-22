import * as THREE from 'three';
import { LabelSpringSystem } from './LabelSpringSystem';

async function testObstacleRepulsion() {
    console.log("Starting Obstacle Repulsion Test...");

    const scene = new THREE.Scene();
    const springSystem = new LabelSpringSystem();

    // 1. Create a static obstacle (Symbol)
    const obstacle = new THREE.Group();
    obstacle.name = 'symbol-123';
    obstacle.position.set(0, 0, 0);
    obstacle.scale.set(1, 1, 1);
    scene.add(obstacle);

    // 2. Create a label overlapping the obstacle
    const label = new THREE.Sprite();
    label.name = 'label';
    label.position.set(2, 2, 0);
    label.scale.set(50, 20, 1);
    label.uuid = 'label-test';
    scene.add(label);

    console.log("Initial Label position:", label.position.x, label.position.y);

    // Update system
    springSystem.update(1, scene);

    const p1_start = label.position.clone();

    // Run 5 frames
    for (let i = 0; i < 5; i++) {
        springSystem.update(1, scene);
    }

    console.log("Label position after 5 frames of Obstacle Repulsion:", label.position.x, label.position.y);
    const distFromObs = label.position.distanceTo(obstacle.position);
    console.log("Distance from obstacle:", distFromObs);

    if (distFromObs > 5) {
        console.log("SUCCESS: Label pushed away from obstacle.");
    } else {
        console.log("FAILURE: Label not pushed away enough.");
    }

    // Now test Label-Label repulsion for comparison
    const label2 = new THREE.Sprite();
    label2.name = 'label';
    label2.position.set(100, 100, 0);
    label2.scale.set(50, 20, 1);
    label2.uuid = 'label-2';
    scene.add(label2);

    const label3 = new THREE.Sprite();
    label3.name = 'label';
    label3.position.set(102, 102, 0);
    label3.scale.set(50, 20, 1);
    label3.uuid = 'label-3';
    scene.add(label3);

    springSystem.update(1, scene);
    const l2_start = label2.position.clone();

    for (let i = 0; i < 5; i++) {
        springSystem.update(1, scene);
    }

    const l2_move = label2.position.distanceTo(l2_start);
    const l1_move = label.position.distanceTo(p1_start);

    console.log("Label move (from label):", l2_move);
    console.log("Label move (from obstacle):", l1_move);

    if (l1_move > l2_move) {
        console.log("SUCCESS: Obstacle repulsion is stronger than label repulsion.");
    } else {
        console.log("FAILURE: Repulsion priority not working as expected.");
    }
}

testObstacleRepulsion().catch(console.error);
