import { useState, useEffect } from 'react';
import { ViewMode } from '../types';

export type AppViewMode = ViewMode | 'COVER_SHEET';

interface ConfigItem {
    prefix: string;
    aliases: string[];
}

// Configuration Map
// using Record ensures we MUST define every single AppViewMode.
const VIEW_CONFIG: Record<AppViewMode, ConfigItem> = {
    // Consolidated Dashboard/Brief View
    COVER_SHEET: { prefix: 'project-brief', aliases: ['brief', 'cover', 'dashboard'] },
    SYSTEMS: { prefix: 'systems', aliases: [] },
    BOM: { prefix: 'bom', aliases: [] },
    VISUALIZER: { prefix: 'visualizer', aliases: ['rack'] },
    FLOORPLAN: { prefix: 'floorplan', aliases: ['map'] },
    ROUGH_IN: { prefix: 'rough-in', aliases: ['guide'] },
    TOPOLOGY: { prefix: 'topology', aliases: [] },
    ADVISOR: { prefix: 'advisor', aliases: [] },
    // Logical mapping for DASHBOARD to prevent TS errors if it exists in ViewMode
    // We treat it as a distinct entry but it effectively maps to a unique prefix
    // to avoid collision with COVER_SHEET's 'dashboard' alias.
    DASHBOARD: { prefix: 'dashboard-view', aliases: [] }
};

// Runtime Validation for Robustness
(() => {
    const prefixes = new Set<string>();
    const aliases = new Map<string, string>();
    const errors: string[] = [];

    (Object.keys(VIEW_CONFIG) as AppViewMode[]).forEach(key => {
        const config = VIEW_CONFIG[key];

        // Check Prefix
        if (prefixes.has(config.prefix)) {
            errors.push(`Duplicate prefix '${config.prefix}' in ${key}`);
        }
        prefixes.add(config.prefix);

        // Check Aliases
        config.aliases.forEach(alias => {
            if (prefixes.has(alias)) {
                errors.push(`Alias '${alias}' in ${key} conflicts with a prefix.`);
            }
            if (aliases.has(alias)) {
                errors.push(`Duplicate alias '${alias}' in ${key} and ${aliases.get(alias)}`);
            }
            aliases.set(alias, key);
        });
    });

    if (errors.length > 0) {
        console.error("FATAL: Navigation Configuration Errors:", errors);
        if (process.env.NODE_ENV !== 'production') {
            throw new Error(`Navigation Config Integrity Check Failed:\n${errors.join('\n')}`);
        }
    }
})();

export const useDeepLink = () => {
    const [view, setView] = useState<AppViewMode>('COVER_SHEET');
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    // Derived lookup helpers
    const getModeFromUrlPart = (part: string): AppViewMode | null => {
        const normalized = part.toLowerCase();
        const entry = Object.entries(VIEW_CONFIG).find(([_, config]) =>
            config.prefix === normalized || config.aliases.includes(normalized)
        );
        return entry ? (entry[0] as AppViewMode) : null;
    };

    const getPrefixFromMode = (mode: AppViewMode): string | null => {
        return VIEW_CONFIG[mode]?.prefix || null;
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
                setHighlightedId(secondPart);
            } else {
                // Scenario 2: Legacy / Fallback
                if (['lcp-1', 'lcp-2', 'mdf'].includes(firstPart.toLowerCase())) {
                    setView('VISUALIZER');
                    setHighlightedId(firstPart);
                } else {
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
