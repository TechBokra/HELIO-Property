
import { leadsData as initialLeadsData } from '../data/leads';
import type { Lead, LeadStatus, LeadMessage } from '../types';
import { getPartnerById } from './partners';
import { addNotification } from './notifications';

// Create a mutable, in-memory copy of the data to simulate a database.
let leadsData: Lead[] = [...initialLeadsData];

const SIMULATED_DELAY = 50;

const populateLeadWithPartnerInfo = async (lead: Lead): Promise<Lead & { partnerName?: string }> => {
    const partner = await getPartnerById(lead.partnerId);
    return { ...lead, partnerName: partner?.name };
};

export const getLeadsByPartnerId = (partnerId: string): Promise<Lead[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const partnerLeads = leadsData.filter(l => l.partnerId === partnerId)
                                         .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            resolve(partnerLeads);
        }, SIMULATED_DELAY);
    });
};

export const getLeadById = (leadId: string): Promise<Lead | undefined> => {
    return new Promise((resolve) => {
        setTimeout(async () => {
            const lead = leadsData.find(l => l.id === leadId);
            if (lead) {
                resolve(await populateLeadWithPartnerInfo(lead));
            } else {
                resolve(undefined);
            }
        }, SIMULATED_DELAY);
    });
};

export const getAllLeads = (): Promise<(Lead & { partnerName?: string })[]> => {
    return new Promise(async (resolve) => {
        setTimeout(async () => {
            const populatedLeadsPromises = leadsData.map(populateLeadWithPartnerInfo);
            const populatedLeads = await Promise.all(populatedLeadsPromises);
            const allLeads = populatedLeads
                                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            resolve(allLeads);
        }, SIMULATED_DELAY);
    });
};

export const addLead = (leadData: Omit<Lead, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'messages'>): Promise<Lead> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const now = new Date().toISOString();
            
            const newLead: Lead = {
                ...leadData,
                id: `lead-${Date.now()}`,
                status: 'new',
                createdAt: now,
                updatedAt: now,
                messages: [],
            };
            leadsData.unshift(newLead);

            const targetUserId = newLead.managerId || newLead.partnerId;
            const link = newLead.managerId 
                ? (newLead.serviceType === 'finishing' ? '/admin/finishing-requests' : '/admin/decoration-requests')
                : '/dashboard/leads';

            addNotification({
                userId: targetUserId,
                message: {
                  ar: `لديك طلب عميل جديد من "${newLead.customerName}".`,
                  en: `New lead from "${newLead.customerName}".`,
                },
                link: link,
            });

            resolve(newLead);
        }, SIMULATED_DELAY);
    });
};

export const updateLead = (leadId: string, updates: Partial<Omit<Lead, 'id' | 'createdAt'>>): Promise<Lead | undefined> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const leadIndex = leadsData.findIndex(l => l.id === leadId);
            if (leadIndex > -1) {
                const lead = { ...leadsData[leadIndex] };
                const now = new Date().toISOString();

                // Check for status change and create a system message
                if (updates.status && updates.status !== lead.status) {
                    const systemMessage: LeadMessage = {
                        id: `msg-sys-${Date.now()}`,
                        sender: 'system',
                        type: 'note',
                        content: `Status changed from "${lead.status}" to "${updates.status}".`,
                        timestamp: now,
                    };
                    lead.messages.push(systemMessage);
                }

                leadsData[leadIndex] = { ...lead, ...updates, updatedAt: now };
                resolve(leadsData[leadIndex]);
            } else {
                resolve(undefined);
            }
        }, SIMULATED_DELAY);
    });
};

export const addMessageToLead = (leadId: string, messageData: Omit<LeadMessage, 'id' | 'timestamp'>): Promise<Lead | undefined> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const leadIndex = leadsData.findIndex(l => l.id === leadId);
            if (leadIndex > -1) {
                const lead = leadsData[leadIndex];
                const newMessage: LeadMessage = {
                    ...messageData,
                    id: `msg-${leadId}-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                };
                lead.messages.push(newMessage);
                lead.updatedAt = new Date().toISOString();
                
                if (lead.status === 'new' && (messageData.sender === 'partner' || messageData.sender === 'admin')) {
                    lead.status = 'contacted';
                }

                resolve(lead);
            } else {
                reject(new Error('Lead not found'));
            }
        }, SIMULATED_DELAY);
    });
};

export const deleteLead = (leadId: string): Promise<boolean> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const initialLength = leadsData.length;
            leadsData = leadsData.filter(l => l.id !== leadId);
            if (leadsData.length < initialLength) {
                resolve(true);
            } else {
                resolve(false);
            }
        }, SIMULATED_DELAY);
    });
};
