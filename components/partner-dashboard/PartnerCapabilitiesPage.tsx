import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../shared/LanguageContext';
import { useToast } from '../shared/ToastContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    getPartnerCapabilities, 
    savePartnerCapabilities, 
    FINISHING_CATEGORIES, 
    FINISHING_SERVICE_AREAS 
} from '../../services/finishing';
import type { PartnerFinishingCapability } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { 
    WrenchScrewdriverIcon, 
    MapPinIcon, 
    ShieldCheckIcon, 
    BanknotesIcon, 
    BuildingIcon,
    CheckCircleIcon 
} from '../ui/Icons';

export const PartnerCapabilitiesPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { language } = useLanguage();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const partnerId = currentUser?.id || '';

    const { data: initialCap, isLoading } = useQuery({
        queryKey: ['partnerCapabilities', partnerId],
        queryFn: () => getPartnerCapabilities(partnerId),
        enabled: !!partnerId
    });

    const [categories, setCategories] = useState<string[]>([]);
    const [serviceAreas, setServiceAreas] = useState<string[]>([]);
    const [minBudget, setMinBudget] = useState<number>(100000);
    const [maxBudget, setMaxBudget] = useState<number | undefined>(undefined);
    const [turnkeyCapacity, setTurnkeyCapacity] = useState<number>(4);
    const [warrantyYears, setWarrantyYears] = useState<number>(2);
    const [hasInHouseArchitects, setHasInHouseArchitects] = useState<boolean>(true);
    const [isVerifiedContractor, setIsVerifiedContractor] = useState<boolean>(true);

    useEffect(() => {
        if (initialCap) {
            setCategories(initialCap.categories || []);
            setServiceAreas(initialCap.serviceAreas || []);
            setMinBudget(initialCap.minBudget || 100000);
            setMaxBudget(initialCap.maxBudget);
            setTurnkeyCapacity(initialCap.turnkeyCapacity || 4);
            setWarrantyYears(initialCap.warrantyYears || 2);
            setHasInHouseArchitects(initialCap.hasInHouseArchitects ?? true);
            setIsVerifiedContractor(initialCap.isVerifiedContractor ?? true);
        }
    }, [initialCap]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload: PartnerFinishingCapability = {
                partnerId,
                categories,
                serviceAreas,
                minBudget,
                maxBudget,
                turnkeyCapacity,
                warrantyYears,
                hasInHouseArchitects,
                isVerifiedContractor
            };
            return await savePartnerCapabilities(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['partnerCapabilities', partnerId] });
            showToast(
                language === 'ar' ? 'تم حفظ وتحديث قدرات ونطاق أعمال الشركة بنجاح!' : 'Capabilities & coverage areas updated successfully!',
                'success'
            );
        },
        onError: () => {
            showToast(
                language === 'ar' ? 'حدث خطأ أثناء حفظ الإعدادات.' : 'Failed to save capabilities.',
                'error'
            );
        }
    });

    const toggleCategory = (catId: string) => {
        setCategories(prev => 
            prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
        );
    };

    const toggleArea = (areaId: string) => {
        setServiceAreas(prev => 
            prev.includes(areaId) ? prev.filter(a => a !== areaId) : [...prev, areaId]
        );
    };

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading company capabilities...</div>;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                        <WrenchScrewdriverIcon className="w-7 h-7 text-amber-500" />
                        {language === 'ar' ? 'قدرات التشطيب ونطاق التغطية الجغرافية' : 'Finishing Capabilities & Coverage Areas'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {language === 'ar'
                            ? 'حدد تخصصات شركتك ومناطق الخدمة المقبولة لتوجيه استفسارات ومقايسات العملاء المناسبة بدقة.'
                            : 'Configure your company disciplines and coverage zones to receive matched finishing RFQs.'}
                    </p>
                </div>
                <Button 
                    onClick={() => saveMutation.mutate()} 
                    disabled={saveMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white shadow-md text-sm px-6 py-2.5"
                >
                    {saveMutation.isPending 
                        ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                        : (language === 'ar' ? 'حفظ التحديثات' : 'Save Changes')}
                </Button>
            </div>

            {/* Disciplines & Categories */}
            <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <BuildingIcon className="w-5 h-5 text-amber-500" />
                        {language === 'ar' ? 'تخصصات ومجالات التنفيذ المعتمدة' : 'Operational Disciplines & Categories'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                    <p className="text-xs text-gray-500">
                        {language === 'ar'
                            ? 'اختر مجالات العمل التي تقدم شركتك عروض مقايسة وتنفيذ معتمدة فيها:'
                            : 'Select categories where your firm executes turnkey projects and submits bids:'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {FINISHING_CATEGORIES.map(cat => {
                            const isSelected = categories.includes(cat.id);
                            return (
                                <div
                                    key={cat.id}
                                    onClick={() => toggleCategory(cat.id)}
                                    className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 flex items-start gap-3 ${
                                        isSelected 
                                            ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-500/50' 
                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
                                    }`}
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={isSelected}
                                        onChange={() => {}}
                                        className="mt-1 h-4 w-4 text-amber-600 rounded border-gray-300 pointer-events-none"
                                    />
                                    <div className="flex-grow">
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                            {cat.name[language]}
                                        </h4>
                                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                                            {cat.description[language]}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Geographical Coverage Zones */}
            <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <MapPinIcon className="w-5 h-5 text-amber-500" />
                        {language === 'ar' ? 'مناطق التغطية والعمل الجغرافية (شرق والقاهرة الكبرى)' : 'Geographical Coverage Zones'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                    <p className="text-xs text-gray-500">
                        {language === 'ar'
                            ? 'حدد المدن والمناطق التي يمكنك استلام مشروعات ومعاينات فيها:'
                            : 'Select cities and communities where your field teams operate:'}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {FINISHING_SERVICE_AREAS.map(area => {
                            const isSelected = serviceAreas.includes(area.id);
                            return (
                                <button
                                    type="button"
                                    key={area.id}
                                    onClick={() => toggleArea(area.id)}
                                    className={`p-3 rounded-lg text-xs font-semibold text-center border transition-all ${
                                        isSelected 
                                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                                            : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    {area.name[language]}
                                    {isSelected && <span className="ml-1 rtl:ml-0 rtl:mr-1">✓</span>}
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Project Capacities & Warranties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <BanknotesIcon className="w-5 h-5 text-amber-500" />
                            {language === 'ar' ? 'نطاق الميزانيات التقديرية (EGP)' : 'Budget Capacities'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                {language === 'ar' ? 'الحد الأدنى لميزانية المشروع المقبول (ج.م)' : 'Minimum Accepted Project Budget (EGP)'}
                            </label>
                            <Input 
                                type="number" 
                                value={minBudget} 
                                onChange={e => setMinBudget(Number(e.target.value) || 0)}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                {language === 'ar' ? 'الحد الأقصى للميزانية (اختياري)' : 'Maximum Budget Capacity (Optional)'}
                            </label>
                            <Input 
                                type="number" 
                                value={maxBudget || ''} 
                                placeholder={language === 'ar' ? 'مفتوح (لا يوجد حد أقصى)' : 'Open / No ceiling'}
                                onChange={e => setMaxBudget(e.target.value ? Number(e.target.value) : undefined)}
                                className="w-full"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <ShieldCheckIcon className="w-5 h-5 text-amber-500" />
                            {language === 'ar' ? 'الطاقة الاستيعابية والضمانات' : 'Capacity & Commitments'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    {language === 'ar' ? 'المشاريع المتزامنة (سعة التنفيذ)' : 'Simultaneous Project Capacity'}
                                </label>
                                <Input 
                                    type="number" 
                                    value={turnkeyCapacity} 
                                    onChange={e => setTurnkeyCapacity(Number(e.target.value) || 1)}
                                    min={1}
                                    max={50}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    {language === 'ar' ? 'سنوات الضمان المعتمد' : 'Warranty Period (Years)'}
                                </label>
                                <Input 
                                    type="number" 
                                    value={warrantyYears} 
                                    onChange={e => setWarrantyYears(Number(e.target.value) || 1)}
                                    min={1}
                                    max={10}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                                        {language === 'ar' ? 'فريق معماري وإشراف هندسي داخلي (In-House)' : 'In-House Architects & Engineering'}
                                    </span>
                                    <span className="text-[11px] text-gray-500">
                                        {language === 'ar' ? 'تمتلك الشركة مكتباً فنياً ومهندسي موقع دائمين' : 'Firm employs dedicated staff architects and supervisors'}
                                    </span>
                                </div>
                                <ToggleSwitch 
                                    checked={hasInHouseArchitects} 
                                    onChange={setHasInHouseArchitects} 
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                                        {language === 'ar' ? 'مقاول معتمد رسمياً ومسجل ضريبياً' : 'Verified & Tax-Registered Contractor'}
                                    </span>
                                    <span className="text-[11px] text-gray-500">
                                        {language === 'ar' ? 'سجل تجاري وبطاقة ضريبية معتمدة' : 'Valid commercial register & tax compliance verified'}
                                    </span>
                                </div>
                                <ToggleSwitch 
                                    checked={isVerifiedContractor} 
                                    onChange={setIsVerifiedContractor} 
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PartnerCapabilitiesPage;
