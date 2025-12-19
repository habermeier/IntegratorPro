import React from 'react';
import { ToolType } from '../../editor/models/types';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';

interface ToolPaletteProps {
    editor: FloorPlanEditor | null;
    activeTool: ToolType;
    isEditMode: boolean;
}

export const ToolPalette: React.FC<ToolPaletteProps> = ({
    editor,
    activeTool,
    isEditMode
}) => {
    const tools: { type: ToolType; icon: string; label: string; shortcut: string }[] = [
        { type: 'select', icon: 'V', label: 'Select', shortcut: 'V' },
        { type: 'draw-room', icon: 'R', label: 'Room', shortcut: 'R' },
        { type: 'draw-mask', icon: 'M', label: 'Mask', shortcut: 'M' },
        { type: 'place-symbol', icon: 'P', label: 'Symbol', shortcut: 'P' },
        { type: 'scale-calibrate', icon: 'S', label: 'Calibrate', shortcut: 'S' },
        { type: 'measure', icon: 'D', label: 'Measure', shortcut: 'D' },
    ];

    return (
        <div className="w-14 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 space-y-4 z-20 shadow-[10px_0_30px_rgba(0,0,0,0.3)]">
            {tools.map((tool) => (
                <button
                    key={tool.type}
                    onClick={() => editor?.setActiveTool(tool.type)}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all relative group ${activeTool === tool.type
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                    title={`${tool.label} (${tool.shortcut})`}
                >
                    <span className="text-sm font-black tracking-tighter opacity-80 group-hover:opacity-100">{tool.icon}</span>

                    {/* Tooltip */}
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-700 shadow-xl">
                        {tool.label} <span className="text-slate-500 ml-1">{tool.shortcut}</span>
                    </div>

                    {/* Active Indicator Line */}
                    {activeTool === tool.type && (
                        <div className="absolute left-0 top-2 bottom-2 w-1 bg-white rounded-r-full" />
                    )}
                </button>
            ))}

            <div className="flex-1" />

            {/* Edit Mode Indicator (Mini-Toggle) */}
            <button
                onClick={() => editor?.toggleEditMode()}
                className={`w-10 h-10 rounded-full flex flex-col items-center justify-center border-2 transition-all group relative ${isEditMode
                    ? 'border-red-500 bg-red-500/10 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                    : 'border-slate-700 text-slate-600 hover:border-slate-500 hover:text-slate-400'
                    }`}
                title={isEditMode ? "Exit Edit Mode" : "Enter Edit Mode (L)"}
            >
                <span className="text-[10px] font-black leading-none">EDIT</span>
                <div className={`mt-0.5 w-1.5 h-1.5 rounded-full transition-colors ${isEditMode ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`} />

                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-700 shadow-xl">
                    {isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode'} <span className="text-slate-500 ml-1">L</span>
                </div>
            </button>
        </div>
    );
};
