import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { 
    scanAllMediaAssets, 
    computeMediaStats, 
    purgeMediaAsset, 
    batchPurgeMediaAssets, 
    type MediaAsset,
    type MediaAssetStatus
} from '../../../services/mediaLibrary';
import { getCloudinarySettings, type CloudinaryConfig } from '../../../services/upload';
import { getOptimizedImageUrl } from '../../../utils/imageUtils';
import { 
    CloudIcon, 
    SearchIcon, 
    ArrowPathIcon, 
    TrashIcon, 
    CheckIcon, 
    PhotoIcon, 
    BuildingIcon, 
    CubeIcon, 
    UsersIcon, 
    SparklesIcon, 
    InformationCircleIcon, 
    ExclamationTriangleIcon,
    LinkIcon,
    TableCellsIcon
} from '../../ui/Icons';

export const AdminMediaLibraryPage: React.FC = () => {
    const { t, language } = useLanguage();
    const t_media = (t as any).adminDashboard?.mediaLibrary || {};
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    // Query media assets
    const { 
        data: assets = [], 
        isLoading, 
        isRefetching, 
        refetch 
    } = useQuery({
        queryKey: ['adminMediaAssets'],
        queryFn: scanAllMediaAssets,
        staleTime: 1000 * 60 * 3 // 3 mins cache
    });

    // Query Cloudinary config
    const { data: cloudConfig } = useQuery<CloudinaryConfig>({
        queryKey: ['cloudinaryConfig'],
        queryFn: getCloudinarySettings
    });

    // Component State
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'in_use' | 'expired' | 'unused' | 'cloudinary'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
    const [isReuseModalOpen, setIsReuseModalOpen] = useState(false);
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [assetToDelete, setAssetToDelete] = useState<MediaAsset | null>(null);
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

    // Stats
    const stats = useMemo(() => computeMediaStats(assets), [assets]);

    // Filtered Assets
    const filteredAssets = useMemo(() => {
        return assets.filter(asset => {
            // Tab filter
            if (activeTab === 'in_use' && asset.status !== 'in_use') return false;
            if (activeTab === 'expired' && asset.status !== 'expired_listing') return false;
            if (activeTab === 'unused' && asset.status !== 'unused') return false;
            if (activeTab === 'cloudinary' && !asset.isCloudinary) return false;

            // Search filter
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                const matchFilename = asset.filename.toLowerCase().includes(q);
                const matchPublicId = asset.publicId.toLowerCase().includes(q);
                const matchFolder = asset.folder.toLowerCase().includes(q);
                const matchUrl = asset.url.toLowerCase().includes(q);
                const matchUsage = asset.usedIn.some(u => u.title.toLowerCase().includes(q));
                return matchFilename || matchPublicId || matchFolder || matchUrl || matchUsage;
            }

            return true;
        });
    }, [assets, activeTab, searchTerm]);

    // Single Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: (asset: MediaAsset) => purgeMediaAsset(asset),
        onSuccess: () => {
            showToast(language === 'ar' ? 'تم حذف الصورة وتحرير المساحة بنجاح' : 'Image deleted and storage reclaimed successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['adminMediaAssets'] });
            setAssetToDelete(null);
            if (selectedAsset && assetToDelete && selectedAsset.id === assetToDelete.id) {
                setIsReuseModalOpen(false);
                setSelectedAsset(null);
            }
        },
        onError: (err: any) => {
            showToast(err?.message || 'Failed to delete asset', 'error');
        }
    });

    // Batch Clean Mutation
    const batchCleanMutation = useMutation({
        mutationFn: (cleanableAssets: MediaAsset[]) => batchPurgeMediaAssets(cleanableAssets),
        onSuccess: (res) => {
            showToast(
                language === 'ar' 
                    ? `تم بنجاح تنظيف ${res.purgedCount} صورة وتحرير السعة التخزينية!` 
                    : `Successfully purged ${res.purgedCount} unused/expired images and reclaimed storage!`, 
                'success'
            );
            queryClient.invalidateQueries({ queryKey: ['adminMediaAssets'] });
            setIsBatchModalOpen(false);
        },
        onError: (err: any) => {
            showToast(err?.message || 'Batch clean failed', 'error');
        }
    });

    const cleanableAssets = useMemo(() => {
        return assets.filter(a => a.status === 'unused' || a.status === 'expired_listing');
    }, [assets]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedUrl(text);
        showToast(t_media.actions?.copied || (language === 'ar' ? 'تم نسخ الرابط إلى الحافظة!' : 'URL copied to clipboard!'), 'success');
        setTimeout(() => setCopiedUrl(null), 2500);
    };

    const handleOpenPreview = (asset: MediaAsset) => {
        setSelectedAsset(asset);
        setIsReuseModalOpen(true);
    };

    const getStatusBadge = (status: MediaAssetStatus) => {
        switch (status) {
            case 'in_use':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                        {t_media.status?.inUse || 'نشطة قيد الاستخدام'}
                    </span>
                );
            case 'expired_listing':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {t_media.status?.expired || 'منتهية فترة العرض'}
                    </span>
                );
            case 'unused':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        {t_media.status?.unused || 'غير مستخدمة / معزولة'}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-16">
            {/* Header & Main Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <CloudIcon className="w-8 h-8 text-amber-500" />
                        {t_media.title || 'مكتبة وسائط Cloudinary وإدارة المساحة'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-2xl text-sm">
                        {t_media.subtitle || 'إدارة وتصفح صور المشروع، واستخدام الصور في مواضع أخرى، وفحص وتنظيف الصور غير المستخدمة أو منتهية العرض لتوفير السعة التخزينية.'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => refetch()}
                        isLoading={isRefetching}
                        className="flex items-center gap-2"
                        title={t_media.actions?.refresh || 'تحديث وفحص'}
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
                        <span>{t_media.actions?.refresh || 'فحص السجلات'}</span>
                    </Button>

                    <Link to="/admin/external-settings">
                        <Button variant="secondary" className="flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-blue-500" />
                            <span>إعدادات الربط ومجلد Cloudinary</span>
                        </Button>
                    </Link>

                    {cleanableAssets.length > 0 && (
                        <Button
                            variant="danger"
                            onClick={() => setIsBatchModalOpen(true)}
                            className="flex items-center gap-2 shadow-sm"
                        >
                            <TrashIcon className="w-4 h-4" />
                            <span>{t_media.actions?.cleanAll || 'تنظيف جماعي وتحرير المساحة'} ({cleanableAssets.length})</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Cloudinary Project Folder Status Bar */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold shadow-sm">
                        <CloudIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                                حساب Cloudinary: <code className="text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-blue-100 font-mono text-xs">{cloudConfig?.cloudName || 'dwg0hr34g'}</code>
                            </span>
                            <span className="text-gray-300">|</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                                مجلد المشروع: <code className="text-amber-600 dark:text-amber-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-amber-100 font-mono text-xs">{cloudConfig?.folder || 'onlyhelio'}</code>
                            </span>
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                            يتم حفظ جميع صور العقارات والمشاريع والشركاء تلقائياً داخل هذا المجلد مع تحويلها لصيغ WebP خفيفة ومضغوطة تلقائياً.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                    <a
                        href={`https://console.cloudinary.com/pm/${cloudConfig?.cloudName || 'dwg0hr34g'}/media-explorer`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 bg-white/80 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm"
                    >
                        <span>{t_media.actions?.openCloudinary || 'فتح لوحة تحكم Cloudinary'}</span>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                </div>
            </div>

            {/* Storage Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Assets */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            {t_media.stats?.total || 'إجمالي الوسائط المتعقبة'}
                        </span>
                        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600">
                            <PhotoIcon className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                            {stats.totalCount}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                            (~{stats.estimatedTotalSizeMB} MB)
                        </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                        <span className="font-semibold text-blue-600">{stats.cloudinaryCount}</span> صورة على Cloudinary
                    </div>
                </div>

                {/* Active / In Use */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                            {t_media.stats?.active || 'قيد الاستخدام النشط'}
                        </span>
                        <div className="p-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600">
                            <CheckIcon className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-green-600 dark:text-green-400">
                            {stats.inUseCount}
                        </span>
                        <span className="text-xs text-gray-400 font-normal">
                            ({stats.totalCount > 0 ? Math.round((stats.inUseCount / stats.totalCount) * 100) : 0}% من الإجمالي)
                        </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        عقارات معروضة، مشاريع نشطة وبانرات
                    </div>
                </div>

                {/* Expired Listings */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            {t_media.stats?.expired || 'منتهية فترة العرض'}
                        </span>
                        <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600">
                            <BuildingIcon className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                            {stats.expiredCount}
                        </span>
                        <span className="text-xs text-gray-400 font-normal">
                            عقارات بيعت أو انتهت
                        </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        مؤهلة للتنظيف بعد انقضاء العرض
                    </div>
                </div>

                {/* Reclaimable Storage */}
                <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/20 rounded-2xl p-5 border border-rose-200 dark:border-rose-900 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                            {t_media.stats?.reclaimable || 'المساحة القابلة للتحرير'}
                        </span>
                        <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600">
                            <TrashIcon className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                            {stats.estimatedReclaimableSizeMB} MB
                        </span>
                    </div>
                    <div className="mt-2 text-xs text-rose-700 dark:text-rose-300 font-medium">
                        {stats.reclaimableImagesCount} صورة غير مستخدمة أو منتهية
                    </div>
                </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Tabs */}
                <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            activeTab === 'all' 
                                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        {t_media.tabs?.all || 'الكل'} ({assets.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('in_use')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            activeTab === 'in_use' 
                                ? 'bg-white dark:bg-gray-800 text-green-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        {t_media.tabs?.inUse || 'قيد الاستخدام'} ({stats.inUseCount})
                    </button>
                    <button
                        onClick={() => setActiveTab('expired')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            activeTab === 'expired' 
                                ? 'bg-white dark:bg-gray-800 text-amber-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        {t_media.tabs?.expired || 'منتهية العرض'} ({stats.expiredCount})
                    </button>
                    <button
                        onClick={() => setActiveTab('unused')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            activeTab === 'unused' 
                                ? 'bg-white dark:bg-gray-800 text-rose-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        {t_media.tabs?.unused || 'غير مستخدمة'} ({stats.unusedCount})
                    </button>
                    <button
                        onClick={() => setActiveTab('cloudinary')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            activeTab === 'cloudinary' 
                                ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        Cloudinary ({stats.cloudinaryCount})
                    </button>
                </div>

                {/* Search & Layout toggle */}
                <div className="flex items-center gap-3">
                    <div className="relative min-w-[240px]">
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="بحث بالاسم، الكود، أو الرابط..."
                            className="pr-9 text-xs h-9"
                        />
                    </div>

                    <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg p-0.5 bg-gray-50 dark:bg-gray-900">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white dark:bg-gray-800 text-amber-600 shadow-sm' : 'text-gray-400'}`}
                            title="عرض شبكي"
                        >
                            <PhotoIcon className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-white dark:bg-gray-800 text-amber-600 shadow-sm' : 'text-gray-400'}`}
                            title="عرض جدول"
                        >
                            <TableCellsIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Display: Loading / Empty / Grid / Table */}
            {isLoading ? (
                <div className="p-16 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <ArrowPathIcon className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
                    <p className="text-gray-500">جاري فحص وتجميع سجلات وسائط المنصة ومطابقتها مع Cloudinary...</p>
                </div>
            ) : filteredAssets.length === 0 ? (
                <div className="p-16 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                    <PhotoIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
                        {t_media.empty || 'لا توجد صور مطابقة لهذا الفلتر'}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                        يمكنك تغيير الفلتر أو كتابة كلمة بحث أخرى.
                    </p>
                </div>
            ) : viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {filteredAssets.map(asset => {
                        const optimizedThumb = getOptimizedImageUrl(asset.url, 480, 75);
                        return (
                            <div 
                                key={asset.id}
                                className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
                            >
                                {/* Thumbnail Image */}
                                <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-900 overflow-hidden">
                                    <img
                                        src={optimizedThumb}
                                        alt={asset.filename}
                                        loading="lazy"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = asset.url;
                                        }}
                                    />

                                    {/* Top Overlay Badges */}
                                    <div className="absolute top-2 right-2 left-2 flex items-center justify-between pointer-events-none">
                                        <div className="pointer-events-auto">
                                            {getStatusBadge(asset.status)}
                                        </div>
                                        {asset.isCloudinary && (
                                            <span className="pointer-events-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-sm font-mono uppercase">
                                                Cloudinary
                                            </span>
                                        )}
                                    </div>

                                    {/* Quick Actions Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleOpenPreview(asset)}
                                            className="text-xs bg-white/90 text-gray-900 hover:bg-white shadow"
                                            title="معاينة واستخدام في موضع آخر"
                                        >
                                            استخدام ومعاينة
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleCopy(asset.url)}
                                            className="text-xs bg-white/90 text-gray-900 hover:bg-white shadow"
                                            title="نسخ الرابط"
                                        >
                                            {copiedUrl === asset.url ? <CheckIcon className="w-4 h-4 text-green-600" /> : 'نسخ'}
                                        </Button>
                                    </div>
                                </div>

                                {/* Body Information */}
                                <div className="p-4 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between text-xs text-gray-400 font-mono mb-1">
                                            <span className="uppercase">{asset.format}</span>
                                            <span>~{asset.estimatedSizeKB} KB</span>
                                        </div>
                                        <h4 
                                            className="text-sm font-bold text-gray-900 dark:text-white truncate" 
                                            title={asset.filename}
                                        >
                                            {asset.filename}
                                        </h4>
                                        <p className="text-[11px] font-mono text-gray-400 truncate mt-0.5" title={asset.folder}>
                                            📁 {asset.folder}
                                        </p>
                                    </div>

                                    {/* Usage Pill */}
                                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/60">
                                        {asset.usedIn.length > 0 ? (
                                            <div className="space-y-1">
                                                <div className="text-[11px] font-medium text-gray-600 dark:text-gray-300 truncate">
                                                    🔗 {asset.usedIn[0].title}
                                                </div>
                                                {asset.usedIn.length > 1 && (
                                                    <span className="text-[10px] text-gray-400">
                                                        + {asset.usedIn.length - 1} مواضع أخرى
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-[11px] text-rose-500 font-medium">
                                                ⚠️ غير مستخدمة (جاهزة للتنظيف)
                                            </div>
                                        )}

                                        <div className="mt-3 flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenPreview(asset)}
                                                className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                                            >
                                                خيارات الاستخدام
                                            </button>

                                            {(asset.status === 'unused' || asset.status === 'expired_listing') && (
                                                <button
                                                    type="button"
                                                    onClick={() => setAssetToDelete(asset)}
                                                    className="text-gray-400 hover:text-rose-600 transition-colors p-1"
                                                    title="حذف وتحرير المساحة"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Table List View */
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-gray-50 dark:bg-gray-900/60 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="py-3.5 px-4">الصورة</th>
                                    <th className="py-3.5 px-4">اسم الملف / Public ID</th>
                                    <th className="py-3.5 px-4">الحالة</th>
                                    <th className="py-3.5 px-4">الموضع المستخدم فيه</th>
                                    <th className="py-3.5 px-4">الحجم التقديري</th>
                                    <th className="py-3.5 px-4 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredAssets.map(asset => (
                                    <tr key={asset.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-900/30 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="w-14 h-11 rounded-lg bg-gray-100 dark:bg-gray-900 overflow-hidden border border-gray-200 dark:border-gray-700">
                                                <img
                                                    src={getOptimizedImageUrl(asset.url, 120, 70)}
                                                    alt={asset.filename}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-gray-900 dark:text-white text-xs truncate max-w-xs" title={asset.filename}>
                                                {asset.filename}
                                            </div>
                                            <div className="text-[11px] font-mono text-gray-400 truncate max-w-xs mt-0.5">
                                                📁 {asset.folder}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            {getStatusBadge(asset.status)}
                                        </td>
                                        <td className="py-3 px-4">
                                            {asset.usedIn.length > 0 ? (
                                                <div className="space-y-0.5 max-w-xs">
                                                    <span className="text-xs text-gray-800 dark:text-gray-200 block truncate">
                                                        {asset.usedIn[0].title}
                                                    </span>
                                                    {asset.usedIn.length > 1 && (
                                                        <span className="text-[10px] text-gray-400">
                                                            +{asset.usedIn.length - 1} مواضع أخرى
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-rose-500 font-medium">
                                                    غير مستخدمة
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-xs text-gray-500">
                                            ~{asset.estimatedSizeKB} KB
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleOpenPreview(asset)}
                                                    className="text-xs h-8 px-2.5"
                                                >
                                                    استخدام
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleCopy(asset.url)}
                                                    className="text-xs h-8 px-2"
                                                    title="نسخ الرابط"
                                                >
                                                    {copiedUrl === asset.url ? <CheckIcon className="w-4 h-4 text-green-600" /> : 'نسخ'}
                                                </Button>
                                                {(asset.status === 'unused' || asset.status === 'expired_listing') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setAssetToDelete(asset)}
                                                        className="text-gray-400 hover:text-rose-600 p-1.5 rounded transition-colors"
                                                        title="حذف"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal: Preview, Code & Reuse */}
            {isReuseModalOpen && selectedAsset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <PhotoIcon className="w-5 h-5 text-amber-500" />
                                <h3 className="font-bold text-gray-900 dark:text-white">
                                    معاينة الصورة واستخدامها في مواضع أخرى
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsReuseModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg p-1"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Visual Preview */}
                            <div className="rounded-2xl overflow-hidden bg-gray-950 flex items-center justify-center max-h-72 border border-gray-800">
                                <img
                                    src={selectedAsset.url}
                                    alt={selectedAsset.filename}
                                    className="max-h-72 w-auto object-contain"
                                />
                            </div>

                            {/* Meta & Status */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-900/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
                                <div>
                                    <span className="text-gray-400 block">اسم الملف:</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-200 truncate block">{selectedAsset.filename}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block">المجلد:</span>
                                    <span className="font-mono text-gray-800 dark:text-gray-200 truncate block">📁 {selectedAsset.folder}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block">الحجم التقديري:</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-200 block">~{selectedAsset.estimatedSizeKB} KB</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block">الحالة:</span>
                                    <div className="mt-0.5">{getStatusBadge(selectedAsset.status)}</div>
                                </div>
                            </div>

                            {/* Reuse Options: Ready-to-copy Code & CDN URLs */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <LinkIcon className="w-4 h-4 text-amber-500" />
                                    روابط الاستخدام وإعادة الاستعمال:
                                </h4>

                                {/* Direct CDN URL */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                        رابط الصورة المباشر (Direct CDN URL):
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            readOnly
                                            value={selectedAsset.url}
                                            className="font-mono text-xs bg-gray-50 dark:bg-gray-900"
                                            dir="ltr"
                                        />
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => handleCopy(selectedAsset.url)}
                                            className="whitespace-nowrap"
                                        >
                                            {copiedUrl === selectedAsset.url ? <CheckIcon className="w-4 h-4 text-green-600" /> : 'نسخ'}
                                        </Button>
                                    </div>
                                </div>

                                {/* Optimized WebP URL */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                        رابط مضغوط فائق السرعة تلقائياً (WebP Optimized 800w):
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            readOnly
                                            value={getOptimizedImageUrl(selectedAsset.url, 800, 75)}
                                            className="font-mono text-xs bg-gray-50 dark:bg-gray-900"
                                            dir="ltr"
                                        />
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => handleCopy(getOptimizedImageUrl(selectedAsset.url, 800, 75))}
                                            className="whitespace-nowrap"
                                        >
                                            نسخ
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Where it is used */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    المواضع المرتبطة بهذه الصورة في المنصة ({selectedAsset.usedIn.length}):
                                </h4>
                                {selectedAsset.usedIn.length > 0 ? (
                                    <div className="space-y-2 max-h-36 overflow-y-auto">
                                        {selectedAsset.usedIn.map((item, idx) => (
                                            <div 
                                                key={idx}
                                                className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-xs"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {item.type === 'property' && <BuildingIcon className="w-4 h-4 text-blue-500" />}
                                                    {item.type === 'project' && <CubeIcon className="w-4 h-4 text-amber-500" />}
                                                    {item.type === 'partner' && <UsersIcon className="w-4 h-4 text-purple-500" />}
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{item.title}</span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {item.statusLabel || (item.isActive ? 'نشط' : 'منتهي')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/10 p-3 rounded-lg border border-rose-200 dark:border-rose-800">
                                        هذه الصورة غير مستخدمة في أي عقار أو مشروع حالياً، ويمكنك حذفها بأمان لتوفير مساحة التخزين.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            {(selectedAsset.status === 'unused' || selectedAsset.status === 'expired_listing') ? (
                                <Button
                                    variant="danger"
                                    onClick={() => {
                                        setAssetToDelete(selectedAsset);
                                    }}
                                    className="flex items-center gap-1.5 text-xs"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                    <span>حذف وتحرير المساحة</span>
                                </Button>
                            ) : <div />}

                            <Button
                                variant="secondary"
                                onClick={() => setIsReuseModalOpen(false)}
                            >
                                إغلاق
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Single Delete Confirmation */}
            {assetToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-6 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center mx-auto">
                            <ExclamationTriangleIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            تأكيد حذف الصورة وتحرير المساحة
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            هل أنت متأكد من رغبتك في حذف <strong className="text-gray-900 dark:text-white font-mono">{assetToDelete.filename}</strong>؟ سيتم إزالتها من سجلات المنصة ومحاولة حذفها من Cloudinary لتوفير السعة التخزينية.
                        </p>
                        <div className="flex items-center justify-center gap-3 pt-2">
                            <Button
                                variant="secondary"
                                onClick={() => setAssetToDelete(null)}
                                disabled={deleteMutation.isPending}
                            >
                                إلغاء
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => deleteMutation.mutate(assetToDelete)}
                                isLoading={deleteMutation.isPending}
                            >
                                {deleteMutation.isPending ? 'جاري الحذف...' : 'تأكيد الحذف الآن'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Batch Cleanup Confirmation */}
            {isBatchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-lg w-full p-6 space-y-5">
                        <div className="flex items-center gap-3 text-rose-600">
                            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center font-bold">
                                <TrashIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    تنظيف الصور غير المستخدمة ومنتهية العرض
                                </h3>
                                <p className="text-xs text-gray-500">
                                    تحرير السعة التخزينية على حساب Cloudinary وقاعدة البيانات
                                </p>
                            </div>
                        </div>

                        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 p-4 rounded-2xl space-y-2">
                            <div className="flex items-center justify-between text-sm font-bold text-rose-800 dark:text-rose-300">
                                <span>عدد الصور المؤهلة للحذف:</span>
                                <span>{cleanableAssets.length} صورة</span>
                            </div>
                            <div className="flex items-center justify-between text-sm font-bold text-rose-800 dark:text-rose-300">
                                <span>المساحة التقديرية الموفرة:</span>
                                <span>~{stats.estimatedReclaimableSizeMB} MB</span>
                            </div>
                            <p className="text-xs text-rose-600 dark:text-rose-400 pt-2 border-t border-rose-200/60">
                                تشمل صور العقارات التي انتهت فترة عرضها أو بيعت، بالإضافة للصور المرفوعة غير المرتبطة بأي إعلان نشط. لن يتم المساس بأي صور قيد الاستخدام.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3">
                            <Button
                                variant="secondary"
                                onClick={() => setIsBatchModalOpen(false)}
                                disabled={batchCleanMutation.isPending}
                            >
                                إلغاء
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => batchCleanMutation.mutate(cleanableAssets)}
                                isLoading={batchCleanMutation.isPending}
                            >
                                {batchCleanMutation.isPending ? 'جاري التنظيف...' : 'تأكيد التنظيف الجماعي'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminMediaLibraryPage;
