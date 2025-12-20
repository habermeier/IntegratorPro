import React, { useState, useEffect } from 'react';
import { Map, Settings as SettingsIcon, ChevronRight } from 'lucide-react';

type UnitSystem = 'IMPERIAL' | 'METRIC';

interface SettingCategory {
    id: string;
    label: string;
    icon: any;
}

const CATEGORIES: SettingCategory[] = [
    { id: 'floorplan', label: 'Floorplan', icon: Map },
];

export const Settings: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState('floorplan');
    const [units, setUnits] = useState<UnitSystem>(() => {
        return (localStorage.getItem('integrator-pro-units') as UnitSystem) || 'IMPERIAL';
    });

    const handleUnitChange = (newUnits: UnitSystem) => {
        setUnits(newUnits);
        localStorage.setItem('integrator-pro-units', newUnits);
        // Dispatch a custom event to notify other components of the change
        window.dispatchEvent(new Event('storage-units-changed'));
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-200">
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col">
                    <div className="p-6 border-b border-slate-800">
                        <h2 className="text-xl font-bold text-white flex items-center">
                            <SettingsIcon className="mr-2 text-blue-500" size={20} />
                            Settings
                        </h2>
                    </div>
                    <nav className="flex-1 p-4 space-y-1">
                        {CATEGORIES.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => setActiveCategory(category.id)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeCategory === category.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <div className="flex items-center">
                                    <category.icon size={18} className="mr-3" />
                                    <span className="font-medium">{category.label}</span>
                                </div>
                                {activeCategory === category.id && <ChevronRight size={16} />}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-950">
                    <div className="max-w-3xl mx-auto">
                        {activeCategory === 'floorplan' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Floorplan Settings</h3>
                                    <p className="text-slate-400 text-sm">Configure defaults and display preferences for the floorplan editor.</p>
                                </div>

                                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h4 className="text-lg font-semibold text-white">Unit System</h4>
                                            <p className="text-slate-400 text-sm mt-1">
                                                Choose measurement units for floor plan dimensions and scale
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex p-1 bg-slate-800 rounded-xl w-fit">
                                        <button
                                            onClick={() => handleUnitChange('IMPERIAL')}
                                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${units === 'IMPERIAL'
                                                    ? 'bg-blue-600 text-white shadow-lg'
                                                    : 'text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            Imperial
                                        </button>
                                        <button
                                            onClick={() => handleUnitChange('METRIC')}
                                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${units === 'METRIC'
                                                    ? 'bg-blue-600 text-white shadow-lg'
                                                    : 'text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            Metric
                                        </button>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-slate-800/50">
                                        <div className="flex items-start space-x-3 text-sm text-slate-500 italic">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500/50 shrink-0" />
                                            <p>
                                                Currently active: <span className="text-blue-400 font-medium">
                                                    {units === 'IMPERIAL' ? "Feet & Inches (e.g. 10' 6\")" : "Meters (e.g. 3.20 m)"}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
