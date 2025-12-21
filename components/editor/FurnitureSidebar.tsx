import React, { useState } from 'react';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';
import { VectorLayerContent, Furniture } from '../../editor/models/types';
import { PlaceFurnitureTool } from '../../editor/tools/PlaceFurnitureTool';
import { FurnitureCreationDialog } from './FurnitureCreationDialog';

interface FurnitureSidebarProps {
    editor: FloorPlanEditor | null;
    layers: any[]; // Using any[] for simplicity, typed as Layer[] normally
    isEditMode: boolean;
}

export const FurnitureSidebar: React.FC<FurnitureSidebarProps> = ({ editor, layers, isEditMode }) => {
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    // Filter layout items directly from layers
    const furnitureList: Furniture[] = layers.flatMap(layer => {
        if (layer.type !== 'vector') return [];
        return (layer.content as VectorLayerContent).furniture || [];
    });

    const handleCreate = (name: string, width: number, length: number, isBlocking: boolean, color: number) => {
        if (editor) {
            // Get the tool and set prototype
            const tool = editor.toolSystem.getTool('place-furniture') as PlaceFurnitureTool;
            if (tool) {
                tool.setPrototype(name, width, length, isBlocking, color);
                editor.setActiveTool('place-furniture');
            }
        }
        setShowCreateDialog(false);
    };

    const handleItemClick = (id: string, x: number, y: number) => {
        if (editor) {
            // "Fly To" manual implementation
            const currentZoom = editor.cameraSystem.getState().zoom;
            editor.cameraSystem.setState({ x, y, zoom: currentZoom });
            // Optional: Select the item (if selection system supports furniture)
        }
    };

    return (
        <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.3)]">
            <div className="p-4 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>🪑 Furniture</span>
                    <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full text-slate-300">
                        {furnitureList.length}
                    </span>
                </h2>
                <button
                    onClick={() => setShowCreateDialog(true)}
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition-colors"
                >
                    <span className="text-xl leading-none">+</span>
                    New Item
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {furnitureList.length === 0 ? (
                    <div className="text-center p-8 text-slate-500 text-sm">
                        No furniture placed yet.<br />Click "New Item" to start.
                    </div>
                ) : (
                    furnitureList.map(item => (
                        <div
                            key={item.id}
                            onClick={() => handleItemClick(item.id, item.x, item.y)}
                            className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg p-3 cursor-pointer transition-all group"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-8 h-8 rounded border border-white/10 flex items-center justify-center font-bold text-xs"
                                        style={{ backgroundColor: `#${item.color.toString(16).padStart(6, '0')}`, color: 'rgba(255,255,255,0.8)' }}
                                    >
                                        {item.label?.[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">
                                            {item.label || 'Unnamed'}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono">
                                            {item.room || 'No Room'} • {item.isBlocking ? 'Blocking' : 'Non-Blocking'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showCreateDialog && (
                <FurnitureCreationDialog
                    onCancel={() => setShowCreateDialog(false)}
                    onApply={handleCreate}
                />
            )}
        </div>
    );
};
