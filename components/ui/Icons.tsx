import React from 'react';
import { IconProps, defaultSvgProps } from './icons/base';

export * from './icons/base';
export * from './icons/general';
export * from './icons/admin';

// General purpose icons remaining after AI cleanup
export const SearchIcon: React.FC<IconProps> = ({ className }) => (
    <svg {...defaultSvgProps} className={className} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
);

export const ChevronUpIcon: React.FC<IconProps> = ({ className }) => (
    <svg {...defaultSvgProps} className={className} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
);

export const DocumentCheckIcon: React.FC<IconProps> = ({ className }) => (
    <svg {...defaultSvgProps} className={className} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-12a2.25 2.25 0 00-2.25-2.25H15M10.125 2.25A2.25 2.25 0 007.875 4.5M10.125 2.25V4.5a2.25 2.25 0 002.25 2.25h2.625M9 13.5l2.25 2.25 4.5-4.5" /></svg>
);

export const ExclamationTriangleIcon: React.FC<IconProps> = ({ className }) => (
    <svg {...defaultSvgProps} className={className} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
);

