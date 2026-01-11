import React, { useState, useEffect } from 'react';

interface BigAssFansBuilderProps {
    initialMetadata?: Record<string, any>;
    onChange?: (spec: BigAssFansSpec) => void;
    deviceId?: string;
}

export interface BigAssFansSpec {
    orderingCode: string;
    shorthand: string;
    pdfUrl: string;
    shoppingLink: string;
    fanSeries: string;
    fanSize: string;
    fanFinish: string;
    fanMount: string;
    fanMaterial: string;
    fanEnvironment: string;
    fanLightKit: string;
    fanVoltage: string;
    // Calculated Properties
    cfm: number;
    maxPower: number;
}

// Technical Data based on Haiku Cutsheet (Approximate)
const PERFORMANCE_DATA: Record<string, { cfm: number, watts: number }> = {
    '52-AL': { cfm: 5172, watts: 15.1 },
    '52-BA': { cfm: 5172, watts: 15.1 },
    '60-AL': { cfm: 8629, watts: 26.8 },
    '60-BA': { cfm: 7673, watts: 21.4 },
    '84-AL': { cfm: 12000, watts: 45.0 }
};

export const BigAssFansBuilder: React.FC<BigAssFansBuilderProps> = ({ initialMetadata, onChange, deviceId }) => {
    // Big Ass Fans Spec State (Refined for Haiku Cutsheet)
    const [fanSeries, setFanSeries] = useState<string>('HK'); // Haiku
    const [fanSize, setFanSize] = useState<string>('60'); 
    const [fanEnvironment, setFanEnvironment] = useState<string>('I'); // I=Indoor, O=Outdoor
    const [fanMaterial, setFanMaterial] = useState<string>('AL'); // AL=Aluminum, BA=Bamboo
    const [fanFinish, setFanFinish] = useState<string>('WH'); // White, BL, BA, CA, CO
    const [fanMount, setFanMount] = useState<string>('STD'); // STD, LOW, UNIV
    const [fanLightKit, setFanLightKit] = useState<string>('L'); // L=Integrated LED, NL=No Light
    const [fanVoltage, setFanVoltage] = useState<string>('UNV');
    const [specShorthand, setSpecShorthand] = useState<string>('');
    const [specPdfUrl, setSpecPdfUrl] = useState<string>('https://bigassfans.com/docs/haiku/haiku/cutsheet-haiku-en.pdf');
    const [specShoppingLink, setSpecShoppingLink] = useState<string>('');

    // Pre-populate from initial metadata
    useEffect(() => {
        if (initialMetadata) {
            setFanSeries(initialMetadata.fanSeries || 'HK');
            setFanSize(initialMetadata.fanSize || '60');
            setFanEnvironment(initialMetadata.fanEnvironment || 'I');
            setFanMaterial(initialMetadata.fanMaterial || 'AL');
            setFanFinish(initialMetadata.fanFinish || 'WH');
            setFanMount(initialMetadata.fanMount || 'STD');
            setFanLightKit(initialMetadata.fanLightKit || 'L');
            setFanVoltage(initialMetadata.fanVoltage || 'UNV');
            setSpecShorthand(initialMetadata.shorthand || '');
            setSpecPdfUrl(initialMetadata.pdfUrl || 'https://bigassfans.com/docs/haiku/haiku/cutsheet-haiku-en.pdf');
            setSpecShoppingLink(initialMetadata.shoppingLink || '');
        }
    }, [deviceId]);

    // Generate Ordering String based on typical Haiku format: SERIES-SIZE-ENV-MAT-FINISH-MOUNT-LIGHT
    const generateOrderingString = (): string => {
        return `${fanSeries}-${fanSize}-${fanEnvironment}-${fanMaterial}-${fanFinish}-${fanMount}-${fanLightKit}`;
    };

    // Calculate Performance Stats
    const calculateStats = () => {
        const key = `${fanSize}-${fanMaterial}`;
        const data = PERFORMANCE_DATA[key] || { cfm: 5000, watts: 20 };
        return {
            cfm: data.cfm,
            maxPower: data.watts
        };
    };

    // Notify parent
    useEffect(() => {
        if (onChange) {
            const stats = calculateStats();
            onChange({
                orderingCode: generateOrderingString(),
                shorthand: specShorthand || `HK-${fanSize}`,
                pdfUrl: specPdfUrl,
                shoppingLink: specShoppingLink,
                fanSeries,
                fanSize,
                fanFinish,
                fanMount,
                fanMaterial,
                fanEnvironment,
                fanLightKit,
                fanVoltage,
                ...stats
            });
        }
    }, [fanSeries, fanSize, fanEnvironment, fanMaterial, fanFinish, fanMount, fanLightKit, fanVoltage, specShorthand, specPdfUrl, specShoppingLink, onChange]);

    return (
        <div className="space-y-1.5">
            {/* Ordering String Display */}
            <div className="bg-slate-900 rounded border border-slate-800 p-2">
                <span className="text-[7px] text-slate-500 font-bold uppercase block mb-1">Ordering Code</span>
                <div className="text-[9px] text-slate-300 font-mono break-all leading-relaxed">
                    {generateOrderingString()}
                </div>
            </div>

            {/* Environment & Material */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Environment</label>
                    <select
                        value={fanEnvironment}
                        onChange={(e) => setFanEnvironment(e.target.value)}
                        className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                    >
                        <option value="I">Indoor</option>
                        <option value="O">Outdoor (Damp)</option>
                    </select>
                </div>
                <div>
                    <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Airfoil Material</label>
                    <select
                        value={fanMaterial}
                        onChange={(e) => setFanMaterial(e.target.value)}
                        className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                    >
                        <option value="AL">Aircraft-Grade Aluminum</option>
                        <option value="BA">Moso Bamboo</option>
                    </select>
                </div>
            </div>

            {/* Size & Mount */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Size</label>
                    <select
                        value={fanSize}
                        onChange={(e) => setFanSize(e.target.value)}
                        className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                    >
                        <option value="52">52" Diameter</option>
                        <option value="60">60" Diameter</option>
                        <option value="84">84" Diameter</option>
                    </select>
                </div>
                <div>
                    <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Mounting</label>
                    <select
                        value={fanMount}
                        onChange={(e) => setFanMount(e.target.value)}
                        className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                    >
                        <option value="LOW">Low Profile (Flush)</option>
                        <option value="STD">Standard</option>
                        <option value="UNIV">Universal (Sloped)</option>
                    </select>
                </div>
            </div>

            {/* Finish */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Finish</label>
                <select
                    value={fanFinish}
                    onChange={(e) => setFanFinish(e.target.value)}
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                >
                    <option value="WH">White</option>
                    <option value="BL">Black</option>
                    <option value="BA">Brushed Aluminum</option>
                    <option value="CA">Caramel (Bamboo)</option>
                    <option value="CO">Cocoa (Bamboo)</option>
                    <option value="DR">Driftwood (Bamboo)</option>
                </select>
            </div>

            {/* Light Kit */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Light Kit</label>
                <select
                    value={fanLightKit}
                    onChange={(e) => setFanLightKit(e.target.value)}
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                >
                    <option value="L">Integrated LED (16 Settings)</option>
                    <option value="NL">No Light</option>
                </select>
            </div>

            {/* Shorthand & Shopping */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800">
                <div>
                    <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Shorthand</label>
                    <input
                        type="text"
                        value={specShorthand}
                        onChange={(e) => setSpecShorthand(e.target.value.toUpperCase())}
                        placeholder={`HK-${fanSize}`}
                        className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Shopping Link</label>
                    <input
                        type="url"
                        value={specShoppingLink}
                        onChange={(e) => setSpecShoppingLink(e.target.value)}
                        placeholder="https://..."
                        className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                </div>
            </div>

            {/* Performance Stats HUD */}
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800">
                <div className="bg-slate-900/50 p-1.5 rounded">
                    <span className="text-[6px] text-slate-500 uppercase font-bold block">Airflow</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">{calculateStats().cfm} CFM</span>
                </div>
                <div className="bg-slate-900/50 p-1.5 rounded">
                    <span className="text-[6px] text-slate-500 uppercase font-bold block">Max Power</span>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">{calculateStats().maxPower} W</span>
                </div>
            </div>
        </div>
    );
};
