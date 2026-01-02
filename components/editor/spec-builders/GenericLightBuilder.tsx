import React, { useState, useEffect } from 'react';

interface GenericLightBuilderProps {
    initialMetadata?: Record<string, any>;
    onChange?: (spec: GenericLightSpec) => void;
}

export interface GenericLightSpec {
    orderingCode: string;
    shorthand: string;
    pdfUrl: string;
    shoppingLink: string;
}

export const GenericLightBuilder: React.FC<GenericLightBuilderProps> = ({ initialMetadata, onChange }) => {
    // Manual Spec State (for generic lights) (AUTO-SPEC-SYSTEM-P26)
    const [manualOrderingCode, setManualOrderingCode] = useState<string>('');
    const [manualShorthand, setManualShorthand] = useState<string>('');
    const [manualPdfUrl, setManualPdfUrl] = useState<string>('');
    const [manualShoppingLink, setManualShoppingLink] = useState<string>('');

    // Pre-populate from initial metadata (AUTO-SPEC-SYSTEM-P26)
    useEffect(() => {
        if (initialMetadata) {
            if (initialMetadata.orderingCode) setManualOrderingCode(initialMetadata.orderingCode);
            if (initialMetadata.shorthand) setManualShorthand(initialMetadata.shorthand);
            if (initialMetadata.pdfUrl) setManualPdfUrl(initialMetadata.pdfUrl);
            if (initialMetadata.shoppingLink) setManualShoppingLink(initialMetadata.shoppingLink);
        }
    }, [initialMetadata]);

    // Notify parent of changes (AUTO-SPEC-SYSTEM-P26)
    useEffect(() => {
        if (onChange) {
            onChange({
                orderingCode: manualOrderingCode,
                shorthand: manualShorthand,
                pdfUrl: manualPdfUrl,
                shoppingLink: manualShoppingLink
            });
        }
    }, [manualOrderingCode, manualShorthand, manualPdfUrl, manualShoppingLink, onChange]);

    return (
        <div className="space-y-1.5">
            {/* Ordering Code */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Ordering Code</label>
                <input
                    type="text"
                    value={manualOrderingCode}
                    onChange={(e) => setManualOrderingCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    placeholder="e.g., ABC-123-XYZ"
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none"
                />
            </div>

            {/* Shorthand (5-7 letters) */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Shorthand (5-7 letters)</label>
                <input
                    type="text"
                    value={manualShorthand}
                    onChange={(e) => setManualShorthand(e.target.value.toUpperCase().slice(0, 7))}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    placeholder="e.g., DL-STD"
                    maxLength={7}
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none uppercase"
                />
            </div>

            {/* Spec PDF URL */}
            <div>
                <label className="text-[7px] text-slate-500 uppercase font-bold block mb-1">Spec PDF URL</label>
                <input
                    type="url"
                    value={manualPdfUrl}
                    onChange={(e) => setManualPdfUrl(e.target.value)}
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
                    value={manualShoppingLink}
                    onChange={(e) => setManualShoppingLink(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    placeholder="https://..."
                    className="w-full text-[9px] text-slate-300 font-mono px-2 py-1.5 bg-slate-900 rounded border border-slate-800 focus:border-blue-500 focus:outline-none"
                />
            </div>
        </div>
    );
};
