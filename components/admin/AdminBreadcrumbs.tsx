import React, { useMemo } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { adminNavLinks, getAdminGroupTitle } from '../../data/navigation';
import { useLanguage } from '../shared/LanguageContext';
import { ChevronRightIcon, ChevronLeftIcon, HomeIcon, ArrowLeftIcon, ArrowRightIcon } from '../ui/Icons';

export const AdminBreadcrumbs: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { language, t } = useLanguage();
    const isAr = language === 'ar';
    const pathname = location.pathname;

    // Only render inside /admin
    if (!pathname.startsWith('/admin')) {
        return null;
    }

    const breadcrumbInfo = useMemo(() => {
        // Find best matching nav link (longest prefix match)
        let bestMatch: (typeof adminNavLinks)[0] | null = null;
        for (const link of adminNavLinks) {
            if (link.exact) {
                if (pathname === link.href || pathname === `${link.href}/`) {
                    bestMatch = link;
                    break;
                }
            } else {
                if (pathname === link.href || pathname.startsWith(`${link.href}/`)) {
                    if (!bestMatch || link.href.length > bestMatch.href.length) {
                        bestMatch = link;
                    }
                }
            }
        }

        if (!bestMatch) {
            return null;
        }

        const domainTitle = getAdminGroupTitle(bestMatch.group, isAr);
        const pageTitle = bestMatch.name(t);
        const isExactPage = pathname === bestMatch.href || pathname === `${bestMatch.href}/`;

        // Check if there's a sub-path (e.g. /new, /edit/:id, /requests/:id)
        let subActionTitle: string | null = null;
        const remainder = pathname.slice(bestMatch.href.length).replace(/^\//, '');

        if (remainder) {
            if (remainder.startsWith('new') || remainder.includes('/new')) {
                subActionTitle = isAr ? 'إضافة جديد' : 'Create New';
            } else if (remainder.startsWith('edit') || remainder.includes('/edit')) {
                subActionTitle = isAr ? 'تعديل المعاملة' : 'Edit Record';
            } else if (remainder.startsWith('requests') || remainder.includes('request')) {
                subActionTitle = isAr ? 'تفاصيل الطلب' : 'Request Details';
            } else if (remainder.startsWith('filters')) {
                subActionTitle = isAr ? 'إدارة الفلاتر' : 'Filter Management';
            } else if (remainder.startsWith('inquiry-routing')) {
                subActionTitle = isAr ? 'توجيه الاستفسارات' : 'Inquiry Routing';
            } else {
                subActionTitle = isAr ? 'التفاصيل والمعاينة' : 'Details & View';
            }
        }

        return {
            domainTitle,
            pageTitle,
            pageHref: bestMatch.href,
            isExactPage,
            subActionTitle,
            isDashboard: bestMatch.href === '/admin'
        };
    }, [pathname, isAr, t]);

    if (!breadcrumbInfo || breadcrumbInfo.isDashboard) {
        return null;
    }

    const { domainTitle, pageTitle, pageHref, isExactPage, subActionTitle } = breadcrumbInfo;
    const SeparatorIcon = isAr ? ChevronLeftIcon : ChevronRightIcon;
    const BackArrow = isAr ? ArrowRightIcon : ArrowLeftIcon;

    return (
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-3">
            <ol className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                <li>
                    <Link 
                        to="/admin" 
                        className="flex items-center gap-1 font-medium hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                        title={isAr ? 'الرئيسية' : 'Dashboard'}
                    >
                        <HomeIcon className="w-4 h-4 text-gray-400 hover:text-amber-500" />
                        <span className="sr-only">Dashboard</span>
                    </Link>
                </li>

                <li>
                    <SeparatorIcon className="w-3.5 h-3.5 text-gray-400" />
                </li>

                <li className="font-medium text-gray-500 dark:text-gray-400">
                    <span>{domainTitle}</span>
                </li>

                <li>
                    <SeparatorIcon className="w-3.5 h-3.5 text-gray-400" />
                </li>

                {isExactPage ? (
                    <li className="font-semibold text-gray-900 dark:text-white" aria-current="page">
                        {pageTitle}
                    </li>
                ) : (
                    <>
                        <li>
                            <Link 
                                to={pageHref} 
                                className="font-medium hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                            >
                                {pageTitle}
                            </Link>
                        </li>
                        {subActionTitle && (
                            <>
                                <li>
                                    <SeparatorIcon className="w-3.5 h-3.5 text-gray-400" />
                                </li>
                                <li className="font-semibold text-gray-900 dark:text-white" aria-current="page">
                                    {subActionTitle}
                                </li>
                            </>
                        )}
                    </>
                )}
            </ol>

            {/* Back action when viewing a sub-action or detail */}
            {!isExactPage && (
                <button
                    onClick={() => navigate(pageHref)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-amber-600 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-2xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                    <BackArrow className="w-3.5 h-3.5" />
                    <span>{isAr ? `العودة إلى ${pageTitle}` : `Back to ${pageTitle}`}</span>
                </button>
            )}
        </nav>
    );
};

export default AdminBreadcrumbs;
