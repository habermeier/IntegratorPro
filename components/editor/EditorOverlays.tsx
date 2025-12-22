/**
 * EditorOverlays Component
 *
 * Displays contextual overlays based on active tool and edit mode
 * Extracted from FloorPlanRenderer.tsx for better modularity
 *
 * Date: 2025-12-22
 */

import React from 'react';
import { ToolType } from '../../editor/models/types';
import { formatDistance } from '../../utils/measurementUtils';

interface EditorOverlaysProps {
  isEditMode: boolean;
  activeTool: ToolType;
  measurement: { distance: number; finalized: boolean } | null;
  unitPreference: 'METRIC' | 'IMPERIAL';
}

export const EditorOverlays: React.FC<EditorOverlaysProps> = ({
  isEditMode,
  activeTool,
  measurement,
  unitPreference
}) => {
  return (
    <>
      {/* Editor Mode Overlay */}
      {isEditMode && activeTool !== 'scale-calibrate' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center z-30 animate-pulse pointer-events-none">
          <div className="bg-red-600 text-white px-8 py-2 rounded-full text-sm font-black uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(220,38,38,1)] border-2 border-red-400">
            🛠️ Layer Editing Mode
          </div>
          <div className="mt-2 text-[10px] text-red-400 font-bold bg-slate-950/80 px-4 py-1 rounded-md backdrop-blur-sm border border-red-900/50">
            Arrows: Move • Ctrl+Arrows: Scale/Rotate • Ctrl+L: Lock
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
    </>
  );
};
