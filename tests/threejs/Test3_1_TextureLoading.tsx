import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import FLOOR_PLAN_IMAGE from '../../images/floor-plan-clean.jpg';

/**
 * Test 3.1: Texture Loading - Load floor plan image
 *
 * Goals:
 * - Load actual floor plan image as texture
 * - Apply to PlaneGeometry with correct dimensions
 * - Verify aspect ratio preserved
 * - Test with multi-camera (main + zoom)
 */
export const Test3_1_TextureLoading: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const mainCameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const zoomCameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
    const [textureInfo, setTextureInfo] = useState({ width: 0, height: 0, loaded: false });

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        console.log('🎬 Test 3.1: Texture Loading Init');
        console.log('📐 Container size:', width, 'x', height);

        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1e293b); // slate-800
        sceneRef.current = scene;

        // Create Main Camera (full view)
        const mainCamera = new THREE.OrthographicCamera(
            0, width,
            height, 0,
            0.1, 1000
        );
        mainCamera.position.z = 10;
        mainCameraRef.current = mainCamera;

        // Create Zoom Camera (2x magnification)
        const zoomCamera = new THREE.OrthographicCamera(
            0, 250,
            250, 0,
            0.1, 1000
        );
        zoomCamera.position.z = 10;
        zoomCameraRef.current = zoomCamera;

        // Create renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.autoClear = false;
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Load floor plan texture
        const textureLoader = new THREE.TextureLoader();
        console.log('📦 Loading texture:', FLOOR_PLAN_IMAGE);

        textureLoader.load(
            FLOOR_PLAN_IMAGE,
            (texture) => {
                console.log('✅ Texture loaded');
                console.log('📐 Texture size:', texture.image.width, 'x', texture.image.height);

                const naturalWidth = texture.image.width;
                const naturalHeight = texture.image.height;

                setTextureInfo({
                    width: naturalWidth,
                    height: naturalHeight,
                    loaded: true
                });

                // Calculate scale to fit floor plan in viewport
                const scaleX = width / naturalWidth;
                const scaleY = height / naturalHeight;
                const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to leave margin

                const displayWidth = naturalWidth * scale;
                const displayHeight = naturalHeight * scale;

                console.log('📏 Display size:', displayWidth, 'x', displayHeight);

                // Create plane with texture
                const geometry = new THREE.PlaneGeometry(displayWidth, displayHeight);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.DoubleSide
                });
                const plane = new THREE.Mesh(geometry, material);

                // Center the floor plan
                plane.position.set(width / 2, height / 2, 0);
                scene.add(plane);

                console.log('✅ Floor plan added to scene');

                // Store for cleanup
                (scene as any).floorPlanGeometry = geometry;
                (scene as any).floorPlanMaterial = material;
                (scene as any).floorPlanTexture = texture;
            },
            undefined,
            (error) => {
                console.error('❌ Error loading texture:', error);
            }
        );

        // Animation loop with multi-viewport rendering
        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            renderer.clear();

            // Render main viewport
            renderer.setViewport(0, 0, width, height);
            renderer.setScissor(0, 0, width, height);
            renderer.setScissorTest(true);
            renderer.clearDepth();
            renderer.render(scene, mainCamera);

            // Render zoom viewport
            const zoomBoxSize = 250;
            const mouseX = (scene as any).lastMouseX || width / 2;
            const mouseY = (scene as any).lastMouseY || height / 2;

            const zoomBoxX = Math.max(0, Math.min(width - zoomBoxSize, mouseX - zoomBoxSize / 2));
            const zoomBoxY = Math.max(0, Math.min(height - zoomBoxSize, height - mouseY - zoomBoxSize / 2));

            renderer.setViewport(zoomBoxX, zoomBoxY, zoomBoxSize, zoomBoxSize);
            renderer.setScissor(zoomBoxX, zoomBoxY, zoomBoxSize, zoomBoxSize);
            renderer.clearDepth();
            renderer.render(scene, zoomCamera);

            renderer.setScissorTest(false);
        };
        animate();

        // Mouse tracking
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            setZoomPosition({ x, y });
            (scene as any).lastMouseX = x;
            (scene as any).lastMouseY = y;

            // Update zoom camera (2x magnification)
            const viewWidth = 125;
            const viewHeight = 125;
            zoomCamera.left = x - viewWidth / 2;
            zoomCamera.right = x + viewWidth / 2;
            zoomCamera.top = y - viewHeight / 2;
            zoomCamera.bottom = y + viewHeight / 2;
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

            const floorPlanGeometry = (scene as any).floorPlanGeometry;
            const floorPlanMaterial = (scene as any).floorPlanMaterial;
            const floorPlanTexture = (scene as any).floorPlanTexture;

            if (floorPlanGeometry) floorPlanGeometry.dispose();
            if (floorPlanMaterial) floorPlanMaterial.dispose();
            if (floorPlanTexture) floorPlanTexture.dispose();

            renderer.dispose();
            container.removeChild(renderer.domElement);
        };
    }, []);

    return (
        <div className="h-full w-full flex flex-col bg-slate-950">
            <div className="p-4 bg-slate-900 border-b border-slate-700">
                <h1 className="text-xl font-bold text-white">Test 3.1: Texture Loading</h1>
                <p className="text-sm text-slate-400 mt-1">
                    Loading floor plan image as texture. Multi-camera with 2x zoom cursor.
                </p>
                <div className="mt-2 text-xs text-slate-500 font-mono">
                    Mouse: ({zoomPosition.x.toFixed(0)}, {zoomPosition.y.toFixed(0)})
                    <br />
                    {textureInfo.loaded ? (
                        <>Texture: {textureInfo.width} x {textureInfo.height}px</>
                    ) : (
                        <>Loading texture...</>
                    )}
                </div>
                <div className="mt-2 text-xs text-slate-400">
                    🖼️ Floor plan image loaded from /images/floor-plan-clean.jpg
                    <br />
                    📐 Aspect ratio preserved, scaled to fit with margin
                    <br />
                    🔍 Move mouse to see 2x magnified zoom cursor
                    <br />
                    💜 <strong>TEST:</strong> Image should be sharp in both main and zoom views
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
