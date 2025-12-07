
import React from 'react';

export interface IconProps {
    className?: string;
}

export const defaultSvgProps: React.SVGProps<SVGSVGElement> = {
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: 1.5,
    stroke: "currentColor",
    "aria-hidden": true
};
