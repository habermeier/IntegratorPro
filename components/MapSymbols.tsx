import React from 'react';

interface SymbolProps extends React.SVGProps<SVGSVGElement> {
    color?: string;
    size?: number | string;
}

export const MapSymbols = {
    LIGHT: ({ color = '#f59e0b', size = '100%', ...props }: SymbolProps) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="white" fillOpacity="0.5" />
            <line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth="2" />
            <line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="2" />
        </svg>
    ),
    SWITCH: ({ color = '#64748b', size = '100%', ...props }: SymbolProps) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="14" fontWeight="bold" fill={color}>$</text>
            <text x="75%" y="75%" textAnchor="start" fontSize="8" fontWeight="bold" fill={color}>LV</text>
        </svg>
    ),
    FAN: ({ color = '#0ea5e9', size = '100%', ...props }: SymbolProps) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <circle cx="12" cy="12" r="11" stroke={color} strokeWidth="1.5" />
            <path d="M12 12L19 9A5 5 0 0 1 15 19L12 12Z" fill={color} fillOpacity="0.4" stroke={color} />
            <path d="M12 12L5 15A5 5 0 0 1 9 5L12 12Z" fill={color} fillOpacity="0.4" stroke={color} />
            <path d="M12 12L15 5A5 5 0 0 1 5 9L12 12Z" fill={color} fillOpacity="0.4" stroke={color} />
        </svg>
    ),
    SENSOR: ({ color = '#10b981', size = '100%', ...props }: SymbolProps) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M12 2L2 22H22L12 2Z" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2" />
            <circle cx="12" cy="14" r="3" fill={color} />
            <path d="M9 22L12 14L15 22" stroke={color} strokeWidth="1" />
        </svg>
    ),
    EXTERIOR: ({ color = '#ef4444', size = '100%', ...props }: SymbolProps) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth="2" fill="white" fillOpacity="0.5" />
            <path d="M8 8L16 16M16 8L8 16" stroke={color} strokeWidth="2" />
            <text x="50%" y="22" textAnchor="middle" fontSize="6" fontWeight="bold" fill={color}>EXT</text>
        </svg>
    )
};
