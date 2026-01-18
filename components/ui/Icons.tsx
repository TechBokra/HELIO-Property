import React from 'react';
import { IconProps, defaultSvgProps } from './icons/base';

export * from './icons/base';
export * from './icons/general';
export * from './icons/admin';

// General purpose icons remaining after AI cleanup
export const SearchIcon: React.FC<IconProps> = ({ className }) => (
    <svg {...defaultSvgProps} className={className} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
);
