import { useState, useEffect, useMemo } from 'react';
import { ViewMode } from '../types';

export type AppViewMode = ViewMode | 'COVER_SHEET';

interface ViewConfig {
    mode: AppViewMode;
    prefix: string;
    aliases: string[];
}

// Configuration Map
const VIEW_CONFIG: ViewConfig[] = [
    { mode: 'COVER_SHEET', prefix: 'project-brief', aliases: ['brief', 'cover', 'dashboard'] },
    { mode: 'DASHBOARD', prefix: 'dashboard', aliases: [] },
    { mode: 'SYSTEMS', prefix: 'systems', aliases: [] },
    { mode: 'BOM', prefix: 'bom', aliases: [] },
    { mode: 'VISUALIZER', prefix: 'visualizer', aliases: ['rack'] },
    { mode: 'FLOORPLAN', prefix: 'floorplan', aliases: ['map'] },
    { mode: 'ROUGH_IN', prefix: 'rough-in', aliases: ['guide'] },
    // Ensure all ViewModes are handled if they need deep linking
    { mode: 'TOPOLOGY', prefix: 'topology', aliases: [] },
    { mode: 'ADVISOR', prefix: 'advisor', aliases: [] },
];

export const useDeepLink = () => {
    const [view, setView] = useState<AppViewMode>('COVER_SHEET');
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    // Derived lookup helpers
    const getModeFromUrlPart = (part: string): AppViewMode | null => {
        const normalized = part.toLowerCase();
        const config = VIEW_CONFIG.find(c =>
            c.prefix === normalized || c.aliases.includes(normalized)
        );
        return config ? config.mode : null;
    };

    const getPrefixFromMode = (mode: AppViewMode): string | null => {
        const config = VIEW_CONFIG.find(c => c.mode === mode);
        return config ? config.prefix : null;
    };

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.substring(1); // Remove '#'
            if (!hash) return;

            const parts = hash.split('/');

            if (parts.length === 0) return;

            const firstPart = parts[0];
            const secondPart = parts.length > 1 ? parts[1] : null;

            // Scenario 1: explicit view mode found
            const detectedMode = getModeFromUrlPart(firstPart);

            if (detectedMode) {
                setView(detectedMode);
                // If there's a second part, it's an ID. 
                // Exception: Dashboard aliases mapping to CoverSheet clearing ID is legacy behavior 
                // but standardizing to "ID is second part" is cleaner.
                // Replicating specific legacy behavior:
                // "Check if it matches a section header like #lcp-1" logic from original
                // was only checked if parts.length === 1 AND arg was NOT a view mode.

                setHighlightedId(secondPart);
            } else {
                // Scenario 2: No view mode found in first part.
                // Could be a direct ID (legacy behavior) or a specific known section ID.

                // Legacy special IDs that force Visualizer
                if (['lcp-1', 'lcp-2', 'mdf'].includes(firstPart.toLowerCase())) {
                    setView('VISUALIZER');
                    setHighlightedId(firstPart);
                } else {
                    // Fallback: Assume it's a module ID for the Visualizer
                    // Only if single part? Original said "Assume module ID" at end of single part check.
                    // If it was valid view it would have been caught above.
                    setView('VISUALIZER');
                    setHighlightedId(firstPart);
                }
            }
        };

        // Run on mount
        handleHashChange();

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const updateDeepLink = (mode: AppViewMode, itemId?: string | null) => {
        const prefix = getPrefixFromMode(mode);

        if (prefix) {
            if (itemId) {
                window.location.hash = `${prefix}/${itemId}`;
            } else {
                window.location.hash = prefix;
            }
        }

        setView(mode);
        if (itemId !== undefined) setHighlightedId(itemId);
    };

    return { view, setView: updateDeepLink, highlightedId };
};
