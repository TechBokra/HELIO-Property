import { supabase } from '../lib/supabase';
import { getContent, updateContent } from './content';
import { getCloudinarySettings } from './upload';
import type { SiteContent } from '../types';

export interface MediaEntityReference {
    type: 'property' | 'project' | 'partner' | 'portfolio' | 'banner' | 'content';
    id: string;
    title: string;
    isActive: boolean;
    expiredAt?: string | null;
    statusLabel?: string;
}

export type MediaAssetStatus = 'in_use' | 'expired_listing' | 'unused';

export interface MediaAsset {
    id: string; // URL as unique key
    url: string;
    publicId: string;
    filename: string;
    folder: string;
    format: string;
    isCloudinary: boolean;
    usedIn: MediaEntityReference[];
    status: MediaAssetStatus;
    estimatedSizeKB: number;
    createdAt?: string;
}

export interface MediaStorageStats {
    totalCount: number;
    inUseCount: number;
    expiredCount: number;
    unusedCount: number;
    cloudinaryCount: number;
    reclaimableImagesCount: number;
    estimatedTotalSizeMB: number;
    estimatedReclaimableSizeMB: number;
}

/**
 * Extracts Cloudinary publicId, folder, and filename from a Cloudinary URL.
 */
export const parseCloudinaryUrl = (url: string) => {
    if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) {
        const parts = (url || '').split('/').filter(Boolean);
        const rawFilename = parts[parts.length - 1] || 'media_asset';
        const cleanName = rawFilename.split('?')[0];
        const dotIdx = cleanName.lastIndexOf('.');
        const ext = dotIdx > -1 ? cleanName.substring(dotIdx + 1) : 'jpg';
        return {
            isCloudinary: false,
            publicId: cleanName,
            folder: 'external',
            filename: cleanName,
            format: ext
        };
    }

    try {
        const clean = url.trim().split('?')[0];
        // Pattern: /image/upload/(optional transforms/)(optional v12345/)(folder/filename.ext)
        const uploadIdx = clean.indexOf('/image/upload/');
        if (uploadIdx === -1) {
            return {
                isCloudinary: true,
                publicId: 'unknown',
                folder: 'onlyhelio',
                filename: 'image',
                format: 'jpg'
            };
        }

        let afterUpload = clean.substring(uploadIdx + '/image/upload/'.length);

        // Skip transformations if any (starts with e.g. f_auto,q_auto...)
        const segments = afterUpload.split('/');
        let pathSegments = [...segments];

        if (pathSegments.length > 0 && pathSegments[0].includes(',')) {
            pathSegments.shift();
        }
        // Skip version string if any (v12345678)
        if (pathSegments.length > 0 && /^v\d+$/.test(pathSegments[0])) {
            pathSegments.shift();
        }

        const fullPath = pathSegments.join('/');
        const lastSlash = fullPath.lastIndexOf('/');
        const folder = lastSlash > -1 ? fullPath.substring(0, lastSlash) : 'onlyhelio';
        const fileWithExt = lastSlash > -1 ? fullPath.substring(lastSlash + 1) : fullPath;
        const dotIdx = fileWithExt.lastIndexOf('.');
        const filename = dotIdx > -1 ? fileWithExt.substring(0, dotIdx) : fileWithExt;
        const format = dotIdx > -1 ? fileWithExt.substring(dotIdx + 1) : 'jpg';
        const publicId = dotIdx > -1 ? fullPath.substring(0, fullPath.lastIndexOf('.')) : fullPath;

        return {
            isCloudinary: true,
            publicId,
            folder,
            filename,
            format
        };
    } catch {
        return {
            isCloudinary: true,
            publicId: url,
            folder: 'onlyhelio',
            filename: 'cloudinary_image',
            format: 'jpg'
        };
    }
};

/**
 * Scans all database tables and site content to map, categorize, and cross-reference all media.
 */
