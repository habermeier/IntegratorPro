import React from 'react';

interface SymbolProps extends React.SVGProps<SVGSVGElement> {
    color?: string;
    size?: number | string;
}

export const MapSymbols = {
    LIGHT: ({ color = '#f59e0b', size = '100%', ...props }: SymbolProps) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            {/* Recessed Light can be a simple circle */}
            <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="2" fill="white" fillOpacity="0.8" />
            <circle cx="12" cy="12" r="1" fill={color} />
        </svg>
    ),
    SWITCH: ({ color = '#64748b', size = '100%', ...props }: SymbolProps) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            {/* Standard Switch Symbol: $ */}
            <text x="50%" y="50%" textAnchor="middle" dy=".35em" fontSize="18" fontFamily="monospace" fontWeight="bold" fill={color} stroke="white" strokeWidth="0.5">$</text>
        </svg>
    ),
    FAN: ({ color = '#0ea5e9', size = '100%', ...props }: SymbolProps) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            {/* Ceiling Fan Symbol */}
            <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
            <path d="M12 12 L19 19 M12 12 L5 5 M12 12 L19 5 M12 12 L5 19" stroke={color} strokeWidth="2" />
        </svg>
    ),
    SENSOR: ({ color = '#10b981', size = '100%', ...props }: SymbolProps) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            {/* Occ Sensor: S inside box/circle */}
            <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="white" fillOpacity="0.7" />
            <text x="50%" y="50%" textAnchor="middle" dy=".35em" fontSize="12" fontWeight="bold" fill={color}>S</text>
        </svg>
    ),
    EXTERIOR: ({ color = '#ef4444', size = '100%', ...props }: SymbolProps) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <rect x="4" y="4" width="16" height="16" stroke={color} strokeWidth="3" fill="white" fillOpacity="0.7" />
            <text x="50%" y="50%" textAnchor="middle" dy=".35em" fontSize="12" fontWeight="900" fill={color}>WP</text>
        </svg>
    ),
    ENCLOSURE: ({ color = '#8b5cf6', size = '100%', ...props }: SymbolProps) => (
        <svg width={size} height={size} viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            {/* Rectangular Panel Box (Double Wide) - Ultra Thick Borders */}
            <rect x="2" y="2" width="44" height="20" rx="2" stroke={color} strokeWidth="8" fill="white" fillOpacity="0.9" />
            <rect x="6" y="6" width="36" height="12" rx="1" stroke={color} strokeWidth="4" strokeDasharray="4 4" />
        </svg>
    )
};
