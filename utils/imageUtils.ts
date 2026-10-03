/**
 * ONLY HELIO — High Performance Image Optimization Utilities
 * Handles dynamic WebP formatting, responsive srcSets, and CDN resizing
 * for Unsplash, Cloudinary, and external property media.
 * Prevents broken /undefined requests and avoids downloading oversized raw images.
 */

const FALLBACK_PLACEHOLDER = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22600%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20600%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder%20text%20%7B%20fill%3A%23888%3Bfont-weight%3Abold%3Bfont-family%3Asans-serif%3Bfont-size%3A24pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%2327272a%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%22300%22%20y%3D%22310%22%3EONLY%20HELIO%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E';

/**
 * Returns an optimized image URL with proper width, quality, and modern format.
 */
export const getOptimizedImageUrl = (
    url: string | undefined | null, 
    width: number = 800, 
    quality: number = 75
): string => {
    if (!url || typeof url !== 'string' || url.trim() === '' || url === 'undefined') {
        return FALLBACK_PLACEHOLDER;
    }

    const cleanUrl = url.trim();

    // 1. Unsplash CDN Optimization
    if (cleanUrl.includes('images.unsplash.com')) {
        try {
            const parsed = new URL(cleanUrl);
            parsed.searchParams.set('auto', 'format');
            parsed.searchParams.set('fit', 'crop');
            parsed.searchParams.set('w', String(width));
            parsed.searchParams.set('q', String(quality));
            return parsed.toString();
        } catch {
            return cleanUrl;
        }
    }

    // 2. Cloudinary Optimization
    if (cleanUrl.includes('res.cloudinary.com') && cleanUrl.includes('/image/upload/')) {
        try {
            // If already has transformation parameters, don't duplicate
            if (cleanUrl.match(/\/image\/upload\/[a-z]_[^/]+\//)) {
                return cleanUrl;
            }
            return cleanUrl.replace(
                '/image/upload/',
                `/image/upload/f_auto,q_auto,w_${width},c_limit/`
            );
        } catch {
            return cleanUrl;
        }
    }

    return cleanUrl;
};

/**
 * Generates valid, high-performance responsive srcSet descriptors.
 * Guarantees zero "undefined" network requests.
 */
export const getResponsiveImageSources = (url: string | undefined | null) => {
    if (!url || typeof url !== 'string' || url.trim() === '' || url === 'undefined') {
        return {
            src: FALLBACK_PLACEHOLDER,
            srcSetWebp: '',
            srcSet: ''
        };
    }

    const cleanUrl = url.trim();

    // For Unsplash images: produce 480w, 800w, 1200w variations
    if (cleanUrl.includes('images.unsplash.com')) {
        const small = getOptimizedImageUrl(cleanUrl, 480, 70);
        const medium = getOptimizedImageUrl(cleanUrl, 800, 75);
        const large = getOptimizedImageUrl(cleanUrl, 1200, 80);

        return {
            src: medium,
            srcSetWebp: `${small}&fm=webp 480w, ${medium}&fm=webp 800w, ${large}&fm=webp 1200w`,
            srcSet: `${small} 480w, ${medium} 800w, ${large} 1200w`
        };
    }

    // For Cloudinary images: produce 480w, 800w, 1200w variations
    if (cleanUrl.includes('res.cloudinary.com')) {
        const small = getOptimizedImageUrl(cleanUrl, 480, 70);
        const medium = getOptimizedImageUrl(cleanUrl, 800, 75);
        const large = getOptimizedImageUrl(cleanUrl, 1200, 80);

        return {
            src: medium,
            srcSetWebp: `${small} 480w, ${medium} 800w, ${large} 1200w`,
            srcSet: `${small} 480w, ${medium} 800w, ${large} 1200w`
        };
    }

    // For all other image hosts: safe single resolution fallback
    return {
        src: cleanUrl,
        srcSetWebp: `${cleanUrl} 1x`,
        srcSet: `${cleanUrl} 1x`
    };
};
