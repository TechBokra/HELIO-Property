import React from 'react';
import { Link } from 'react-router-dom';
import { isExternalUrl, normalizeActionTarget } from '../../utils/siteContentHelpers';

interface SmartActionLinkProps {
    to?: string;
    fallback?: string;
    className?: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    children: React.ReactNode;
}

export const SmartActionLink: React.FC<SmartActionLinkProps> = ({
    to,
    fallback = '/',
    className,
    onClick,
    children,
}) => {
    const resolvedTarget = normalizeActionTarget(to, fallback);
    if (isExternalUrl(resolvedTarget)) {
        return (
            <a
                href={resolvedTarget}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
                onClick={onClick}
            >
                {children}
            </a>
        );
    }

    return (
        <Link to={resolvedTarget} className={className} onClick={onClick}>
            {children}
        </Link>
    );
};

export default SmartActionLink;
