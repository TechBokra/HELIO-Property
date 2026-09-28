import React, { useState, useMemo } from 'react';
import { useLanguage } from '../shared/LanguageContext';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { 
    CheckCircleIcon, 
    CalculatorIcon, 
    ShieldCheckIcon, 
    ClockIcon, 
    ChevronRightIcon, 
    HomeIcon, 
    SparklesIcon 
} from '../ui/Icons';
import { 
    ESTIMATOR_TIERS, 
    calculateDetailedFinishingEstimate, 
    PLATFORM_FINISHING_MANAGER_ID 
} from '../../services/finishing';
import ServiceRequestModal from '../shared/ServiceRequestModal';

interface FinishingCostEstimatorProps {
    defaultArea?: number;
    propertyId?: string;
    propertyTitle?: string;
    onRfqLaunched?: () => void;
}

export const FinishingCostEstimator: React.FC<FinishingCostEstimatorProps> = ({
    defaultArea = 140,
    propertyId,
    propertyTitle,
    onRfqLaunched
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    // State for estimator parameters
    const [area, setArea] = useState<number>(defaultArea);
    const [selectedTierId, setSelectedTierId] = useState<string>('super_lux');
    const [bedrooms, setBedrooms] = useState<number>(3);
    const [bathrooms, setBathrooms] = useState<number>(2);
    const [style, setStyle] = useState<string>('modern');

    // Addons
    const [addons, setAddons] = useState({
        smartHome: false,
        acPrep: false,
        soundproofing: false,
        woodPanels: false
    });

    // Modal state
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [modalServiceTitle, setModalServiceTitle] = useState('');

    // Quick area presets
    const areaPresets = [90, 120, 150, 180, 220, 300];

    // Styles catalog
    const designStyles = [
        { id: 'modern', ar: 'مودرن معاصر', en: 'Modern Contemporary', desc: { ar: 'خطوط هندسية نظيفة وإضاءات مخفية وألوان محايدة', en: 'Clean lines, hidden lighting, neutral palettes' } },
        { id: 'neoclassic', ar: 'نيوكلاسيك راقي', en: 'Neoclassical Luxury', desc: { ar: 'بانوهات جدارية وقوالب جبسية وفخامة متوازنة', en: 'Wall moldings, plaster cornices, timeless elegance' } },
        { id: 'minimalist', ar: 'مينيماليزم ياباني / هادئ', en: 'Minimalist Japandi', desc: { ar: 'هدوء بصري وأخشاب دافئة واستغلال ذكي للفراغ', en: 'Warm woods, decluttered spaces, serene feel' } },
        { id: 'industrial', ar: 'صناعي حديث (Industrial)', en: 'Urban Industrial', desc: { ar: 'طوب ديكوري ومعدن أسود وإضاءات تراك سبوت', en: 'Exposed elements, dark metal, industrial tracks' } }
    ];

    // Calculate live breakdown
    const estimate = useMemo(() => {
        return calculateDetailedFinishingEstimate({
            area,
            tierId: selectedTierId,
            bedrooms,
            bathrooms,
            style,
            addons
        });
    }, [area, selectedTierId, bedrooms, bathrooms, style, addons]);

    const activeTier = useMemo(() => {
        return ESTIMATOR_TIERS.find(t => t.id === selectedTierId) || ESTIMATOR_TIERS[1];
    }, [selectedTierId]);

    const handleLaunchRfq = () => {
        const title = isAr
            ? `طرح مناقصة مقايسات: ${estimate.tierName.ar} بمساحة ${area} م²`
            : `Finishing RFQ Tender: ${estimate.tierName.en} (${area} m²)`;
        setModalServiceTitle(title);
        setIsRequestModalOpen(true);
    };

    const handleBookSiteInspection = () => {
        const title = isAr
            ? `طلب معاينة فنية مجانية: مساحة ${area} م² (${propertyTitle || 'الموقع'})`
            : `Free Site Technical Survey: ${area} m² (${propertyTitle || 'Site'})`;
        setModalServiceTitle(title);
        setIsRequestModalOpen(true);
    };

    return (
        <section className="bg-gradient-to-b from-gray-50 to-amber-50/30 dark:from-gray-900 dark:to-gray-950 py-12 md:py-16 rounded-3xl border border-amber-200/50 dark:border-amber-900/30 shadow-xl overflow-hidden my-12">
            <div className="container mx-auto px-4 sm:px-6">
                
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-10">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-xs md:text-sm mb-4 border border-amber-500/20">
                        <CalculatorIcon className="w-4 h-4" />
                        <span>{isAr ? 'حاسبة التكاليف الهندسية الذكية 2026' : 'Smart Finishing Cost Estimator 2026'}</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        {isAr ? 'احسب تكلفة تشطيب وحدتك واستدرج عروض المقاولين' : 'Calculate Your Finishing Cost & Tender for Contractor Bids'}
                    </h2>
                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
                        {isAr
                            ? 'تقدير دقيق معتمد على أسعار السوق الحقيقية في هليوبوليس الجديدة وشرق القاهرة مع تفقيط بنود التأسيس والمحارة والتشطيب النهائي.'
                            : 'Accurate estimates based on real market rates in New Heliopolis & East Cairo with detailed MEP, masonry and finishes breakdown.'}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Controls Column (7 Cols) */}
                    <div className="lg:col-span-7 space-y-8 bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        
                        {/* 1. Area Selector */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <HomeIcon className="w-5 h-5 text-amber-500" />
                                    <span>{isAr ? '1. مساحة الوحدة الإجمالية (بالمتر المربع):' : '1. Total Unit Area (m²):'}</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number"
                                        min={50}
                                        max={1000}
                                        value={area}
                                        onChange={(e) => setArea(Math.max(50, Math.min(1000, Number(e.target.value) || 50)))}
                                        className="w-20 px-2 py-1 text-center font-bold text-lg rounded-lg border-2 border-amber-500 bg-amber-50/50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                    <span className="font-bold text-gray-700 dark:text-gray-300">{isAr ? 'م²' : 'm²'}</span>
                                </div>
                            </div>

                            <input 
                                type="range"
                                min={50}
                                max={500}
                                step={5}
                                value={area}
                                onChange={(e) => setArea(Number(e.target.value))}
                                className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />

                            {/* Area Chips */}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {areaPresets.map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setArea(preset)}
                                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                                            area === preset
                                                ? 'bg-amber-500 text-gray-950 shadow-sm font-bold'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        {preset} {isAr ? 'م²' : 'm²'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Finishing Tier Selection */}
                        <div>
                            <label className="block text-base font-bold text-gray-900 dark:text-white mb-3">
                                {isAr ? '2. مستوى وباقة التشطيب المطلوبة:' : '2. Select Finishing Package Tier:'}
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {ESTIMATOR_TIERS.map((tier) => {
                                    const isSelected = selectedTierId === tier.id;
                                    return (
                                        <div
                                            key={tier.id}
                                            onClick={() => setSelectedTierId(tier.id)}
                                            className={`p-4 rounded-xl cursor-pointer border-2 transition-all relative ${
                                                isSelected
                                                    ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/30 shadow-md ring-2 ring-amber-500/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-1.5">
                                                <h4 className="font-bold text-base text-gray-900 dark:text-white">
                                                    {tier.name[language] || tier.name.en}
                                                </h4>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    isSelected ? 'bg-amber-500 text-gray-950' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                                }`}>
                                                    {tier.badge}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                {tier.tagline[language] || tier.tagline.en}
                                            </p>
                                            <div className="flex items-baseline gap-1 text-amber-700 dark:text-amber-400 font-bold">
                                                <span className="text-lg">{tier.pricePerSqm.toLocaleString(language)}</span>
                                                <span className="text-xs font-normal text-gray-500">{isAr ? 'ج.م / م² تقريباً' : 'EGP / m² approx'}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. Rooms & Wet Areas Counters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700">
                                <span className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">
                                    {isAr ? 'عدد غرف النوم:' : 'Bedrooms Count:'}
                                </span>
                                <div className="flex items-center gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setBedrooms(Math.max(1, bedrooms - 1))}
                                        className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 flex items-center justify-center font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100"
                                    >
                                        -
                                    </button>
                                    <span className="font-extrabold text-lg w-8 text-center text-gray-900 dark:text-white">{bedrooms}</span>
                                    <button 
                                        type="button"
                                        onClick={() => setBedrooms(Math.min(7, bedrooms + 1))}
                                        className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 flex items-center justify-center font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100"
                                    >
                                        +
                                    </button>
                                    <span className="text-xs text-gray-500">{isAr ? 'غرف نوم رئيسية ومعيشة' : 'Bedrooms & living'}</span>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700">
                                <span className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">
                                    {isAr ? 'عدد الحمامات:' : 'Bathrooms Count:'}
                                </span>
                                <div className="flex items-center gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setBathrooms(Math.max(1, bathrooms - 1))}
                                        className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 flex items-center justify-center font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100"
                                    >
                                        -
                                    </button>
                                    <span className="font-extrabold text-lg w-8 text-center text-gray-900 dark:text-white">{bathrooms}</span>
                                    <button 
                                        type="button"
                                        onClick={() => setBathrooms(Math.min(5, bathrooms + 1))}
                                        className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 flex items-center justify-center font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100"
                                    >
                                        +
                                    </button>
                                    <span className="text-xs text-gray-500">{isAr ? 'حمامات كاملة وضيافة' : 'Full & guest baths'}</span>
                                </div>
                            </div>
                        </div>

                        {/* 4. Architectural Style */}
                        <div>
                            <label className="block text-base font-bold text-gray-900 dark:text-white mb-2.5">
                                {isAr ? '3. النمط المعماري والتصميم الداخلي:' : '3. Interior Design Style:'}
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {designStyles.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setStyle(item.id)}
                                        className={`p-2.5 rounded-lg text-center border text-xs font-bold transition-all ${
                                            style === item.id
                                                ? 'border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-extrabold shadow-sm'
                                                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                        }`}
                                    >
                                        {item[language] || item.en}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 5. Optional Engineering Addons */}
                        <div>
                            <label className="block text-base font-bold text-gray-900 dark:text-white mb-3">
                                {isAr ? '4. إضافات هندسية وتقنية متقدمة (اختياري):' : '4. Optional Advanced Engineering Add-ons:'}
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={addons.smartHome}
                                        onChange={(e) => setAddons(prev => ({ ...prev, smartHome: e.target.checked }))}
                                        className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                                    />
                                    <div>
                                        <div className="font-semibold text-xs text-gray-900 dark:text-white">
                                            {isAr ? 'أنظمة المنازل الذكية (Smart Home)' : 'Smart Home Automation'}
                                        </div>
                                        <div className="text-[11px] text-gray-500">
                                            {isAr ? 'تحكم بالإضاءة والتكييف والستائر' : 'Smart lighting & climate control'}
                                        </div>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={addons.acPrep}
                                        onChange={(e) => setAddons(prev => ({ ...prev, acPrep: e.target.checked }))}
                                        className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                                    />
                                    <div>
                                        <div className="font-semibold text-xs text-gray-900 dark:text-white">
                                            {isAr ? 'تجهيز وتأسيس التكييف الكونسيلد' : 'Concealed HVAC Rough-ins'}
                                        </div>
                                        <div className="text-[11px] text-gray-500">
                                            {isAr ? 'تمديد مواسير النحاس والصرف المدفون' : 'Copper pipes & hidden drainage'}
                                        </div>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={addons.soundproofing}
                                        onChange={(e) => setAddons(prev => ({ ...prev, soundproofing: e.target.checked }))}
                                        className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                                    />
                                    <div>
                                        <div className="font-semibold text-xs text-gray-900 dark:text-white">
                                            {isAr ? 'عزل صوتي وحراري فائق' : 'Acoustic & Thermal Insulation'}
                                        </div>
                                        <div className="text-[11px] text-gray-500">
                                            {isAr ? 'صوف صخري للجدران وشبابيك دبل' : 'Rockwool & acoustic barriers'}
                                        </div>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={addons.woodPanels}
                                        onChange={(e) => setAddons(prev => ({ ...prev, woodPanels: e.target.checked }))}
                                        className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                                    />
                                    <div>
                                        <div className="font-semibold text-xs text-gray-900 dark:text-white">
                                            {isAr ? 'تجاليد خشبية وبديل رخام جداري' : 'Wood & Marble Wall Claddings'}
                                        </div>
                                        <div className="text-[11px] text-gray-500">
                                            {isAr ? 'ديكورات خشبية وبديل خشب مستورد' : 'Custom fluted panels & wall accents'}
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>

                    </div>

                    {/* Results & Tender CTA Column (5 Cols) */}
                    <div className="lg:col-span-5 space-y-6">
                        
                        {/* Live Estimate Card */}
                        <Card className="border-2 border-amber-500/40 shadow-xl overflow-hidden bg-white dark:bg-gray-800">
                            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 text-gray-950 flex justify-between items-center">
                                <div>
                                    <span className="text-xs uppercase font-extrabold tracking-wider opacity-90">
                                        {isAr ? 'التكلفة الإجمالية التقديرية' : 'Estimated Total Investment'}
                                    </span>
                                    <div className="text-2xl sm:text-3xl font-black mt-0.5">
                                        {estimate.totalEstimatedCost.toLocaleString(language)} <span className="text-lg font-bold">{isAr ? 'ج.م' : 'EGP'}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs opacity-90 block">{isAr ? 'متوسط المتر:' : 'Avg / m²:'}</span>
                                    <span className="font-extrabold text-base">{estimate.pricePerSqm.toLocaleString(language)} {isAr ? 'ج.م' : 'EGP'}</span>
                                </div>
                            </div>

                            <CardContent className="p-6 space-y-6">
                                
                                {/* Timeline & Guarantee Badges */}
                                <div className="grid grid-cols-2 gap-3 text-center">
                                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700">
                                        <ClockIcon className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                                        <span className="text-xs text-gray-500 block">{isAr ? 'مدة التنفيذ المتوقعة' : 'Execution Timeline'}</span>
                                        <span className="font-bold text-gray-900 dark:text-white text-sm">
                                            {estimate.estimatedDays} {isAr ? 'يوم عمل' : 'Working Days'}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700">
                                        <ShieldCheckIcon className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                                        <span className="text-xs text-gray-500 block">{isAr ? 'الضمان الهندسي' : 'Certified Warranty'}</span>
                                        <span className="font-bold text-gray-900 dark:text-white text-sm">
                                            {activeTier.warrantyYears} {isAr ? 'سنوات شاملة' : 'Years Full'}
                                        </span>
                                    </div>
                                </div>

                                {/* Engineering Cost Breakdown */}
                                <div>
                                    <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-3 flex items-center justify-between">
                                        <span>{isAr ? 'توزيع التكلفة على مراحل التنفيذ:' : 'Cost Breakdown by Trade:'}</span>
                                        <span className="text-amber-600 dark:text-amber-400 font-semibold">{isAr ? '100% شفافية' : '100% Transparent'}</span>
                                    </h4>

                                    <div className="space-y-2.5 text-xs">
                                        {/* MEP */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-gray-600 dark:text-gray-300 font-medium">
                                                    {isAr ? '⚡ تأسيس السباكة والكهرباء (25%)' : '⚡ MEP Plumbing & Electrical (25%)'}
                                                </span>
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {estimate.mepCost.toLocaleString(language)} {isAr ? 'ج.م' : 'EGP'}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-amber-500 h-full rounded-full" style={{ width: '25%' }}></div>
                                            </div>
                                        </div>

                                        {/* Porcelain & Masonry */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-gray-600 dark:text-gray-300 font-medium">
                                                    {isAr ? '🧱 المحارة، الجبس والبورسلين (30%)' : '🧱 Plaster, Drywall & Porcelain (30%)'}
                                                </span>
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {estimate.flooringMasonryCost.toLocaleString(language)} {isAr ? 'ج.م' : 'EGP'}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-blue-500 h-full rounded-full" style={{ width: '30%' }}></div>
                                            </div>
                                        </div>

                                        {/* Carpentry & Aluminum */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-gray-600 dark:text-gray-300 font-medium">
                                                    {isAr ? '🚪 النجارة، الأبواب وشبابيك الألوميتال (20%)' : '🚪 Doors, Woodwork & Aluminum (20%)'}
                                                </span>
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {estimate.carpentryAluminumCost.toLocaleString(language)} {isAr ? 'ج.م' : 'EGP'}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '20%' }}></div>
                                            </div>
                                        </div>

                                        {/* Paints & Wall Decor */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-gray-600 dark:text-gray-300 font-medium">
                                                    {isAr ? '🎨 النقاشة والدهانات والديكورات (15%)' : '🎨 Wall Putty, Paints & Finishes (15%)'}
                                                </span>
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {estimate.paintsDecorCost.toLocaleString(language)} {isAr ? 'ج.م' : 'EGP'}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-purple-500 h-full rounded-full" style={{ width: '15%' }}></div>
                                            </div>
                                        </div>

                                        {/* Supervision & Warranty */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-gray-600 dark:text-gray-300 font-medium">
                                                    {isAr ? '📐 الإشراف الهندسي والفحص والضمان (10%)' : '📐 Supervision, Snag List & Warranty (10%)'}
                                                </span>
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {estimate.supervisionWarrantyCost.toLocaleString(language)} {isAr ? 'ج.م' : 'EGP'}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-teal-500 h-full rounded-full" style={{ width: '10%' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Call to Action Buttons */}
                                <div className="space-y-3 pt-2">
                                    <Button
                                        onClick={handleLaunchRfq}
                                        className="w-full bg-amber-500 hover:bg-amber-600 text-gray-950 font-extrabold py-3.5 rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 text-sm md:text-base transition-transform active:scale-[0.99]"
                                    >
                                        <SparklesIcon className="w-5 h-5" />
                                        <span>{isAr ? 'طرح مناقصة واستدراج عروض مقاولين' : 'Launch RFQ for Contractor Bids'}</span>
                                        <ChevronRightIcon className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                                    </Button>

                                    <Button
                                        onClick={handleBookSiteInspection}
                                        variant="outline"
                                        className="w-full py-2.5 rounded-xl text-xs md:text-sm font-bold text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        {isAr ? 'حجز موعد معاينة فنية مجانية للموقع' : 'Book Free Site Technical Inspection'}
                                    </Button>
                                </div>

                                <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 pt-1 text-center">
                                    <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    <span>
                                        {isAr
                                            ? 'عقود موثقة، دفعات مقسمة على مراحل الاستلام، وإشراف هندسي مستقل'
                                            : 'Official contracts, phased milestone payments, independent inspection'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                </div>

            </div>

            {/* Request & RFQ Submission Modal */}
            <ServiceRequestModal
                isOpen={isRequestModalOpen}
                onClose={() => {
                    setIsRequestModalOpen(false);
                    onRfqLaunched?.();
                }}
                partnerId={PLATFORM_FINISHING_MANAGER_ID}
                serviceTitle={modalServiceTitle}
                propertyId={propertyId}
            />
        </section>
    );
};

export default FinishingCostEstimator;
