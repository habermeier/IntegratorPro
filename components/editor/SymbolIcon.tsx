import React from 'react';
import { getSymbolShorthand } from '../../editor/models/symbolLibrary';

interface SymbolIconProps {
    symbolType: string;
    color: string;
    size?: number;
    showShorthand?: boolean;
    secondaryLabel?: string;
    customShorthand?: string;
    meshType?: string;
    metadata?: Record<string, any>;
    rotation?: number;
}

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
    customShorthand,
    meshType,
    metadata,
    rotation = 0
}) => {
    const strokeWidth = size / 16; // Proportional stroke width
    const fontSize = size * 0.3; // Shorthand text size (slightly smaller)

    let displayShorthand = customShorthand || getSymbolShorthand(symbolType);

    const renderLabels = (center: number, offset: number, displayShorthand: string) => {
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
                            {displayShorthand}
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
                            {displayShorthand}
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

    const renderSymbol = () => {
        // Specialized Icon: Ceiling Fan
        if (meshType === 'fan' || symbolType === 'ceiling-fan' || symbolType === 'haiku-fan' || symbolType.toLowerCase().includes('fan') || symbolType.toLowerCase().includes('haiku')) {
            const hubRadius = 4;
            const bladeWidth = 4;
            const bladeLength = 20;
            const iconCenter = 24;

            const hasLight = metadata?.fanLightKit !== 'NL' && metadata?.lumens !== 0;

            return (
                <svg width={size} height={size} viewBox="0 0 48 48" style={{ overflow: 'visible' }}>
                    {/* White Halos for Fan */}
                    {hasLight && <circle cx={iconCenter} cy={iconCenter} r={hubRadius + 1.5} fill="#FFF" />}
                    {[0, 120, 240].map((angle) => (
                        <g key={`halo-${angle}`} transform={`rotate(${angle}, ${iconCenter}, ${iconCenter})`}>
                            <rect x={iconCenter - bladeWidth / 2 - 1} y={iconCenter - hubRadius - bladeLength - 1} width={bladeWidth + 2} height={bladeLength + 2} fill="#FFF" rx="2" />
                        </g>
                    ))}

                    {/* Black Fan Parts */}
                    {hasLight && <circle cx={iconCenter} cy={iconCenter} r={hubRadius} fill="#000" />}
                    {[0, 120, 240].map((angle) => (
                        <g key={`blade-${angle}`} transform={`rotate(${angle}, ${iconCenter}, ${iconCenter})`}>
                            <rect x={iconCenter - bladeWidth / 2} y={iconCenter - hubRadius - bladeLength} width={bladeWidth} height={bladeLength} fill="#000" rx="1" />
                        </g>
                    ))}

                    {/* Shorthand & Labels (Shared logic) */}
                    {renderLabels(iconCenter, 8, displayShorthand)}
                </svg>
            );
        }

        // Specialized Icon: Pendant (Circular Bullseye with Radial Marks)
        if (meshType === 'pendant' || symbolType === 'pendant-light' || symbolType === 'decorative-pendant') {
            const iconCenter = 24;
            const radius = 18;

            return (
                <svg width={size} height={size} viewBox="0 0 48 48" style={{ overflow: 'visible' }}>
                    {/* Outer Ring Halo */}
                    <circle cx={iconCenter} cy={iconCenter} r={radius + 1.5} fill="#FFF" />

                    {/* Radial Marks Halo (45 degree offset from standard crosshairs) */}
                    {[45, 135, 225, 315].map(angle => (
                        <g key={`prong-h-${angle}`} transform={`rotate(${angle}, ${iconCenter}, ${iconCenter})`}>
                            <rect x={iconCenter - 1} y={iconCenter - radius - 4 - 1} width={4} height={10} fill="#FFF" />
                        </g>
                    ))}

                    {/* Ring Body */}
                    <circle cx={iconCenter} cy={iconCenter} r={radius} fill="#000" />
                    <circle cx={iconCenter} cy={iconCenter} r={radius * 0.7} fill="#FFF" />

                    {/* Central Target Dot */}
                    <circle cx={iconCenter} cy={iconCenter} r={radius * 0.3} fill="#000" />

                    {/* Radial Marks */}
                    {[45, 135, 225, 315].map(angle => (
                        <g key={`prong-${angle}`} transform={`rotate(${angle}, ${iconCenter}, ${iconCenter})`}>
                            <rect x={iconCenter - 0.5} y={iconCenter - radius - 4} width={1.5} height={8} fill="#000" />
                        </g>
                    ))}

                    {renderLabels(iconCenter, radius * 0.5, displayShorthand)}
                </svg>
            );
        }

        // Specialized Icon: Sconce (Directional Wedge/Triangle)
        if (meshType === 'sconce' || symbolType === 'wall-sconce' || symbolType === 'exterior-light') {
            const iconCenter = 24;
            const width = 24;
            const height = 24;

            return (
                <svg width={size} height={size} viewBox="0 0 48 48" style={{ overflow: 'visible' }}>
                    {/* White Halo for Triangle + Base */}
                    <path
                        d={`M ${iconCenter - width / 2 - 2} ${iconCenter + height / 2 + 2} 
                           L ${iconCenter + width / 2 + 2} ${iconCenter + height / 2 + 2} 
                           L ${iconCenter} ${iconCenter - height / 2 - 4} Z`}
                        fill="#FFF"
                    />
                    <rect x={iconCenter - width / 2 - 2} y={iconCenter + height / 2} width={width + 4} height={4} fill="#FFF" />

                    {/* Black Triangle (The Wash) */}
                    <path
                        d={`M ${iconCenter - width / 2} ${iconCenter + height / 2} 
                           L ${iconCenter + width / 2} ${iconCenter + height / 2} 
                           L ${iconCenter} ${iconCenter - height / 2} Z`}
                        fill="#000"
                    />

                    {/* Base Plate (Wall attachment) */}
                    <rect x={iconCenter - width / 8} y={iconCenter + height / 2 - 1} width={width / 4} height={3} fill="#000" />

                    {renderLabels(iconCenter, 6, displayShorthand)}
                </svg>
            );
        }

        // Specialized Icon: Equipment (Rectangle with Power/Panel pattern)
        if (meshType === 'equipment') {
            const iconCenterW = 24, iconCenterH = 24;
            const w = 24, h = 32;

            return (
                <svg width={size} height={size} viewBox="0 0 48 48" style={{ overflow: 'visible' }}>
                    {/* White Halo */}
                    <rect x={iconCenterW - w / 2 - 1.5} y={iconCenterH - h / 2 - 1.5} width={w + 3} height={h + 3} fill="#FFF" />

                    {/* Main Box */}
                    <rect x={iconCenterW - w / 2} y={iconCenterH - h / 2} width={w} height={h} fill="#000" />

                    {/* Power Bolt (Simplified SVG Polyline) */}
                    <polyline
                        points={`${iconCenterW - 3},${iconCenterH - 6} ${iconCenterW + 3},${iconCenterH} ${iconCenterW - 3},${iconCenterH} ${iconCenterW + 3},${iconCenterH + 6}`}
                        fill="none"
                        stroke="#FFF"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Panel Lines */}
                    <line x1={iconCenterW - w / 2 + 4} y1={iconCenterH - h / 4} x2={iconCenterW + w / 2 - 4} y2={iconCenterH - h / 4} stroke="#FFF" strokeWidth="1" />
                    <line x1={iconCenterW - w / 2 + 4} y1={iconCenterH + h / 4} x2={iconCenterW + w / 2 - 4} y2={iconCenterH + h / 4} stroke="#FFF" strokeWidth="1" />

                    {renderLabels(iconCenterW, w / 2, displayShorthand)}
                </svg>
            );
        }

        const center = 16;
        const squareSize = 16;
        const squareHalf = squareSize / 2;
        const crosshairExt = squareHalf;

        return (
            <svg width={size} height={size} viewBox="0 0 32 32" style={{ overflow: 'visible' }}>
                <rect
                    x={center - squareHalf - 1}
                    y={center - squareHalf - 1}
                    width={squareSize + 2}
                    height={squareSize + 2}
                    fill="#FFF"
                />

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

                <rect
                    x={center - squareHalf}
                    y={center - squareHalf}
                    width={squareSize}
                    height={squareSize}
                    fill="#000"
                />

                <line
                    x1={center - squareHalf - crosshairExt}
                    y1={center}
                    x2={center + squareHalf + crosshairExt}
                    y2={center}
                    stroke="#000"
                    strokeWidth={strokeWidth}
                />

                <line
                    x1={center}
                    y1={center - squareHalf - crosshairExt}
                    x2={center}
                    y2={center + squareHalf + crosshairExt}
                    stroke="#000"
                    strokeWidth={strokeWidth}
                />

                {renderLabels(center, squareHalf, displayShorthand)}
            </svg>
        );
    };

    return (
        <div
            className="flex items-center justify-center transition-transform duration-150"
            style={{ transform: `rotate(${rotation}deg)` }}
        >
            {renderSymbol()}
        </div>
    );
};