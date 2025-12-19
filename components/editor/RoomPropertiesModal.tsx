import React, { useState, useEffect } from 'react';
import { Room, RoomType } from '../../editor/models/types';

interface RoomPropertiesModalProps {
    room: Room;
    existingNames: string[];
    onSave: (name: string, type: RoomType) => void;
    onCancel: () => void;
}

export const RoomPropertiesModal: React.FC<RoomPropertiesModalProps> = ({
    room,
    existingNames,
    onSave,
    onCancel
}) => {
    const [name, setName] = useState('');
    const [roomType, setRoomType] = useState<RoomType>('other');
    const [error, setError] = useState('');

    const roomTypes: { value: RoomType, label: string }[] = [
        { value: 'hallway', label: 'Hallway' },
        { value: 'closet', label: 'Closet' },
        { value: 'bedroom', label: 'Bedroom' },
        { value: 'bathroom', label: 'Bathroom' },
        { value: 'open', label: 'Open (Living/Kitchen/etc)' },
        { value: 'other', label: 'Other' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('Room name is required');
            return;
        }

        if (existingNames.includes(name.trim())) {
            setError('Room name must be unique');
            return;
        }

        onSave(name.trim(), roomType);
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-800 bg-slate-900">
                    <h2 className="text-xl font-bold text-white mb-1">Room Properties</h2>
                    <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Define attributes for your new room</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Room Name</label>
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                setError('');
                            }}
                            placeholder="e.g. Master Bedroom"
                            className={`w-full bg-slate-950 border ${error ? 'border-red-500' : 'border-slate-800'} rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
                        />
                        {error && <p className="text-red-400 text-[10px] uppercase font-bold">{error}</p>}
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Room Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {roomTypes.map((t) => (
                                <label
                                    key={t.value}
                                    className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${roomType === t.value
                                            ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                                            : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="roomType"
                                        value={t.value}
                                        checked={roomType === t.value}
                                        onChange={() => setRoomType(t.value)}
                                        className="hidden"
                                    />
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${roomType === t.value ? 'border-blue-400 bg-blue-400' : 'border-slate-700'
                                        }`}>
                                        {roomType === t.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span className="text-xs font-bold">{t.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex space-x-3 pt-4 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-lg transition-colors text-xs uppercase"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-900/20 transition-all text-xs uppercase"
                        >
                            Complete Room
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
