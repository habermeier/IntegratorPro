import React, { useState } from 'react';
import { Test1_1_HelloWorld } from './Test1_1_HelloWorld';
import { Test1_2_BasicGeometry } from './Test1_2_BasicGeometry';
import { Test2_1_MultiViewport } from './Test2_1_MultiViewport';
import { Test3_1_TextureLoading } from './Test3_1_TextureLoading';
import { Test3_2_LayeredTextures } from './Test3_2_LayeredTextures';

interface Test {
    id: string;
    name: string;
    phase: string;
    component: React.FC;
    description: string;
}

const TESTS: Test[] = [
    {
        id: '1.1',
        name: 'Hello World',
        phase: 'Phase 1: Basics',
        component: Test1_1_HelloWorld,
        description: 'Empty scene with OrthographicCamera and solid background'
    },
    {
        id: '1.2',
        name: 'Basic Geometry',
        phase: 'Phase 1: Basics',
        component: Test1_2_BasicGeometry,
        description: 'Colored rectangle with corner markers and zoom control'
    },
    {
        id: '2.1',
        name: 'Multi-Viewport',
        phase: 'Phase 2: Multi-Camera',
        component: Test2_1_MultiViewport,
        description: 'Two cameras rendering same scene - main view + zoom cursor'
    },
    {
        id: '3.1',
        name: 'Texture Loading',
        phase: 'Phase 3: Textures & Layers',
        component: Test3_1_TextureLoading,
        description: 'Load floor plan image as texture with correct aspect ratio'
    },
    {
        id: '3.2',
        name: 'Layered Textures',
        phase: 'Phase 3: Textures & Layers',
        component: Test3_2_LayeredTextures,
        description: 'Base + electrical overlay with position, scale, rotation, opacity'
    }
];

export const TestHarness: React.FC = () => {
    const [selectedTest, setSelectedTest] = useState<Test>(TESTS[0]);
    const [menuOpen, setMenuOpen] = useState(true);

    const TestComponent = selectedTest.component;

    // Group tests by phase
    const phases = Array.from(new Set(TESTS.map(t => t.phase)));

    return (
        <div className="h-screen w-screen flex bg-slate-950 text-slate-200">
            {/* Sidebar */}
            <div
                className={`${menuOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-slate-900 border-r border-slate-700 flex flex-col overflow-hidden`}
            >
                <div className="p-4 border-b border-slate-700">
                    <h1 className="text-2xl font-bold text-white">Three.js Tests</h1>
                    <p className="text-sm text-slate-400 mt-1">Primitive Testing Suite</p>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {phases.map(phase => {
                        const phaseTests = TESTS.filter(t => t.phase === phase);
                        return (
                            <div key={phase} className="mb-6">
                                <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    {phase}
                                </div>
                                {phaseTests.map(test => (
                                    <button
                                        key={test.id}
                                        onClick={() => {
                                            setSelectedTest(test);
                                            setMenuOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 hover:bg-slate-800 transition-colors ${selectedTest.id === test.id ? 'bg-slate-800 border-l-4 border-blue-500' : ''
                                            }`}
                                    >
                                        <div className="text-sm font-medium text-white">
                                            {test.id} - {test.name}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            {test.description}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
                    <div>Total Tests: {TESTS.length}</div>
                    <div className="mt-1">Current: {selectedTest.id}</div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top bar */}
                <div className="h-14 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-4">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm transition-colors"
                    >
                        {menuOpen ? '◀ Hide' : '▶ Menu'}
                    </button>
                    <div className="flex-1">
                        <div className="text-lg font-semibold text-white">
                            Test {selectedTest.id}: {selectedTest.name}
                        </div>
                        <div className="text-xs text-slate-400">
                            {selectedTest.description}
                        </div>
                    </div>
                </div>

                {/* Test component */}
                <div className="flex-1 overflow-hidden">
                    <TestComponent />
                </div>
            </div>
        </div>
    );
};
