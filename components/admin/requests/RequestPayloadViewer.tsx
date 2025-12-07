
import React from 'react';
import { Request, RequestType } from '../../../types';
import DetailItem from '../../shared/DetailItem';
import { useLanguage } from '../../shared/LanguageContext';

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

            return (
                <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailItem label="Property Type" value={pd.propertyType?.[language] || 'N/A'} />
                        <DetailItem label="Purpose" value={pd.purpose?.[language] || 'N/A'} />
                        <DetailItem label="Area" value={`${pd.area} m²`} />
                        <DetailItem label="Price" value={`EGP ${pd.price?.toLocaleString()}`} />
                        <DetailItem label="Finishing" value={pd.finishingStatus?.[language] || 'N/A'} />
                        <DetailItem label="Cooperation" value={r.cooperationType} />
                    </div>
                    
                    <DetailItem label="Address" value={pd.address} />
                    <DetailItem label="Description" value={<p className="whitespace-pre-line text-sm">{pd.description}</p>} />

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
                        <DetailItem label="Partner ID" value={l.partnerId} />
                        <DetailItem label="Manager ID" value={l.managerId || 'N/A'} />
                        <DetailItem label="Preferred Time" value={l.contactTime} />
                        
                        {/* Decoration Specifics */}
                        {l.itemCategory && <DetailItem label="Category" value={t.formOptions?.[l.itemCategory] || l.itemCategory} className="capitalize" />}
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
