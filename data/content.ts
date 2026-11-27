
import type { SiteContent } from '../types';
import { quotes } from './quotes';

export let siteContentData: SiteContent = {
  siteName: { ar: 'أونلي هيليو', en: 'ONLY HELIO' },
  logoUrl: '',
  locationPickerMapUrl: 'https://i.imgur.com/y6z7x5y.jpeg',
  topBanner: {
    enabled: true,
    content: {
        ar: 'نسخة تجريبية (Beta) - نسعد باستقبال ملاحظاتكم لتحسين تجربة الاستخدام.',
        en: 'Beta Version - We welcome your feedback to improve the user experience.'
    }
  },
  navigation: [
    { id: 'nav-home', href: '/', label: { ar: 'الرئيسية', en: 'Home' }, visible: true, order: 1, icon: 'HomeIcon', isEnd: true },
    { id: 'nav-properties', href: '/properties', label: { ar: 'العقارات', en: 'Properties' }, visible: true, order: 2, icon: 'BuildingIcon' },
    { id: 'nav-projects', href: '/projects', label: { ar: 'المشاريع', en: 'Projects' }, visible: true, order: 3, icon: 'CubeIcon' },
    { id: 'nav-finishing', href: '/finishing', label: { ar: 'التشطيبات', en: 'Finishing' }, visible: true, order: 4, icon: 'WrenchScrewdriverIcon' },
    { id: 'nav-decorations', href: '/decorations', label: { ar: 'الديكورات', en: 'Decorations' }, visible: true, order: 5, icon: 'SparklesIcon' },
    { id: 'nav-contact', href: '/contact', label: { ar: 'تواصل معنا', en: 'Contact Us' }, visible: true, order: 6, icon: 'PhoneIcon' },
  ],
  headerCta: {
    visible: true,
    text: { ar: 'انضم كشريك', en: 'Join as Partner' },
    link: '/register',
  },
  homeSections: [
    { id: 'hero', label: { ar: 'القسم الرئيسي (Hero)', en: 'Hero Section' }, enabled: true, order: 1 },
    { id: 'homeBanner', label: { ar: 'البانرات الإعلانية', en: 'Promotional Banners' }, enabled: true, order: 2 },
    { id: 'socialProof', label: { ar: 'الإثبات الاجتماعي والأرقام', en: 'Social Proof Stats' }, enabled: true, order: 3 },
    { id: 'services', label: { ar: 'خدماتنا', en: 'Services Overview' }, enabled: true, order: 4 },
    { id: 'whyNewHeliopolis', label: { ar: 'لماذا هليوبوليس الجديدة', en: 'Why New Heliopolis' }, enabled: true, order: 5 },
    { id: 'whyUs', label: { ar: 'لماذا تختارنا', en: 'Why Choose Us' }, enabled: true, order: 6 },
    { id: 'homeListings', label: { ar: 'أحدث العقارات', en: 'Latest Properties' }, enabled: true, order: 7 },
    { id: 'partners', label: { ar: 'الشركاء والمطورون', en: 'Partners & Developers' }, enabled: true, order: 8 },
    { id: 'testimonials', label: { ar: 'آراء العملاء', en: 'Testimonials' }, enabled: true, order: 9 },
    { id: 'homeCTA', label: { ar: 'الدعوة لاتخاذ إجراء (CTA)', en: 'Call to Action (CTA)' }, enabled: true, order: 10 },
  ],
  contactPage: {
    ar: {
      title: 'تواصل',
      subtitle: 'نحن هنا لمساعدتك. إذا كان لديك استفسار حول خدماتنا وعقاراتنا داخل هليوبوليس الجديدة، أو ترغب في بدء مشروع، لا تتردد في التواصل معنا.',
      formTitle: 'أرسل لنا رسالة',
      formDescription: '',
      contactInfoTitle: 'معلومات الاتصال',
      contactInfoDescription: '',
      addressTitle: 'العنوان',
      phoneTitle: 'الهاتف',
      emailTitle: 'البريد الإلكتروني',
      hoursTitle: 'ساعات العمل',
    },
    en: {
      title: 'Contact Us',
      subtitle: 'We are here to help. If you have any questions about our services and properties in New Heliopolis, or wish to start a project, feel free to contact us.',
      formTitle: 'Send us a message',
      formDescription: '',
      contactInfoTitle: 'Contact Information',
      contactInfoDescription: '',
      addressTitle: 'Address',
      phoneTitle: 'Phone',
      emailTitle: 'Email',
      hoursTitle: 'Working Hours',
    },
  },
  contactConfiguration: {
    routing: 'internal',
    targetEmail: 'admin@onlyhelio.com',
  },
  integrationConfiguration: {
      vercel: {
          accessToken: '',
          projectId: '',
          teamId: ''
      },
      supabase: {
          url: 'https://xyyvgpchkznznwbxbgrp.supabase.co',
          anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5eXZncGNoa3puem53YnhiZ3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTI1MDksImV4cCI6MjA4MTAyODUwOX0.1oRRd_bm3Ug9zXVR5Ae2xelGt0aN6uMP2rKpUu2AGVM',
          serviceRoleKey: ''
      },
      cloudinary: {
          cloudName: '',
          apiKey: '',
          apiSecret: '',
          uploadPreset: '',
          folder: 'onlyhelio'
      }
  },
  paymentConfiguration: {
      instapay: {
          enabled: true,
          number: '01012345678',
          walletName: 'OnlyHelio',
          paymentLink: '',
          qrCodeUrl: '',
          instructions: {
              ar: 'قم بالتحويل ثم ارفع صورة الإيصال للتأكيد.',
              en: 'Transfer amount then upload receipt for confirmation.'
          }
      },
      paymob: {
          enabled: false
      }
  },
  hero: {
      enabled: true,
      ar: { title: 'اكتشف هليوبوليس الجديدة', subtitle: 'استمتع بأسلوب حياة عصري ومتميز في قلب المدينة.' },
      en: { title: 'Discover New Heliopolis', subtitle: 'Experience a modern lifestyle in the heart of the city.' },
      images: [
          { src: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2070&auto=format&fit=crop', alt: { ar: 'فيلا حديثة', en: 'Modern Villa' } },
          { src: 'https://images.unsplash.com/photo-1600596542815-27bfefd0c3c6?q=80&w=2070&auto=format&fit=crop', alt: { ar: 'تصميم داخلي', en: 'Interior Design' } }
      ],
      primaryButton: {
          visible: true,
          text: { ar: 'تصفح العقارات', en: 'Browse Properties' },
          link: '/properties',
      },
      secondaryButton: {
          visible: true,
          text: { ar: 'أضف عقارك', en: 'List Your Property' },
          link: '/add-property',
      },
  },
  homeCTA: {
      enabled: true,
      ar: { title: 'جاهز لامتلاك منزلك؟', subtitle: 'تصفح العقارات المتاحة الآن.', button: 'تصفح الآن', link: '/properties' },
      en: { title: 'Ready to own your home?', subtitle: 'Browse available properties now.', button: 'Browse Now', link: '/properties' },
      secondaryButton: {
          visible: true,
          text: { ar: 'انضم كشريك', en: 'Join as Partner' },
          link: '/register',
      },
  },
  homeListings: {
      enabled: true,
      count: 4,
      ar: { title: 'أحدث العقارات' },
      en: { title: 'Latest Properties' },
      viewAllButton: {
          visible: true,
          text: { ar: 'عرض الكل', en: 'View All' },
          link: '/properties',
      },
  },
  whyUs: {
      ar: {
          title: 'لماذا تختارنا؟',
          description: 'نقدم لك أفضل الخدمات العقارية.',
          features: [
              { title: 'خبرة واسعة', description: 'سنوات من الخبرة في السوق.' },
              { title: 'أسعار تنافسية', description: 'أفضل الأسعار في السوق.' },
              { title: 'دعم متواصل', description: 'فريق دعم متاح 24/7.' },
              { title: 'مواقع مميزة', description: 'عقارات في أرقى المواقع.' }
          ]
      },
      en: {
          title: 'Why Choose Us?',
          description: 'We offer the best real estate services.',
          features: [
              { title: 'Extensive Experience', description: 'Years of market experience.' },
              { title: 'Competitive Prices', description: 'Best prices in the market.' },
              { title: 'Continuous Support', description: '24/7 support team.' },
              { title: 'Prime Locations', description: 'Properties in prime locations.' }
          ]
      },
      enabled: true
  },
  services: {
      enabled: true,
      ar: {
          title: 'خدماتنا',
          description: 'مجموعة شاملة من الخدمات.',
          features: [
              { title: 'بيع وشراء', description: 'نساعدك في بيع وشراء العقارات.', link: '/properties', icon: 'BuildingIcon' },
              { title: 'تشطيبات', description: 'خدمات تشطيب عالية الجودة.', link: '/finishing', icon: 'FinishingIcon' },
              { title: 'ديكورات', description: 'تصميمات ديكور مميزة.', link: '/decorations', icon: 'DecorationIcon' }
          ]
      },
      en: {
          title: 'Our Services',
          description: 'Comprehensive range of services.',
          features: [
              { title: 'Buying & Selling', description: 'We help you buy and sell properties.', link: '/properties', icon: 'BuildingIcon' },
              { title: 'Finishing', description: 'High quality finishing services.', link: '/finishing', icon: 'FinishingIcon' },
              { title: 'Decorations', description: 'Unique decoration designs.', link: '/decorations', icon: 'DecorationIcon' }
          ]
      }
  },
  partners: {
      enabled: true,
      ar: {
          title: 'شركاؤنا',
          description: 'نعمل مع أفضل الشركاء.',
          mega_projects_title: 'مشاريع كبرى',
          developers_title: 'مطورون',
          finishing_companies_title: 'شركات تشطيب',
          agencies_title: 'وكالات'
      },
      en: {
          title: 'Our Partners',
          description: 'We work with the best partners.',
          mega_projects_title: 'Mega Projects',
          developers_title: 'Developers',
          finishing_companies_title: 'Finishing Companies',
          agencies_title: 'Agencies'
      }
  },
  testimonials: {
      enabled: true,
      ar: {
          title: 'آراء العملاء',
          subtitle: 'نفتخر بثقة عملائنا ونسعد بمشاركتهم تجاربهم معنا.',
      },
      en: {
          title: 'Testimonials',
          subtitle: 'We are proud of our clients trust and happy to share their experiences.',
      },
      items: [
          {
              id: 't1',
              quote: {
                  ar: "تجربة ممتازة مع فريق أونلي هيليو. ساعدوني في العثور على فيلا أحلامي في الحي المتميز بسرعة واحترافية.",
                  en: "Excellent experience with the Only Helio team. They helped me find my dream villa in the Distinguished District quickly and professionally."
              },
              author: { ar: "محمد عبد الرحمن", en: "Mohamed Abdelrahman" },
              location: { ar: "هليوبوليس الجديدة", en: "New Heliopolis" }
          },
          {
              id: 't2',
              quote: {
                  ar: "خدمات التشطيب كانت رائعة. التصميم ثلاثي الأبعاد كان مطابقاً للتنفيذ تماماً. شكراً للمهندس المسؤول.",
                  en: "The finishing services were amazing. The 3D design matched the execution perfectly. Thanks to the engineer in charge."
              },
              author: { ar: "سارة الشريف", en: "Sarah El-Sherif" },
              location: { ar: "كمبوند تلالا", en: "Talala Compound" }
          },
          {
              id: 't3',
              quote: {
                  ar: "اشتريت قطعة أرض عن طريق الموقع، الإجراءات كانت شفافة وواضحة جداً. أنصح بالتعامل معهم.",
                  en: "I bought a plot of land through the site, the procedures were very transparent and clear. I recommend dealing with them."
              },
              author: { ar: "د. يوسف كمال", en: "Dr. Youssef Kamal" },
              location: { ar: "القاهرة", en: "Cairo" }
          }
      ]
  },
  socialProof: {
      enabled: true,
      stats: [
          { value: '100+', name: { ar: 'عقار', en: 'Properties' } },
          { value: '50+', name: { ar: 'شريك', en: 'Partners' } },
          { value: '1000+', name: { ar: 'عميل', en: 'Clients' } },
          { value: '5', name: { ar: 'سنوات خبرة', en: 'Years Experience' } }
      ]
  },
  whyNewHeliopolis: {
      enabled: true,
      ar: {
          title: 'لماذا هليوبوليس الجديدة؟',
          location: {
              title: 'موقع استراتيجي',
              description: 'تقع في موقع متميز.',
              stats: [
                  { value: '10 كم', desc: 'من العاصمة الإدارية' },
                  { value: '15 دقيقة', desc: 'من المطار' }
              ]
          }
      },
      en: {
          title: 'Why New Heliopolis?',
          location: {
              title: 'Strategic Location',
              description: 'Located in a prime location.',
              stats: [
                  { value: '10 km', desc: 'From New Capital' },
                  { value: '15 min', desc: 'From Airport' }
              ]
          }
      },
      images: [
          { src: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2144&auto=format&fit=crop', alt: { ar: 'صورة المدينة', en: 'City Image' } }
      ]
  },
  // Use the rich quotes array from data/quotes.ts
  quotes: quotes,
  footer: {
      ar: {
          description: 'منصة عقارية متكاملة.',
          address: 'هليوبوليس الجديدة، الحي السادس',
          hours: 'السبت - الخميس: 9 ص - 5 م'
      },
      en: {
          description: 'Integrated real estate platform.',
          address: 'New Heliopolis, 6th District',
          hours: 'Sat - Thu: 9 AM - 5 PM'
      },
      email: 'info@onlyhelio.com',
      phone: '01000000000',
      isWhatsAppOnly: false,
      copyright: { ar: 'جميع الحقوق محفوظة 2024', en: 'All rights reserved 2024' },
      feedbackText: { ar: 'أرسل ملاحظاتك', en: 'Send Feedback' },
      social: {
          facebook: 'https://facebook.com',
          twitter: 'https://twitter.com',
          instagram: 'https://instagram.com',
          linkedin: 'https://linkedin.com'
      }
  },
  finishingServices: [
      {
          id: 'fs-consultation',
          title: { ar: "الاستشارة ووضع التصور", en: "Consultation & Concept" },
          description: { 
              ar: "جلسات استشارية معمقة مع مهندسينا لفهم رؤيتك ومتطلباتك، نترجمها إلى تصورات مبدئية مبتكرة للتصميم الداخلي مع تقديم مقايسات تقديرية دقيقة للتكاليف وخيارات المواد.", 
              en: "In-depth consultation sessions with our engineers to understand your vision and requirements, translating them into innovative initial interior design concepts with accurate cost estimates." 
          },
          category: 'consultation',
          pricingModel: 'fixed_package',
          basePrice: 1500,
          currency: 'EGP',
          displayOrder: 1,
          isActive: true,
          pricingTiers: [
              { id: 'tier-c1', unitType: { ar: "مكالمة استشارية أولية", en: "Initial Consultation Call" }, areaRange: { ar: "حتى 1 ساعة", en: "Up to 1 hour" }, price: 0, priceModel: 'fixed_package' },
              { id: 'tier-c2', unitType: { ar: "زيارة معاينة ميدانية", en: "Site Visit" }, areaRange: { ar: "القاهرة والجيزة", en: "Cairo & Giza" }, price: 1500, priceModel: 'fixed_package' },
              { id: 'tier-c3', unitType: { ar: "تصميم Moodboard", en: "Moodboard Design" }, areaRange: { ar: "لكل غرفة", en: "Per Room" }, price: 2500, priceModel: 'fixed_package' }
          ],
          features: [
              { ar: "معاينة هندسية دقيقة للموقع", en: "Precise engineering survey", included: true },
              { ar: "مقايسة تكاليف مبدئية شفافة", en: "Transparent cost estimate", included: true },
              { ar: "مقترحات وتوزيعات للفراغات", en: "Space planning proposals", included: true }
          ]
      },
      {
          id: 'fs-3d-design',
          title: { ar: "التصميم ثلاثي الأبعاد (3D)", en: "3D Design & Visualization" },
          description: { 
              ar: "تصميمات واقعية ثلاثية الأبعاد تتيح لك رؤية منزلك قبل التنفيذ، مع توزيع الإضاءة والأثاث والألوان، ومخططات تنفيذية شاملة.", 
              en: "Realistic 3D designs allowing you to see your home before execution, including lighting, furniture, and colors, with comprehensive executive plans." 
          },
          category: 'architectural',
          pricingModel: 'per_sqm',
          basePrice: 150,
          currency: 'EGP',
          displayOrder: 2,
          isActive: true,
          pricingTiers: [
              { id: 'tier-3d-1', unitType: { ar: "شقة", en: "Apartment" }, areaRange: { ar: "حتى 150 متر", en: "Up to 150m" }, price: 15000, priceModel: 'fixed_package' },
              { id: 'tier-3d-2', unitType: { ar: "شقة كبيرة / دوبلكس", en: "Large Apt / Duplex" }, areaRange: { ar: "150 - 250 متر", en: "150 - 250m" }, price: 25000, priceModel: 'fixed_package' },
              { id: 'tier-3d-3', unitType: { ar: "فيلا", en: "Villa" }, areaRange: { ar: "أكبر من 250 متر", en: "Above 250m" }, price: 40000, priceModel: 'fixed_package' }
          ],
          features: [
              { ar: "لقطات ثلاثية الأبعاد واقعية لكل فراغ", en: "Realistic 3D renders for every space", included: true },
              { ar: "مخططات تنفيذية تفصيلية للكهرباء والسباكة", en: "Executive MEP drawings", included: true },
              { ar: "قائمة توصيف الخامات وأكواد الدهانات", en: "Material & paint specification sheet", included: true }
          ]
      },
      {
          id: 'fs-turnkey',
          title: { ar: "التنفيذ والإشراف الكامل (Turnkey)", en: "Turnkey Execution" },
          description: { 
              ar: "تولي مسؤولية التنفيذ بالكامل من الألف إلى الياء، مع ضمان الجودة والالتزام بالمواعيد والميزانية، وتسليم المفتاح.", 
              en: "Full execution responsibility from A to Z, ensuring quality, deadlines, and budget adherence, delivering turn-key." 
          },
          category: 'turnkey',
          pricingModel: 'per_sqm',
          basePrice: 4500,
          currency: 'EGP',
          displayOrder: 3,
          isActive: true,
          pricingTiers: [
              { id: 'tier-tk-1', unitType: { ar: "تشطيب اقتصادي", en: "Economic Finishing" }, areaRange: { ar: "سعر المتر", en: "Price per Meter" }, price: 4500, priceModel: 'per_sqm' },
              { id: 'tier-tk-2', unitType: { ar: "تشطيب سوبر لوكس", en: "Super Lux Finishing" }, areaRange: { ar: "سعر المتر", en: "Price per Meter" }, price: 7500, priceModel: 'per_sqm' },
              { id: 'tier-tk-3', unitType: { ar: "تشطيب فندقي / الترا", en: "Ultra / Hotel Finishing" }, areaRange: { ar: "سعر المتر", en: "Price per Meter" }, price: 12000, priceModel: 'per_sqm' }
          ],
          features: [
              { ar: "إشراف هندسي مستمر وتقارير دورية", en: "Continuous engineering supervision & reports", included: true },
              { ar: "ضمان تعاقدي شامل لمدة سنتين", en: "2-year comprehensive contractual warranty", included: true },
              { ar: "التزام صارم بالجدول الزمني وغرامة تأخير", en: "Strict schedule commitment with penalty clauses", included: true }
          ]
      }
    ],
  finishingPage: {
      heroImageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?fm=webp&q=75&w=1600&auto=format&fit=crop',
      heroButtonLink: '/request-service',
      ctaLink: '/request-service',
      ar: {
          heroTitle: "مهندسون وشركات تشطيب في مكان واحد",
          heroSubtitle: "تصفح المهندسين المستقلين وشركات التشطيب المعتمدين على المنصة، قارن أعمالهم، واطلب عرض سعر مباشرة من مقدم الخدمة المناسب لك.",
          heroButton: "تصفح مقدمي خدمات التشطيب",
          servicesTitle: "اختر نوع الخدمة",
          servicesSubtitle: "تحت كل فئة تجد مقدمي الخدمة المعتمدين لها. كل مقدم خدمة يحدد عرضه وسعره ويتعاقد وينفّذ بنفسه.",
          servicesIntro: "دور المنصة عرض مقدمي الخدمة واستقبال طلبك وتوجيهه ومتابعته.",
          requestButton: "اطلب عرضًا من مقدم الخدمة",
          partnerCompaniesTitle: "مقدمو خدمات التشطيب",
          partnerCompaniesSubtitle: "مهندسون مستقلون وشركات معتمدون على المنصة.",
          serviceProvidersTitle: "مقدمو الخدمة",
          serviceProvidersSubtitle: "اطلب عرضًا مباشرة من مقدم الخدمة.",
          ctaTitle: "مش متأكد تبدأ منين؟",
          ctaSubtitle: "ابدأ بفئة الاستشارة ووضع التصور، أو استخدم الحاسبة للحصول على تقدير استرشادي قبل طلب العروض.",
          ctaButton: "تصفح مقدمي خدمات التشطيب",
      },
      en: {
          heroTitle: "Finishing engineers and companies in one place",
          heroSubtitle: "Browse independent engineers and finishing companies approved on the platform, compare their work, and request a quote directly from the provider that fits you.",
          heroButton: "Browse finishing providers",
          servicesTitle: "Choose a service type",
          servicesSubtitle: "Each category lists the providers approved for it. Every provider sets its own offer and price, contracts and executes the work itself.",
          servicesIntro: "The platform lists providers and receives, routes and follows up on your request.",
          requestButton: "Request a quote from this provider",
          partnerCompaniesTitle: "Finishing service providers",
          partnerCompaniesSubtitle: "Independent engineers and companies approved on the platform.",
          serviceProvidersTitle: "Service providers",
          serviceProvidersSubtitle: "Request a quote directly from a provider.",
          ctaTitle: "Not sure where to start?",
          ctaSubtitle: "Start with the consultation & concept category, or use the calculator for an indicative estimate before requesting quotes.",
          ctaButton: "Browse finishing providers",
      }
  },
  decorationsPage: {
      heroImageUrl: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?fm=webp&q=75&w=1600&auto=format&fit=crop',
      customRequestLink: '/request-service',
      ar: {
          heroTitle: 'إبداعات فنية تزين جدرانك',
          heroSubtitle: 'نصمم وننفذ منحوتات فنية مباشرة على الجدران لتحويلها إلى قطعة فنية فريدة. استلهم من أعمالنا أو زودنا بفكرتك الخاصة لنحولها إلى واقع.',
          sculptures_desc: 'نصمم وننفذ منحوتات فنية مباشرة على الجدران لتحويلها إلى قطعة فنية فريدة. استلهم من أعمالنا أو زودنا بفكرتك الخاصة لنحولها إلى واقع.',
          paintings_desc: 'مجموعة فريدة من اللوحات الفنية التي تناسب جميع الأذواق والمساحات، منفذة بأيدي فنانين محترفين.',
          antiques_desc: 'تشكيلة مختارة من التحف وقطع الديكور التي تضيف لمسة من الأناقة والفخامة لمساحتك.',
          customRequestButton: 'اطلب تصميم خاص',
      },
      en: {
          heroTitle: 'Artistic Creations to Adorn Your Walls',
          heroSubtitle: 'We design and create art sculptures directly on walls to turn them into unique masterpieces. Get inspired by our work or provide your own idea to bring it to life.',
          sculptures_desc: 'We design and execute art sculptures directly on walls to transform them into unique masterpieces. Get inspired by our work or provide your own idea to bring it to life.',
          paintings_desc: 'A unique collection of art paintings to suit all tastes and spaces, created by professional artists.',
          antiques_desc: 'A curated selection of antiques and decor pieces that add a touch of elegance and luxury to your space.',
          customRequestButton: 'Request Custom Design',
      }
  }
};
