import React from 'react';
import { Monitor, Smartphone, AlertCircle } from 'lucide-react';

const MobileBlocker: React.FC = () => {
    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-8 relative">
                <div className="bg-blue-500/10 p-4 rounded-full border border-blue-500/20">
                    <Monitor className="w-12 h-12 text-blue-400" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-slate-900 rounded-full p-2 border border-slate-700 shadow-xl">
                    <Smartphone className="w-5 h-5 text-slate-500" />
                    <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-slate-900"></div>
                </div>
            </div>

            <h1 className="text-2xl font-bold text-white mb-3">Desktop Experience Required</h1>

            <p className="text-slate-400 max-w-sm mb-8 leading-relaxed">
                The IntegratorPro portal contains complex technical data and architectural layouts that are not optimized for mobile devices.
            </p>

            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-800 w-full max-w-xs">
                <div className="flex items-center gap-3 mb-4 text-left">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <span className="text-sm text-slate-300 font-medium">Please verify on:</span>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span>Tablet (Landscape)</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span>Laptop / Desktop</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileBlocker;
