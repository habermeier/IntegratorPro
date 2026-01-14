import React, { useEffect, useState, useRef } from 'react';

export const FPSCounter: React.FC = () => {
    const [fps, setFps] = useState(0);
    const [history, setHistory] = useState<number[]>([]);
    const frameCount = useRef(0);
    const lastTime = useRef(performance.now());
    const historyLimit = 60;

    useEffect(() => {
        let animationFrameId: number;

        const update = () => {
            frameCount.current++;
            const now = performance.now();
            const delta = now - lastTime.current;

            if (delta >= 1000) {
                const currentFps = Math.round((frameCount.current * 1000) / delta);
                setFps(currentFps);
                setHistory(prev => {
                    const next = [...prev, currentFps];
                    if (next.length > historyLimit) return next.slice(1);
                    return next;
                });
                frameCount.current = 0;
                lastTime.current = now;
            }

            animationFrameId = requestAnimationFrame(update);
        };

        animationFrameId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/90 border border-slate-800 rounded px-2 py-1 flex items-center gap-3 backdrop-blur-sm shadow-xl pointer-events-none">
            <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-black uppercase leading-none">System Perf</span>
                <span className={`text-sm font-mono font-bold leading-none ${fps < 30 ? 'text-red-500' : fps < 50 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {fps} <span className="text-[8px] opacity-70">FPS</span>
                </span>
            </div>

            {/* Simple Sparkline */}
            <div className="flex items-end gap-[1px] h-6 w-30 overflow-hidden">
                {history.map((val, i) => {
                    const height = Math.min(100, (val / 60) * 100);
                    return (
                        <div
                            key={i}
                            className={`w-1 rounded-t-[1px] ${val < 30 ? 'bg-red-500' : val < 50 ? 'bg-amber-500' : 'bg-emerald-500/50'}`}
                            style={{ height: `${height}%` }}
                        />
                    );
                })}
            </div>
        </div>
    );
};
