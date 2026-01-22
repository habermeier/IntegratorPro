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

interface OverloadDetail {
    type: string;
    name: string;
    current: string;
    limit: string;
}

const ConflictNotification: React.FC = () => {
    const [conflict, setConflict] = useState<ConflictDetail | null>(null);
    const [massiveChange, setMassiveChange] = useState<MassiveChangeDetail | null>(null);
    const [overload, setOverload] = useState<OverloadDetail | null>(null);

    useEffect(() => {
        const handleConflict = (e: any) => {
            setConflict(e.detail);
        };

        const handleMassiveChange = (e: any) => {
            setMassiveChange(e.detail);
        };

        const handleOverload = (e: any) => {
            setOverload(e.detail);
        };

        window.addEventListener('project-collision-detected', handleConflict);
        window.addEventListener('massive-change-detected', handleMassiveChange);
        window.addEventListener('circuit-overload-detected', handleOverload);

        return () => {
            window.removeEventListener('project-collision-detected', handleConflict);
            window.removeEventListener('massive-change-detected', handleMassiveChange);
            window.removeEventListener('circuit-overload-detected', handleOverload);
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
                setOverload(null);
            } catch (err) {
                console.error('Failed to force save:', err);
            }
        }
    };

    if (!conflict && !massiveChange && !overload) return null;

    const isUrgent = !!conflict || !!massiveChange;
    const alertTitle = conflict ? 'Save Conflict Detected' :
        massiveChange ? 'Safety Interlock Active' :
            'Electrical Overload Warning';

    return (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-md animate-in slide-in-from-bottom-4 duration-300">
            <div className={`bg-slate-900 border ${isUrgent ? 'border-red-500/50 shadow-red-900/20' : 'border-amber-500/50 shadow-amber-900/20'} rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl`}>
                <div className={`${isUrgent ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'} px-4 py-3 border-b flex items-center justify-between`}>
                    <div className="flex items-center space-x-2 font-bold uppercase tracking-wider text-xs">
                        <AlertCircle size={16} />
                        <span>{alertTitle}</span>
                    </div>
                    <button
                        onClick={() => { setConflict(null); setMassiveChange(null); setOverload(null); }}
                        className="text-slate-500 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <p className="text-slate-300 text-sm leading-relaxed">
                        {conflict ? (
                            <>Another tab or user has updated the project. Saving now would overwrite their changes.</>
                        ) : massiveChange ? (
                            <>A massive reduction in data was detected ({massiveChange?.lastCount} → {massiveChange?.currentCount} items). Auto-save was paused to prevent accidental data loss. </>) : (
                            <>Electrical overload detected on <strong>{overload?.type} {overload?.name}</strong>. Current: <span className="text-amber-400 font-bold">{overload?.current}</span> (Limit: {overload?.limit}). Please re-assign devices to other circuits.</>
                        )}
                    </p>

                    {(conflict || massiveChange) && (
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
                    )}

                    {overload && !conflict && !massiveChange && (
                        <button
                            onClick={() => setOverload(null)}
                            className="flex items-center justify-center space-x-2 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-lg font-semibold transition-all border border-slate-700"
                        >
                            <span>Acknowledge Warning</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConflictNotification;
