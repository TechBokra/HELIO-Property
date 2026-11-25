
import React from 'react';
import { Link } from 'react-router-dom';
import { Request, RequestType } from '../../../types';
import DetailItem from '../../shared/DetailItem';
import { useLanguage } from '../../shared/LanguageContext';
import { normalizeBilingualText, resolvePropertyReferenceCode } from '../../../utils/propertyFormShared';

interface RequestPayloadViewerProps {
    request: Request;
}

const RequestPayloadViewer: React.FC<RequestPayloadViewerProps> = ({ request }) => {
    const { language, t } = useLanguage();
    const t_admin = t.adminDashboard.adminRequests;

    const { payload, type } = request;

    switch (type) {
        case RequestType.PARTNER_APPLICATION:
            const p = payload as any;
            return (
                <div className="space-y-4 animate-fadeIn">
                    <DetailItem label="Company" value={p.companyName} />
                    <DetailItem label="Type" value={p.companyType} />
                    <DetailItem label="Website" value={p.website ? <a href={p.website} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{p.website}</a> : 'N/A'} />
                    <DetailItem label="Address" value={p.companyAddress} />
                    <DetailItem label="Description" value={<p className="whitespace-pre-line">{p.description}</p>} />
                    
                    {p.managementContacts && p.managementContacts.length > 0 && (
                         <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                            <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Management Contacts</h5>
                            <ul className="space-y-2">
                                {p.managementContacts.map((contact: any, idx: number) => (
                                    <li key={idx} className="text-sm">
                                        <span className="font-semibold">{contact.name}</span> ({contact.position}) - {contact.email}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {p.documents && p.documents.length > 0 && (
                        <div className="mt-4">
                            <p className="text-sm font-medium text-gray-500 mb-2">{t_admin.table.documents}</p>
                            <ul className="list-disc list-inside text-sm text-blue-600">
                                {p.documents.map((doc: any, i: number) => (
                                    <li key={i}><a href={doc.fileContent} download={doc.fileName}>{doc.fileName}</a></li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            );

        case RequestType.PROPERTY_LISTING_REQUEST:
            const r = payload as any;
            const pd = r.propertyDetails;
            
            if (!pd) return <div className="text-red-500">Missing property details</div>;
            const descObj = normalizeBilingualText(pd.description);
            const addressObj = normalizeBilingualText(pd.address);

            return (
                <div className="space-y-6 animate-fadeIn">
                    {r.createdPropertyId && (
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                                {language === 'ar' ? 'مسودة العقار المرتبطة:' : 'Linked Draft Property:'}{' '}
                                <span className="font-mono font-bold">
                                    {resolvePropertyReferenceCode(r.createdPropertyId, r.createdPropertyReference)}
                                </span>
                            </div>
                            <Link
                                to={`/admin/properties/edit/${r.createdPropertyId}`}
                                className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline"
                            >
                                {language === 'ar' ? 'فتح المسودة ←' : 'Open Draft →'}
                            </Link>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailItem label="Property Type" value={pd.propertyType?.[language] || pd.propertyType?.en || pd.propertyType || 'N/A'} />
                        <DetailItem label="Purpose" value={pd.purpose?.[language] || pd.purpose?.en || 'N/A'} />
                        <DetailItem label="Area" value={`${pd.area || 0} m²`} />
                        <DetailItem label="Price" value={`EGP ${Number(pd.price || 0).toLocaleString()}`} />
                        <DetailItem label="Finishing" value={pd.finishingStatus?.[language] || pd.finishingStatus?.en || pd.finishingStatus || 'N/A'} />
                        <DetailItem label="Cooperation" value={r.cooperationType} />
                    </div>
                    
                    <DetailItem label="Address" value={addressObj[language] || addressObj.ar || addressObj.en || 'N/A'} />
                    <DetailItem label="Description" value={<p className="whitespace-pre-line text-sm">{descObj[language] || descObj.ar || descObj.en || '—'}</p>} />

                    {r.images && r.images.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-2">Images</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {r.images.map((img: string, idx: number) => (
                                    <a key={idx} href={img} target="_blank" rel="noreferrer" className="block aspect-video">
                                        <img src={img} alt={`Property ${idx + 1}`} className="w-full h-full object-cover rounded-md border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );

        case RequestType.LEAD:
            const l = payload as any;
            return (
                <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailItem label="Service Type" value={l.serviceType} />
                        {(l.workItemReference || l.serviceReference) && (
                            <DetailItem
                                label={language === 'ar' ? 'مرجع العنصر / الخدمة' : 'Item / Service Reference'}
                                value={<span className="font-mono font-bold text-amber-700 dark:text-amber-400">{l.workItemReference || l.serviceReference}</span>}
                            />
                        )}
                        {l.propertyReference && (
                            <DetailItem
                                label={language === 'ar' ? 'مرجع العقار' : 'Property Reference'}
                                value={<span className="font-mono font-bold text-blue-700 dark:text-blue-400">{l.propertyReference}</span>}
                            />
                        )}
                        <DetailItem label={language === 'ar' ? 'الشريك المرتبط' : 'Partner'} value={l.partnerName || l.partnerId} />
                        <DetailItem label="Manager ID" value={l.managerId || 'N/A'} />
                        <DetailItem label="Preferred Time" value={l.contactTime} />
                        {l.tierId && <DetailItem label="Tier ID" value={<span className="font-mono">{l.tierId}</span>} />}
                        {l.workItemTitle && <DetailItem label={language === 'ar' ? 'العمل المرجعي' : 'Reference Work'} value={l.workItemTitle} />}
                        {(l.categoryName || l.itemCategory) && (
                            <DetailItem
                                label={language === 'ar' ? 'التصنيف' : 'Category'}
                                value={l.categoryName || t.formOptions?.[l.itemCategory] || l.itemCategory}
                                className="capitalize"
                            />
                        )}
                        {l.workItemPrice != null && <DetailItem label={language === 'ar' ? 'السعر المرجعي' : 'Reference Price'} value={`${Number(l.workItemPrice).toLocaleString()} EGP`} />}
                        {l.dimensions && <DetailItem label="Dimensions" value={l.dimensions} />}
                    </div>
                    
                    <DetailItem label="Service Title" value={l.serviceTitle} />
                    
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-md border border-yellow-200 dark:border-yellow-800/30">
                        <DetailItem label="Initial Customer Notes" value={l.customerNotes || 'No notes provided.'} />
                    </div>
                    
                    {l.referenceImage && (
                         <div className="mt-4">
                            <p className="text-sm font-medium text-gray-500 mb-2">Reference Image</p>
                            <div className="w-full max-w-xs rounded-lg overflow-hidden border border-gray-200">
                                <a href={l.referenceImage} target="_blank" rel="noreferrer">
                                    <img src={l.referenceImage} alt="Ref" className="w-full object-cover" />
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            );

        case RequestType.CONTACT_MESSAGE:
             const c = payload as any;
             return (
                 <div className="space-y-4 animate-fadeIn">
                     <DetailItem label="Inquiry Type" value={c.inquiryType} />
                     {c.companyName && <DetailItem label="Company Name" value={c.companyName} />}
                     {c.businessType && <DetailItem label="Business Type" value={c.businessType} />}
                     <div className="pt-2">
                        <p className="text-sm font-medium text-gray-500 mb-1">Message</p>
                        <p className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 whitespace-pre-line">{c.message}</p>
                     </div>
                 </div>
             );

        case RequestType.PROPERTY_INQUIRY:
            const i = payload as any;
            return (
                <div className="space-y-4 animate-fadeIn">
                    <DetailItem label="Inquiry Details" value={<p className="whitespace-pre-line">{i.details}</p>} />
                </div>
            );

        default:
            return (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md font-mono text-xs overflow-auto max-h-60">
                    <pre>{JSON.stringify(payload, null, 2)}</pre>
                </div>
            );
    }
};

export default RequestPayloadViewer;
