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
    const [fastZoomMultiplier, setFastZoomMultiplier] = useState<number>(3);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Load from Server
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                if (res.ok) {
                    const data = await res.json();
                    if (data.units) {
                        setUnits(data.units);
                        localStorage.setItem('integrator-pro-units', data.units);
                        window.dispatchEvent(new Event('storage-units-changed'));
                    }
                    if (data.fastZoomMultiplier) {
                        setFastZoomMultiplier(data.fastZoomMultiplier);
                        localStorage.setItem('integrator-pro-fast-zoom-multiplier', data.fastZoomMultiplier.toString());
                    }
                }
            } catch (err) {
                console.error('Failed to load settings from server:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, []);

    const saveSettings = async (newUnits: UnitSystem, newMultiplier: number) => {
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ units: newUnits, fastZoomMultiplier: newMultiplier })
            });
        } catch (err) {
            console.error('Failed to save settings to server:', err);
        }
    };

    const handleUnitChange = (newUnits: UnitSystem) => {
        setUnits(newUnits);
        localStorage.setItem('integrator-pro-units', newUnits);
        saveSettings(newUnits, fastZoomMultiplier);
        // Dispatch a custom event to notify other components of the change
        window.dispatchEvent(new Event('storage-units-changed'));
    };

    const handleMultiplierChange = (newMultiplier: number) => {
        setFastZoomMultiplier(newMultiplier);
        localStorage.setItem('integrator-pro-fast-zoom-multiplier', newMultiplier.toString());
        saveSettings(units, newMultiplier);
        window.dispatchEvent(new Event('storage-settings-changed'));
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
                        {isLoading ? (
                            <div className="flex items-center justify-center p-20 text-slate-500">
                                Loading settings...
                            </div>
                        ) : activeCategory === 'floorplan' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Floorplan Settings</h3>
                                    <p className="text-slate-400 text-sm">Configure defaults and display preferences for the floorplan editor.</p>
                                </div>

                                {/* Unit System */}
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
                                </div>

                                {/* Zoom Settings */}
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h4 className="text-lg font-semibold text-white">Interaction Speed</h4>
                                            <p className="text-slate-400 text-sm mt-1">
                                                Adjust the speed multiplier for navigation shortcuts.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-slate-300">Fast Zoom Multiplier (Shift + Scroll)</label>
                                            <div className="flex items-center space-x-3">
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="10"
                                                    step="0.5"
                                                    value={fastZoomMultiplier}
                                                    onChange={(e) => handleMultiplierChange(parseFloat(e.target.value))}
                                                    className="w-48 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                />
                                                <span className="w-12 text-center py-1 bg-slate-800 rounded-md text-blue-400 font-mono font-bold text-sm border border-slate-700">
                                                    {fastZoomMultiplier}x
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-500 italic">
                                            Recommended setting: 3x. Higher values provide faster navigation but less precision.
                                        </p>
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
