import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import BASE_IMAGE from '../../images/floor-plan-clean.jpg';
import ELECTRICAL_IMAGE from '../../images/electric-plan-plain-full-clean-2025-12-12.jpg';

/**
 * Test 3.2: Layered Textures - Multiple textures with transforms
 *
 * Goals:
 * - Load base floor plan + electrical overlay
 * - Apply transforms to electrical layer (position, scale, rotation, opacity)
 * - Verify z-ordering (electrical on top of base)
 * - Test multi-camera with both layers
 */
export const Test3_2_LayeredTextures: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const mainCameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const zoomCameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const electricalPlaneRef = useRef<THREE.Mesh | null>(null);

    const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
    const [texturesLoaded, setTexturesLoaded] = useState({ base: false, electrical: false });

    // Electrical overlay transform controls
    const [electricalTransform, setElectricalTransform] = useState({
        offsetX: 0,
        offsetY: 0,
        scale: 1.0,
        rotation: 0,
        opacity: 0.7
    });

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        console.log('🎬 Test 3.2: Layered Textures Init');

        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1e293b);
        sceneRef.current = scene;

        // Create cameras
        const mainCamera = new THREE.OrthographicCamera(0, width, height, 0, 0.1, 1000);
        mainCamera.position.z = 10;
        mainCameraRef.current = mainCamera;

        const zoomCamera = new THREE.OrthographicCamera(0, 250, 250, 0, 0.1, 1000);
        zoomCamera.position.z = 10;
        zoomCameraRef.current = zoomCamera;

        // Create renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.autoClear = false;
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Load textures
        const textureLoader = new THREE.TextureLoader();
        let baseTexture: THREE.Texture | null = null;
        let electricalTexture: THREE.Texture | null = null;
        let basePlane: THREE.Mesh | null = null;

        // Load base floor plan
        console.log('📦 Loading base texture:', BASE_IMAGE);
        textureLoader.load(BASE_IMAGE, (texture) => {
            console.log('✅ Base texture loaded:', texture.image.width, 'x', texture.image.height);
            baseTexture = texture;

            const naturalWidth = texture.image.width;
            const naturalHeight = texture.image.height;

            // Scale to fit
            const scaleX = width / naturalWidth;
            const scaleY = height / naturalHeight;
            const scale = Math.min(scaleX, scaleY) * 0.9;

            const displayWidth = naturalWidth * scale;
            const displayHeight = naturalHeight * scale;

            // Create base plane (z=0)
            const geometry = new THREE.PlaneGeometry(displayWidth, displayHeight);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide
            });
            basePlane = new THREE.Mesh(geometry, material);
            basePlane.position.set(width / 2, height / 2, 0);
            scene.add(basePlane);

            console.log('✅ Base layer added at z=0');
            (scene as any).basePlane = basePlane;
            (scene as any).baseScale = scale;
            (scene as any).baseNaturalSize = { width: naturalWidth, height: naturalHeight };

            setTexturesLoaded(prev => ({ ...prev, base: true }));
        });

        // Load electrical overlay
        console.log('📦 Loading electrical texture:', ELECTRICAL_IMAGE);
        textureLoader.load(ELECTRICAL_IMAGE, (texture) => {
            console.log('✅ Electrical texture loaded:', texture.image.width, 'x', texture.image.height);
            electricalTexture = texture;

            const naturalWidth = texture.image.width;
            const naturalHeight = texture.image.height;

            // Use same scale as base for initial sizing
            const baseScale = (scene as any).baseScale || 1;
            const displayWidth = naturalWidth * baseScale;
            const displayHeight = naturalHeight * baseScale;

            // Create electrical plane (z=1, on top of base)
            const geometry = new THREE.PlaneGeometry(displayWidth, displayHeight);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.7 // Initial opacity
            });
            const plane = new THREE.Mesh(geometry, material);
            plane.position.set(width / 2, height / 2, 1); // z=1 renders on top
            scene.add(plane);

            electricalPlaneRef.current = plane;
            console.log('✅ Electrical layer added at z=1');

            (scene as any).electricalPlane = plane;
            (scene as any).electricalNaturalSize = { width: naturalWidth, height: naturalHeight };

            // Trigger transform update by setting state
            setTexturesLoaded(prev => ({ ...prev, electrical: true }));
        });

        // Animation loop
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

            if (baseTexture) baseTexture.dispose();
            if (electricalTexture) electricalTexture.dispose();
            if (basePlane) {
                basePlane.geometry.dispose();
                (basePlane.material as THREE.Material).dispose();
            }

            renderer.dispose();
            container.removeChild(renderer.domElement);
        };
    }, []);

    // Update electrical layer transforms
    useEffect(() => {
        const plane = electricalPlaneRef.current;
        if (!plane || !containerRef.current) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // Apply transforms
        plane.position.x = width / 2 + electricalTransform.offsetX;
        plane.position.y = height / 2 + electricalTransform.offsetY;
        plane.scale.set(electricalTransform.scale, electricalTransform.scale, 1);
        plane.rotation.z = (electricalTransform.rotation * Math.PI) / 180; // degrees to radians

        const material = plane.material as THREE.MeshBasicMaterial;
        material.opacity = electricalTransform.opacity;

        console.log('🔄 Electrical transform updated:', electricalTransform);
    }, [electricalTransform, texturesLoaded.electrical]); // Re-run when electrical texture loads

    return (
        <div className="h-full w-full flex bg-slate-950">
            {/* Left sidebar - controls */}
            <div className="w-80 bg-slate-900 border-r border-slate-700 p-4 overflow-y-auto">
                <h1 className="text-xl font-bold text-white mb-2">Test 3.2: Layered Textures</h1>
                <p className="text-xs text-slate-400 mb-4">
                    Base + Electrical overlay with transform controls
                </p>

                <div className="space-y-4">
                    {/* Status */}
                    <div className="text-xs">
                        <div className={texturesLoaded.base ? 'text-green-400' : 'text-yellow-400'}>
                            {texturesLoaded.base ? '✅' : '⏳'} Base layer
                        </div>
                        <div className={texturesLoaded.electrical ? 'text-green-400' : 'text-yellow-400'}>
                            {texturesLoaded.electrical ? '✅' : '⏳'} Electrical layer
                        </div>
                    </div>

                    {/* Offset X */}
                    <div>
                        <label className="text-xs text-slate-300 block mb-1">
                            Offset X: {electricalTransform.offsetX}px
                        </label>
                        <input
                            type="range"
                            min="-500"
                            max="500"
                            value={electricalTransform.offsetX}
                            onChange={(e) => setElectricalTransform(prev => ({ ...prev, offsetX: parseFloat(e.target.value) }))}
                            className="w-full"
                        />
                    </div>

                    {/* Offset Y */}
                    <div>
                        <label className="text-xs text-slate-300 block mb-1">
                            Offset Y: {electricalTransform.offsetY}px
                        </label>
                        <input
                            type="range"
                            min="-500"
                            max="500"
                            value={electricalTransform.offsetY}
                            onChange={(e) => setElectricalTransform(prev => ({ ...prev, offsetY: parseFloat(e.target.value) }))}
                            className="w-full"
                        />
                    </div>

                    {/* Scale */}
                    <div>
                        <label className="text-xs text-slate-300 block mb-1">
                            Scale: {electricalTransform.scale.toFixed(2)}x
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.01"
                            value={electricalTransform.scale}
                            onChange={(e) => setElectricalTransform(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                            className="w-full"
                        />
                    </div>

                    {/* Rotation */}
                    <div>
                        <label className="text-xs text-slate-300 block mb-1">
                            Rotation: {electricalTransform.rotation}°
                        </label>
                        <input
                            type="range"
                            min="-180"
                            max="180"
                            value={electricalTransform.rotation}
                            onChange={(e) => setElectricalTransform(prev => ({ ...prev, rotation: parseFloat(e.target.value) }))}
                            className="w-full"
                        />
                    </div>

                    {/* Opacity */}
                    <div>
                        <label className="text-xs text-slate-300 block mb-1">
                            Opacity: {(electricalTransform.opacity * 100).toFixed(0)}%
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={electricalTransform.opacity}
                            onChange={(e) => setElectricalTransform(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                            className="w-full"
                        />
                    </div>

                    {/* Reset button */}
                    <button
                        onClick={() => setElectricalTransform({
                            offsetX: 0,
                            offsetY: 0,
                            scale: 1.0,
                            rotation: 0,
                            opacity: 0.7
                        })}
                        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                        Reset Transforms
                    </button>
                </div>

                <div className="mt-4 text-xs text-slate-500">
                    Mouse: ({zoomPosition.x.toFixed(0)}, {zoomPosition.y.toFixed(0)})
                </div>
            </div>

            {/* Right side - canvas */}
            <div className="flex-1 flex flex-col">
                <div className="p-3 bg-slate-900 border-b border-slate-700">
                    <div className="text-xs text-slate-400">
                        🔍 Move mouse to see 2x zoom | 📐 Adjust transforms to align electrical layer
                    </div>
                </div>
                <div ref={containerRef} className="flex-1 relative">
                    {/* Zoom cursor border */}
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
        </div>
    );
};
