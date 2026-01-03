import React from 'react';
import { Target, MapPin, Box } from 'lucide-react';

interface RoomEditorProps {
    selectedRoom: any;
    calculateRoomStats: { area: number; areaFt: number; width: number; height: number };
    onClearSelection: () => void;
    onFocusRoom: (id: string) => void;
}

export const RoomEditor: React.FC<RoomEditorProps> = ({
    selectedRoom,
    calculateRoomStats,
    onClearSelection,
    onFocusRoom
}) => {
    return (
        <div className="p-3 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Editing Room</h3>
                <button
                    onClick={onClearSelection}
                    className="text-[8px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors uppercase font-bold"
                >
                    Clear
                </button>
            </div>

            {/* Room Properties */}
            <div className="space-y-3">
                <div className="p-2 bg-slate-950 rounded border border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[7px] text-slate-400 uppercase font-bold">Room Name</span>
                        <span className="text-[9px] text-slate-200 font-mono">{selectedRoom.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[7px] text-slate-400 uppercase font-bold">Area</span>
                        <span className="text-[9px] text-emerald-400 font-mono">
                            {calculateRoomStats.areaFt.toFixed(1)} ft²
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-slate-950 rounded border border-slate-700">
                        <span className="text-[7px] text-slate-500 block mb-1">WIDTH</span>
                        <span className="text-[10px] text-slate-200 font-mono">{calculateRoomStats.width.toFixed(2)}m</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded border border-slate-700">
                        <span className="text-[7px] text-slate-500 block mb-1">HEIGHT</span>
                        <span className="text-[10px] text-slate-200 font-mono">{calculateRoomStats.height.toFixed(2)}m</span>
                    </div>
                </div>

                <button
                    onClick={() => onFocusRoom(selectedRoom.id)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 transition-all text-[9px] font-bold uppercase"
                >
                    <Target size={12} />
                    <span>Focus on Room</span>
                </button>
            </div>
        </div>
    );
};
