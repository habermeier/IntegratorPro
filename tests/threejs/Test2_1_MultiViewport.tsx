import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Test 2.1: Multi-Viewport - Two cameras rendering same scene
 *
 * Goals:
 * - Main viewport: full canvas
 * - Small viewport: 250x250px box in corner
 * - Both cameras looking at SAME scene
 * - Verify single renderer with setViewport() pattern
 */
export const Test2_1_MultiViewport: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const mainCameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const zoomCameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        console.log('🎬 Test 2.1: Multi-Viewport Init');
        console.log('📐 Container size:', width, 'x', height);

        // Create scene (SINGLE scene for both cameras)
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1e3a8a); // blue-900 (darker)
        sceneRef.current = scene;

        // Create Main Camera (full view)
        const mainCamera = new THREE.OrthographicCamera(
            0, width,     // left, right
            height, 0,    // top, bottom (inverted Y)
            0.1, 1000
        );
        mainCamera.position.z = 10;
        mainCameraRef.current = mainCamera;
        console.log('📷 Main camera created');

        // Create Zoom Camera (will show magnified view)
        const zoomSize = 250;
        const zoomCamera = new THREE.OrthographicCamera(
            0, zoomSize,
            zoomSize, 0,
            0.1, 1000
        );
        zoomCamera.position.z = 10;
        zoomCameraRef.current = zoomCamera;
        console.log('🔍 Zoom camera created');

        // Create renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.autoClear = false; // CRITICAL: disable auto-clear for multi-viewport
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        console.log('🎨 Renderer created with autoClear=false');

        // Add fine grid with color-coded lines
        const gridSpacing = 50;

        // Vertical lines (RED) - show left/right
        const verticalGeometry = new THREE.BufferGeometry();
        const verticalPositions: number[] = [];
        for (let x = 0; x <= width; x += gridSpacing) {
            verticalPositions.push(x, 0, -1);
            verticalPositions.push(x, height, -1);
        }
        verticalGeometry.setAttribute('position', new THREE.Float32BufferAttribute(verticalPositions, 3));
        const verticalMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true }); // RED
        const verticalLines = new THREE.LineSegments(verticalGeometry, verticalMaterial);
        scene.add(verticalLines);
        console.log('📏 Vertical grid (RED) added');

        // Horizontal lines (GREEN) - show top/bottom
        const horizontalGeometry = new THREE.BufferGeometry();
        const horizontalPositions: number[] = [];
        for (let y = 0; y <= height; y += gridSpacing) {
            horizontalPositions.push(0, y, -1);
            horizontalPositions.push(width, y, -1);
        }
        horizontalGeometry.setAttribute('position', new THREE.Float32BufferAttribute(horizontalPositions, 3));
        const horizontalMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, opacity: 0.5, transparent: true }); // GREEN
        const horizontalLines = new THREE.LineSegments(horizontalGeometry, horizontalMaterial);
        scene.add(horizontalLines);
        console.log('📏 Horizontal grid (GREEN) added');

        // Store for cleanup
        (scene as any).verticalGrid = { geometry: verticalGeometry, material: verticalMaterial };
        (scene as any).horizontalGrid = { geometry: horizontalGeometry, material: horizontalMaterial };

        // Add content to scene
        // Blue rectangle at center
        const rectGeometry = new THREE.PlaneGeometry(400, 300);
        const rectMaterial = new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide });
        const rect = new THREE.Mesh(rectGeometry, rectMaterial);
        rect.position.set(width / 2, height / 2, 0);
        scene.add(rect);
        console.log('📦 Blue rectangle at center');

        // Red circles at corners
        const cornerGeometry = new THREE.CircleGeometry(30, 32);
        const cornerMaterial = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
        const corners = [
            { x: 100, y: 100 },
            { x: width - 100, y: 100 },
            { x: 100, y: height - 100 },
            { x: width - 100, y: height - 100 }
        ];
        corners.forEach(pos => {
            const marker = new THREE.Mesh(cornerGeometry, cornerMaterial);
            marker.position.set(pos.x, pos.y, 2);
            scene.add(marker);
        });
        console.log('🔴 4 corner markers added');

        // Animation loop with multi-viewport rendering
        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            // Clear once at start of frame
            renderer.clear();

            // Render main viewport (full screen)
            renderer.setViewport(0, 0, width, height);
            renderer.setScissor(0, 0, width, height);
            renderer.setScissorTest(true);
            renderer.clearDepth();
            renderer.render(scene, mainCamera);

            // Render zoom viewport (following mouse cursor)
            const zoomBoxSize = 250;
            const mouseX = (scene as any).lastMouseX || width / 2;
            const mouseY = (scene as any).lastMouseY || height / 2;

            // Position zoom box centered on mouse
            const zoomBoxX = Math.max(0, Math.min(width - zoomBoxSize, mouseX - zoomBoxSize / 2));
            // WebGL Y is bottom-up, so convert from screen coords (top-down)
            const zoomBoxY = Math.max(0, Math.min(height - zoomBoxSize, height - mouseY - zoomBoxSize / 2));

            renderer.setViewport(zoomBoxX, zoomBoxY, zoomBoxSize, zoomBoxSize);
            renderer.setScissor(zoomBoxX, zoomBoxY, zoomBoxSize, zoomBoxSize);
            renderer.clearDepth();
            renderer.render(scene, zoomCamera);

            renderer.setScissorTest(false);
        };
        animate();
        console.log('🎞️  Multi-viewport animation loop started');

        // Mouse tracking to update zoom camera
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            console.log('🖱️  Mouse move:', x, y);
            setZoomPosition({ x, y });

            // Store mouse position for viewport positioning
            (scene as any).lastMouseX = x;
            (scene as any).lastMouseY = y;

            // Update zoom camera to center on mouse position
            // Zoom viewport is 250x250, but camera views 125x125 region = 2x magnification
            const viewWidth = 125;  // Half size = 2x zoom
            const viewHeight = 125;
            zoomCamera.left = x - viewWidth / 2;
            zoomCamera.right = x + viewWidth / 2;
            // For inverted Y-axis: top > bottom (top=larger value, bottom=smaller value)
            zoomCamera.top = y + viewHeight / 2;     // top (larger Y = lower on screen)
            zoomCamera.bottom = y - viewHeight / 2;  // bottom (smaller Y = higher on screen)
            zoomCamera.updateProjectionMatrix();
        };

        window.addEventListener('mousemove', handleMouseMove);

        // Handle resize
        const handleResize = () => {
            if (!containerRef.current) return;
            const newWidth = containerRef.current.clientWidth;
            const newHeight = containerRef.current.clientHeight;

            mainCamera.right = newWidth;
            mainCamera.top = newHeight;
            mainCamera.updateProjectionMatrix();

            renderer.setSize(newWidth, newHeight);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            rectGeometry.dispose();
            rectMaterial.dispose();
            cornerGeometry.dispose();
            cornerMaterial.dispose();
            verticalGeometry.dispose();
            verticalMaterial.dispose();
            horizontalGeometry.dispose();
            horizontalMaterial.dispose();
            renderer.dispose();
            container.removeChild(renderer.domElement);
        };
    }, []);

    return (
        <div className="h-full w-full flex flex-col bg-slate-950">
            <div className="p-4 bg-slate-900 border-b border-slate-700">
                <h1 className="text-xl font-bold text-white">Test 2.1: Multi-Viewport (2x Zoom)</h1>
                <p className="text-sm text-slate-400 mt-1">
                    Two cameras rendering <strong>same scene</strong>. Main view (full) + Zoom viewport (2x magnified, follows cursor).
                </p>
                <div className="mt-2 text-xs text-slate-500 font-mono">
                    Mouse: ({zoomPosition.x.toFixed(0)}, {zoomPosition.y.toFixed(0)})
                </div>
                <div className="mt-2 text-xs text-slate-400">
                    📏 Grid: 🔴 RED = vertical, 🟢 GREEN = horizontal (50px spacing)
                    <br />
                    📦 Scene: Blue rectangle + 4 red corner circles (static objects)
                    <br />
                    💜 Magenta border = zoom viewport (250x250px showing 125x125 region = 2x zoom)
                    <br />
                    🔍 <strong>TEST:</strong> Grid cells should be DOUBLE SIZE inside magenta box
                </div>
            </div>
            <div ref={containerRef} className="flex-1 relative">
                {/* Border around zoom viewport */}
                {zoomPosition.x > 0 && (
                    <div
                        className="absolute pointer-events-none"
                        style={{
                            left: `${Math.max(0, zoomPosition.x - 125)}px`,
                            top: `${Math.max(0, zoomPosition.y - 125)}px`,
                            width: '250px',
                            height: '250px',
                            border: '3px solid #ff00ff',
                            boxShadow: '0 0 10px rgba(255, 0, 255, 0.5)',
                            zIndex: 100
                        }}
                    />
                )}
            </div>
        </div>
    );
};
