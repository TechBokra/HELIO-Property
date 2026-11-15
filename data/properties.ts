

import type { Property } from '../types';

// Data is now mutable to simulate a database
export let propertiesData: Property[] = [
    {
      id: 'villa-heliopolis-1',
      partnerId: 'united-development',
      projectId: 'proj-1',
      imageUrl: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=75&w=2071&auto=format&fit=crop",
      imageUrl_small: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=75&w=480&auto=format&fit=crop",
      imageUrl_medium: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=75&w=800&auto=format&fit=crop",
      imageUrl_large: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=75&w=1200&auto=format&fit=crop",
      gallery: [
        "https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=75&w=2071&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1613977257363-707ba9348227?q=75&w=2070&auto=format&fit=crop"
      ],
      status: { en: 'For Sale', ar: 'للبيع' },
      price: { en: 'EGP 8,500,000', ar: '8,500,000 ج.م' },
      priceNumeric: 8500000,
      type: { en: 'Villa', ar: 'فيلا' },
      title: {
        ar: 'فيلا فاخرة بتصميم عصري في كمبوند تلالا',
        en: 'Luxury Modern Villa in Talala Compound'
      },
      address: {
        ar: 'كمبوند تلالا، هليوبوليس الجديدة',
        en: 'Talala Compound, New Heliopolis'
      },
      description: {
        ar: 'فيلا مستقلة فاخرة بتصميم معماري فريد يجمع بين الحداثة والأصالة. تقع في قلب كمبوند تلالا الراقي، وتوفر إطلالات خلابة على المساحات الخضراء. الفيلا مكونة من طابقين وروف، مع حديقة خاصة ومساحة لحمام سباحة.',
        en: 'A luxurious standalone villa with a unique architectural design that combines modernity and authenticity. Located in the heart of the prestigious Talala Compound, it offers stunning views of the green spaces. The villa consists of two floors and a roof, with a private garden and space for a swimming pool.'
      },
      beds: 5,
      baths: 6,
      area: 450,
      amenities: {
        ar: ['حديقة خاصة', 'جراج خاص', 'أمن 24/7', 'إطلالة مفتوحة'],
        en: ['Private Garden', 'Private Garage', '24/7 Security', 'Open View']
      },
      finishingStatus: { en: 'Semi-finished', ar: 'نصف تشطيب' },
      installmentsAvailable: true,
      isInCompound: true,
      realEstateFinanceAvailable: true,
      delivery: { isImmediate: false, date: '2025-12-01' },
      installments: { downPayment: 850000, monthlyInstallment: 63750, years: 10 },
      location: { lat: 30.138, lng: 31.679 },
      listingStartDate: '2024-06-01',
      listingStatus: 'active',
    },
    {
      id: 'apartment-heliopolis-2',
      partnerId: 'modern-construction-group',
      projectId: 'proj-2',
      imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=75&w=2070&auto=format&fit=crop",
      imageUrl_small: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=75&w=480&auto=format=fit-crop",
      imageUrl_medium: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=75&w=800&auto=format&fit=crop",
      imageUrl_large: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=75&w=1200&auto=format&fit=crop",
      gallery: [
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=75&w=2070&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=75&w=2070&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=75&w=2070&auto=format&fit=crop"
      ],
      status: { en: 'For Rent', ar: 'إيجار' },
      price: { en: 'EGP 25,000 / month', ar: '25,000 ج.م / شهرياً' },
      priceNumeric: 25000,
      type: { en: 'Apartment', ar: 'شقة' },
      title: {
        ar: 'شقة مفروشة بالكامل للإيجار في جولز',
        en: 'Fully Furnished Apartment for Rent in Joules'
      },
      address: {
        ar: 'كمبوند جولز، الحي الثاني، هليوبوليس الجديدة',
        en: 'Joules Compound, 2nd District, New Heliopolis'
      },
      description: {
        ar: 'شقة فاخرة للإيجار مفروشة بالكامل بأثاث عصري وأجهزة حديثة. تتميز الشقة بإطلالة مباشرة على حديقة الكمبوند. جاهزة للسكن الفوري.',
        en: 'Luxury apartment for rent, fully furnished with modern furniture and appliances. The apartment features a direct view of the compound\'s garden. Ready for immediate occupancy.'
      },
      beds: 3,
      baths: 2,
      area: 180,
      floor: 3,
      amenities: {
        ar: ['مفروشة بالكامل', 'أجهزة حديثة', 'جاهزة للسكن', 'مصعد'],
        en: ['Fully Furnished', 'Modern Appliances', 'Ready to Move In', 'Elevator']
      },
      finishingStatus: { en: 'Fully Furnished', ar: 'مفروشة بالكامل' },
      isInCompound: true,
      delivery: { isImmediate: true },
      location: { lat: 30.141, lng: 31.675 },
      listingStartDate: '2024-07-01',
      listingStatus: 'active',
      installmentsAvailable: false,
      realEstateFinanceAvailable: false,
    },
    {
      id: 'commercial-heliopolis-3',
      partnerId: 'future-real-estate',
      imageUrl: "https://images.unsplash.com/photo-1448630360428-65456885c650?q=75&w=2067&auto=format&fit=crop",
      imageUrl_small: "https://images.unsplash.com/photo-1448630360428-65456885c650?q=75&w=480&auto=format&fit=crop",
      imageUrl_medium: "https://images.unsplash.com/photo-1448630360428-65456885c650?q=75&w=800&auto=format&fit=crop",
      imageUrl_large: "https://images.unsplash.com/photo-1448630360428-65456885c650?q=75&w=1200&auto=format&fit=crop",
      gallery: [],
      status: { en: 'For Sale', ar: 'للبيع' },
      price: { en: 'EGP 3,200,000', ar: '3,200,000 ج.م' },
      priceNumeric: 3200000,
      type: { en: 'Commercial', ar: 'تجاري' },
      title: {
        ar: 'محل تجاري بموقع متميز على شارع رئيسي',
        en: 'Commercial Shop in a Prime Location on a Main Street'
      },
      address: {
        ar: 'الحي الأول، شارع الكوربة، هليوبوليس الجديدة',
        en: '1st District, El Korba St, New Heliopolis'
      },
      description: {
        ar: 'محل تجاري بمساحة 80 متر مربع، واجهة على شارع رئيسي وحيوي. يصلح لجميع الأنشطة التجارية. استلام فوري.',
        en: 'A commercial shop with an area of 80 square meters, fronting a main and lively street. Suitable for all commercial activities. Immediate delivery.'
      },
      beds: 0,
      baths: 1,
      area: 80,
      floor: 0,
      amenities: {
        ar: ['موقع استراتيجي', 'واجهة على شارع رئيسي', 'كاملة المرافق'],
        en: ['Strategic Location', 'Frontage on a Main Street', 'Fully Serviced']
      },
      finishingStatus: { en: 'Without Finishing', ar: 'بدون تشطيب' },
      installmentsAvailable: false,
      isInCompound: false,
      realEstateFinanceAvailable: false,
      delivery: { isImmediate: true },
      location: { lat: 30.135, lng: 31.672 },
      listingStartDate: '2024-05-15',
      listingStatus: 'active',
    },
    {
      id: 'land-heliopolis-4',
      partnerId: 'individual-listings',
      imageUrl: "https://images.unsplash.com/photo-1555526244-4c3113576751?q=75&w=2070&auto=format&fit=crop",
      imageUrl_small: "https://images.unsplash.com/photo-1555526244-4c3113576751?q=75&w=480&auto=format&fit=crop",
      imageUrl_medium: "https://images.unsplash.com/photo-1555526244-4c3113576751?q=75&w=800&auto=format&fit=crop",
      imageUrl_large: "https://images.unsplash.com/photo-1555526244-4c3113576751?q=75&w=1200&auto=format&fit=crop",
      gallery: [],
      status: { en: 'For Sale', ar: 'للبيع' },
      price: { en: 'EGP 5,000,000', ar: '5,000,000 ج.م' },
      priceNumeric: 5000000,
      type: { en: 'Land', ar: 'أرض' },
      title: {
        ar: 'أرض للبيع بمنطقة الفيلات',
        en: 'Land for Sale in the Villas Area'
      },
      address: {
        ar: 'الحي الرابع، هليوبوليس الجديدة',
        en: '4th District, New Heliopolis'
      },
      description: {
        ar: 'قطعة أرض مميزة بمساحة 600 متر مربع، مخصصة لبناء فيلا. تقع في منطقة هادئة وراقية.',
        en: 'A prime piece of land of 600 square meters, designated for building a villa. Located in a quiet and upscale area.'
      },
      beds: 0,
      baths: 0,
      area: 600,
      amenities: {
        ar: ['إمكانية التخصيص الكامل', 'منطقة هادئة'],
        en: ['Full Customization Potential', 'Quiet Area']
      },
      delivery: { isImmediate: true },
      location: { lat: 30.133, lng: 31.668 },
      listingStartDate: '2024-07-10',
      contactMethod: 'direct',
      ownerPhone: '01012345678',
      isInCompound: false,
      listingStatus: 'active',
      installmentsAvailable: false,
      realEstateFinanceAvailable: false,
    },
    {
        id: 'apartment-heliopolis-5',
        partnerId: 'sodic',
        projectId: 'proj-3',
        imageUrl: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?q=75&w=2070&auto=format&fit=crop",
        imageUrl_small: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?q=75&w=480&auto=format&fit=crop",
        imageUrl_medium: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?q=75&w=800&auto=format&fit=crop",
        imageUrl_large: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?q=75&w=1200&auto=format&fit=crop",
        gallery: [
            "https://images.unsplash.com/photo-1600585152220-90363fe7e115?q=75&w=2070&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1600607687939-ce8a69d67e20?q=75&w=2070&auto=format&fit=crop",
        ],
        status: { en: 'For Sale', ar: 'للبيع' },
        price: { en: 'EGP 4,200,000', ar: '4,200,000 ج.م' },
        priceNumeric: 4200000,
        type: { en: 'Apartment', ar: 'شقة' },
        title: {
          ar: 'شقة فاخرة بتشطيب كامل في سوديك إيست',
          en: 'Luxury Fully Finished Apartment in SODIC East'
        },
        address: {
          ar: 'سوديك إيست، هليوبوليس الجديدة',
          en: 'SODIC East, New Heliopolis'
        },
        description: {
          ar: 'شقة عصرية في قلب سوديك إيست، تتميز بتشطيبات عالية الجودة وإطلالة مفتوحة. جاهزة للسكن الفوري وتوفر جميع وسائل الراحة والرفاهية.',
          en: 'A modern apartment in the heart of SODIC East, featuring high-quality finishes and an open view. Ready for immediate occupancy and offers all modern comforts and luxuries.'
        },
        beds: 3,
        baths: 3,
        area: 195,
        floor: 5,
        amenities: {
          ar: ['نادي رياضي', 'أمن 24/7', 'مصعد', 'إطلالة مفتوحة'],
          en: ['Shared Health Club', '24/7 Security', 'Elevator', 'Open View']
        },
        finishingStatus: { en: 'Fully Finished', ar: 'تشطيب كامل' },
        installmentsAvailable: true,
        isInCompound: true,
        realEstateFinanceAvailable: true,
        delivery: { isImmediate: true },
        installments: { downPayment: 420000, monthlyInstallment: 31500, years: 10 },
        location: { lat: 30.13, lng: 31.67 },
        listingStartDate: '2024-07-20',
        listingStatus: 'active',
    },
    {
        id: 'villa-heliopolis-6',
        partnerId: 'capital-group-properties',
        projectId: 'proj-4',
        imageUrl: "https://images.unsplash.com/photo-1570129477492-45c003edd2e0?q=75&w=2070&auto=format&fit=crop",
        imageUrl_small: "https://images.unsplash.com/photo-1570129477492-45c003edd2e0?q=75&w=480&auto=format&fit=crop",
        imageUrl_medium: "https://images.unsplash.com/photo-1570129477492-45c003edd2e0?q=75&w=800&auto=format&fit=crop",
        imageUrl_large: "https://images.unsplash.com/photo-1570129477492-45c003edd2e0?q=75&w=1200&auto=format&fit=crop",
        gallery: [
            "https://images.unsplash.com/photo-1570129477492-45c003edd2e0?q=75&w=2070&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=75&w=2070&auto=format&fit=crop",
        ],
        status: { en: 'For Rent', ar: 'إيجار' },
        price: { en: 'EGP 55,000 / month', ar: '55,000 ج.م / شهرياً' },
        priceNumeric: 55000,
        type: { en: 'Villa', ar: 'فيلا' },
        title: {
          ar: 'فيلا مفروشة مع حديقة للإيجار في البروج',
          en: 'Furnished Villa with Garden for Rent in Al Burouj'
        },
        address: {
          ar: 'كمبوند البروج، طريق الإسماعيلية',
          en: 'Al Burouj Compound, Ismailia Road'
        },
        description: {
          ar: 'فيلا أنيقة مفروشة بالكامل بأثاث راقٍ وجاهزة للسكن. تتميز بحديقة واسعة وموقع هادئ داخل كمبوند البروج المتكامل.',
          en: 'An elegant, fully furnished villa with high-end furniture, ready for occupancy. It features a spacious garden and a quiet location within the integrated Al Burouj compound.'
        },
        beds: 4,
        baths: 5,
        area: 380,
        amenities: {
          ar: ['مفروشة بالكامل', 'حديقة خاصة', 'أمن وحراسة', 'جراج خاص'],
          en: ['Fully Furnished', 'Private Garden', 'Security', 'Private Garage']
        },
        finishingStatus: { en: 'Fully Furnished', ar: 'مفروشة بالكامل' },
        isInCompound: true,
        delivery: { isImmediate: true },
        location: { lat: 30.125, lng: 31.65 },
        listingStartDate: '2024-06-25',
        listingStatus: 'active',
        installmentsAvailable: false,
        realEstateFinanceAvailable: false,
    },
    {
      id: 'apartment-heliopolis-7',
      partnerId: 'future-real-estate',
      imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=75&w=2070&auto=format&fit=crop",
      imageUrl_small: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=75&w=480&auto=format&fit=crop",
      imageUrl_medium: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=75&w=800&auto=format&fit=crop",
      imageUrl_large: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=75&w=1200&auto=format&fit=crop",
      gallery: [],
      status: { en: 'For Sale', ar: 'للبيع' },
      price: { en: 'EGP 2,100,000', ar: '2,100,000 ج.م' },
      priceNumeric: 2100000,
      type: { en: 'Apartment', ar: 'شقة' },
      title: {
        ar: 'شقة استلام فوري بسعر مميز',
        en: 'Apartment with Immediate Delivery at a Great Price'
      },
      address: {
        ar: 'الحي الخامس، هليوبوليس الجديدة',
        en: '5th District, New Heliopolis'
      },
      description: {
        ar: 'شقة نصف تشطيب بمساحة 165 متر، جاهزة للاستلام الفوري. موقع مميز بالقرب من منطقة الخدمات.',
        en: 'A semi-finished 165m apartment, ready for immediate delivery. Prime location near the service area.'
      },
      beds: 3,
      baths: 2,
      area: 165,
      floor: 4,
      amenities: {
        ar: ['مصعد', 'قريبة من الخدمات', 'عدادات منفصلة'],
        en: ['Elevator', 'Close to Services', 'Separate Meters']
      },
      finishingStatus: { en: 'Semi-finished', ar: 'نصف تشطيب' },
      installmentsAvailable: false,
      isInCompound: false,
      realEstateFinanceAvailable: true,
      delivery: { isImmediate: true },
      location: { lat: 30.132, lng: 31.67 },
      listingStartDate: '2024-07-05',
      listingStatus: 'active',
    },
    {
      id: 'duplex-heliopolis-8',
      partnerId: 'individual-listings',
      imageUrl: "https://images.unsplash.com/photo-1628744448842-1b8265089602?q=75&w=2070&auto=format&fit=crop",
      imageUrl_small: "https://images.unsplash.com/photo-1628744448842-1b8265089602?q=75&w=480&auto=format&fit=crop",
      imageUrl_medium: "https://images.unsplash.com/photo-1628744448842-1b8265089602?q=75&w=800&auto=format&fit=crop",
      imageUrl_large: "https://images.unsplash.com/photo-1628744448842-1b8265089602?q=75&w=1200&auto=format&fit=crop",
      gallery: [],
      status: { en: 'For Sale', ar: 'للبيع' },
      price: { en: 'EGP 3,500,000', ar: '3,500,000 ج.م' },
      priceNumeric: 3500000,
      type: { en: 'Apartment', ar: 'شقة' },
      title: {
        ar: 'دوبلكس بحديقة خاصة للبيع',
        en: 'Duplex with Private Garden for Sale'
      },
      address: {
        ar: 'الحي الثالث، هليوبوليس الجديدة',
        en: '3rd District, New Heliopolis'
      },
      description: {
        ar: 'دوبلكس أرضي وأول بمساحة 250 متر وحديقة خاصة 80 متر. تشطيب سوبر لوكس، موقع هادئ ومميز.',
        en: 'Ground and first-floor duplex with an area of 250m and a private 80m garden. Super Lux finishing, in a quiet and distinguished location.'
      },
      beds: 4,
      baths: 3,
      area: 250,
      floor: 0,
      amenities: {
        ar: ['حديقة خاصة', 'تشطيب سوبر لوكس', 'خصوصية تامة'],
        en: ['Private Garden', 'Super Lux', 'Complete Privacy']
      },
      finishingStatus: { en: 'Super Lux', ar: 'سوبر لوكس' },
      installmentsAvailable: false,
      isInCompound: false,
      realEstateFinanceAvailable: false,
      delivery: { isImmediate: true },
      location: { lat: 30.139, lng: 31.665 },
      listingStartDate: '2024-07-15',
      listingStatus: 'active',
    },
     {
      id: 'villa-heliopolis-9',
      partnerId: 'heliopolis-developers-group',
      projectId: 'proj-5',
      imageUrl: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?q=75&w=1965&auto=format&fit=crop",
      imageUrl_small: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?q=75&w=480&auto=format&fit=crop",
      imageUrl_medium: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?q=75&w=800&auto=format&fit=crop",
      imageUrl_large: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?q=75&w=1200&auto=format&fit=crop",
      gallery: [],
      status: { en: 'For Sale', ar: 'للبيع' },
      price: { en: 'EGP 6,800,000', ar: '6,800,000 ج.م' },
      priceNumeric: 6800000,
      type: { en: 'Villa', ar: 'فيلا' },
      title: {
        ar: 'تاون هاوس كورنر في كمبوند قرطبة هايتس',
        en: 'Corner Townhouse in Korba Heights Compound'
      },
      address: {
        ar: 'كمبوند قرطبة هايتس، هليوبوليس الجديدة',
        en: 'Korba Heights Compound, New Heliopolis'
      },
      description: {
        ar: 'تاون هاوس كورنر بموقع مميز داخل الكمبوند، نصف تشطيب، مع حديقة جانبية وخلفية. تصميم يضمن الخصوصية الكاملة.',
        en: 'A corner townhouse in a prime location within the compound, semi-finished, with a side and back garden. Designed for complete privacy.'
      },
      beds: 4,
      baths: 4,
      area: 320,
      amenities: {
        ar: ['حديقة خاصة', 'موقع مميز', 'أمن 24/7'],
        en: ['Private Garden', 'Prime Location', '24/7 Security']
      },
      finishingStatus: { en: 'Semi-finished', ar: 'نصف تشطيب' },
      installmentsAvailable: true,
      isInCompound: true,
      realEstateFinanceAvailable: true,
      delivery: { isImmediate: false, date: '2025-06-01' },
       installments: { downPayment: 1360000, monthlyInstallment: 45333, years: 10 },
      location: { lat: 30.128, lng: 31.678 },
      listingStartDate: '2024-05-28',
      listingStatus: 'active',
    },
    {
      id: 'penthouse-heliopolis-10',
      partnerId: 'individual-listings',
      imageUrl: "https://images.unsplash.com/photo-1613553425593-3b12635b2b5f?q=75&w=2070&auto=format&fit=crop",
      imageUrl_small: "https://images.unsplash.com/photo-1613553425593-3b12635b2b5f?q=75&w=480&auto=format&fit=crop",
      imageUrl_medium: "https://images.unsplash.com/photo-1613553425593-3b12635b2b5f?q=75&w=800&auto=format&fit=crop",
      imageUrl_large: "https://images.unsplash.com/photo-1613553425593-3b12635b2b5f?q=75&w=1200&auto=format&fit=crop",
      gallery: [],
      status: { en: 'For Sale', ar: 'للبيع' },
      price: { en: 'EGP 6,000,000', ar: '6,000,000 ج.م' },
      priceNumeric: 6000000,
      type: { en: 'Apartment', ar: 'شقة' },
      title: {
        ar: 'بنتهاوس فاخر بإطلالة بانورامية للبيع',
        en: 'Luxury Penthouse with Panoramic View for Sale'
      },
      address: {
        ar: 'الحي السادس، هليوبوليس الجديدة',
        en: '6th District, New Heliopolis'
      },
      description: {
        ar: 'بنتهاوس دوبلكس بالطابق الأخير مع رووف خاص بمساحة 100م. إطلالة مفتوحة على المدينة، تشطيبات سوبر لوكس وجاهز للسكن. مثالي لمن يبحث عن الخصوصية والتميز.',
        en: 'A duplex penthouse on the top floor with a private 100m roof. Open views of the city, super lux finishes, and ready to move in. Ideal for those seeking privacy and distinction.'
      },
      beds: 4,
      baths: 4,
      area: 280,
      floor: 7,
      amenities: {
        ar: ['رووف خاص', 'إطلالة بانورامية', 'تصميم حديث'],
        en: ['Private Roof', 'Panoramic View', 'Modern Design']
      },
      finishingStatus: { en: 'Super Lux', ar: 'سوبر لوكس' },
      installmentsAvailable: false,
      isInCompound: false,
      realEstateFinanceAvailable: true,
      delivery: { isImmediate: true },
      location: { lat: 30.136, lng: 31.666 },
      listingStartDate: '2024-07-22',
      contactMethod: 'platform',
      listingStatus: 'active',
    },
    {
      id: 'villa-rent-heliopolis-11',
      partnerId: 'individual-listings',
      imageUrl: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=75&w=2070&auto=format&fit=crop",
      imageUrl_small: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=75&w=480&auto=format&fit=crop",
      imageUrl_medium: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=75&w=800&auto=format&fit=crop",
      imageUrl_large: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=75&w=1200&auto=format&fit=crop",
      gallery: [],
      status: { en: 'For Rent', ar: 'إيجار' },
      price: { en: 'EGP 40,000 / month', ar: '40,000 ج.م / شهرياً' },
      priceNumeric: 40000,
      type: { en: 'Villa', ar: 'فيلا' },
      title: {
        ar: 'فيلا للإيجار بحديقة خاصة وحمام سباحة',
        en: 'Villa for Rent with Private Garden and Pool'
      },
      address: {
        ar: 'منطقة الفيلات، الحي الثاني، هليوبوليس الجديدة',
        en: 'Villas Area, 2nd District, New Heliopolis'
      },
      description: {
        ar: 'فيلا مستقلة مفروشة بالكامل للإيجار. تحتوي على حديقة واسعة وحمام سباحة خاص. مكيفة بالكامل وجاهزة للسكن الفوري. مثالية للعائلات.',
        en: 'Standalone furnished villa for rent. Features a large garden and a private swimming pool. Fully air-conditioned and ready for immediate occupancy. Perfect for families.'
      },
      beds: 5,
      baths: 5,
      area: 400,
      amenities: {
        ar: ['حديقة خاصة', 'حمام سباحة', 'مفروشة بالكامل', 'جراج خاص'],
        en: ['Private Garden', 'Swimming Pool', 'Fully Furnished', 'Private Garage']
      },
      finishingStatus: { en: 'Fully Furnished', ar: 'مفروشة بالكامل' },
      isInCompound: false,
      delivery: { isImmediate: true },
      location: { lat: 30.142, lng: 31.670 },
      listingStartDate: '2024-07-18',
      contactMethod: 'direct',
      ownerPhone: '01123456789',
      listingStatus: 'active',
      installmentsAvailable: false,
      realEstateFinanceAvailable: false,
    },
    {
      id: 'clinic-sale-heliopolis-12',
      partnerId: 'individual-listings',
      imageUrl: "https://images.unsplash.com/photo-1631049354021-b3b45a3ce3f4?q=75&w=2070&auto=format&fit=crop",
      imageUrl_small: "https://images.unsplash.com/photo-1631049354021-b3b45a3ce3f4?q=75&w=480&auto=format&fit=crop",
      imageUrl_medium: "https://images.unsplash.com/photo-1631049354021-b3b45a3ce3f4?q=75&w=800&auto=format&fit=crop",
      imageUrl_large: "https://images.unsplash.com/photo-1631049354021-b3b45a3ce3f4?q=75&w=1200&auto=format&fit=crop",
      gallery: [],
      status: { en: 'For Sale', ar: 'للبيع' },
      price: { en: 'EGP 2,500,000', ar: '2,500,000 ج.م' },
      priceNumeric: 2500000,
      type: { en: 'Commercial', ar: 'تجاري' },
      title: {
        ar: 'مساحة إدارية تصلح عيادة أو مكتب للبيع',
        en: 'Administrative Space for Clinic or Office for Sale'
      },
      address: {
        ar: 'المركز الطبي، الحي الأول، هليوبوليس الجديدة',
        en: 'Medical Center, 1st District, New Heliopolis'
      },
      description: {
        ar: 'مساحة تجارية مشطبة بالكامل في مبنى إداري مميز. تصلح لعيادة طبية أو مكتب إداري. موقع حيوي وسهل الوصول.',
        en: 'Fully finished commercial space in a distinguished administrative building. Suitable for a medical clinic or an administrative office. Prime and easily accessible location.'
      },
      beds: 0,
      baths: 1,
      area: 90,
      floor: 2,
      amenities: {
        ar: ['مصعد', 'موقع متميز', 'تشطيب كامل'],
        en: ['Elevator', 'Prime Location', 'Fully Finished']
      },
      finishingStatus: { en: 'Fully Finished', ar: 'تشطيب كامل' },
      installmentsAvailable: false,
      isInCompound: false,
      realEstateFinanceAvailable: false,
      delivery: { isImmediate: true },
      location: { lat: 30.134, lng: 31.673 },
      listingStartDate: '2024-07-25',
      contactMethod: 'platform',
      listingStatus: 'active',
      cityId: 'heliopolis',
    },
    {
      id: 'villa-shorouk-101',
      partnerId: 'sodic',
      projectId: 'proj-shorouk-1',
      imageUrl: '/src/assets/images/city_portal_shorouk_1794779921340.jpg',
      imageUrl_small: '/src/assets/images/city_portal_shorouk_1794779921340.jpg',
      imageUrl_medium: '/src/assets/images/city_portal_shorouk_1794779921340.jpg',
      imageUrl_large: '/src/assets/images/city_portal_shorouk_1794779921340.jpg',
      gallery: ['/src/assets/images/city_portal_shorouk_1794779921340.jpg'],
      status: { en: 'For Sale', ar: 'للبيع' },
      price: { en: 'EGP 9,850,000', ar: '9,850,000 ج.م' },
      priceNumeric: 9850000,
      type: { en: 'Villa', ar: 'فيلا' },
      title: {
        ar: 'تاون هاوس ناصية في الباتيو كازا الشروق',
        en: 'Corner Townhouse in El Patio Casa El Shorouk'
      },
      address: {
        ar: 'مدينة الشروق، مدخل ٢ طريق السويس، الباتيو كازا',
        en: 'El Shorouk City, Entrance 2 Suez Road, El Patio Casa'
      },
      description: {
        ar: 'تاون هاوس ناصية بحديقة خاصة 140 متر وإطلالة مباشرة على اللاندسكيب والمسطحات المائية في قلب مدينة الشروق.',
        en: 'Corner townhouse with a 140 sqm private garden overlooking lush landscaping and water features in El Shorouk City.'
      },
      beds: 4,
      baths: 4,
      area: 245,
      amenities: {
        ar: ['حديقة خاصة', 'نادي اجتماعي', 'أمن 24/7', 'جراج خاص'],
        en: ['Private Garden', 'Clubhouse', '24/7 Security', 'Private Garage']
      },
      finishingStatus: { en: 'Semi-finished', ar: 'نصف تشطيب' },
      installmentsAvailable: true,
      isInCompound: true,
      realEstateFinanceAvailable: true,
      delivery: { isImmediate: true },
      installments: { downPayment: 1970000, monthlyInstallment: 93800, years: 7 },
      location: { lat: 30.1449, lng: 31.6295 },
      listingStartDate: '2024-08-01',
      contactMethod: 'platform',
      listingStatus: 'active',
      cityId: 'shorouk',
    },
    {
      id: 'apartment-shorouk-102',
      partnerId: 'capital-group-properties',
      projectId: 'proj-shorouk-2',
      imageUrl: '/src/assets/images/city_portal_shorouk_1794779921340.jpg',
      imageUrl_small: '/src/assets/images/city_portal_shorouk_1794779921340.jpg',
      imageUrl_medium: '/src/assets/images/city_portal_shorouk_1794779921340.jpg',
      imageUrl_large: '/src/assets/images/city_portal_shorouk_1794779921340.jpg',
      gallery: ['/src/assets/images/city_portal_shorouk_1794779921340.jpg'],
      status: { en: 'For Sale', ar: 'للبيع' },
      price: { en: 'EGP 4,600,000', ar: '4,600,000 ج.م' },
      priceNumeric: 4600000,
      type: { en: 'Apartment', ar: 'شقة' },
      title: {
        ar: 'شقة 180م ألترا سوبر لوكس بجوار نادي هليوبوليس الشروق',
        en: '180 sqm Ultra Super Lux Apartment near Heliopolis Club Shorouk'
      },
      address: {
        ar: 'مدينة الشروق، الحي الثامن، المجاورة الأولى',
        en: 'El Shorouk City, 8th District, Neighborhood 1'
      },
      description: {
        ar: 'شقة واجهة بحرية بالكامل خطوات من نادي هليوبوليس الشروق والجامعة البريطانية BUE، تشطيب فندقي فاخر واستلام فوري.',
        en: 'North-facing apartment steps from Heliopolis Sporting Club El Shorouk and BUE, hotel-grade finishing and immediate delivery.'
      },
      beds: 3,
      baths: 3,
      area: 180,
      floor: 2,
      amenities: {
        ar: ['أسانسير', 'حصة في الجراج', 'عدادات كاملة', 'واجهة بحرية'],
        en: ['Elevator', 'Garage Share', 'Full Utilities', 'North Facade']
      },
      finishingStatus: { en: 'Super Lux', ar: 'سوبر لوكس' },
      installmentsAvailable: false,
      isInCompound: true,
      realEstateFinanceAvailable: true,
      delivery: { isImmediate: true },
      location: { lat: 30.1395, lng: 31.6185 },
      listingStartDate: '2024-08-05',
      contactMethod: 'platform',
      listingStatus: 'active',
      cityId: 'shorouk',
    },
    {
      id: 'apartment-badr-201',
      partnerId: 'modern-construction-group',
      projectId: 'proj-badr-1',
      imageUrl: '/src/assets/images/city_portal_badr_1794779922365.jpg',
      imageUrl_small: '/src/assets/images/city_portal_badr_1794779922365.jpg',
      imageUrl_medium: '/src/assets/images/city_portal_badr_1794779922365.jpg',
      imageUrl_large: '/src/assets/images/city_portal_badr_1794779922365.jpg',
      gallery: ['/src/assets/images/city_portal_badr_1794779922365.jpg'],
      status: { en: 'For Sale', ar: 'للبيع' },
      price: { en: 'EGP 2,850,000', ar: '2,850,000 ج.م' },
      priceNumeric: 2850000,
      type: { en: 'Apartment', ar: 'شقة' },
      title: {
        ar: 'شقة 160م بالحي المتميز في مدينة بدر أمام محطة القطار الكهربائي',
        en: '160 sqm Apartment in Badr Distinguished District Facing LRT'
      },
      address: {
        ar: 'مدينة بدر، الحي المتميز، بدر جاردنز سيتي سنتر',
        en: 'Badr City, Distinguished District, Badr Gardens City Center'
      },
      description: {
        ar: 'وحدة سكنية فاخرة في قلب الحي المتميز بمدينة بدر على بُعد 3 دقائق من محطة القطار الكهربائي LRT وطريق السويس والعاصمة الإدارية.',
        en: 'Luxury residential apartment in Badr Distinguished District 3 minutes from the LRT station, Suez Road, and New Administrative Capital.'
      },
      beds: 3,
      baths: 2,
      area: 160,
      floor: 3,
      amenities: {
        ar: ['بجوار محطة LRT', 'جراج خاص', 'حديقة عائلية', 'أمن 24/7'],
        en: ['Near LRT Station', 'Private Garage', 'Family Garden', '24/7 Security']
      },
      finishingStatus: { en: 'Fully Finished', ar: 'تشطيب كامل' },
      installmentsAvailable: true,
      isInCompound: true,
      realEstateFinanceAvailable: true,
      delivery: { isImmediate: true },
      installments: { downPayment: 850000, monthlyInstallment: 41600, years: 4 },
      location: { lat: 30.1365, lng: 31.7145 },
      listingStartDate: '2024-08-08',
      contactMethod: 'platform',
      listingStatus: 'active',
      cityId: 'badr',
    },
    {
      id: 'commercial-badr-202',
      partnerId: 'modern-construction-group',
      projectId: 'proj-badr-1',
      imageUrl: '/src/assets/images/city_portal_badr_1794779922365.jpg',
      imageUrl_small: '/src/assets/images/city_portal_badr_1794779922365.jpg',
      imageUrl_medium: '/src/assets/images/city_portal_badr_1794779922365.jpg',
      imageUrl_large: '/src/assets/images/city_portal_badr_1794779922365.jpg',
      gallery: ['/src/assets/images/city_portal_badr_1794779922365.jpg'],
      status: { en: 'For Sale', ar: 'للبيع' },
      price: { en: 'EGP 5,900,000', ar: '5,900,000 ج.م' },
      priceNumeric: 5900000,
      type: { en: 'Commercial', ar: 'تجاري' },
      title: {
        ar: 'وحدة تجارية وإدارية 115م في المحور المركزي بمدينة بدر',
        en: '115 sqm Commercial & Retail Unit on Badr Central Axis'
      },
      address: {
        ar: 'مدينة بدر، المحور المركزي التجاري، بجوار مجمع البنوك',
        en: 'Badr City, Central Commercial Axis, beside Banking Complex'
      },
      description: {
        ar: 'فرصة استثمارية بعائد إيجاري مرتفع في المحور التجاري الرئيسي لمدينة بدر لخدمة الكثافة السكنية وموظفي العاصمة الإدارية.',
        en: 'High-yield commercial retail opportunity on Badr City’s central axis serving residential and New Capital commuters.'
      },
      beds: 0,
      baths: 1,
      area: 115,
      floor: 1,
      amenities: {
        ar: ['واجهة زجاجية مزدوجة', 'ساحة انتظار سيارات', 'مولدات طوارئ'],
        en: ['Double Glass Facade', 'Parking Plaza', 'Backup Generators']
      },
      finishingStatus: { en: 'Semi-finished', ar: 'نصف تشطيب' },
      installmentsAvailable: true,
      isInCompound: false,
      realEstateFinanceAvailable: false,
      delivery: { isImmediate: true },
      installments: { downPayment: 1475000, monthlyInstallment: 73750, years: 5 },
      location: { lat: 30.1380, lng: 31.7190 },
      listingStartDate: '2024-08-10',
      contactMethod: 'platform',
      listingStatus: 'active',
      cityId: 'badr',
    }
];

