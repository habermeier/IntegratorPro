import React, { useState, useEffect, useRef } from 'react';
import { Type, Check, X } from 'lucide-react';

interface NameNewTypeModalProps {
    isOpen: boolean;
    defaultName: string;
    existingNames: string[];
    onConfirm: (name: string) => void;
    onCancel: () => void;
}

export const NameNewTypeModal: React.FC<NameNewTypeModalProps> = ({
    isOpen,
    defaultName,
    existingNames,
    onConfirm,
    onCancel
}) => {
    const [name, setName] = useState(defaultName);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input on open
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isDuplicate = existingNames.some(existing => existing.toLowerCase() === name.trim().toLowerCase());
    const isValid = name.trim().length > 0 && !isDuplicate;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isValid) {
            onConfirm(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[380px] bg-slate-900 rounded-lg border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-900/50 to-slate-900 border-b border-slate-700 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Type className="w-4 h-4 text-indigo-400" />
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Save As New Type</h2>
                        </div>
                        <p className="text-[10px] text-slate-400">
                            Create a separate definition for this configuration.
                        </p>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
                                New Fixture Name
                            </label>
                            <input
                                ref={inputRef}
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={`w-full bg-slate-950 border text-white px-3 py-2 rounded text-sm outline-none transition-all placeholder:text-slate-600 ${isDuplicate
                                        ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                                        : 'border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                                    }`}
                                placeholder="e.g. Recessed 2DS Custom..."
                            />
                            {isDuplicate && (
                                <p className="text-[10px] text-red-400 mt-1.5 font-medium animate-in slide-in-from-top-1">
                                    Name already exists. Please choose a unique name.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-950 p-3 border-t border-slate-800 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase flex items-center gap-1"
                        >
                            <X size={14} /> Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!isValid}
                            className={`px-4 py-1.5 text-xs font-bold text-white rounded transition-colors uppercase flex items-center gap-1 shadow-lg ${isValid
                                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20'
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                }`}
                        >
                            <Check size={14} /> Create Type
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
