import type { FilterOption } from '../types';

export let propertyTypesData: FilterOption[] = [
    { id: 'type-1', en: 'Apartment', ar: 'شقة' },
    { id: 'type-2', en: 'Villa', ar: 'فيلا' },
    { id: 'type-3', en: 'Commercial', ar: 'تجاري' },
    { id: 'type-4', en: 'Land', ar: 'أرض' },
];

export let finishingStatusesData: FilterOption[] = [
    { id: 'fin-1', en: 'Fully Finished', ar: 'تشطيب كامل', applicableTo: ['Apartment', 'Villa', 'Commercial'] },
    { id: 'fin-2', en: 'Semi-finished', ar: 'نصف تشطيب', applicableTo: ['Apartment', 'Villa', 'Commercial'] },
    { id: 'fin-3', en: 'Without Finishing', ar: 'بدون تشطيب', applicableTo: ['Apartment', 'Villa', 'Commercial'] },
    { id: 'fin-4', en: 'Super Lux', ar: 'سوبر لوكس', applicableTo: ['Apartment', 'Villa', 'Commercial'] },
    { id: 'fin-5', en: 'Luxury Finishing', ar: 'تشطيب فاخر', applicableTo: ['Apartment', 'Villa', 'Commercial'] },
    { id: 'fin-6', en: 'Fully Furnished', ar: 'مفروشة بالكامل', applicableTo: ['Apartment', 'Villa'] },
];

export let amenitiesData: FilterOption[] = [
    { id: 'amen-1', en: 'Private Garden', ar: 'حديقة خاصة', applicableTo: ['Villa'] },
    { id: 'amen-2', en: 'Swimming Pool', ar: 'حمام سباحة', applicableTo: ['Villa'] },
    { id: 'amen-3', en: 'Covered Parking', ar: 'موقف سيارات مغطى' },
    { id: 'amen-4', en: '24/7 Security', ar: 'أمن 24/7' },
    { id: 'amen-5', en: 'Balcony', ar: 'شرفة', applicableTo: ['Apartment', 'Villa'] },
    { id: 'amen-6', en: "Maid's Room", ar: 'غرفة خادمة', applicableTo: ['Villa', 'Apartment'] },
    { id: 'amen-7', en: 'Electricity Meter', ar: 'عداد كهرباء' },
    { id: 'amen-8', en: 'Water Meter', ar: 'عداد مياه' },
    { id: 'amen-9', en: 'Natural Gas', ar: 'غاز طبيعي' },
    { id: 'amen-10', en: 'Panoramic View', ar: 'إطلالة بانورامية' },
    { id: 'amen-11', en: 'Fully Air-Conditioned', ar: 'مكيف بالكامل' },
    { id: 'amen-12', en: 'Security', ar: 'أمن وحراسة' },
    { id: 'amen-13', en: 'Shared Health Club', ar: 'نادي صحي مشترك' },
    { id: 'amen-14', en: 'Elevator', ar: 'مصعد', applicableTo: ['Apartment', 'Commercial'] },
    { id: 'amen-15', en: 'Prime Location', ar: 'موقع متميز' },
    { id: 'amen-16', en: 'Close to Services', ar: 'قريبة من الخدمات' },
    { id: 'amen-17', en: 'Separate Meters', ar: 'عدادات منفصلة' },
    { id: 'amen-18', en: 'Private Roof', ar: 'رووف خاص', applicableTo: ['Villa', 'Apartment'] },
    { id: 'amen-19', en: 'Open View', ar: 'إطلالة مفتوحة' },
    { id: 'amen-20', en: 'Jacuzzi', ar: 'جاكوزي', applicableTo: ['Villa', 'Apartment'] },
    { id: 'amen-21', en: 'Dressing Room', ar: 'غرفة ملابس', applicableTo: ['Villa', 'Apartment'] },
    { id: 'amen-22', en: 'Modern Design', ar: 'تصميم حديث' },
    { id: 'amen-23', en: 'Large Garden', ar: 'حديقة كبيرة', applicableTo: ['Villa'] },
    { id: 'amen-24', en: 'Complete Privacy', ar: 'خصوصية تامة' },
    { id: 'amen-25', en: 'Panoramic Windows', ar: 'نوافذ بانورامية' },
    { id: 'amen-26', en: 'Private Garage', ar: 'جراج خاص', applicableTo: ['Villa'] },
    { id: 'amen-27', en: 'Fully Furnished', ar: 'مفروشة بالكامل' },
    { id: 'amen-28', en: 'Modern Appliances', ar: 'أجهزة حديثة' },
    { id: 'amen-29', en: 'Ready to Move In', ar: 'جاهزة للسكن' },
    { id: 'amen-30', en: 'High-Speed Internet', ar: 'إنترنت فائق السرعة' },
    { id: 'amen-31', en: 'Strategic Location', ar: 'موقع استراتيجي' },
    { id: 'amen-32', en: 'Frontage on a Main Street', ar: 'واجهة على شارع رئيسي', applicableTo: ['Commercial'] },
    { id: 'amen-33', en: 'Fully Serviced', ar: 'كاملة المرافق' },
    { id: 'amen-34', en: 'Full Customization Potential', ar: 'إمكانية التخصيص الكامل' },
    { id: 'amen-35', en: 'Quiet Area', ar: 'منطقة هادئة' },
    { id: 'amen-36', en: 'Parking', ar: 'موقف سيارات' }
];