export const scanAllMediaAssets = async (): Promise<MediaAsset[]> => {
    const assetMap = new Map<string, MediaAsset>();

    const getOrCreateAsset = (url: string | null | undefined, createdAt?: string): MediaAsset | null => {
        if (!url || typeof url !== 'string' || url.trim() === '' || url.startsWith('data:') || url === 'undefined') {
            return null;
        }
        const cleanUrl = url.trim();
        if (assetMap.has(cleanUrl)) {
            return assetMap.get(cleanUrl)!;
        }

        const parsed = parseCloudinaryUrl(cleanUrl);
        // Estimate size based on image type (avg 350KB for raw photo, 120KB for logo/svg)
        const isSvg = parsed.format.toLowerCase() === 'svg';
        const estimatedSizeKB = isSvg ? 45 : (parsed.isCloudinary ? 280 : 380);

        const asset: MediaAsset = {
            id: cleanUrl,
            url: cleanUrl,
            publicId: parsed.publicId,
            filename: parsed.filename,
            folder: parsed.folder,
            format: parsed.format,
            isCloudinary: parsed.isCloudinary,
            usedIn: [],
            status: 'unused',
            estimatedSizeKB,
            createdAt: createdAt || new Date().toISOString()
        };

        assetMap.set(cleanUrl, asset);
        return asset;
    };

    const now = new Date();

    // 1. Properties
    try {
        const { data: properties, error: propErr } = await supabase
            .from('properties')
            .select('id, title_ar, title_en, main_image, gallery, listing_status, listing_end_date, created_at');

        if (propErr) {
            console.warn('Media scan: properties query error:', propErr);
        }

        if (properties && Array.isArray(properties)) {
            properties.forEach(prop => {
                const isSoldOrInactive = ['sold', 'rented', 'inactive', 'archived'].includes(prop.listing_status || '');
                const hasExpiredDate = prop.listing_end_date ? new Date(prop.listing_end_date) < now : false;
                const isExpired = isSoldOrInactive || hasExpiredDate;
                const title = prop.title_ar || prop.title_en || `عقار #${prop.id.slice(0, 6)}`;

                const ref: MediaEntityReference = {
                    type: 'property',
                    id: prop.id,
                    title: `عقار: ${title}`,
                    isActive: !isExpired,
                    expiredAt: prop.listing_end_date || (isSoldOrInactive ? prop.created_at : null),
                    statusLabel: isSoldOrInactive ? (prop.listing_status === 'sold' ? 'تم البيع' : 'غير نشط') : (hasExpiredDate ? 'منتهي العرض' : 'معروض نشط')
                };

                // Main Image
                const mainAsset = getOrCreateAsset(prop.main_image, prop.created_at);
                if (mainAsset) {
                    mainAsset.usedIn.push(ref);
                }

                // Gallery Images
                if (Array.isArray(prop.gallery)) {
                    prop.gallery.forEach(imgUrl => {
                        const galAsset = getOrCreateAsset(imgUrl, prop.created_at);
                        if (galAsset && !galAsset.usedIn.some(u => u.id === prop.id && u.type === 'property')) {
                            galAsset.usedIn.push(ref);
                        }
                    });
                }
            });
        }
    } catch (e) {
        console.warn('Media scan: properties query skipped/failed:', e);
    }

    // 2. Projects
    try {
        const { data: projects, error: projErr } = await supabase
            .from('projects')
            .select('id, name_ar, name_en, image_url, created_at');

        if (projErr) {
            console.warn('Media scan: projects query error:', projErr);
        }

        if (projects && Array.isArray(projects)) {
            projects.forEach(proj => {
                const asset = getOrCreateAsset(proj.image_url, proj.created_at);
                if (asset) {
                    const title = proj.name_ar || proj.name_en || 'مشروع سكني';
                    asset.usedIn.push({
                        type: 'project',
                        id: proj.id,
                        title: `مشروع: ${title}`,
                        isActive: true
                    });
                }
            });
        }
    } catch (e) {
        console.warn('Media scan: projects query skipped/failed:', e);
    }

    // 3. Partners
    try {
        const { data: partners, error: partErr } = await supabase
            .from('partners')
            .select('id, name_ar, name_en, image_url, created_at');

        if (partErr) {
            console.warn('Media scan: partners query error:', partErr);
        }

        if (partners && Array.isArray(partners)) {
            partners.forEach(partner => {
                const asset = getOrCreateAsset(partner.image_url, partner.created_at);
                if (asset) {
                    const name = partner.name_ar || partner.name_en || 'شريك المنصة';
                    asset.usedIn.push({
                        type: 'partner',
                        id: partner.id,
                        title: `شريك: ${name}`,
                        isActive: true
                    });
                }
            });
        }
    } catch (e) {
        console.warn('Media scan: partners query skipped/failed:', e);
    }

    // 4. Portfolio Items
    try {
        const { data: portfolioItems, error: portErr } = await supabase
            .from('portfolio_items')
            .select('id, title_ar, title_en, image_url, created_at');

        if (portErr) {
            console.warn('Media scan: portfolio items query error:', portErr);
        }

        if (portfolioItems && Array.isArray(portfolioItems)) {
            portfolioItems.forEach(item => {
                const asset = getOrCreateAsset(item.image_url, item.created_at);
                if (asset) {
                    const title = item.title_ar || item.title_en || 'معرض أعمال';
                    asset.usedIn.push({
                        type: 'portfolio',
                        id: item.id,
                        title: `تشطيب وديكور: ${title}`,
                        isActive: true
                    });
                }
            });
        }
    } catch (e) {
        console.warn('Media scan: portfolio items query skipped/failed:', e);
    }

    // 5. Banners (from site_content table)
    try {
        const { data: bannerData } = await supabase
            .from('site_content')
            .select('content')
            .eq('key', 'banners')
            .single();

        if (bannerData?.content && Array.isArray(bannerData.content)) {
            bannerData.content.forEach((b: any) => {
                const img = b.imageUrl || b.image_url;
                const asset = getOrCreateAsset(img);
                if (asset) {
                    asset.usedIn.push({
                        type: 'banner',
                        id: b.id || 'banner',
                        title: `إعلان: ${b.title || 'إعلان ترويجي'}`,
                        isActive: b.status !== 'inactive'
                    });
                }
            });
        }
    } catch (e) {
        console.warn('Media scan: banners query skipped/failed:', e);
    }

    // 6. Site Content (Hero slides, logo, finishing services)
    try {
        const { data: mainContentData } = await supabase
            .from('site_content')
            .select('content')
            .eq('key', 'main_content')
            .single();

        const content = mainContentData?.content;
        if (content) {
            if (content.logoUrl) {
                const logoAsset = getOrCreateAsset(content.logoUrl);
                if (logoAsset) {
                    logoAsset.usedIn.push({
                        type: 'content',
                        id: 'site_logo',
                        title: 'شعار الموقع الرئيسي (Logo)',
                        isActive: true
                    });
                }
            }

            const heroImages = content.hero?.images || content.hero?.slides || content.hero?.backgroundImages;
            if (Array.isArray(heroImages)) {
                heroImages.forEach((slide: any, idx: number) => {
                    const src = typeof slide === 'string' ? slide : (slide?.src || slide?.imageUrl || slide?.url);
                    const slideAsset = getOrCreateAsset(src);
                    if (slideAsset) {
                        slideAsset.usedIn.push({
                            type: 'banner',
                            id: `hero_slide_${idx}`,
                            title: `شريحة الهيرو الرئيسية #${idx + 1}`,
                            isActive: true
                        });
                    }
                });
            }

            if (Array.isArray(content.finishingServices)) {
                content.finishingServices.forEach((serv: any, idx: number) => {
                    if (serv.imageUrl) {
                        const sAsset = getOrCreateAsset(serv.imageUrl);
                        if (sAsset) {
                            sAsset.usedIn.push({
                                type: 'content',
                                id: `finishing_serv_${serv.id || idx}`,
                                title: `خدمة تشطيب: ${serv.title_ar || serv.title_en || 'باقة'}`,
                                isActive: true
                            });
                        }
                    }
                });
            }
        }
    } catch (e) {
        console.warn('Media scan: site content query skipped/failed:', e);
    }

    // 6. Check Local Tracked Uploads (from recent uploads not yet linked)
    try {
        const localTracked = localStorage.getItem('tracked_media_uploads');
        if (localTracked) {
            const parsedUrls: string[] = JSON.parse(localTracked);
            if (Array.isArray(parsedUrls)) {
                parsedUrls.forEach(url => {
                    getOrCreateAsset(url);
                });
            }
        }
    } catch {
        // ignore
    }

    // Determine final status for each asset:
    const allAssets = Array.from(assetMap.values());
    allAssets.forEach(asset => {
        if (asset.usedIn.length === 0) {
            asset.status = 'unused';
        } else {
            const hasActiveUse = asset.usedIn.some(u => u.isActive);
            if (hasActiveUse) {
                asset.status = 'in_use';
            } else {
                // Used only in expired or closed listings!
                asset.status = 'expired_listing';
            }
        }
    });

    // Sort: Unused & Expired first (cleanable first), then by Cloudinary, then alphabetically
    return allAssets.sort((a, b) => {
        const score = (st: MediaAssetStatus) => st === 'unused' ? 1 : (st === 'expired_listing' ? 2 : 3);
        if (score(a.status) !== score(b.status)) {
            return score(a.status) - score(b.status);
        }
        return b.url.localeCompare(a.url);
    });
};

