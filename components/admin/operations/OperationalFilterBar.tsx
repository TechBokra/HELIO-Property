import React from 'react';
import { useLanguage } from '../../shared/LanguageContext';
import { 
    type OperationalDomain, 
    OperationalStatus, 
    RequestType,
    type Partner
} from '../../../types';
import { SearchIcon, XMarkIcon, AdjustmentsHorizontalIcon } from '../../ui/Icons';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';

interface OperationalFilterBarProps {
    domain: OperationalDomain | 'all';
    onDomainChange: (domain: OperationalDomain | 'all') => void;
    requestType: RequestType | 'all';
    onRequestTypeChange: (type: RequestType | 'all') => void;
    operationalStatus: OperationalStatus | 'all';
    onOperationalStatusChange: (status: OperationalStatus | 'all') => void;
    assignedTo: string;
    onAssignedToChange: (assignee: string) => void;
    priority?: 'all' | 'high' | 'medium' | 'low';
    onPriorityChange?: (priority: 'all' | 'high' | 'medium' | 'low') => void;
    dateRange?: 'all' | 'today' | 'last7days' | 'last30days' | 'older';
    onDateRangeChange?: (range: 'all' | 'today' | 'last7days' | 'last30days' | 'older') => void;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    managers: Partner[];
    onReset: () => void;
}

export const OperationalFilterBar: React.FC<OperationalFilterBarProps> = ({
    domain,
    onDomainChange,
    requestType,
    onRequestTypeChange,
    operationalStatus,
    onOperationalStatusChange,
    assignedTo,
    onAssignedToChange,
    priority = 'all',
    onPriorityChange,
    dateRange = 'all',
    onDateRangeChange,
    searchTerm,
    onSearchChange,
    managers,
    onReset,
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const domainTabs: { key: OperationalDomain | 'all'; labelEn: string; labelAr: string }[] = [
        { key: 'all', labelEn: 'All Domains', labelAr: 'جميع القطاعات' },
        { key: 'real_estate', labelEn: 'Real Estate', labelAr: 'العقارات' },
        { key: 'partners', labelEn: 'Partners', labelAr: 'الشركاء' },
        { key: 'finishing', labelEn: 'Finishing', labelAr: 'التشطيبات' },
        { key: 'decorations', labelEn: 'Decorations', labelAr: 'الديكور' },
        { key: 'commercial', labelEn: 'Commercial', labelAr: 'المبيعات' },
        { key: 'customer_care', labelEn: 'Customer Care', labelAr: 'خدمة العملاء' },
    ];

    const hasActiveFilters = 
        domain !== 'all' || 
        requestType !== 'all' || 
        operationalStatus !== 'all' || 
        assignedTo !== 'all' || 
        priority !== 'all' ||
        dateRange !== 'all' ||
        searchTerm.trim() !== '';

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-2xs space-y-3">
            {/* Domain Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-100 scrollbar-none">
                {domainTabs.map(tab => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => onDomainChange(tab.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                            domain === tab.key
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'text-gray-600 hover:text-amber-600 hover:bg-gray-50'
                        }`}
                    >
                        {isAr ? tab.labelAr : tab.labelEn}
                    </button>
                ))}
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-center">
                {/* Search Term */}
                <div className="sm:col-span-2 lg:col-span-2 relative">
                    <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        type="text"
                        value={searchTerm}
                        onChange={e => onSearchChange(e.target.value)}
                        placeholder={isAr ? 'البحث بالاسم، الهاتف، البريد أو رقم الطلب...' : 'Search requester, phone, email, ID...'}
                        className="ps-9 text-xs h-9 bg-gray-50/50"
                    />
                </div>

                {/* Request Type */}
                <div>
                    <Select
                        value={requestType}
                        onChange={e => onRequestTypeChange(e.target.value as any)}
                        className="text-xs h-9 py-1 bg-gray-50/50"
                    >
                        <option value="all">{isAr ? 'جميع الأنواع' : 'All Request Types'}</option>
                        <option value={RequestType.LEAD}>{isAr ? 'طلب عميل (LEAD)' : 'Lead'}</option>
                        <option value={RequestType.PROPERTY_LISTING_REQUEST}>{isAr ? 'طلب إضافة عقار' : 'Property Listing'}</option>
                        <option value={RequestType.PROPERTY_INQUIRY}>{isAr ? 'استفسار عقار' : 'Property Inquiry'}</option>
                        <option value={RequestType.PARTNER_APPLICATION}>{isAr ? 'طلب انضمام شريك' : 'Partner Application'}</option>
                        <option value={RequestType.CONTACT_MESSAGE}>{isAr ? 'رسالة اتصل بنا' : 'Contact Message'}</option>
                    </Select>
                </div>

                {/* Operational Status */}
                <div>
                    <Select
                        value={operationalStatus}
                        onChange={e => onOperationalStatusChange(e.target.value as any)}
                        className="text-xs h-9 py-1 bg-gray-50/50"
                    >
                        <option value="all">{isAr ? 'جميع الحالات التشغيلية' : 'All Operational States'}</option>
                        <option value={OperationalStatus.NEW}>{isAr ? 'جديد (NEW)' : 'NEW'}</option>
                        <option value={OperationalStatus.ASSIGNED}>{isAr ? 'معين (ASSIGNED)' : 'ASSIGNED'}</option>
                        <option value={OperationalStatus.IN_PROGRESS}>{isAr ? 'قيد المعالجة (IN PROGRESS)' : 'IN PROGRESS'}</option>
                        <option value={OperationalStatus.WAITING}>{isAr ? 'بانتظار إجراء (WAITING)' : 'WAITING'}</option>
                        <option value={OperationalStatus.RESOLVED}>{isAr ? 'مكتمل (RESOLVED)' : 'RESOLVED'}</option>
                        <option value={OperationalStatus.CLOSED}>{isAr ? 'مغلق (CLOSED)' : 'CLOSED'}</option>
                        <option value={OperationalStatus.REJECTED}>{isAr ? 'مرفوض / ملغى (REJECTED)' : 'REJECTED'}</option>
                    </Select>
                </div>

                {/* Priority */}
                <div>
                    <Select
                        value={priority}
                        onChange={e => onPriorityChange?.(e.target.value as any)}
                        className="text-xs h-9 py-1 bg-gray-50/50"
                    >
                        <option value="all">{isAr ? 'الأولوية: الكل' : 'Priority: All'}</option>
                        <option value="high">{isAr ? 'أولوية عاجلة (High)' : 'High Priority'}</option>
                        <option value="medium">{isAr ? 'أولوية متوسطة (Medium)' : 'Medium Priority'}</option>
                        <option value="low">{isAr ? 'أولوية عادية (Low)' : 'Low Priority'}</option>
                    </Select>
                </div>

                {/* Assigned Owner + Reset */}
                <div className="flex items-center gap-1.5">
                    <Select
                        value={assignedTo}
                        onChange={e => onAssignedToChange(e.target.value)}
                        className="text-xs h-9 py-1 flex-1 bg-gray-50/50"
                    >
                        <option value="all">{isAr ? 'المسؤول: الكل' : 'Owner: All'}</option>
                        <option value="unassigned">{isAr ? 'غير معين (Unassigned)' : 'Unassigned Only'}</option>
                        {(managers || []).map(m => (
                            <option key={m.id} value={m.id}>
                                {(isAr && m.nameAr ? m.nameAr : m.name) || m.email}
                            </option>
                        ))}
                    </Select>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={onReset}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg border border-gray-200 hover:bg-red-50 transition-colors shrink-0"
                            title={isAr ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
