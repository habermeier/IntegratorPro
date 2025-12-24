import React from 'react';

interface SymbolIconProps {
    symbolType: string;
    color: string;
    size?: number;
    showShorthand?: boolean;
}

/**
 * SVG-based symbol icon renderer for device palette
 * Universal simplified design: black square with crosshairs
 */
export const SymbolIcon: React.FC<SymbolIconProps> = ({
    symbolType,
    color,
    size = 32,
    showShorthand = true
}) => {
    const strokeWidth = size / 16; // Proportional stroke width
    const fontSize = size * 0.3; // Shorthand text size (slightly smaller)

    // Symbol type to shorthand mapping
    const getShorthand = (): string => {
        const shorthandMap: Record<string, string> = {
            'recessed-light': '',
            'focus-light': 'ADJ',
            'adjustable-light': 'ADJ',
            'pendant-light': 'CHN',
            'motion-sensor': 'MOT',
            'wifi-ap': 'AP',
            'security-camera': 'CAM',
            'ceiling-fan': 'FAN',
            'exterior-light': 'OSC',
            'knx-switch': 'LV',
            'standard-outlet': 'OUT',
            'lcp-panel': 'LCP'
        };
        return shorthandMap[symbolType] || '';
    };

    // Universal symbol design for ALL types
    const renderSymbol = () => {
        const squareSize = 16;
        const squareHalf = squareSize / 2;
        const crosshairExt = squareHalf; // Jut out by 1/2 width (8px extension on 8px half)
        const center = 16;

        return (
            <svg width={size} height={size} viewBox="0 0 32 32" style={{ overflow: 'visible' }}>
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

                {/* Shorthand text at bottom-right corner */}
                {showShorthand && (
                    <text
                        x={center + squareHalf + 2}
                        y={center + squareHalf + 2}
                        textAnchor="start"
                        dominantBaseline="hanging"
                        fontSize={fontSize}
                        fontWeight="bold"
                        fill="#000"
                    >
                        {getShorthand()}
                    </text>
                )}
            </svg>
        );
    };

    return <div className="flex items-center justify-center">{renderSymbol()}</div>;
};