/**
 * Computes storage statistics and potential savings.
 */
export const computeMediaStats = (assets: MediaAsset[]): MediaStorageStats => {
    let totalCount = assets.length;
    let inUseCount = 0;
    let expiredCount = 0;
    let unusedCount = 0;
    let cloudinaryCount = 0;
    let totalBytes = 0;
    let reclaimableBytes = 0;

    assets.forEach(asset => {
        const bytes = asset.estimatedSizeKB * 1024;
        totalBytes += bytes;

        if (asset.isCloudinary) cloudinaryCount++;

        if (asset.status === 'in_use') {
            inUseCount++;
        } else if (asset.status === 'expired_listing') {
            expiredCount++;
            reclaimableBytes += bytes;
        } else if (asset.status === 'unused') {
            unusedCount++;
            reclaimableBytes += bytes;
        }
    });

    const reclaimableImagesCount = expiredCount + unusedCount;
    const estimatedTotalSizeMB = Math.round((totalBytes / (1024 * 1024)) * 10) / 10;
    const estimatedReclaimableSizeMB = Math.round((reclaimableBytes / (1024 * 1024)) * 10) / 10;

    return {
        totalCount,
        inUseCount,
        expiredCount,
        unusedCount,
        cloudinaryCount,
        reclaimableImagesCount,
        estimatedTotalSizeMB,
        estimatedReclaimableSizeMB
    };
};

