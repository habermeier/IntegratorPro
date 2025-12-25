import React, { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Save, X } from 'lucide-react';
import { dataService } from '../../src/services/DataService';

interface ConflictDetail {
    error: string;
    serverToken: string;
    clientToken: string;
}

interface MassiveChangeDetail {
    type: string;
    lastCount: number;
    currentCount: number;
    data: any[];
}

const ConflictNotification: React.FC = () => {
    const [conflict, setConflict] = useState<ConflictDetail | null>(null);
    const [massiveChange, setMassiveChange] = useState<MassiveChangeDetail | null>(null);

    useEffect(() => {
        const handleConflict = (e: any) => {
            setConflict(e.detail);
        };

        const handleMassiveChange = (e: any) => {
            setMassiveChange(e.detail);
        };

        window.addEventListener('project-collision-detected', handleConflict);
        window.addEventListener('massive-change-detected', handleMassiveChange);

        return () => {
            window.removeEventListener('project-collision-detected', handleConflict);
            window.removeEventListener('massive-change-detected', handleMassiveChange);
        };
    }, []);

    const handleReload = () => {
        window.location.reload();
    };

    const handleForceSave = async () => {
        const projectData = dataService.getCachedProject();
        if (projectData) {
            try {
                await dataService.saveProject(projectData, true); // force=true
                setConflict(null);
                setMassiveChange(null);
            } catch (err) {
                console.error('Failed to force save:', err);
            }
        }
    };

    if (!conflict && !massiveChange) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-md animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-900 border border-red-500/50 rounded-xl shadow-2xl shadow-red-900/20 overflow-hidden backdrop-blur-xl">
                <div className="bg-red-500/10 px-4 py-3 border-b border-red-500/20 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-red-400 font-bold uppercase tracking-wider text-xs">
                        <AlertCircle size={16} />
                        <span>{conflict ? 'Save Conflict Detected' : 'Safety Interlock Active'}</span>
                    </div>
                    <button
                        onClick={() => { setConflict(null); setMassiveChange(null); }}
                        className="text-slate-500 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <p className="text-slate-300 text-sm leading-relaxed">
                        {conflict ? (
                            <>Another tab or user has updated the project. Saving now would overwrite their changes.</>
                        ) : (
                            <>A massive reduction in data was detected ({massiveChange?.lastCount} → {massiveChange?.currentCount} items). Auto-save was paused to prevent accidental data loss.</>
                        )}
                    </p>

                    <div className="flex flex-col space-y-2">
                        <button
                            onClick={handleReload}
                            className="flex items-center justify-center space-x-2 w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-semibold transition-all shadow-lg shadow-blue-900/40"
                        >
                            <RefreshCw size={18} />
                            <span>Reload Latest (Safe)</span>
                        </button>
                        <button
                            onClick={handleForceSave}
                            className="flex items-center justify-center space-x-2 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-lg font-semibold transition-all border border-slate-700"
                        >
                            <Save size={18} />
                            <span>Overwrite Server (Force Save)</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConflictNotification;
