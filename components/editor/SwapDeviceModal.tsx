import React from 'react';
import { RefreshCw, Monitor, Grid, Box } from 'lucide-react';

interface SwapDeviceModalProps {
    isOpen: boolean;
    currentDeviceName: string;
    newDeviceName: string;
    onSwapInstance: () => void;
    onSwapRoom: () => void;
    onSwapProject: () => void;
    onCancel: () => void;
}

export const SwapDeviceModal: React.FC<SwapDeviceModalProps> = ({
    isOpen,
    currentDeviceName,
    newDeviceName,
    onSwapInstance,
    onSwapRoom,
    onSwapProject,
    onCancel
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[340px] bg-slate-900 rounded-lg border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900/50 to-slate-900 border-b border-slate-700 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <RefreshCw className="w-4 h-4 text-blue-400" />
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Swap Device</h2>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    <div className="text-xs text-slate-300">
                        <p>Replacing <span className="text-amber-400 font-bold">{currentDeviceName}</span> with <span className="text-green-400 font-bold">{newDeviceName}</span>.</p>
                        <p className="mt-2 text-slate-500">Select scope:</p>
                    </div>

                    <div className="space-y-2">
                        <button
                            onClick={onSwapInstance}
                            className="w-full flex items-center justify-between p-3 rounded bg-slate-800 border border-slate-700 hover:border-blue-500 hover:bg-slate-700 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded bg-blue-500/10 text-blue-400 group-hover:text-blue-300 text-center">
                                    <Monitor size={16} />
                                </div>
                                <div className="text-left">
                                    <div className="text-xs font-bold text-slate-200">This Instance Only</div>
                                    <div className="text-[10px] text-slate-500">Only replacements selected device</div>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={onSwapRoom}
                            className="w-full flex items-center justify-between p-3 rounded bg-slate-800 border border-slate-700 hover:border-blue-500 hover:bg-slate-700 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded bg-amber-500/10 text-amber-400 group-hover:text-amber-300 text-center">
                                    <Grid size={16} />
                                </div>
                                <div className="text-left">
                                    <div className="text-xs font-bold text-slate-200">All in Current Room</div>
                                    <div className="text-[10px] text-slate-500">Replaces all matching in this room</div>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={onSwapProject}
                            className="w-full flex items-center justify-between p-3 rounded bg-slate-800 border border-slate-700 hover:border-blue-500 hover:bg-slate-700 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded bg-purple-500/10 text-purple-400 group-hover:text-purple-300 text-center">
                                    <Box size={16} />
                                </div>
                                <div className="text-left">
                                    <div className="text-xs font-bold text-slate-200">Entire Project</div>
                                    <div className="text-[10px] text-slate-500">Replaces every instance globally</div>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-950 p-3 border-t border-slate-800 flex justify-end">
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};
