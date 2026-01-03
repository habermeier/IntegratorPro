import React, { useState, useEffect } from 'react';

interface HEWilliams2DSBuilderProps {
    initialMetadata?: Record<string, any>;
    onChange?: (spec: HEWilliams2DSSpec) => void;
}

export interface HEWilliams2DSSpec {
    orderingCode: string;
    shorthand: string;
    pdfUrl: string;
    shoppingLink: string;
    specLumens: string;
    specColor: string;
    specMountingType: string;
    specDriver: string;
    specDistribution: string;
    specFlange: string;
    specReflectorFinish: string;
    specOptions: string;
    specControl: string;
    specVoltage: string;
    specTrimType: string;
    specTrimOptions: string;
    specBracket: string;
}

export const HEWilliams2DSBuilder: React.FC<HEWilliams2DSBuilderProps> = ({ initialMetadata, onChange }) => {
    // HE Williams 2DS Spec State (AUTO-SPEC-SYSTEM-P26)
    const [specMountingType, setSpecMountingType] = useState<string>('N');
    const [specLumens, setSpecLumens] = useState<string>('L15');
    const [specColor, setSpecColor] = useState<string>('9TW');
    const [specDriver, setSpecDriver] = useState<string>('LD2');
    const [specDistribution, setSpecDistribution] = useState<string>('M');
    const [specFlange, setSpecFlange] = useState<string>('OF');
    const [specReflectorFinish, setSpecReflectorFinish] = useState<string>('CS');
    const [specOptions, setSpecOptions] = useState<string>('NONE');
    const [specControl, setSpecControl] = useState<string>('STD');
    const [specVoltage, setSpecVoltage] = useState<string>('UNV');
    const [specTrimType, setSpecTrimType] = useState<string>('O');
    const [specTrimOptions, setSpecTrimOptions] = useState<string>('NONE');
    const [specBracket, setSpecBracket] = useState<string>('F1');
    const [specShorthand, setSpecShorthand] = useState<string>('');
    const [specPdfUrl, setSpecPdfUrl] = useState<string>('');
    const [specShoppingLink, setSpecShoppingLink] = useState<string>('');

    // Pre-populate from initial metadata (AUTO-SPEC-SYSTEM-P26)
    useEffect(() => {
        if (initialMetadata) {
            if (initialMetadata.specLumens) setSpecLumens(initialMetadata.specLumens);
            if (initialMetadata.specColor) setSpecColor(initialMetadata.specColor);
            if (initialMetadata.specMountingType) setSpecMountingType(initialMetadata.specMountingType);
            if (initialMetadata.specDriver) setSpecDriver(initialMetadata.specDriver);
            if (initialMetadata.specOptions) setSpecOptions(initialMetadata.specOptions);
            if (initialMetadata.specControl) setSpecControl(initialMetadata.specControl);
            if (initialMetadata.specVoltage) setSpecVoltage(initialMetadata.specVoltage);
            if (initialMetadata.specFlange) setSpecFlange(initialMetadata.specFlange);
            if (initialMetadata.specReflectorFinish) setSpecReflectorFinish(initialMetadata.specReflectorFinish);
            if (initialMetadata.specDistribution) setSpecDistribution(initialMetadata.specDistribution);
            if (initialMetadata.specTrimType) setSpecTrimType(initialMetadata.specTrimType);
            if (initialMetadata.specTrimOptions) setSpecTrimOptions(initialMetadata.specTrimOptions);
            if (initialMetadata.specBracket) setSpecBracket(initialMetadata.specBracket);
            if (initialMetadata.shorthand) setSpecShorthand(initialMetadata.shorthand);
            if (initialMetadata.pdfUrl) setSpecPdfUrl(initialMetadata.pdfUrl);
            if (initialMetadata.shoppingLink) setSpecShoppingLink(initialMetadata.shoppingLink);
        }
    }, [initialMetadata]);

    // Detect series from initial metadata or default to 2DS
    const [seriesPrefix, setSeriesPrefix] = useState<string>(() => {
        if (initialMetadata?.orderingCode?.startsWith('2AS')) return '2AS';
        return '2DS';
    });

    // Generate HE Williams Ordering String
    const generateOrderingString = (): string => {
        const parts = [
            seriesPrefix,
            `${specLumens}/${specColor}`,
            specMountingType,
            specOptions !== 'NONE' ? specOptions : '',
            specControl !== 'STD' ? specControl : '',
            specDriver,
            specVoltage,
            specDistribution,
            specTrimType,
            specFlange,
            specReflectorFinish,
            specTrimOptions !== 'NONE' ? specTrimOptions : '',
            specBracket
        ];
        return parts.filter(p => p !== '').join(' - ');
    };

    // Notify parent of changes (AUTO-SPEC-SYSTEM-P26)
    useEffect(() => {
        if (onChange) {
            onChange({
                orderingCode: generateOrderingString(),
                shorthand: specShorthand,
                pdfUrl: specPdfUrl,
                shoppingLink: specShoppingLink,
                specLumens,
                specColor,
                specMountingType,
                specDriver,
                specDistribution,
                specFlange,
                specReflectorFinish,
                specOptions,
                specControl,
                specVoltage,
                specTrimType,
                specTrimOptions,
                specBracket
            });
        }
    }, [specLumens, specColor, specMountingType, specDriver, specDistribution, specFlange,
        specReflectorFinish, specOptions, specControl, specVoltage, specTrimType,
        specTrimOptions, specBracket, specShorthand, specPdfUrl, specShoppingLink, onChange]);

    return (
        <div className="space-y-1.5">
            {/* Ordering String Display */}
            <div className="bg-slate-900 rounded border border-slate-800 p-2">
                <span className="text-[7px] text-slate-500 font-bold uppercase block mb-1">Ordering Code</span>
                <div className="text-[9px] text-slate-300 font-mono break-all">
                    {generateOrderingString()}
                </div>
            </div>

            {/* Lumens Selection */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Lumens</label>
                <select
                    value={specLumens}
                    onChange={(e) => setSpecLumens(e.target.value)}
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                >
                    <option value="L5">L5 - 500 Lumens</option>
                    <option value="L7">L7 - 700 Lumens</option>
                    <option value="L9">L9 - 900 Lumens</option>
                    <option value="L12">L12 - 1200 Lumens</option>
                    <option value="L15">L15 - 1500 Lumens</option>
                </select>
            </div>

            {/* Mounting Type */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Mounting</label>
                <select
                    value={specMountingType}
                    onChange={(e) => setSpecMountingType(e.target.value)}
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                >
                    <option value="N">N - New Construction</option>
                    <option value="I">I - IC-Rated New Construction</option>
                    <option value="R">R - Remodel</option>
                </select>
            </div>

            {/* Color Temperature */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Color Temperature</label>
                <select
                    value={specColor}
                    onChange={(e) => setSpecColor(e.target.value)}
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                >
                    <option value="9TW">9TW - Tunable White (2700K-5000K)</option>
                </select>
            </div>

            {/* Control */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Control</label>
                <select
                    value={specControl}
                    onChange={(e) => setSpecControl(e.target.value)}
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                >
                    <option value="STD">STD - Standard (0-10V)</option>
                    <option value="AWNR">AWNR - Lutron Athena RF</option>
                    <option value="DALI">DALI - DALI Prewired</option>
                    <option value="DIM">DIM - 2x 0-10V (Level/CCT)</option>
                    <option value="DMX">DMX - DMX Prewired</option>
                </select>
            </div>

            {/* Driver */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Driver</label>
                <select
                    value={specDriver}
                    onChange={(e) => setSpecDriver(e.target.value)}
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                >
                    <option value="LD2">LD2 - Lutron DALI-2 (1%)</option>
                </select>
            </div>

            {/* Options */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Options</label>
                <select
                    value={specOptions}
                    onChange={(e) => setSpecOptions(e.target.value)}
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                >
                    <option value="NONE">NONE - No Options</option>
                    <option value="ATH">ATH - Airtight</option>
                    <option value="F">F - Fuse Kit</option>
                    <option value="CP">CP - Chicago Plenum</option>
                    <option value="AM">AM - Anti-microbial</option>
                </select>
            </div>

            {/* Voltage */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Voltage</label>
                <select
                    value={specVoltage}
                    onChange={(e) => setSpecVoltage(e.target.value)}
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                >
                    <option value="UNV">UNV - Universal (120-277V)</option>
                </select>
            </div>

            {/* Distribution */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Distribution</label>
                <select
                    value={specDistribution}
                    onChange={(e) => setSpecDistribution(e.target.value)}
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                >
                    <option value="N">N - Narrow</option>
                    <option value="M">M - Medium</option>
                    <option value="W">W - Wide</option>
                    <option value="WW">WW - Wall Wash</option>
                </select>
            </div>

            {/* Flange */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Flange Type</label>
                <select
                    value={specFlange}
                    onChange={(e) => {
                        const val = e.target.value;
                        setSpecFlange(val);
                        // ZF doesn't support 'O' (Open) Trim
                        if (val === 'ZF' && specTrimType === 'O') {
                            setSpecTrimType('L');
                        }
                    }}
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                >
                    <option value="OF">OF - 1/2" Standard Flange</option>
                    <option value="ZF">ZF - Zero-Flange Mud-In</option>
                </select>
            </div>

            {/* Trim Type */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Trim Type</label>
                <select
                    value={specTrimType}
                    onChange={(e) => setSpecTrimType(e.target.value)}
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                >
                    {specFlange !== 'ZF' && <option value="O">O - Open Reflector</option>}
                    <option value="L">L - Flush Lens</option>
                    <option value="R">R - Regressed Lens</option>
                    <option value="A">A - Angled Lens</option>
                </select>
            </div>

            {/* Reflector Finish */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Reflector Finish</label>
                <select
                    value={specReflectorFinish}
                    onChange={(e) => setSpecReflectorFinish(e.target.value)}
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                >
                    <option value="CS">CS - Clear Semi-Specular</option>
                    <option value="SG">SG - Satin-Glow</option>
                    <option value="GD">GD - Gold</option>
                    <option value="CG">CG - Champagne Gold</option>
                    <option value="PW">PW - Pewter</option>
                    <option value="SPC">SPC - Clear Specular</option>
                    <option value="RG">RG - Rose Gold</option>
                    <option value="WH">WH - White texture</option>
                    <option value="BL">BL - Black texture</option>
                </select>
            </div>

            {/* Trim Options */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Trim Options</label>
                <select
                    value={specTrimOptions}
                    onChange={(e) => setSpecTrimOptions(e.target.value)}
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                >
                    <option value="NONE">NONE - No Options</option>
                    <option value="MWT">MWT - Matte White Trim Flange</option>
                    <option value="MB">MB - Black Splay/White Flange</option>
                    <option value="AD">AD - Diffuse Acrylic Lens</option>
                    <option value="PD">PD - Diffuse Polycarbonate Lens</option>
                    <option value="WET/CC">WET/CC - Wet Location</option>
                </select>
            </div>

            {/* Bracket */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Bracket</label>
                <select
                    value={specBracket}
                    onChange={(e) => setSpecBracket(e.target.value)}
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none [&>option]:text-black [&>option]:bg-white"
                >
                    <option value="F1">F1 - Fixed Pan Bracket</option>
                    <option value="BA1">BA1 - Butterfly Pan Bracket</option>
                    <option value="CA1">CA1 - Caterpillar Pan Bracket</option>
                </select>
            </div>

            {/* Shorthand (5-7 letters) */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Shorthand (5-7 letters)</label>
                <input
                    type="text"
                    value={specShorthand}
                    onChange={(e) => setSpecShorthand(e.target.value.toUpperCase().slice(0, 7))}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    placeholder="e.g., 2DS-L15"
                    maxLength={7}
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none uppercase"
                />
            </div>

            {/* Spec PDF URL */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Spec PDF URL</label>
                <input
                    type="url"
                    value={specPdfUrl}
                    onChange={(e) => setSpecPdfUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    placeholder="https://..."
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none"
                />
            </div>

            {/* Shopping Link */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Shopping Link</label>
                <input
                    type="url"
                    value={specShoppingLink}
                    onChange={(e) => setSpecShoppingLink(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    placeholder="https://..."
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none"
                />
            </div>
        </div>
    );
};
