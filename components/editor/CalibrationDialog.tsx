import React from 'react';

interface CalibrationDialogProps {
    realDist: string;
    setRealDist: (dist: string) => void;
    onCancel: () => void;
    onApply: () => void;
}

export const CalibrationDialog: React.FC<CalibrationDialogProps> = React.memo(({
    realDist,
    setRealDist,
    onCancel,
    onApply
}) => {
    const units = (localStorage.getItem('integrator-pro-units') || 'IMPERIAL') as 'IMPERIAL' | 'METRIC';
    const isImperial = units === 'IMPERIAL';

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-96 transform transition-all animate-in fade-in zoom-in duration-200">
                <h3 className="text-xl font-bold text-white mb-2">Scale Calibration</h3>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                    How far apart are the two points you selected? Use natural units like <span className={isImperial ? "text-blue-400" : "text-emerald-400"}>
                        {isImperial ? "10ft 6in" : "3.2m"}
                    </span>.
                </p>
                <input
                    autoFocus
                    type="text"
                    placeholder={isImperial ? "e.g. 10' 6\" or 12ft" : "e.g. 3.2m or 320cm"}
                    value={realDist}
                    onChange={(e) => setRealDist(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onApply()}
                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-white mb-6 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-600"
                />
                <div className="flex space-x-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onApply}
                        className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/20 transition-all"
                    >
                        Apply Scale
                    </button>
                </div>
            </div>
        </div>
    );
});
