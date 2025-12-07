import type { PortfolioItem } from '../types';

export let portfolioData: PortfolioItem[] = [
    // El Mottaheda Group
    { id: 'p1-1', partnerId: 'el-mottaheda-group', imageUrl: "https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?q=75&w=1974&auto=format&fit=crop", alt: "موقع بناء حديث", title: {ar: "موقع بناء حديث", en: "Modern Construction Site"}, category: {ar: 'تشطيبات خارجية', en: 'Exterior Finishes'} },
    { id: 'p1-2', partnerId: 'el-mottaheda-group', imageUrl: "https://images.unsplash.com/photo-1429497419816-9ca5cfb4571a?q=75&w=2071&auto=format&fit=crop", alt: "هيكل معماري", title: {ar: "هيكل معماري", en: "Architectural Structure"}, category: {ar: 'تشطيبات خارجية', en: 'Exterior Finishes'} },
    { id: 'p1-3', partnerId: 'el-mottaheda-group', imageUrl: "https://images.unsplash.com/photo-1581092446347-a8bce1e51b4c?q=75&w=2070&auto=format&fit=crop", alt: "أعمال تشطيب داخلية", title: {ar: "أعمال تشطيب داخلية", en: "Interior Finishing Works"}, category: {ar: 'تصاميم داخلية', en: 'Interior Designs'} },
    { id: 'p1-4', partnerId: 'el-mottaheda-group', imageUrl: "https://images.unsplash.com/photo-1517983692621-4493f06a1478?q=75&w=2070&auto=format&fit=crop", alt: "واجهة خارجية لمبنى", title: {ar: "واجهة خارجية لمبنى", en: "Building Exterior Facade"}, category: {ar: 'تشطيبات خارجية', en: 'Exterior Finishes'} },
    
    // Design Hub (Finishing examples)
    { id: 'p2-1', partnerId: 'design-hub', imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=75&w=2000&auto=format&fit=crop", alt: "غرفة معيشة عصرية", title: {ar: "غرفة معيشة عصرية", en: "Modern Living Room"}, category: {ar: 'تصاميم داخلية', en: 'Interior Designs'} },
    { id: 'p2-2', partnerId: 'design-hub', imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=75&w=2070&auto=format&fit=crop", alt: "مطبخ حديث", title: {ar: "مطبخ حديث", en: "Modern Kitchen"}, category: {ar: 'مطابخ', en: 'Kitchens'} },
    
    // Artistic Touch
    { id: 'p3-1', partnerId: 'artistic-touch-decor', imageUrl: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?q=75&w=2070&auto=format&fit=crop", alt: "ديكور جداري فاخر", title: {ar: "ديكور جداري فاخر", en: "Luxury Wall Decor"}, category: {ar: 'تفاصيل فنية', en: 'Artistic Details'} },
    { id: 'p3-3', partnerId: 'artistic-touch-decor', imageUrl: "https://images.unsplash.com/photo-1533090481720-337a8a6f3874?q=75&w=1974&auto=format&fit=crop", alt: "لمسة فنية في غرفة طعام", title: {ar: "لمسة فنية في غرفة طعام", en: "Artistic Touch in Dining Room"}, category: {ar: 'تصاميم داخلية', en: 'Interior Designs'} },
    
    // Ebdaa
    { id: 'p4-1', partnerId: 'ebdaa-integrated-finishes', imageUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=75&w=2070&auto=format&fit=crop", alt: "تشطيب شقة سكنية", title: {ar: "تشطيب شقة سكنية", en: "Residential Apartment Finishing"}, category: {ar: 'تصاميم داخلية', en: 'Interior Designs'} },
    { id: 'p4-2', partnerId: 'ebdaa-integrated-finishes', imageUrl: "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?q=75&w=2070&auto=format&fit=crop", alt: "تشطيب مطبخ عملي", title: {ar: "تشطيب مطبخ عملي", en: "Practical Kitchen Finishing"}, category: {ar: 'مطابخ', en: 'Kitchens'} },

    // DECORATIONS SECTION - MANAGED INTERNALLY
    // Wall Sculptures
    { id: 'decor-1', partnerId: 'admin-user', imageUrl: "https://i.imgur.com/gJ9n273.jpeg", alt: "3D wall sculpture of flowers", title: {ar: "منحوتة زهور ثلاثية الأبعاد", en: "3D Flower Sculpture"}, category: {ar: 'منحوتات جدارية', en: 'Wall Sculptures'}, price: 7500, dimensions: '150cm x 90cm', availability: 'Made to Order' },
    { id: 'decor-2', partnerId: 'admin-user', imageUrl: "https://i.imgur.com/g05Y36x.jpeg", alt: "Wall sculpture of a blossoming tree", title: {ar: "منحوتة شجرة مزهرة", en: "Blossoming Tree Sculpture"}, category: {ar: 'منحوتات جدارية', en: 'Wall Sculptures'}, price: 12000, dimensions: '200cm x 120cm', availability: 'Made to Order' },
    { id: 'decor-3', partnerId: 'admin-user', imageUrl: "https://i.imgur.com/6pgpJA8.jpeg", alt: "Abstract tree branch wall sculpture", title: {ar: "منحوتة غصن شجرة تجريدي", en: "Abstract Tree Branch Sculpture"}, category: {ar: 'منحوتات جدارية', en: 'Wall Sculptures'}, price: 4800, dimensions: '100cm x 70cm', availability: 'In Stock' },
    { id: 'decor-4', partnerId: 'admin-user', imageUrl: "https://i.imgur.com/mR3e5OF.jpeg", alt: "Geometric wall sculpture", title: {ar: "منحوتة جدارية هندسية", en: "Geometric Wall Sculpture"}, category: {ar: 'منحوتات جدارية', en: 'Wall Sculptures'}, price: 6200, dimensions: '130cm x 130cm', availability: 'Made to Order' },
    { id: 'decor-5', partnerId: 'admin-user', imageUrl: "https://i.imgur.com/rN9yUaM.jpeg", alt: "Nature inspired wall sculpture", title: {ar: "منحوتة مستوحاة من الطبيعة", en: "Nature Inspired Sculpture"}, category: {ar: 'منحوتات جدارية', en: 'Wall Sculptures'}, price: 8900, dimensions: '180cm x 100cm', availability: 'Made to Order' },

    // Canvas Paintings
    { id: 'decor-6', partnerId: 'admin-user', imageUrl: "https://images.unsplash.com/photo-1579965342575-5fab2a4d6893?q=75&w=1964&auto=format&fit=crop", alt: "Abstract canvas painting", title: {ar: "لوحة كانفس تجريدية", en: "Abstract Canvas Painting"}, category: {ar: 'لوحات كانفس', en: 'Canvas Paintings'}, price: 2200, dimensions: '100cm x 100cm', availability: 'In Stock' },
    { id: 'decor-7', partnerId: 'admin-user', imageUrl: "https://images.unsplash.com/photo-1549492423-400259a5e5a9?q=75&w=2070&auto=format&fit=crop", alt: "Modern art canvas", title: {ar: "لوحة فنية عصرية", en: "Modern Art Canvas"}, category: {ar: 'لوحات كانفس', en: 'Canvas Paintings'}, price: 3500, dimensions: '120cm x 90cm', availability: 'In Stock' },
    { id: 'decor-8', partnerId: 'admin-user', imageUrl: "https://images.unsplash.com/photo-1531816434952-fb843331c1a3?q=75&w=1974&auto=format&fit=crop", alt: "Minimalist canvas painting", title: {ar: "لوحة كانفس بسيطة", en: "Minimalist Canvas Painting"}, category: {ar: 'لوحات كانفس', en: 'Canvas Paintings'}, price: 1800, dimensions: '80cm x 80cm', availability: 'Made to Order' },
    { id: 'decor-9', partnerId: 'admin-user', imageUrl: "https://images.unsplash.com/photo-1552573102-2b4f3a61b3c4?q=75&w=1974&auto=format&fit=crop", alt: "Colorful abstract art", title: {ar: "فن تجريدي ملون", en: "Colorful Abstract Art"}, category: {ar: 'لوحات كانفس', en: 'Canvas Paintings'}, price: 2750, dimensions: '90cm x 120cm', availability: 'In Stock' },

    // Antiques & Decor
    { id: 'decor-10', partnerId: 'admin-user', imageUrl: "https://images.unsplash.com/photo-1542641197-cdc1de658234?q=75&w=1974&auto=format&fit=crop", alt: "Vintage decorative items", title: {ar: "قطع ديكور كلاسيكية", en: "Vintage Decorative Items"}, category: {ar: 'تحف وديكورات', en: 'Antiques & Decor'}, price: 950, dimensions: 'Set of 3', availability: 'In Stock' },
    { id: 'decor-11', partnerId: 'admin-user', imageUrl: "https://images.unsplash.com/photo-1555864324-343d3d548f22?q=75&w=1974&auto=format&fit=crop", alt: "Elegant vase", title: {ar: "مزهرية أنيقة", en: "Elegant Vase"}, category: {ar: 'تحف وديكورات', en: 'Antiques & Decor'}, price: 1300, dimensions: '45cm height', availability: 'In Stock' },
    { id: 'decor-12', partnerId: 'admin-user', imageUrl: "https://images.unsplash.com/photo-1594951351419-61a7a4297858?q=75&w=1974&auto=format&fit=crop", alt: "Modern sculpture decor piece", title: {ar: "قطعة ديكور منحوتة عصرية", en: "Modern Sculpture Decor Piece"}, category: {ar: 'تحف وديكورات', en: 'Antiques & Decor'}, price: 2100, dimensions: '30cm x 30cm', availability: 'Made to Order' },
    { id: 'decor-13', partnerId: 'admin-user', imageUrl: "https://images.unsplash.com/photo-1617099222329-847d3c0b021a?q=75&w=1964&auto=format&fit=crop", alt: "Set of decorative vases", title: {ar: "مجموعة مزهريات ديكورية", en: "Set of Decorative Vases"}, category: {ar: 'تحف وديكورات', en: 'Antiques & Decor'}, price: 1650, dimensions: 'Various', availability: 'In Stock' }
];