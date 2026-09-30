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

export const ChatBubbleLeftRightIcon: React.FC<IconProps> = ({ className }) => (
    <svg {...defaultSvgProps} className={className} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.27z" /></svg>
);

export const InformationCircleIcon: React.FC<IconProps> = ({ className }) => (
    <svg {...defaultSvgProps} className={className} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
);

export const CheckIcon: React.FC<IconProps> = ({ className }) => (
    <svg {...defaultSvgProps} className={className} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
);

export const XMarkIcon: React.FC<IconProps> = ({ className }) => (
    <svg {...defaultSvgProps} className={className} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
);

export const ArrowPathIcon: React.FC<IconProps> = ({ className }) => (
    <svg {...defaultSvgProps} className={className} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
);

export const PaintBrushIcon: React.FC<IconProps> = ({ className }) => (
    <svg {...defaultSvgProps} className={className} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>
);

