import type { SiteContent } from '../types';

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
          url: '',
          anonKey: '',
          serviceRoleKey: ''
      },
      cloudinary: {
          cloudName: '',
          apiKey: '',
          apiSecret: ''
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
      ar: { title: 'اكتشف هليوبوليس الجديدة', subtitle: 'استمتع بأسلوب حياة عصري ومتميز في قلب المدينة.' },
      en: { title: 'Discover New Heliopolis', subtitle: 'Experience a modern lifestyle in the heart of the city.' },
      images: [
          { src: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2070&auto=format&fit=crop', alt: { ar: 'فيلا حديثة', en: 'Modern Villa' } },
          { src: 'https://images.unsplash.com/photo-1600596542815-27bfefd0c3c6?q=80&w=2070&auto=format&fit=crop', alt: { ar: 'تصميم داخلي', en: 'Interior Design' } }
      ]
  },
  homeCTA: {
      enabled: true,
      ar: { title: 'جاهز لامتلاك منزلك؟', subtitle: 'تصفح العقارات المتاحة الآن.', button: 'تصفح الآن', link: '/properties' },
      en: { title: 'Ready to own your home?', subtitle: 'Browse available properties now.', button: 'Browse Now', link: '/properties' }
  },
  homeListings: {
      enabled: true,
      count: 4,
      ar: { title: 'أحدث العقارات' },
      en: { title: 'Latest Properties' }
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
  quotes: [
      { quote: { ar: 'المنزل هو حيث يبدأ القلب.', en: 'Home is where the heart starts.' }, author: { ar: 'مجهول', en: 'Unknown' } }
  ],
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
          title: { ar: "الاستشارة ووضع التصور", en: "Consultation & Concept" },
          description: { 
              ar: "جلسات استشارية معمقة مع مهندسينا لفهم رؤيتك ومتطلباتك، نترجمها إلى تصورات مبدئية مبتكرة للتصميم الداخلي مع تقديم مقايسات تقديرية دقيقة للتكاليف وخيارات المواد.", 
              en: "In-depth consultation sessions with our engineers to understand your vision and requirements, translating them into innovative initial interior design concepts with accurate cost estimates and material options." 
          },
          pricingTiers: [
              { unitType: { ar: "مكالمة استشارية أولية", en: "Initial Consultation Call" }, areaRange: { ar: "جلسة أونلاين (60 دقيقة)", en: "Online Session (60 mins)" }, price: 1500 },
              { unitType: { ar: "زيارة موقع واستشارة", en: "Site Visit & Consultation" }, areaRange: { ar: "جلسة في الموقع (3 ساعات)", en: "On-site Session (3 hours)" }, price: 4000 },
              { unitType: { ar: "ورشة عمل وتخطيط", en: "Planning Workshop" }, areaRange: { ar: "يوم كامل (موقع/مكتب)", en: "Full Day (Site/Office)" }, price: 10000 }
          ]
      },
      {
          title: { ar: "التصميم ثلاثي الأبعاد", en: "3D Design" },
          description: { 
              ar: "نحول التصور المبدئي إلى تصميم ثلاثي الأبعاد واقعي وتفاعلي، مما يسمح لك بالتجول افتراضيًا في منزلك المستقبلي وتعديل التفاصيل قبل البدء في أي أعمال تنفيذ.", 
              en: "We turn the initial concept into a realistic and interactive 3D design, allowing you to virtually tour your future home and adjust details before starting any execution works." 
          },
          pricingTiers: [
              { unitType: { ar: "شقة", en: "Apartment" }, areaRange: { ar: "حتى 150 م²", en: "Up to 150 m²" }, price: 15000 },
              { unitType: { ar: "شقة", en: "Apartment" }, areaRange: { ar: "151 - 250 م²", en: "151 - 250 m²" }, price: 20000 },
              { unitType: { ar: "فيلا", en: "Villa" }, areaRange: { ar: "حتى 300 م²", en: "Up to 300 m²" }, price: 30000 },
              { unitType: { ar: "فيلا", en: "Villa" }, areaRange: { ar: "أكثر من 300 م²", en: "More than 300 m²" }, price: 45000 }
          ]
      },
      {
          title: { ar: "التنفيذ والتشطيب (Turnkey)", en: "Turnkey Construction" },
          description: { 
              ar: "تولي كامل لعملية التنفيذ والتشطيب بأعلى معايير الجودة. نقوم بإدارة الموقع، توريد الخامات، والإشراف الهندسي الكامل لتسليم مفتاح.", 
              en: "Complete management of the execution and finishing process with the highest quality standards. We handle site management, material supply, and full engineering supervision for a turnkey delivery." 
          },
          pricingTiers: [
              { unitType: { ar: "تشطيب اقتصادي", en: "Economic Finishing" }, areaRange: { ar: "سعر المتر (تقريبي)", en: "Per Meter (Approx)" }, price: 5000 },
              { unitType: { ar: "تشطيب متميز", en: "Premium Finishing" }, areaRange: { ar: "سعر المتر (تقريبي)", en: "Per Meter (Approx)" }, price: 8500 },
              { unitType: { ar: "تشطيب فاخر", en: "Luxury Finishing" }, areaRange: { ar: "سعر المتر (تقريبي)", en: "Per Meter (Approx)" }, price: 12000 }
          ]
      }
  ],
  projectsPage: {
      ar: { title: 'المشاريع', subtitle: 'تصفح أحدث المشاريع.' },
      en: { title: 'Projects', subtitle: 'Browse latest projects.' }
  },
  finishingPage: {
      ar: {
          heroTitle: 'تشطيبات',
          heroSubtitle: 'خدمات تشطيب متكاملة.',
          servicesTitle: 'خدماتنا',
          servicesSubtitle: 'ما نقدمه لك.',
          servicesIntro: 'نقدم خدمات متنوعة.',
          partnerCompaniesTitle: 'شركاؤنا',
          partnerCompaniesSubtitle: 'نعمل مع الأفضل.',
          serviceProvidersTitle: 'مقدمو الخدمات',
          serviceProvidersSubtitle: 'تواصل معهم مباشرة.',
          ctaTitle: 'ابدأ مشروعك',
          ctaSubtitle: 'تواصل معنا الآن.',
          ctaButton: 'اتصل بنا'
      },
      en: {
          heroTitle: 'Finishing',
          heroSubtitle: 'Integrated finishing services.',
          servicesTitle: 'Our Services',
          servicesSubtitle: 'What we offer.',
          servicesIntro: 'We offer diverse services.',
          partnerCompaniesTitle: 'Our Partners',
          partnerCompaniesSubtitle: 'We work with the best.',
          serviceProvidersTitle: 'Service Providers',
          serviceProvidersSubtitle: 'Contact them directly.',
          ctaTitle: 'Start Your Project',
          ctaSubtitle: 'Contact us now.',
          ctaButton: 'Contact Us'
      }
  },
  decorationsPage: {
      ar: {
          heroTitle: 'ديكورات',
          heroSubtitle: 'أضف لمسة جمالية.',
          sculptures_desc: 'منحوتات فنية.',
          paintings_desc: 'لوحات فنية.',
          antiques_desc: 'تحف وانتيكات.'
      },
      en: {
          heroTitle: 'Decorations',
          heroSubtitle: 'Add an aesthetic touch.',
          sculptures_desc: 'Art sculptures.',
          paintings_desc: 'Art paintings.',
          antiques_desc: 'Antiques.'
      }
  },
  privacyPolicy: {
      ar: { title: 'سياسة الخصوصية', lastUpdated: '2024', sections: [] },
      en: { title: 'Privacy Policy', lastUpdated: '2024', sections: [] }
  },
  termsOfUse: {
      ar: { title: 'شروط الاستخدام', lastUpdated: '2024', sections: [] },
      en: { title: 'Terms of Use', lastUpdated: '2024', sections: [] }
  }
};