
import React from 'react';

interface LogoProps {
    className?: string;
}

export const HelioLogo: React.FC<LogoProps> = ({ className }) => {
    return (
        <svg
            className={className}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Only Helio Logo"
        >
            <defs>
                <linearGradient id="helio-gradient" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#F97316" />
                </linearGradient>
            </defs>

            {/* Sun element */}
            <circle cx="50" cy="50" r="28" fill="url(#helio-gradient)" />

            {/* Arch/Building element */}
            <path
                d="M20 90 V 50 C 20 33.43 33.43 20 50 20 C 66.57 20 80 33.43 80 50 V 90"
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
                // FIX: Corrected SVG attribute 'strokeLineCap' to 'strokeLinecap'.
                strokeLinecap="round"
            />

            {/* Base line */}
            <line x1="10" y1="90" x2="90" y2="90" stroke="currentColor" strokeWidth="10" 
                // FIX: Corrected SVG attribute 'strokeLineCap' to 'strokeLinecap'.
                strokeLinecap="round" />
        </svg>
    );
};
