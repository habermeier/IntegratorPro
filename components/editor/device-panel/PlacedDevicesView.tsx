import React from 'react';
import { Search, Target, Trash2 } from 'lucide-react';
import { SYMBOL_CATEGORIES } from '../../../editor/models/symbolLibrary';

interface PlacedDevicesViewProps {
    devices: any[];
    searchQuery: string;
    onSearchChange: (q: string) => void;
    onFocusDevice: (id: string) => void;
    onDeleteDevice: (id: string) => void;
    onSelectDevice: (id: string) => void;
}

export const PlacedDevicesView: React.FC<PlacedDevicesViewProps> = ({
    devices,
    searchQuery,
    onSearchChange,
    onFocusDevice,
    onDeleteDevice,
    onSelectDevice
}) => {
    // Group devices by category
    const groupedDevices = SYMBOL_CATEGORIES.map(cat => ({
        ...cat,
        items: devices.filter(d =>
            d.layerId === cat.id &&
            (d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                d.productId?.toLowerCase().includes(searchQuery.toLowerCase()))
        )
    })).filter(cat => cat.items.length > 0);

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Search Bar */}
            <div className="px-1">
                <div className="relative">
                    <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search project devices..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded py-1.5 pl-8 pr-3 text-[10px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-all font-mono"
                    />
                </div>
            </div>

            {/* Device List */}
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pb-10">
                {groupedDevices.length === 0 ? (
                    <div className="text-center py-10 opacity-30 italic text-[10px]">
                        {searchQuery ? 'No matching devices' : 'No devices placed yet'}
                    </div>
                ) : (
                    groupedDevices.map(cat => (
                        <div key={cat.id} className="space-y-2">
                            <div className="flex items-center gap-2 px-1 mb-1">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `#${cat.color.toString(16).padStart(6, '0')}` }} />
                                <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">{cat.name}</span>
                                <div className="h-[1px] flex-1 bg-slate-800" />
                                <span className="text-[7px] font-mono text-slate-600">{cat.items.length}</span>
                            </div>

                            <div className="space-y-1">
                                {cat.items.map(device => (
                                    <div
                                        key={device.id}
                                        className="group relative flex items-center justify-between p-2 rounded bg-slate-800/20 hover:bg-slate-800/40 border border-slate-800/50 hover:border-slate-700 transition-all cursor-pointer"
                                        onClick={() => onSelectDevice(device.id)}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[9px] font-bold truncate text-slate-200">
                                                {device.name}
                                            </div>
                                            <div className="text-[7px] text-slate-500 truncate uppercase mt-0.5 tracking-tighter flex items-center gap-1 font-mono">
                                                <span>{device.productId || 'Generic'}</span>
                                                <span className="text-slate-700">•</span>
                                                <span>{device.busAssignment || 'N/A'}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onFocusDevice(device.id); }}
                                                className="p-1 rounded bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors"
                                                title="Focus"
                                            >
                                                <Target size={11} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteDevice(device.id); }}
                                                className="p-1 rounded bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
