import { RoomType } from '../../editor/models/types';

export interface LightingTarget {
    avg: number;
    min?: number;
    description: string;
}

/**
 * Standard Residential Lighting Targets (Lux)
 * Based on IES recommendations for home environments.
 * 1 Lux = 1 Lumen / Square Meter
 */
export const DEFAULT_ROOM_TARGETS: Record<RoomType, LightingTarget> = {
    'kitchen': { avg: 300, min: 150, description: 'Task lighting for food prep' },
    'bathroom': { avg: 250, min: 100, description: 'Vanity and ambient' },
    'bedroom': { avg: 150, min: 50, description: 'Soft ambient lighting' },
    'hallway': { avg: 100, min: 30, description: 'Safe passage' },
    'closet': { avg: 150, min: 50, description: 'Finding items' },
    'garage': { avg: 100, min: 50, description: 'Utility and safety' },
    'open': { avg: 200, min: 75, description: 'Living/General area' },
    'other': { avg: 150, min: 50, description: 'General ambient' }
};

export const getRecommendedLux = (type: RoomType): number => {
    return DEFAULT_ROOM_TARGETS[type]?.avg || 150;
};
