import React, { useEffect } from 'react';
import { ViewMode } from '../types';
import { X, Activity } from 'lucide-react';

interface MobileNavProps {
    isOpen: boolean;
    onClose: () => void;
    currentView: ViewMode | 'COVER_SHEET';
    onNavigate: (mode: ViewMode | 'COVER_SHEET') => void;
    navItems: Array<{
        mode: ViewMode | 'COVER_SHEET';
        label: string;
        icon: any;
    }>;
}

const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose, currentView, onNavigate, navItems }) => {
    // Prevent body scroll when menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Handle Backdrop Click
    const handleBackdropClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={handleBackdropClick}
            />

            {/* Drawer */}
            <div
                className={`fixed inset-y-0 left-0 w-64 bg-slate-950 border-r border-slate-800 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 flex items-center justify-between border-b border-slate-800">
                        <h1 className="text-xl font-bold tracking-tight text-white flex items-center">
                            <Activity className="text-blue-500 mr-2" size={20} />
                            Integrator<span className="text-blue-500">Pro</span>
                        </h1>
                        <button
                            onClick={onClose}
                            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Navigation Items */}
                    <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
                        {navItems.map((item) => (
                            <button
                                key={item.label}
                                onClick={() => {
                                    onNavigate(item.mode);
                                    onClose();
                                }}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${currentView === item.mode
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <item.icon size={20} />
                                <span className="font-medium">{item.label}</span>
                            </button>
                        ))}
                    </nav>

                    {/* Footer Info */}
                    <div className="p-4 border-t border-slate-800">
                        <div className="bg-slate-900 rounded p-3 text-xs text-slate-500">
                            Project: <span className="text-slate-300">270 Boll Ave</span><br />
                            Status: <span className="text-amber-500">Draft</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MobileNav;
