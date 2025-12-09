import { useState, useEffect } from 'react';
import { ViewMode } from '../types';

export const useDeepLink = () => {
    const [view, setView] = useState<ViewMode | 'COVER_SHEET'>('COVER_SHEET');
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.substring(1); // Remove '#'
            if (!hash) return;

            const parts = hash.split('/');
            if (parts.length === 2) {
                const [viewName, itemId] = parts;

                // Map viewName to ViewMode
                let targetView: ViewMode | 'COVER_SHEET' | null = null;
                const v = viewName.toLowerCase();

                if (v === 'dashboard') targetView = 'COVER_SHEET'; // Dashboard = Project Brief
                else if (v === 'bom') targetView = 'BOM';
                else if (v === 'visualizer' || v === 'rack') targetView = 'VISUALIZER';
                else if (v === 'floorplan' || v === 'map') targetView = 'FLOORPLAN';
                else if (v === 'rough-in' || v === 'guide') targetView = 'ROUGH_IN';
                else if (v === 'brief' || v === 'cover' || v === 'project-brief') targetView = 'COVER_SHEET';

                if (targetView) {
                    setView(targetView);
                    setHighlightedId(itemId);
                }
            } else if (parts.length === 1) {
                const arg = parts[0].toLowerCase();

                // Check if it's a View Mode
                if (arg === 'dashboard') {
                    setView('DASHBOARD');
                    setHighlightedId(null);
                }
                else if (arg === 'bom') {
                    setView('BOM');
                    setHighlightedId(null);
                }
                else if (arg === 'visualizer' || arg === 'rack') {
                    setView('VISUALIZER');
                    setHighlightedId(null);
                }
                else if (arg === 'floorplan' || arg === 'map') {
                    setView('FLOORPLAN');
                    setHighlightedId(null);
                }
                else if (arg === 'rough-in' || arg === 'guide') {
                    setView('ROUGH_IN');
                    setHighlightedId(null);
                }
                else if (arg === 'brief' || arg === 'cover' || arg === 'project-brief') {
                    setView('COVER_SHEET');
                    setHighlightedId(null);
                }
                // Check if it matches a section header like #lcp-1
                else if (['lcp-1', 'lcp-2', 'mdf'].includes(arg)) {
                    setView('VISUALIZER');
                    setHighlightedId(arg);
                } else {
                    // Assume module ID
                    setHighlightedId(parts[0]);
                    setView('VISUALIZER');
                }
            }
        };

        // Run on mount
        handleHashChange();

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const updateDeepLink = (mode: ViewMode | 'COVER_SHEET', itemId?: string | null) => {
        if (itemId) {
            let prefix = 'visualizer';
            if (mode === 'DASHBOARD') prefix = 'dashboard';
            if (mode === 'FLOORPLAN') prefix = 'floorplan';
            if (mode === 'ROUGH_IN') prefix = 'rough-in';
            if (mode === 'COVER_SHEET') prefix = 'project-brief';

            window.location.hash = `${prefix}/${itemId}`;
        } else {
            // Update URL to view root
            let prefix = '';
            if (mode === 'DASHBOARD') prefix = 'dashboard';
            if (mode === 'FLOORPLAN') prefix = 'floorplan';
            if (mode === 'ROUGH_IN') prefix = 'rough-in';
            if (mode === 'COVER_SHEET') prefix = 'project-brief';
            if (mode === 'VISUALIZER') prefix = 'visualizer';

            if (prefix) window.location.hash = prefix;
        }

        setView(mode);
        if (itemId !== undefined) setHighlightedId(itemId);
    };

    return { view, setView: updateDeepLink, highlightedId };
};
