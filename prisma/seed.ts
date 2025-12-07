
import { propertiesData } from '../data/properties';
import { partnersData } from '../data/partners';
import { projectsData } from '../data/projects';
import { portfolioData } from '../data/portfolio';
import { decorationCategoriesData } from '../data/decorationCategories';
import {
    propertyTypesData,
    finishingStatusesData,
    amenitiesData,
} from '../data/filterOptions';
import { siteContentData } from '../data/content';
import { bannersData } from '../data/banners';
import { leadsData } from '../data/leads';
import { requestsData } from '../data/requests';
import { arTranslations, enTranslations } from '../data/translations';

// @ts-ignore
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  console.log('Deleting existing data...');
  // Delete in an order that respects foreign key constraints
  await prisma.notification.deleteMany();
  await prisma.leadMessage.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.request.deleteMany();
  await prisma.amenityOnProperty.deleteMany();
  await prisma.property.deleteMany();
  await prisma.project.deleteMany();
  await prisma.portfolioItem.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.propertyType.deleteMany();
  await prisma.finishingStatus.deleteMany();
  await prisma.decorationCategory.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.siteContent.deleteMany();

  console.log('Seeding lookup tables...');
  await prisma.propertyType.createMany({
    data: propertyTypesData.map((pt) => ({
      id: pt.id,
      name_en: pt.en,
      name_ar: pt.ar,
    })),
  });

  await prisma.finishingStatus.createMany({
    data: finishingStatusesData.map((fs) => ({
      id: fs.id,
      name_en: fs.en,
      name_ar: fs.ar,
      applicableTo: fs.applicableTo,
    })),
  });

  await prisma.amenity.createMany({
    data: amenitiesData.map((a) => ({
      id: a.id,
      name_en: a.en,
      name_ar: a.ar,
      applicableTo: a.applicableTo,
    })),
  });

  await prisma.decorationCategory.createMany({
      data: decorationCategoriesData.map(dc => ({
          id: dc.id,
          name_en: dc.name.en,
          name_ar: dc.name.ar,
          description_en: dc.description.en,
          description_ar: dc.description.ar,
      }))
  });

  console.log('Seeding partners...');
  await prisma.partner.createMany({
    data: partnersData.map((p) => {
      const enInfo = (enTranslations.partnerInfo as any)[p.id];
      const arInfo = (arTranslations.partnerInfo as any)[p.id];
      return {
        id: p.id,
        email: p.email,
        password: (p as any).password || 'password', // Safe access to password
        imageUrl: p.imageUrl,
        type: p.type,
        status: p.status,
        subscriptionPlan: p.subscriptionPlan,
        subscriptionEndDate: p.subscriptionEndDate ? new Date(p.subscriptionEndDate) : null,
        displayType: p.displayType,
        name_en: enInfo?.name || p.id,
        name_ar: arInfo?.name || p.id,
        description_en: enInfo?.description || '',
        description_ar: arInfo?.description || '',
        contactMethods: p.contactMethods ? JSON.stringify(p.contactMethods) : '{}',
      };
    }),
  });
  
  console.log('Seeding projects...');
  await prisma.project.createMany({
    data: projectsData.map((p) => ({
      id: p.id,
      partnerId: p.partnerId,
      name_en: p.name.en,
      name_ar: p.name.ar,
      description_en: p.description.en,
      description_ar: p.description.ar,
      imageUrl: p.imageUrl,
      createdAt: new Date(p.createdAt),
      features: JSON.stringify(p.features),
    })),
  });
  
  console.log('Seeding properties...');
  for (const prop of propertiesData) {
    await prisma.property.create({
      data: {
        id: prop.id,
        partnerId: prop.partnerId,
        projectId: prop.projectId,
        imageUrl: prop.imageUrl,
        gallery: prop.gallery,
        status_en: prop.status.en,
        status_ar: prop.status.ar,
        price_en: prop.price.en,
        price_ar: prop.price.ar,
        priceNumeric: prop.priceNumeric,
        type_en: prop.type.en,
        type_ar: prop.type.ar,
        title_en: prop.title.en,
        title_ar: prop.title.ar,
        address_en: prop.address.en,
        address_ar: prop.address.ar,
        description_en: prop.description.en,
        description_ar: prop.description.ar,
        beds: prop.beds,
        baths: prop.baths,
        area: prop.area,
        floor: prop.floor,
        finishingStatus_en: prop.finishingStatus?.en,
        finishingStatus_ar: prop.finishingStatus?.ar,
        installmentsAvailable: prop.installmentsAvailable,
        isInCompound: prop.isInCompound,
        realEstateFinanceAvailable: prop.realEstateFinanceAvailable,
        deliveryImmediate: prop.delivery.isImmediate,
        deliveryDate: prop.delivery.date ? new Date(prop.delivery.date) : null,
        installments: prop.installments ? JSON.stringify(prop.installments) : null,
        location: JSON.stringify(prop.location),
        listingStartDate: prop.listingStartDate ? new Date(prop.listingStartDate) : null,
        listingStatus: prop.listingStatus,
        contactMethod: prop.contactMethod,
        ownerPhone: prop.ownerPhone,
        amenities: {
          create: (prop.amenities?.en || []).map(amenityName => {
            const amenity = amenitiesData.find(a => a.en === amenityName);
            if (!amenity) {
              throw new Error(`Amenity not found: ${amenityName} for property ${prop.id}`);
            }
            return {
              amenity: {
                connect: { id: amenity.id }
              }
            };
          })
        }
      },
    });
  }
  
  console.log('Seeding portfolio items...');
  await prisma.portfolioItem.createMany({
    data: portfolioData.map(item => ({
        id: item.id,
        partnerId: item.partnerId,
        imageUrl: item.imageUrl,
        alt: item.alt,
        title_en: item.title.en,
        title_ar: item.title.ar,
        category_en: item.category.en,
        category_ar: item.category.ar,
        price: item.price,
        dimensions: item.dimensions,
        availability: item.availability,
    }))
  });
  
  console.log('Seeding banners...');
  await prisma.banner.createMany({
    data: bannersData.map(b => ({
      id: b.id,
      title: b.title,
      imageUrl: b.imageUrl,
      link: b.link,
      locations: b.locations,
      status: b.status,
      startDate: b.startDate ? new Date(b.startDate) : null,
      endDate: b.endDate ? new Date(b.endDate) : null,
    }))
  });

  console.log('Seeding site content...');
  const { quotes, ...restOfSiteContent } = siteContentData;
  await prisma.siteContent.create({
      data: {
          id: 'main_content',
          content: JSON.stringify(restOfSiteContent),
      }
  });

  await prisma.quote.createMany({
      data: quotes.map(q => ({
          quote_en: q.quote.en,
          quote_ar: q.quote.ar,
          author_en: q.author.en,
          author_ar: q.author.ar,
      }))
  });
  
  console.log('Seeding leads...');
  await prisma.lead.createMany({
      data: leadsData.map(lead => ({
          id: lead.id,
          partnerId: lead.partnerId,
          managerId: lead.managerId,
          propertyId: lead.propertyId,
          customerName: lead.customerName,
          customerPhone: lead.customerPhone,
          contactTime: lead.contactTime,
          serviceTitle: lead.serviceTitle,
          customerNotes: lead.customerNotes,
          status: lead.status,
          createdAt: new Date(lead.createdAt),
          updatedAt: new Date(lead.updatedAt),
          serviceType: lead.serviceType,
          assignedTo: lead.assignedTo,
      }))
  });
  
  for (const lead of leadsData) {
      if (lead.messages && lead.messages.length > 0) {
          await prisma.leadMessage.createMany({
              data: lead.messages.map(msg => ({
                  id: msg.id,
                  leadId: lead.id,
                  sender: msg.sender,
                  senderId: msg.senderId,
                  type: msg.type,
                  content: msg.content,
                  timestamp: new Date(msg.timestamp)
              }))
          });
      }
  }

  console.log('Seeding requests...');
  await prisma.request.createMany({
    data: requestsData.map(req => ({
      id: req.id,
      type: req.type,
      requesterInfo: JSON.stringify(req.requesterInfo),
      payload: JSON.stringify(req.payload),
      status: req.status,
      assignedTo: req.assignedTo,
      createdAt: new Date(req.createdAt),
      updatedAt: req.updatedAt ? new Date(req.updatedAt) : null,
    }))
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    (process as any).exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });