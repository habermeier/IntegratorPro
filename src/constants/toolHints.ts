import { ToolType } from '../../editor/models/types';

/**
 * Mode color themes for the Command Bar border
 */
export type ModeColor = 'blue' | 'emerald' | 'purple' | 'cyan' | 'red';

export interface ModeTheme {
    color: ModeColor;
    borderClass: string;
    textClass: string;
    shouldPulse: boolean;
}

/**
 * Get contextual hint text based on active tool and editor mode
 * AUTO-ULTIMATE-POLISH-P25: Added viewport-aware hints and verified accuracy against tool implementations
 */
export function getToolHint(
    activeTool: ToolType,
    isEditMode: boolean,
    isZoomCursorEnabled?: boolean,
    viewportWidth?: number
): string {
    const isMobile = viewportWidth !== undefined && viewportWidth < 640;
    let hint = '';

    // Priority 1: Edit/Alignment mode (overrides tool hints)
    if (isEditMode) {
        hint = isMobile
            ? 'ALIGN: Arrows/Ctrl+Arrows • L to Exit'
            : 'ALIGNMENT: Arrows to move • Ctrl+Arrows to Scale/Rotate • L to Exit';
    }
    // Priority 2: Tool-specific hints (verified against actual tool implementations)
    else {
        switch (activeTool) {
            case 'select':
                hint = isMobile
                    ? 'SELECT: Click • Drag • Del'
                    : 'SELECT: Click to edit • Drag to move • Del to delete';
                break;
            case 'pan':
                hint = isMobile
                    ? 'PAN: Drag to navigate'
                    : 'PAN: Click and drag to navigate the floor plan';
                break;
            case 'draw-room':
                hint = isMobile
                    ? 'ROOM: Click to draw • Enter'
                    : 'ROOM: Click to add point • Enter to finish • Esc to undo';
                break;
            case 'draw-mask':
                // FIXED: Was "Double-click to finish" but PolygonTool has no double-click logic
                hint = isMobile
                    ? 'MASK: Click to draw • Enter'
                    : 'MASK: Click to add point • Enter to finish';
                break;
            case 'draw-cable':
                hint = isMobile
                    ? 'CABLE: Click • Enter'
                    : 'CABLE: Click to add point • Enter to finish • Esc to undo';
                break;
            case 'place-symbol':
                // FIXED: Was "Arrows to move" but PlaceSymbolTool only supports R for rotation
                hint = isMobile
                    ? 'SYMBOL: Click • R to rotate'
                    : 'SYMBOL: Click to place • R to rotate';
                break;
            case 'place-furniture':
                // UPDATED: Added R for rotation (was missing)
                hint = isMobile
                    ? 'FURNITURE: Click • Arrows • R'
                    : 'FURNITURE: Click to place • Arrows to move • R to rotate';
                break;
            case 'measure':
                hint = isMobile
                    ? 'MEASURE: Click 2 points'
                    : 'MEASURE: Click two points to see distance • Esc to clear';
                break;
            case 'scale-calibrate':
                hint = isMobile
                    ? 'SCALE: Click 2 points'
                    : 'SCALE: Click two points to calibrate map • Esc to cancel';
                break;
            default:
                hint = isMobile ? 'Choose tool' : 'READY: Choose a tool to begin';
        }
    }

    // Prepend zoom indicator if enabled
    if (isZoomCursorEnabled) {
        hint = `🔍 ${hint}`;
    }

    return hint;
}

/**
 * Get mode color theme based on active tool and editor state
 *
 * Color mapping:
 * - Alignment mode: Emerald (modal/important state)
 * - Select tool: Blue (default/safe)
 * - Placement tools (symbol/furniture): Purple (creative/additive)
 * - Drawing tools (room/mask/cable): Cyan (structural/foundational)
 * - Destructive/Warning: Red (not currently used, reserved for future)
 */
export function getModeTheme(
    activeTool: ToolType,
    isEditMode: boolean
): ModeTheme {
    // Priority 1: Alignment mode (modal state - gets pulse)
    if (isEditMode) {
        return {
            color: 'emerald',
            borderClass: 'border-emerald-500/40',
            textClass: 'text-emerald-400',
            shouldPulse: true
        };
    }

    // Priority 2: Tool-based themes
    switch (activeTool) {
        case 'draw-room':
        case 'draw-cable':
            return {
                color: 'cyan',
                borderClass: 'border-cyan-500/30',
                textClass: 'text-cyan-400',
                shouldPulse: false
            };

        case 'draw-mask':
            // Mask is potentially destructive (covers areas) - gets pulse
            return {
                color: 'cyan',
                borderClass: 'border-cyan-500/30',
                textClass: 'text-cyan-400',
                shouldPulse: true
            };

        case 'place-symbol':
        case 'place-furniture':
            return {
                color: 'purple',
                borderClass: 'border-purple-500/30',
                textClass: 'text-purple-400',
                shouldPulse: false
            };

        case 'select':
        default:
            return {
                color: 'blue',
                borderClass: 'border-blue-500/20',
                textClass: 'text-blue-400/60',
                shouldPulse: false
            };
    }
}

/**
 * Get CSS classes for pulse animation
 */
export function getPulseAnimation(): string {
    return 'animate-pulse-border';
}
