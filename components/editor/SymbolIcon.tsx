import React from 'react';

interface SymbolIconProps {
    symbolType: string;
    color: string;
    size?: number;
    showShorthand?: boolean;
    secondaryLabel?: string;
    customShorthand?: string;
}

import { getSymbolShorthand } from '../../editor/models/symbolLibrary';

/**
 * SVG-based symbol icon renderer for device palette
 * Universal simplified design: black square with crosshairs
 */
export const SymbolIcon: React.FC<SymbolIconProps> = ({
    symbolType,
    color,
    size = 32,
    showShorthand = true,
    secondaryLabel,
    customShorthand
}) => {
    const strokeWidth = size / 16; // Proportional stroke width
    const fontSize = size * 0.3; // Shorthand text size (slightly smaller)

    // Symbol type to shorthand is now centralized in symbolLibrary.ts

    // Universal symbol design for ALL types
    const renderSymbol = () => {
        const center = 16;

        // Specialized Icon: Ceiling Fan
        if (symbolType === 'ceiling-fan' || symbolType === 'haiku-fan' || symbolType.includes('fan')) {
            const hubRadius = 4;
            const bladeWidth = 4;
            const bladeLength = 10;

            return (
                <svg width={size} height={size} viewBox="0 0 32 32" style={{ overflow: 'visible' }}>
                    {/* White Halos for Fan */}
                    <circle cx={center} cy={center} r={hubRadius + 1.5} fill="#FFF" />
                    {[0, 120, 240].map((angle) => (
                        <g key={`halo-${angle}`} transform={`rotate(${angle}, ${center}, ${center})`}>
                            <rect x={center - bladeWidth / 2 - 1} y={center - hubRadius - bladeLength - 1} width={bladeWidth + 2} height={bladeLength + 2} fill="#FFF" rx="2" />
                        </g>
                    ))}

                    {/* Black Fan Parts */}
                    <circle cx={center} cy={center} r={hubRadius} fill="#000" />
                    {[0, 120, 240].map((angle) => (
                        <g key={`blade-${angle}`} transform={`rotate(${angle}, ${center}, ${center})`}>
                            <rect x={center - bladeWidth / 2} y={center - hubRadius - bladeLength} width={bladeWidth} height={bladeLength} fill="#000" rx="1" />
                        </g>
                    ))}

                    {/* Shorthand & Labels (Shared logic) */}
                    {renderLabels(center, 8)}
                </svg>
            );
        }

        const squareSize = 16;
        const squareHalf = squareSize / 2;
        const crosshairExt = squareHalf; // Jut out by 1/2 width (8px extension on 8px half)

        return (
            <svg width={size} height={size} viewBox="0 0 32 32" style={{ overflow: 'visible' }}>
                {/* White Halos (Backgrounds) for high contrast */}
                {/* Square Halo */}
                <rect
                    x={center - squareHalf - 1}
                    y={center - squareHalf - 1}
                    width={squareSize + 2}
                    height={squareSize + 2}
                    fill="#FFF"
                />

                {/* Crosshair Halos (wider white lines) */}
                <line
                    x1={center - squareHalf - crosshairExt - 1}
                    y1={center}
                    x2={center + squareHalf + crosshairExt + 1}
                    y2={center}
                    stroke="#FFF"
                    strokeWidth={strokeWidth + 2}
                />
                <line
                    x1={center}
                    y1={center - squareHalf - crosshairExt - 1}
                    x2={center}
                    y2={center + squareHalf + crosshairExt + 1}
                    stroke="#FFF"
                    strokeWidth={strokeWidth + 2}
                />

                {/* Filled black square */}
                <rect
                    x={center - squareHalf}
                    y={center - squareHalf}
                    width={squareSize}
                    height={squareSize}
                    fill="#000"
                />

                {/* Crosshairs - horizontal line */}
                <line
                    x1={center - squareHalf - crosshairExt}
                    y1={center}
                    x2={center + squareHalf + crosshairExt}
                    y2={center}
                    stroke="#000"
                    strokeWidth={strokeWidth}
                />

                {/* Crosshairs - vertical line */}
                <line
                    x1={center}
                    y1={center - squareHalf - crosshairExt}
                    x2={center}
                    y2={center + squareHalf + crosshairExt}
                    stroke="#000"
                    strokeWidth={strokeWidth}
                />

                {/* Labels */}
                {renderLabels(center, squareHalf)}
            </svg>
        );
    };

    const renderLabels = (center: number, offset: number) => {
        return (
            <>
                {/* Shorthand text with white halo */}
                {showShorthand && (
                    <>
                        <text
                            x={center + offset + 2}
                            y={center + offset + 2}
                            textAnchor="start"
                            dominantBaseline="hanging"
                            fontSize={fontSize}
                            fontWeight="bold"
                            fill="#FFF"
                            stroke="#FFF"
                            strokeWidth={2}
                        >
                            {customShorthand || getSymbolShorthand(symbolType)}
                        </text>
                        <text
                            x={center + offset + 2}
                            y={center + offset + 2}
                            textAnchor="start"
                            dominantBaseline="hanging"
                            fontSize={fontSize}
                            fontWeight="bold"
                            fill="#000"
                        >
                            {customShorthand || getSymbolShorthand(symbolType)}
                        </text>
                    </>
                )}

                {/* Secondary label at bottom-left corner (RED with white halo) */}
                {secondaryLabel && (
                    <>
                        <text
                            x={center - offset - 2}
                            y={center + offset + 2}
                            textAnchor="end"
                            dominantBaseline="hanging"
                            fontSize={fontSize}
                            fontWeight="bold"
                            fill="#FFF"
                            stroke="#FFF"
                            strokeWidth={2}
                        >
                            {secondaryLabel}
                        </text>
                        <text
                            x={center - offset - 2}
                            y={center + offset + 2}
                            textAnchor="end"
                            dominantBaseline="hanging"
                            fontSize={fontSize}
                            fontWeight="bold"
                            fill="#FF0000"
                        >
                            {secondaryLabel}
                        </text>
                    </>
                )}
            </>
        );
    };

    return <div className="flex items-center justify-center">{renderSymbol()}</div>;
};
