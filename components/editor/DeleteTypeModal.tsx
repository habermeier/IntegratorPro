import React, { useState } from 'react';
import { AlertTriangle, Trash2, Replace, X } from 'lucide-react';
import { SymbolDefinition } from '../../editor/models/symbolLibrary';

interface DeleteTypeModalProps {
    isOpen: boolean;
    typeName: string;
    usageCount: number;
    availableReplacementTypes: SymbolDefinition[];
    onDeleteAll: () => void;
    onReplaceAndDelete: (newTypeId: string) => void;
    onCancel: () => void;
}

export const DeleteTypeModal: React.FC<DeleteTypeModalProps> = ({
    isOpen,
    typeName,
    usageCount,
    availableReplacementTypes,
    onDeleteAll,
    onReplaceAndDelete,
    onCancel
}) => {
    // If usage > 0 default to replace (safer), else default to delete (only option)
    const [action, setAction] = useState<'delete' | 'replace'>(usageCount > 0 ? 'replace' : 'delete');
    const [replacementTypeId, setReplacementTypeId] = useState<string>(availableReplacementTypes[0]?.id || '');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (action === 'delete') {
            onDeleteAll();
        } else {
            if (replacementTypeId) {
                onReplaceAndDelete(replacementTypeId);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Delete Custom Type</h3>
                            <p className="text-sm text-slate-400">
                                {usageCount > 0
                                    ? <><span className="text-white font-semibold">"{typeName}"</span> is in use.</>
                                    : <><span className="text-white font-semibold">"{typeName}"</span> will be removed from library.</>
                                }
                            </p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-4 mb-6">
                    {usageCount > 0 ? (
                        <>
                            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-sm text-slate-300">
                                There are <span className="font-bold text-white">{usageCount}</span> devices currently using this type on the floor plan.
                            </div>

                            <div className="space-y-3">
                                {/* Option 1: Replace */}
                                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${action === 'replace'
                                        ? 'bg-blue-600/10 border-blue-500/50'
                                        : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="deleteAction"
                                        value="replace"
                                        checked={action === 'replace'}
                                        onChange={() => setAction('replace')}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 font-bold text-white text-sm mb-1">
                                            <Replace size={14} className="text-blue-400" />
                                            Replace Devices
                                        </div>
                                        <p className="text-xs text-slate-400 mb-2">
                                            Swap existing devices to a different type, then delete this one.
                                        </p>
                                        {action === 'replace' && (
                                            <select
                                                value={replacementTypeId}
                                                onChange={(e) => setReplacementTypeId(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded px-2 py-1.5 focus:border-blue-500 outline-none"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {availableReplacementTypes.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </label>

                                {/* Option 2: Delete All */}
                                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${action === 'delete'
                                        ? 'bg-red-600/10 border-red-500/50'
                                        : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="deleteAction"
                                        value="delete"
                                        checked={action === 'delete'}
                                        onChange={() => setAction('delete')}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 font-bold text-white text-sm mb-1">
                                            <Trash2 size={14} className="text-red-400" />
                                            Delete All
                                        </div>
                                        <p className="text-xs text-slate-400">
                                            Permanently remove the type and all {usageCount} associated devices.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </>
                    ) : (
                        <div className="p-4 bg-slate-800 rounded-lg text-sm text-slate-300">
                            Are you sure you want to permanently delete <span className="font-bold text-white">"{typeName}"</span> from your custom library?
                            <br /><br />
                            This action cannot be undone.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white uppercase transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`px-4 py-2 text-xs font-bold text-white rounded uppercase shadow-lg transition-colors flex items-center gap-2 ${action === 'delete'
                                ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20'
                                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                            }`}
                    >
                        {action === 'delete' ? <Trash2 size={14} /> : <Replace size={14} />}
                        {action === 'delete' ? (usageCount > 0 ? 'Delete All' : 'Delete Type') : 'Replace & Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};
