import React, { useState } from 'react';
import type { FinishingQuote, QuoteScopeItem } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { PlusIcon, TrashIcon, BanknotesIcon, CloseIcon } from '../ui/Icons';
import { useLanguage } from '../shared/LanguageContext';
import { useToast } from '../shared/ToastContext';
import { submitFinishingQuote } from '../../services/finishing';

interface SubmitFinishingQuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    requestId: string;
    partnerId: string;
    partnerName: string;
    propertyArea?: number;
    onSuccess?: (quote: FinishingQuote) => void;
}

export const SubmitFinishingQuoteModal: React.FC<SubmitFinishingQuoteModalProps> = ({
    isOpen,
    onClose,
    requestId,
    partnerId,
    partnerName,
    propertyArea,
    onSuccess
}) => {
    const { language } = useLanguage();
    const { showToast } = useToast();

    const [totalPrice, setTotalPrice] = useState<number>(propertyArea ? propertyArea * 4500 : 250000);
    const [timelineDays, setTimelineDays] = useState<number>(60);
    const [warrantyMonths, setWarrantyMonths] = useState<number>(24);
    const [notes, setNotes] = useState<string>('');
    const [terms, setTerms] = useState<string>(
        language === 'ar' 
            ? 'يشمل التوريد والمصنعيات والإشراف الهندسي اليومي واختبارات الجودة قبل التسليم.' 
            : 'Includes materials, labor, daily engineering supervision, and pre-handover tests.'
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial scope items breakdown
    const [scopeItems, setScopeItems] = useState<QuoteScopeItem[]>([
        {
            id: 'item-1',
            category: 'mep',
            description: { ar: 'أعمال تأسيس السباكة والكهرباء والعزل', en: 'MEP rough-ins, piping & waterproofing' },
            amount: Math.round(totalPrice * 0.35),
            unit: language === 'ar' ? 'مقطوعية' : 'Lump sum'
        },
        {
            id: 'item-2',
            category: 'paint',
            description: { ar: 'المحارة والدهانات والجبس بورد', en: 'Plastering, painting & drywall ceilings' },
            amount: Math.round(totalPrice * 0.30),
            unit: language === 'ar' ? 'مقطوعية' : 'Lump sum'
        },
        {
            id: 'item-3',
            category: 'flooring',
            description: { ar: 'أرضيات البورسلين والسيراميك والباركيه', en: 'Porcelain, ceramic & parquet flooring' },
            amount: Math.round(totalPrice * 0.25),
            unit: language === 'ar' ? 'مقطوعية' : 'Lump sum'
        },
        {
            id: 'item-4',
            category: 'supervision',
            description: { ar: 'الإشراف الهندسي وضمان الجودة واختبارات التسليم', en: 'Engineering supervision & quality assurance' },
            amount: Math.round(totalPrice * 0.10),
            unit: language === 'ar' ? 'مقطوعية' : 'Lump sum'
        }
    ]);

    if (!isOpen) return null;

    const handleAddScopeItem = () => {
        setScopeItems([
            ...scopeItems,
            {
                id: `item-${Date.now()}`,
                category: 'custom',
                description: { ar: '', en: '' },
                amount: 0,
                unit: language === 'ar' ? 'مقطوعية' : 'Lump sum'
            }
        ]);
    };

    const handleRemoveScopeItem = (index: number) => {
        setScopeItems(scopeItems.filter((_, i) => i !== index));
    };

    const handleScopeChange = (index: number, field: 'ar' | 'en' | 'amount', value: any) => {
        const updated = [...scopeItems];
        if (field === 'amount') {
            updated[index].amount = Number(value) || 0;
            // Recalculate total price as sum of scope items
            const newTotal = updated.reduce((sum, item) => sum + item.amount, 0);
            setTotalPrice(newTotal);
        } else {
            updated[index].description[field] = value;
        }
        setScopeItems(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (totalPrice <= 0) {
            showToast(language === 'ar' ? 'يرجى إدخال إجمالي المقايسة' : 'Please enter total price', 'error');
            return;
        }

        // P1.3: Validate commercial total integrity
        const scopeSum = scopeItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        if (scopeItems.length > 0 && Math.abs(scopeSum - totalPrice) > 1) {
            showToast(
                language === 'ar'
                    ? `إجمالي المقايسة (${totalPrice.toLocaleString()} ج.م) يجب أن يطابق مجموع بنود المصنعيات (${scopeSum.toLocaleString()} ج.م).`
                    : `Total price (${totalPrice.toLocaleString()} EGP) must match sum of scope items (${scopeSum.toLocaleString()} EGP).`,
                'error'
            );
            return;
        }

        setIsSubmitting(true);
        try {
            const pricePerSqm = propertyArea && propertyArea > 0 
                ? Math.round(totalPrice / propertyArea) 
                : undefined;

            const quote = await submitFinishingQuote({
                requestId,
                partnerId,
                partnerName,
                totalPrice,
                pricePerSqm,
                currency: 'EGP',
                executionTimelineDays: timelineDays,
                warrantyMonths,
                scopeItems,
                termsAndConditions: terms,
                status: 'submitted',
                notes
            });

            showToast(
                language === 'ar' ? 'تم تقديم عرض المقايسة بنجاح!' : 'Quote submitted successfully!',
                'success'
            );
            onSuccess?.(quote);
            onClose();
        } catch (err: any) {
            showToast(err?.message || (language === 'ar' ? 'فشل تقديم العرض. حاول مرة أخرى.' : 'Failed to submit quote.'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <div className="flex items-center gap-3">
                        <span className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <BanknotesIcon className="w-6 h-6" />
                        </span>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {language === 'ar' ? 'تقديم عرض مقايسة تفصيلية' : 'Submit Detailed Contractor Bid'}
                            </h3>
                            <p className="text-xs text-gray-500">
                                {language === 'ar' ? `المقاول: ${partnerName}` : `Contractor: ${partnerName}`}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Top Row: Total & Timeline & Warranty */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                                {language === 'ar' ? 'إجمالي المقايسة (ج.م)' : 'Total Price (EGP)'}
                            </label>
                            <Input
                                type="number"
                                required
                                value={totalPrice}
                                onChange={e => setTotalPrice(Number(e.target.value))}
                                className="font-bold text-lg text-amber-600 dark:text-amber-400"
                            />
                            {propertyArea && (
                                <span className="text-[11px] text-gray-400 block mt-1">
                                    ~{Math.round(totalPrice / propertyArea).toLocaleString()} EGP / m²
                                </span>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                                {language === 'ar' ? 'مدة التنفيذ (بالأيام)' : 'Timeline (Days)'}
                            </label>
                            <Input
                                type="number"
                                required
                                min={1}
                                value={timelineDays}
                                onChange={e => setTimelineDays(Number(e.target.value))}
                            />
                            <span className="text-[11px] text-gray-400 block mt-1">
                                {Math.round(timelineDays / 30)} {language === 'ar' ? 'أشهر تقريباً' : 'approx. months'}
                            </span>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wider">
                                {language === 'ar' ? 'فترة الضمان (بالأشهر)' : 'Warranty (Months)'}
                            </label>
                            <Input
                                type="number"
                                required
                                min={6}
                                value={warrantyMonths}
                                onChange={e => setWarrantyMonths(Number(e.target.value))}
                            />
                            <span className="text-[11px] text-gray-400 block mt-1">
                                {warrantyMonths / 12} {language === 'ar' ? 'سنوات ضمان معتمد' : 'years warranty'}
                            </span>
                        </div>
                    </div>

                    {/* Scope Items Breakdown */}
                    <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                {language === 'ar' ? 'تفصيل بنود المقايسة والمصنعيات (Scope Breakdown)' : 'Scope Breakdown Items'}
                            </h4>
                            <button
                                type="button"
                                onClick={handleAddScopeItem}
                                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                            >
                                <PlusIcon className="w-4 h-4" />
                                {language === 'ar' ? 'إضافة بند' : 'Add Item'}
                            </button>
                        </div>

                        <div className="space-y-2">
                            {scopeItems.map((item, index) => (
                                <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <input
                                            type="text"
                                            value={item.description.ar}
                                            onChange={e => handleScopeChange(index, 'ar', e.target.value)}
                                            placeholder="وصف البند بالعربية (مثال: أعمال السباكة والكهرباء)"
                                            dir="rtl"
                                            className="w-full text-xs p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveScopeItem(index)}
                                            className="text-gray-400 hover:text-red-500 p-1"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={item.description.en}
                                            onChange={e => handleScopeChange(index, 'en', e.target.value)}
                                            placeholder="Item description in English"
                                            className="w-2/3 text-xs p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                        />
                                        <div className="w-1/3 flex items-center gap-1">
                                            <input
                                                type="number"
                                                value={item.amount}
                                                onChange={e => handleScopeChange(index, 'amount', e.target.value)}
                                                placeholder="القيمة"
                                                className="w-full text-xs p-2 font-mono font-bold rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                            />
                                            <span className="text-xs text-gray-500">ج.م</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Terms & Notes */}
                    <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                {language === 'ar' ? 'الشروط والمواصفات الفنية' : 'Terms & Technical Specifications'}
                            </label>
                            <Textarea
                                rows={2}
                                value={terms}
                                onChange={e => setTerms(e.target.value)}
                                placeholder="شروط الدفع والتسليم..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                {language === 'ar' ? 'ملاحظات إضافية للعميل' : 'Additional Notes for Client'}
                            </label>
                            <Input
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="أي تفاصيل خاصة بتوريد الخامات أو مواعيد المعاينة..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </Button>
                        <Button
                            type="submit"
                            isLoading={isSubmitting}
                            className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold px-6 shadow"
                        >
                            {language === 'ar' ? 'إرسال المقايسة الرسمية' : 'Submit Official Quote'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
