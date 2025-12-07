import type { Project } from '../types';

export let projectsData: Project[] = [
    {
        id: 'proj-1',
        partnerId: 'united-development',
        name: {
            ar: 'كمبوند تلالا',
            en: 'Talala Compound'
        },
        description: {
            ar: 'كمبوند تلالا في هليوبوليس الجديدة، يقدم تجربة سكنية فاخرة مع التركيز على المساحات الخضراء والهدوء.',
            en: 'Talala Compound in New Heliopolis, offering a luxurious residential experience with a focus on green spaces and tranquility.'
        },
        imageUrl: 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?q=75&w=2148&auto=format&fit=crop',
        imageUrl_small: 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?q=75&w=480&auto=format&fit=crop',
        imageUrl_medium: 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?q=75&w=800&auto=format&fit=crop',
        imageUrl_large: 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?q=75&w=1200&auto=format&fit=crop',
        createdAt: new Date('2023-11-10T00:00:00Z').toISOString(),
        features: [
            { icon: 'SwimmingPoolIcon', text: { ar: 'حمامات سباحة', en: 'Swimming Pools' } },
            { icon: 'ParkIcon', text: { ar: 'مساحات خضراء واسعة', en: 'Vast Green Spaces' } },
            { icon: 'ShieldCheckIcon', text: { ar: 'أمن وحراسة 24/7', en: '24/7 Security' } },
            { icon: 'ShoppingCartIcon', text: { ar: 'منطقة تجارية', en: 'Commercial Area' } },
        ]
    },
    {
        id: 'proj-2',
        partnerId: 'modern-construction-group',
        name: {
            ar: 'كمبوند جولز',
            en: 'Joules Compound'
        },
        description: {
            ar: 'كمبوند جولز يقدم حياة عصرية متكاملة مع مجموعة متنوعة من الوحدات السكنية والخدمات الترفيهية.',
            en: 'Joules Compound offers a modern, integrated lifestyle with a variety of residential units and recreational services.'
        },
        imageUrl: 'https://images.unsplash.com/photo-1593696140826-c58b02198d47?q=75&w=2070&auto=format&fit=crop',
        imageUrl_small: 'https://images.unsplash.com/photo-1593696140826-c58b02198d47?q=75&w=480&auto=format&fit=crop',
        imageUrl_medium: 'https://images.unsplash.com/photo-1593696140826-c58b02198d47?q=75&w=800&auto=format&fit=crop',
        imageUrl_large: 'https://images.unsplash.com/photo-1593696140826-c58b02198d47?q=75&w=1200&auto=format&fit=crop',
        createdAt: new Date('2024-02-15T00:00:00Z').toISOString(),
        features: [
            { icon: 'BuildingStorefrontIcon', text: { ar: 'محلات تجارية بالأسفل', en: 'Ground-Floor Shops' } },
            { icon: 'ParkingIcon', text: { ar: 'جراجات تحت الأرض', en: 'Underground Garages' } },
            { icon: 'ElevatorIcon', text: { ar: 'مصاعد حديثة', en: 'Modern Elevators' } },
            { icon: 'ShieldCheckIcon', text: { ar: 'أمن وحراسة', en: 'Security Services' } },
        ]
    },
    {
        id: 'proj-3',
        partnerId: 'sodic',
        name: { ar: 'سوديك إيست', en: 'SODIC East' },
        description: {
            ar: 'مشروع متكامل يمتد على مساحة 655 فدانًا، ويقدم مجموعة متنوعة من الوحدات السكنية مع خدمات متكاملة تشمل ناديًا رياضيًا ومناطق تجارية ومدارس.',
            en: 'An integrated project spanning 655 acres, offering a variety of residential units with comprehensive services including a sports club, commercial areas, and schools.'
        },
        imageUrl: 'https://images.unsplash.com/photo-1605146769283-4a23588950c6?q=75&w=2070&auto=format&fit=crop',
        imageUrl_small: 'https://images.unsplash.com/photo-1605146769283-4a23588950c6?q=75&w=480&auto=format&fit=crop',
        imageUrl_medium: 'https://images.unsplash.com/photo-1605146769283-4a23588950c6?q=75&w=800&auto=format&fit=crop',
        imageUrl_large: 'https://images.unsplash.com/photo-1605146769283-4a23588950c6?q=75&w=1200&auto=format&fit=crop',
        createdAt: new Date('2024-04-01T00:00:00Z').toISOString(),
        features: [
            { icon: 'ParkIcon', text: { ar: 'حدائق ومساحات خضراء', en: 'Parks & Green Spaces' } },
            { icon: 'ShoppingCartIcon', text: { ar: 'مناطق تجارية وترفيهية', en: 'Retail & Entertainment' } },
            { icon: 'ShieldCheckIcon', text: { ar: 'نادي رياضي واجتماعي', en: 'Sports & Social Club' } },
            { icon: 'BuildingStorefrontIcon', text: { ar: 'مدارس دولية', en: 'International Schools' } },
        ]
    },
    {
        id: 'proj-4',
        partnerId: 'capital-group-properties',
        name: { ar: 'البروج', en: 'Al Burouj' },
        description: {
            ar: 'كمبوند سكني فاخر يقع على طريق القاهرة-الإسماعيلية، يتميز بتصميماته المعمارية الراقية وبنية تحتية متطورة تشمل مركزًا ثقافيًا عالميًا وحدائق مركزية.',
            en: 'A luxury residential compound on the Cairo-Ismailia road, distinguished by its refined architecture and advanced infrastructure, including a world-class cultural hub and central gardens.'
        },
        imageUrl: 'https://images.unsplash.com/photo-1599809275661-059052824c04?q=75&w=2070&auto=format&fit=crop',
        imageUrl_small: 'https://images.unsplash.com/photo-1599809275661-059052824c04?q=75&w=480&auto=format&fit=crop',
        imageUrl_medium: 'https://images.unsplash.com/photo-1599809275661-059052824c04?q=75&w=800&auto=format&fit=crop',
        imageUrl_large: 'https://images.unsplash.com/photo-1599809275661-059052824c04?q=75&w=1200&auto=format&fit=crop',
        createdAt: new Date('2024-05-20T00:00:00Z').toISOString(),
        features: [
            { icon: 'ParkIcon', text: { ar: 'حديقة مركزية ضخمة', en: 'Orchard Park' } },
            { icon: 'ShieldCheckIcon', text: { ar: 'مركز ثقافي (ساقية الصاوي)', en: 'Cultural Hub (El Sawy Culturewheel)' } },
            { icon: 'BuildingStorefrontIcon', text: { ar: 'مدارس الشويفات وكادمس', en: 'Choueifat & Cadmus Schools' } },
            { icon: 'ShoppingCartIcon', text: { ar: 'مركز تجاري ذكي', en: 'Smart Village & Business Park' } },
        ]
    },
    {
        id: 'proj-5',
        partnerId: 'heliopolis-developers-group',
        name: { ar: 'قرطبة هايتس', en: 'Korba Heights' },
        description: {
            ar: 'كمبوند سكني هادئ في قلب هليوبوليس الجديدة، يوفر تجربة سكنية مميزة مع التركيز على الخصوصية والمساحات الخضراء.',
            en: 'A tranquil residential compound in the heart of New Heliopolis, offering a distinctive living experience with a focus on privacy and green spaces.'
        },
        imageUrl: 'https://images.unsplash.com/photo-1560185893-a55d88652353?q=75&w=2070&auto=format&fit=crop',
        imageUrl_small: 'https://images.unsplash.com/photo-1560185893-a55d88652353?q=75&w=480&auto=format&fit=crop',
        imageUrl_medium: 'https://images.unsplash.com/photo-1560185893-a55d88652353?q=75&w=800&auto=format&fit=crop',
        imageUrl_large: 'https://images.unsplash.com/photo-1560185893-a55d88652353?q=75&w=1200&auto=format&fit=crop',
        createdAt: new Date('2024-01-10T00:00:00Z').toISOString(),
        features: [
            { icon: 'ParkIcon', text: { ar: 'مساحات خضراء', en: 'Green Areas' } },
            { icon: 'ShieldCheckIcon', text: { ar: 'أمن وبوابات', en: 'Security & Gates' } },
            { icon: 'SwimmingPoolIcon', text: { ar: 'حمامات سباحة', en: 'Swimming Pools' } },
            { icon: 'ParkingIcon', text: { ar: 'مناطق انتظار للسيارات', en: 'Parking Areas' } },
        ]
    },
    {
        id: 'proj-6',
        partnerId: 'alrowad-engineering',
        name: { ar: 'كمبوند تيباروز', en: 'Tibarose Compound' },
        description: { 
            ar: 'كمبوند تيباروز هليوبوليس الجديدة، مجتمع سكني فاخر يوفر شققًا وبنتهاوس بتصميمات عصرية وخدمات متكاملة.', 
            en: 'Tibarose Heliopolis, a luxurious residential community offering apartments and penthouses with modern designs and integrated services.' 
        },
        imageUrl: 'https://images.unsplash.com/photo-1599809275661-059052824c04?q=75&w=2070&auto=format&fit=crop',
        imageUrl_small: 'https://images.unsplash.com/photo-1599809275661-059052824c04?q=75&w=480&auto=format&fit=crop',
        imageUrl_medium: 'https://images.unsplash.com/photo-1599809275661-059052824c04?q=75&w=800&auto=format&fit=crop',
        imageUrl_large: 'https://images.unsplash.com/photo-1599809275661-059052824c04?q=75&w=1200&auto=format&fit=crop',
        createdAt: new Date('2024-03-10T00:00:00Z').toISOString(),
        features: [
            { icon: 'ShieldCheckIcon', text: { ar: 'أمن وحراسة', en: 'Security Services' } },
            { icon: 'ParkIcon', text: { ar: 'مساحات خضراء', en: 'Green Spaces' } },
            { icon: 'SwimmingPoolIcon', text: { ar: 'حمامات سباحة', en: 'Swimming Pools' } },
            { icon: 'ElevatorIcon', text: { ar: 'مصاعد حديثة', en: 'Modern Elevators' } },
        ]
    }
];