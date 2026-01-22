import React from 'react';

interface EditorFooterProps {
    coordsRef: React.RefObject<HTMLSpanElement | null>;
    zenMode?: boolean;
}

export const EditorFooter: React.FC<EditorFooterProps> = React.memo(({ coordsRef, zenMode }) => {
    return (
        <div className={`h-8 bg-slate-950 border-t border-slate-800 flex items-center px-4 justify-between text-[10px] text-slate-600 font-medium z-10 transition-all ${zenMode ? 'justify-center border-none' : ''}`}>
            <div className="flex items-center space-x-4">
                <span ref={coordsRef} className={zenMode ? 'text-slate-400 font-bold' : ''}>---</span>
                {!zenMode && (
                    <>
                        <span className="w-px h-3 bg-slate-800" />
                        <span className="text-slate-500">IntegratorPro v1.15</span>
                    </>
                )}
            </div>
            {!zenMode && (
                <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                    <span>Live Session</span>
                </div>
            )}
        </div>
    );
});
