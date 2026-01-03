import React from 'react';
import { HEWilliams2DSBuilder } from '../spec-builders/HEWilliams2DSBuilder';
import { GenericLightBuilder } from '../spec-builders/GenericLightBuilder';

/**
 * Interface for all Specification Builders
 */
export interface SpecBuilderProps {
    initialMetadata: any;
    onChange: (metadata: any) => void;
    deviceId?: string;
}

/**
 * Registry to map products to their specialized UI builders.
 * Eventually this could be dynamic, but for now we centralize the "if" statements here.
 */
export const getSpecBuilder = (product: any): React.FC<SpecBuilderProps> | null => {
    if (!product) return null;

    // Special Case: HE Williams 2DS Series
    if (product.id === '2DS-L9' || product.id === 'light-fix-dali' || product.manufacturer === 'HE Williams') {
        // We only use the 2DS builder for things that look like 2DS series
        if (product.id?.includes('2DS') || product.name?.includes('2DS')) {
            return HEWilliams2DSBuilder as any;
        }
    }

    // Fallback: Generic Builders by Category
    if (product.type === 'LIGHTING') {
        return GenericLightBuilder as any;
    }

    // Add more category fallbacks here (POWER, HVAC, etc.)

    return null;
};