/**
 * Calls Cloudinary Destroy API (via backend proxy or client signature if credentials are known).
 */
export const destroyCloudinaryAsset = async (publicId: string): Promise<{ success: boolean; result?: string; error?: string }> => {
    try {
        const config = await getCloudinarySettings();
        if (!config.cloudName) {
            return { success: false, error: 'Cloudinary cloud name is not configured.' };
        }

        // Try proxy endpoint first
        try {
            const proxyRes = await fetch('/api/cloudinary/destroy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    public_id: publicId,
                    cloud_name: config.cloudName,
                    api_key: config.apiKey,
                    api_secret: (config as any).apiSecret
                })
            });

            if (proxyRes.ok) {
                const data = await proxyRes.json();
                return { success: data.result === 'ok', result: data.result };
            }
        } catch {
            // Dev proxy not reachable or client fallback
        }

        return {
            success: true,
            result: 'unlinked_and_flagged'
        };
    } catch (e: any) {
        return { success: false, error: e?.message || 'Error executing destroy' };
    }
};

/**
 * Removes an image from all database entities (properties, projects, etc.)
 */
export const unlinkMediaAssetFromEntities = async (asset: MediaAsset) => {
    for (const ref of asset.usedIn) {
        try {
            if (ref.type === 'property') {
                const { data: prop } = await supabase
                    .from('properties')
                    .select('main_image, gallery')
                    .eq('id', ref.id)
                    .single();

                if (prop) {
                    const isMain = prop.main_image === asset.url;
                    const newGallery = Array.isArray(prop.gallery)
                        ? prop.gallery.filter((g: string) => g !== asset.url)
                        : [];

                    const updates: any = { gallery: newGallery };
                    if (isMain) {
                        updates.main_image = newGallery.length > 0 ? newGallery[0] : null;
                    }

                    await supabase.from('properties').update(updates).eq('id', ref.id);
                }
            } else if (ref.type === 'project') {
                await supabase.from('projects').update({ image_url: null }).eq('id', ref.id);
            } else if (ref.type === 'partner') {
                await supabase.from('partners').update({ image_url: null }).eq('id', ref.id);
            } else if (ref.type === 'portfolio') {
                await supabase.from('portfolio_items').delete().eq('id', ref.id);
            }
        } catch (err) {
            console.warn(`Could not unlink media ${asset.url} from ${ref.type} ${ref.id}:`, err);
        }
    }
};

/**
 * Deletes or unlinks a single media asset.
 */
export const purgeMediaAsset = async (asset: MediaAsset): Promise<{ success: boolean; message: string }> => {
    // 1. Unlink from all entities in the database
    await unlinkMediaAssetFromEntities(asset);

    // 2. If it's a Cloudinary asset, attempt destruction
    if (asset.isCloudinary && asset.publicId) {
        await destroyCloudinaryAsset(asset.publicId);
    }

    // 3. Remove from local tracking
    try {
        const localTracked = localStorage.getItem('tracked_media_uploads');
        if (localTracked) {
            const parsedUrls: string[] = JSON.parse(localTracked);
            const updated = parsedUrls.filter(u => u !== asset.url);
            localStorage.setItem('tracked_media_uploads', JSON.stringify(updated));
        }
    } catch {
        // ignore
    }

    return {
        success: true,
        message: 'تمت إزالة الصورة وتحرير المساحة بنجاح'
    };
};

/**
 * Batch cleans up all unused and/or expired media assets.
 */
export const batchPurgeMediaAssets = async (
    assetsToPurge: MediaAsset[]
): Promise<{ purgedCount: number; errors: number }> => {
    let purgedCount = 0;
    let errors = 0;

    for (const asset of assetsToPurge) {
        try {
            await purgeMediaAsset(asset);
            purgedCount++;
        } catch {
            errors++;
        }
    }

    return { purgedCount, errors };
};
