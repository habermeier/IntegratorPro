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
    rooms: any[];
}

export const PlacedDevicesView: React.FC<PlacedDevicesViewProps> = ({
    devices,
    searchQuery,
    onSearchChange,
    onFocusDevice,
    onDeleteDevice,
    onSelectDevice,
    rooms
}) => {
    // 1. Group by Room
    const groupedByRoom = React.useMemo(() => {
        const filtered = devices.filter(d =>
            d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.productId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.deviceTypeId?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const map: Record<string, { name: string, items: any[] }> = {};

        // Pre-populate with known rooms
        rooms.forEach(r => {
            map[r.id] = { name: r.name, items: [] };
        });

        // Unassigned bucket
        map['unassigned'] = { name: 'Unassigned / Hallway', items: [] };

        filtered.forEach(d => {
            const rawRoomId = d.roomId;
            let targetGroupId = 'unassigned';

            if (rawRoomId) {
                // 1. Direct ID match
                if (map[rawRoomId]) {
                    targetGroupId = rawRoomId;
                } else {
                    // 2. Name match (case-insensitive fallback with fuzzy prefix)
                    const foundRoom = rooms.find(r =>
                        r.name.toLowerCase() === rawRoomId.toLowerCase() ||
                        r.id.toLowerCase() === rawRoomId.toLowerCase() ||
                        rawRoomId.toLowerCase().startsWith(r.name.toLowerCase())
                    );
                    if (foundRoom) {
                        targetGroupId = foundRoom.id;
                    } else {
                        // 3. Fallback: Use the string itself as the room name if it looks like a name
                        targetGroupId = rawRoomId;
                        if (!map[targetGroupId]) {
                            map[targetGroupId] = { name: rawRoomId, items: [] };
                        }
                    }
                }
            }

            map[targetGroupId].items.push(d);
        });

        return Object.entries(map)
            .filter(([_, data]) => data.items.length > 0)
            .sort((a, b) => {
                if (a[0] === 'unassigned') return 1;
                if (b[0] === 'unassigned') return -1;
                return a[1].name.localeCompare(b[1].name);
            });
    }, [devices, rooms, searchQuery]);

    const isGenericName = (name: string) => !name || /^Device \d+$/.test(name);

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

            {/* Device List - Grouped by Room */}
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pb-10">
                {groupedByRoom.length === 0 ? (
                    <div className="text-center py-10 opacity-30 italic text-[10px]">
                        {searchQuery ? 'No matching devices' : 'No devices placed yet'}
                    </div>
                ) : (
                    groupedByRoom.map(([roomId, data]) => (
                        <div key={roomId} className="space-y-1.5">
                            <div className="flex items-center gap-2 px-1 mb-1">
                                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{data.name}</span>
                                <div className="h-[1px] flex-1 bg-slate-800" />
                                <span className="text-[7px] font-mono text-slate-600">{data.items.length}</span>
                            </div>

                            <div className="space-y-1">
                                {data.items.sort((a, b) => (a.productId || '').localeCompare(b.productId || '')).map(device => {
                                    const isGeneric = isGenericName(device.name);
                                    const title = isGeneric ? (device.productId || device.deviceTypeId) : device.name;
                                    const subTitle = isGeneric ? device.name : device.productId;

                                    return (
                                        <div
                                            key={device.id}
                                            className="group relative flex items-center justify-between p-1.5 rounded bg-slate-800/20 hover:bg-slate-800/40 border border-slate-800/40 hover:border-slate-700 transition-all cursor-pointer"
                                            onClick={() => onSelectDevice(device.id)}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[10px] font-bold truncate text-slate-100 uppercase tracking-tight">
                                                    {title}
                                                </div>
                                                <div className="text-[7px] text-slate-500 truncate mt-0.5 tracking-tighter flex items-center gap-1 font-mono uppercase">
                                                    <span>{subTitle}</span>
                                                    <span className="text-slate-800">•</span>
                                                    <span>{device.busAssignment || 'N/A'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onFocusDevice(device.id); }}
                                                    className="p-1 rounded bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white transition-colors border border-slate-700"
                                                    title="Focus"
                                                >
                                                    <Target size={10} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDeleteDevice(device.id); }}
                                                    className="p-1 rounded bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white transition-colors border border-slate-700"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
