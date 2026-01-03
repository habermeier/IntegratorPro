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

    // Special Case: HE Williams Lighting Series
    const isHEWilliams = product.manufacturer === 'HE Williams' || product.id?.includes('2DS') || product.id?.includes('2AS');

    if (isHEWilliams && product.type === 'LIGHTING') {
        // We use the 2DS/2AS builder for things that look like 2DS/2AS series or families
        const isCompatibleSeries =
            product.id?.includes('2DS') || product.name?.includes('2DS') || product.productFamily === '2DS' ||
            product.id?.includes('2AS') || product.name?.includes('2AS') || product.productFamily === '2AS' ||
            product.hasSpecBuilder; // Trust the catalog flag if present for HE Williams

        if (isCompatibleSeries) {
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
