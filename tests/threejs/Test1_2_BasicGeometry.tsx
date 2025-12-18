import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Test 1.2: Basic Geometry - Single colored rectangle
 *
 * Goals:
 * - Create a 2D plane with MeshBasicMaterial
 * - Verify OrthographicCamera framing (coordinates match expected bounds)
 * - Test camera zoom (adjust camera bounds)
 */
export const Test1_2_BasicGeometry: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        console.log('🎬 Test 1.2: Initializing Three.js with geometry');
        console.log('📐 Container size:', width, 'x', height);

        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f172a); // slate-900
        sceneRef.current = scene;

        // Create OrthographicCamera
        // For 2D: Y-axis should go DOWN (like screen coordinates)
        // left/right: X from 0 to width (left to right)
        // top/bottom: Y from 0 to height (top to bottom)
        const camera = new THREE.OrthographicCamera(
            0,      // left
            width,  // right
            height, // top (Y-axis inverted for screen coords)
            0,      // bottom
            0.1,    // near
            1000    // far
        );
        camera.position.z = 10;
        cameraRef.current = camera;
        console.log('📷 Camera created with INVERTED Y-axis for screen coordinates');

        // Create renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Create a colored rectangle in the center
        // Rectangle: 400x300 positioned at center
        const rectWidth = 400;
        const rectHeight = 300;
        const geometry = new THREE.PlaneGeometry(rectWidth, rectHeight);
        const material = new THREE.MeshBasicMaterial({
            color: 0x3b82f6, // blue-500
            side: THREE.DoubleSide
        });
        const plane = new THREE.Mesh(geometry, material);

        // Position at center of screen
        plane.position.x = width / 2;
        plane.position.y = height / 2;
        plane.position.z = 0;
        scene.add(plane);

        console.log('✅ Rectangle created at:', plane.position);

        // Add 4 corner markers (small circles) to verify coordinate system
        const markerGeometry = new THREE.CircleGeometry(50, 32); // Much bigger!
        const markerMaterial = new THREE.MeshBasicMaterial({
            color: 0xef4444, // red-500
            side: THREE.DoubleSide
        });

        const corners = [
            { x: 100, y: 100, label: 'Corner 1' },
            { x: width - 100, y: 100, label: 'Corner 2' },
            { x: 100, y: height - 100, label: 'Corner 3' },
            { x: width - 100, y: height - 100, label: 'Corner 4' }
        ];

        console.log('🔴 Creating markers with camera bounds:', {
            left: camera.left,
            right: camera.right,
            top: camera.top,
            bottom: camera.bottom,
            cameraZ: camera.position.z
        });

        corners.forEach((corner, i) => {
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.set(corner.x, corner.y, 5); // z=5 way in front
            scene.add(marker);
            console.log(`📍 Marker ${i + 1} at:`, corner.x, corner.y, 'z=5', corner.label);
        });

        console.log('🎨 Scene children count:', scene.children.length);

        // Add one BIG test circle in center (should definitely be visible)
        const testCircle = new THREE.Mesh(
            new THREE.CircleGeometry(100, 32),
            new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide }) // bright green
        );
        testCircle.position.set(width / 2, height / 2, 8); // Center, in front but not at camera
        scene.add(testCircle);
        console.log('🟢 BIG GREEN test circle at center:', width / 2, height / 2, 'z=8 (in front)');

        // Animation loop
        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };
        animate();

        // Handle resize
        const handleResize = () => {
            if (!containerRef.current) return;
            const newWidth = containerRef.current.clientWidth;
            const newHeight = containerRef.current.clientHeight;

            camera.right = newWidth;
            camera.bottom = newHeight;
            camera.updateProjectionMatrix();

            renderer.setSize(newWidth, newHeight);

            // Reposition center rectangle
            plane.position.x = newWidth / 2;
            plane.position.y = newHeight / 2;
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            geometry.dispose();
            material.dispose();
            markerGeometry.dispose();
            markerMaterial.dispose();
            renderer.dispose();
            container.removeChild(renderer.domElement);
        };
    }, []);

    // Update camera zoom when slider changes
    useEffect(() => {
        if (!cameraRef.current || !containerRef.current) return;

        const camera = cameraRef.current;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // Apply zoom by adjusting camera bounds (centered)
        const centerX = width / 2;
        const centerY = height / 2;
        const zoomedWidth = width / zoom;
        const zoomedHeight = height / zoom;

        camera.left = centerX - zoomedWidth / 2;
        camera.right = centerX + zoomedWidth / 2;
        // Remember: top = height, bottom = 0 (inverted Y)
        camera.top = centerY + zoomedHeight / 2;   // Y goes down, so + for top
        camera.bottom = centerY - zoomedHeight / 2; // and - for bottom
        camera.updateProjectionMatrix();

        console.log('🔍 Zoom updated:', zoom, '| Camera bounds:', {
            left: camera.left,
            right: camera.right,
            top: camera.top,
            bottom: camera.bottom
        });
    }, [zoom]);

    return (
        <div className="h-full w-full flex flex-col bg-slate-950">
            <div className="p-4 bg-slate-900 border-b border-slate-700">
                <h1 className="text-xl font-bold text-white">Test 1.2: Basic Geometry</h1>
                <p className="text-sm text-slate-400 mt-1">
                    Blue rectangle centered, red markers at corners (50px from edges).
                </p>
                <div className="mt-3 flex items-center gap-4">
                    <label className="text-sm text-slate-300">Zoom:</label>
                    <input
                        type="range"
                        min="1"
                        max="5"
                        step="0.1"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="flex-1 max-w-xs"
                    />
                    <span className="text-sm text-slate-400">{zoom.toFixed(1)}x</span>
                </div>
            </div>
            <div ref={containerRef} className="flex-1 relative" />
        </div>
    );
};
