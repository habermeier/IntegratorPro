import * as THREE from 'three';
import { LabelSpringSystem } from './LabelSpringSystem';

async function testLabelSpringSystem() {
    console.log("Starting LabelSpringSystem Unit Test...");

    const scene = new THREE.Scene();
    const springSystem = new LabelSpringSystem();
    const mockLayerSystem = {
        scene,
        getLayer: (id: string) => ({ container: scene, visible: true })
    } as any;

    // Create two labels close to each other
    const l1 = new THREE.Sprite();
    l1.name = 'label';
    l1.position.set(0, 0, 0);
    l1.scale.set(50, 20, 1);
    l1.uuid = 'label-1';

    const l2 = new THREE.Sprite();
    l2.name = 'label';
    l2.position.set(10, 5, 0); // Overlapping
    l2.scale.set(50, 20, 1);
    l2.uuid = 'label-2';

    scene.add(l1);
    scene.add(l2);

    console.log("Initial positions:", l1.position.x, l1.position.y, "|", l2.position.x, l2.position.y);

    // Initial update captures anchors
        springSystem.update(1, mockLayerSystem);

    const p1_start = l1.position.clone();
    const p2_start = l2.position.clone();

    // Run a few frames
    for (let i = 0; i < 10; i++) {
            springSystem.update(1, mockLayerSystem);
    }

    console.log("Positions after 10 frames:", l1.position.x, l1.position.y, "|", l2.position.x, l2.position.y);

    // Assert movement
    const moved1 = l1.position.distanceTo(p1_start) > 0.1;
    const moved2 = l2.position.distanceTo(p2_start) > 0.1;

    if (moved1 && moved2) {
        console.log("SUCCESS: Labels moved apart.");
    } else {
        console.log("FAILURE: Labels did not move enough.");
    }

    // Check if it reaches equilibrium
    let iterations = 0;
    while (springSystem.isMoving() && iterations < 500) {
            springSystem.update(1, mockLayerSystem);
        iterations++;
    }

    console.log(`Reached equilibrium in ${iterations} frames.`);
    if (iterations < 500) {
        console.log("SUCCESS: System converges.");
    } else {
        console.log("FAILURE: System failed to converge.");
    }
}

testLabelSpringSystem().catch(console.error);
