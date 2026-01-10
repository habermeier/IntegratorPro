/**
 * EditorOverlays Component
 *
 * Displays contextual overlays based on active tool and edit mode
 * Extracted from FloorPlanRenderer.tsx for better modularity
 *
 * Date: 2025-12-22
 */

import React from 'react';
import { ToolType, Room, PlacedSymbol, VectorLayerContent } from '../../editor/models/types';
import { formatDistance } from '../../utils/measurementUtils';
import { Lightbulb, Target, Zap, TrendingUp } from 'lucide-react';
import { calculateRoomLightingStats } from '../../src/utils/lightModeling';
import { getRecommendedLux } from '../../src/constants/lightingTargets';
import { FloorPlanEditor } from '../../editor/FloorPlanEditor';

interface EditorOverlaysProps {
  editor: FloorPlanEditor | null;
  isEditMode: boolean;
  activeTool: ToolType;
  measurement: { distance: number; finalized: boolean } | null;
  unitPreference: 'METRIC' | 'IMPERIAL';
  contextRoom: Room | null;
  layers?: any[]; // Added to trigger re-renders on layer changes
}

export const EditorOverlays: React.FC<EditorOverlaysProps> = ({
  editor,
  isEditMode,
  activeTool,
  measurement,
  unitPreference,
  contextRoom,
  layers
}) => {
  // Compute lighting stats if contextRoom exists
  const lightingStats = React.useMemo(() => {
    if (!contextRoom || !editor) return null;

    const layer = editor.layerSystem.getLayer('lighting');
    const symbols = layer?.content ? (layer.content as VectorLayerContent).symbols || [] : [];

    const stats = calculateRoomLightingStats(contextRoom, symbols, editor.pixelsMeter);
    const target = contextRoom.targetLux || getRecommendedLux(contextRoom.roomType);
    const performance = Math.round((stats.mean / target) * 100);

    return { ...stats, target, performance };
  }, [contextRoom, editor, layers]); // Added layers to dependencies

  // Only show HUD during placement mode or when actively hovering
  const showHUD = lightingStats && (activeTool === 'place-symbol' || activeTool === 'place-furniture');
  return (
    <>
      {/* Editor Mode Overlay */}
      {isEditMode && activeTool !== 'scale-calibrate' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center z-30 animate-pulse">
          <div className="bg-red-600 text-white px-8 py-2 rounded-full text-sm font-black uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(220,38,38,1)] border-2 border-red-400 pointer-events-none">
            🛠️ Overlay Alignment Mode
          </div>
          <div className="mt-2 text-[10px] text-red-200 font-bold bg-slate-950/90 px-6 py-2 rounded-lg backdrop-blur-md border border-red-900/50 pointer-events-none shadow-2xl flex flex-col items-center space-y-1">
            <div className="flex space-x-4">
              <span><span className="text-red-400">Arrows:</span> Nudge <span className="text-slate-500 font-normal italic">(+Shift: Fast)</span></span>
              <span><span className="text-red-400">Ctrl+Arrows:</span> Scale/Rotate</span>
            </div>
            <div className="flex space-x-4">
              <span><span className="text-red-400">+/-:</span> Opacity</span>
              <span><span className="text-red-400">L:</span> Toggle Mode</span>
            </div>
          </div>
        </div>
      )}

      {/* Scale Calibration Overlay */}
      {activeTool === 'scale-calibrate' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-2 rounded-full text-sm font-bold z-20 shadow-xl border border-emerald-400/30 pointer-events-none">
          📏 Click two points to calibrate Scale
        </div>
      )}

      {/* Measure Tool Overlay */}
      {activeTool === 'measure' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-bold z-20 shadow-xl border border-blue-400/30 pointer-events-none flex flex-col items-center">
          <div className="flex items-center gap-2">
            📏 Measuring Distance
            {measurement && (
              <span className="bg-white/20 px-2 py-0.5 rounded text-white active:scale-95 transition-transform">
                {formatDistance(measurement.distance, unitPreference)}
              </span>
            )}
          </div>
          <div className="text-[10px] opacity-80 mt-0.5">Click two points • Escape to undo</div>
        </div>
      )}
      {/* Lighting HUD - Compact Top-Right Card */}
      {showHUD && (
        <div className="absolute top-4 right-4 z-30 pointer-events-none animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-slate-950/90 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-2xl ring-1 ring-white/5 min-w-[200px]">
            {/* Room Name */}
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Live Context</span>
              <Lightbulb size={14} className={lightingStats.performance < 90 ? 'text-amber-500' : 'text-emerald-500'} />
            </div>

            <div className="text-xs font-bold text-white mb-3">{contextRoom?.name}</div>

            {/* Compact Stats */}
            <div className="space-y-2">
              {/* Average Lux */}
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-300 font-bold uppercase">Average</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-lg font-mono font-black ${lightingStats.performance < 90 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {lightingStats.mean}
                  </span>
                  <span className="text-[8px] text-slate-500 font-bold">LUX</span>
                </div>
              </div>

              {/* Target Match */}
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-300 font-bold uppercase">Target</span>
                <span className={`text-xs font-black font-mono ${lightingStats.performance < 90 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {lightingStats.performance}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="relative h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`absolute inset-0 transition-all duration-700 ${lightingStats.performance < 90 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, lightingStats.performance)}%` }}
                />
              </div>

              {/* Range */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex flex-col">
                  <span className="text-[7px] text-slate-500 uppercase">Min</span>
                  <span className="text-[10px] font-mono text-slate-300 font-bold">{lightingStats.min}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[7px] text-slate-500 uppercase">Max</span>
                  <span className="text-[10px] font-mono text-slate-300 font-bold">{lightingStats.max}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
