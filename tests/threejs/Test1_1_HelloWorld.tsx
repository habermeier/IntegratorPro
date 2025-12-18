import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Test 1.1: Hello World - Empty scene with OrthographicCamera
 *
 * Goals:
 * - Render a solid color background
 * - Verify canvas renders
 * - Test resize handling
 * - Verify OrthographicCamera setup for 2D
 */
export const Test1_1_HelloWorld: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        console.log('🎬 Test 1.1: Initializing Three.js');
        console.log('📐 Container size:', width, 'x', height);

        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1e293b); // slate-800
        sceneRef.current = scene;
        console.log('✅ Scene created');

        // Create OrthographicCamera for 2D
        // For now, use a simple 0-width, 0-height coordinate system
        const camera = new THREE.OrthographicCamera(
            0,      // left
            width,  // right
            0,      // top
            height, // bottom
            0.1,    // near
            1000    // far
        );
        camera.position.z = 10;
        cameraRef.current = camera;
        console.log('📷 Camera created:', {
            left: 0,
            right: width,
            top: 0,
            bottom: height,
            position: camera.position.z
        });

        // Create renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        console.log('🎨 Renderer created');

        // Animation loop
        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };
        animate();
        console.log('🎞️  Animation loop started');

        // Handle resize
        const handleResize = () => {
            if (!containerRef.current) return;
            const newWidth = containerRef.current.clientWidth;
            const newHeight = containerRef.current.clientHeight;

            console.log('📐 Resize:', newWidth, 'x', newHeight);

            camera.right = newWidth;
            camera.bottom = newHeight;
            camera.updateProjectionMatrix();

            renderer.setSize(newWidth, newHeight);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            console.log('🧹 Cleaning up Test 1.1');
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            renderer.dispose();
            container.removeChild(renderer.domElement);
        };
    }, []);

    return (
        <div className="h-full w-full flex flex-col bg-slate-950">
            <div className="p-4 bg-slate-900 border-b border-slate-700">
                <h1 className="text-xl font-bold text-white">Test 1.1: Hello World</h1>
                <p className="text-sm text-slate-400 mt-1">
                    Empty scene with OrthographicCamera. Should show solid slate-800 background.
                </p>
            </div>
            <div ref={containerRef} className="flex-1 relative" />
        </div>
    );
};
