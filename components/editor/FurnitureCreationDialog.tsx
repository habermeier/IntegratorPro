import React, { useState } from 'react';
import { parseDistanceInput } from '../../utils/measurementUtils';

interface FurnitureCreationDialogProps {
    onCancel: () => void;
    onApply: (name: string, width: number, length: number, isBlocking: boolean, color: number) => void;
}

export const FurnitureCreationDialog: React.FC<FurnitureCreationDialogProps> = ({ onCancel, onApply }) => {
    const [name, setName] = useState('Table');
    const [widthStr, setWidthStr] = useState('4ft');
    const [lengthStr, setLengthStr] = useState('2ft');
    const [isBlocking, setIsBlocking] = useState(true);
    const [colorHex, setColorHex] = useState('#888888');

    const handleApply = () => {
        const width = parseDistanceInput(widthStr);
        const length = parseDistanceInput(lengthStr);

        if (width === null || length === null) {
            alert('Invalid dimensions. Use format like "4ft" or "1.2m"');
            return;
        }

        // Convert hex to number
        const color = parseInt(colorHex.replace('#', '0x'), 16);
        onApply(name, width, length, isBlocking, color);
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-96 shadow-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Add Furniture</h2>

                <div className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 outline-none"
                            placeholder="e.g. Dining Table"
                            autoFocus
                        />
                    </div>

                    {/* Dimensions */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Width</label>
                            <input
                                type="text"
                                value={widthStr}
                                onChange={(e) => setWidthStr(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 outline-none font-mono text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Length</label>
                            <input
                                type="text"
                                value={lengthStr}
                                onChange={(e) => setLengthStr(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 outline-none font-mono text-sm"
                            />
                        </div>
                    </div>

                    {/* Color Picker (Simple) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Color</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={colorHex}
                                onChange={(e) => setColorHex(e.target.value)}
                                className="w-10 h-10 rounded cursor-pointer bg-transparent border-none"
                            />
                            <div className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-400 font-mono text-sm flex items-center">
                                {colorHex.toUpperCase()}
                            </div>
                        </div>
                    </div>

                    {/* Blocking Toggle */}
                    <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                        <input
                            type="checkbox"
                            checked={isBlocking}
                            onChange={(e) => setIsBlocking(e.target.checked)}
                            className="w-5 h-5 rounded border-slate-600 accent-blue-600 focus:ring-offset-slate-900"
                        />
                        <div>
                            <div className="text-sm font-bold text-white">Blocking Object</div>
                            <div className="text-[10px] text-slate-400">Other items will snap to this object</div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-8">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-400 hover:text-white font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg shadow-blue-600/20 transition-all hover:scale-105"
                    >
                        Create & Place
                    </button>
                </div>
            </div>
        </div>
    );
};
