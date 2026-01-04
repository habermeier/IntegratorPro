import React from 'react';
import { Target, Lightbulb, Zap, TrendingUp, ChevronRight } from 'lucide-react';
import { calculateRoomLightingStats } from '../../../src/utils/lightModeling';
import { Room, PlacedSymbol } from '../../../editor/models/types';
import { DEFAULT_ROOM_TARGETS, getRecommendedLux } from '../../../src/constants/lightingTargets';
import { SYMBOL_LIBRARY } from '../../../editor/models/symbolLibrary';

interface RoomEditorProps {
    selectedRoom: Room;
    devices: PlacedSymbol[];
    calculateRoomStats: { area: number; areaFt: number; width: number; height: number };
    pixelsPerMeter: number;
    onUpdateRoom: (updates: Partial<Room>) => void;
    onClearSelection: () => void;
    onFocusRoom: (id: string) => void;
    lightingMode: 'circles' | 'intensity' | 'fixture';
    onToggleLightingMode: () => void;
}

export const RoomEditor: React.FC<RoomEditorProps> = ({
    selectedRoom,
    devices,
    calculateRoomStats,
    pixelsPerMeter,
    onUpdateRoom,
    onClearSelection,
    onFocusRoom,
    lightingMode,
    onToggleLightingMode
}) => {
    // 1. Calculate Live Lighting Stats
    const lightStats = React.useMemo(() => {
        return calculateRoomLightingStats(selectedRoom, devices, pixelsPerMeter);
    }, [selectedRoom, devices, pixelsPerMeter]);

    const targetLux = selectedRoom.targetLux || getRecommendedLux(selectedRoom.roomType);
    const recommendedLux = getRecommendedLux(selectedRoom.roomType);

    // Performance vs Target
    const performancePercent = Math.round((lightStats.mean / targetLux) * 100);
    const isUnderlit = lightStats.mean < targetLux * 0.9;
    const isOverlit = lightStats.mean > targetLux * 1.3;

    // Headroom Logic (One notch higher)
    // If we are hitting exactly 100%, but mean is barely target, user wants "one notch higher"
    // to allow software-side dimming/flexibility.
    const needsHeadroom = performancePercent > 80 && performancePercent < 110;

    return (
        <div className="p-3 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <div className="flex flex-col">
                    <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest leading-tight">Editing Room</h3>
                    <span className="text-[8px] text-slate-500 uppercase font-bold">{selectedRoom.id}</span>
                </div>
                <button
                    onClick={onClearSelection}
                    className="text-[8px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors uppercase font-bold"
                >
                    Clear
                </button>
            </div>

            {/* Room Properties */}
            <div className="space-y-4">
                <div className="p-2.5 bg-slate-950 rounded border border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[7px] text-slate-400 uppercase font-bold tracking-wider">Room Name / Type</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-200 font-bold">{selectedRoom.name}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[7px] text-slate-400 uppercase border border-slate-700 font-bold">
                                {selectedRoom.roomType}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/50">
                        <span className="text-[7px] text-slate-400 uppercase font-bold tracking-wider">Floor Area</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-[11px] text-emerald-400 font-mono font-bold">
                                {calculateRoomStats.areaFt.toFixed(0)}
                            </span>
                            <span className="text-[7px] text-emerald-700 font-bold">SQFT</span>
                        </div>
                    </div>
                </div>

                {/* Lighting Analysis Section */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <Lightbulb size={10} className="text-yellow-400" />
                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-wider">Illumination Goals</span>
                        </div>
                        <button
                            onClick={onToggleLightingMode}
                            className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all border ${lightingMode === 'intensity'
                                ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                                }`}
                        >
                            {lightingMode === 'intensity' ? '✓ Heatmap On' : 'Show Heatmap'}
                        </button>
                    </div>

                    <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 space-y-4 shadow-inner">
                        {/* Target Inputs */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[7px] text-slate-500 uppercase font-black">Target Lux</label>
                                <button
                                    onClick={() => onUpdateRoom({ targetLux: recommendedLux })}
                                    className="text-[7px] text-emerald-500 hover:text-emerald-400 font-bold uppercase"
                                >
                                    Reset to Recommended
                                </button>
                            </div>
                            <div className="relative group">
                                <input
                                    type="number"
                                    value={targetLux || ''}
                                    onChange={(e) => onUpdateRoom({ targetLux: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-[12px] text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                                    placeholder={`${recommendedLux} (Recommended for ${selectedRoom.roomType})`}
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-slate-600 font-bold uppercase pointer-events-none">LUX</div>
                            </div>
                        </div>

                        {/* Live Performance Meter */}
                        <div className="space-y-2">
                            <div className="flex items-end justify-between px-0.5">
                                <div className="flex flex-col">
                                    <span className="text-[7px] text-slate-500 uppercase font-bold">Computed Average</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-[16px] font-mono font-black ${isUnderlit ? 'text-amber-400' : isOverlit ? 'text-blue-400' : 'text-emerald-400'}`}>
                                            {lightStats.mean}
                                        </span>
                                        <span className="text-[8px] text-slate-600 font-bold uppercase">LUX</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Target Match</span>
                                    <div className={`text-[11px] font-bold ${isUnderlit ? 'text-amber-400' : isOverlit ? 'text-blue-400' : 'text-emerald-400'}`}>
                                        {performancePercent}%
                                    </div>
                                </div>
                            </div>

                            {/* Mini Bar Chart */}
                            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                                <div
                                    className={`h-full transition-all duration-500 ${isUnderlit ? 'bg-amber-500' : isOverlit ? 'bg-blue-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min(100, performancePercent)}%` }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <div className="flex flex-col p-1.5 bg-slate-950/50 rounded border border-slate-800/50">
                                    <span className="text-[6px] text-slate-500 uppercase font-bold">Hot Spot</span>
                                    <span className="text-[9px] text-slate-300 font-mono font-bold">{lightStats.max} <span className="text-[6px]">LUX</span></span>
                                </div>
                                <div className="flex flex-col p-1.5 bg-slate-950/50 rounded border border-slate-800/50">
                                    <span className="text-[6px] text-slate-500 uppercase font-bold">Cold Spot</span>
                                    <span className="text-[9px] text-slate-300 font-mono font-bold">{lightStats.min} <span className="text-[6px]">LUX</span></span>
                                </div>
                            </div>
                        </div>

                        {/* Procurement Hint */}
                        {needsHeadroom && (
                            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-md flex items-start gap-2 animate-pulse">
                                <TrendingUp size={12} className="text-blue-400 mt-0.5 shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-[7.5px] text-blue-300 font-bold leading-tight">
                                        COST OPTIMIZATION: UPGRADE FIXTURES
                                    </p>
                                    <p className="text-[7px] text-blue-400/80 leading-tight italic">
                                        Hitting {performancePercent}% target. Switch to higher-lumen types (L12 vs L9) to allow logic-side dimming and ensure future flexibility.
                                    </p>
                                </div>
                            </div>
                        )}

                        {isOverlit && (
                            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-start gap-2">
                                <Zap size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-[7.5px] text-emerald-300 font-bold leading-tight">
                                        VALUE ENGINEERING: OVER-SPECIFIED
                                    </p>
                                    <p className="text-[7px] text-emerald-400/80 leading-tight">
                                        Current design is {performancePercent}% over target. Consider reducing fixture count or lumen output (L9 vs L12) to reduce cost.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-slate-950 rounded border border-slate-700">
                        <span className="text-[7px] text-slate-500 block mb-1 uppercase font-bold">Width</span>
                        <span className="text-[10px] text-slate-200 font-mono italic">{calculateRoomStats.width.toFixed(2)}m</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded border border-slate-700">
                        <span className="text-[7px] text-slate-500 block mb-1 uppercase font-bold">Depth</span>
                        <span className="text-[10px] text-slate-200 font-mono italic">{calculateRoomStats.height.toFixed(2)}m</span>
                    </div>
                </div>

                {/* Fixture Breakdown */}
                {devices.length > 0 && (
                    <div className="space-y-1.5">
                        <span className="text-[7px] text-slate-500 uppercase font-black px-1">Fixture Breakdown</span>
                        <div className="bg-slate-950/30 rounded border border-slate-800 divide-y divide-slate-800/50">
                            {Object.entries(
                                devices.reduce((acc, d) => {
                                    const key = d.type;
                                    if (!acc[key]) acc[key] = { count: 0, lumens: d.metadata?.lumens, beam: d.metadata?.beamAngle, name: SYMBOL_LIBRARY[d.type]?.name || d.type };
                                    acc[key].count++;
                                    return acc;
                                }, {} as Record<string, { count: number, lumens?: number, beam?: number, name: string }>)
                            ).map(([type, info]) => (
                                <div key={type} className="flex items-center justify-between p-2">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-slate-300 font-bold leading-tight">{info.name}</span>
                                        <div className="flex gap-2">
                                            <span className="text-[7px] text-slate-500 font-mono italic">{info.lumens || 800}L</span>
                                            <span className="text-[7px] text-slate-600 font-mono">{info.beam || 60}° beam</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-emerald-400 font-black">x{info.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={() => onFocusRoom(selectedRoom.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-all text-[9px] font-bold uppercase active:scale-95"
                    >
                        <Target size={12} />
                        <span>Navigate</span>
                    </button>
                    <button
                        onClick={() => { }} // Could be "Update Room Metadata" or similar
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 transition-all text-[9px] font-bold uppercase active:scale-95 shadow-lg shadow-emerald-900/40"
                    >
                        <ChevronRight size={12} />
                        <span>Room History</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
