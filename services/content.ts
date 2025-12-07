
import { siteContentData as initialContentData } from '../data/content';
import type { SiteContent } from '../types';

let siteContentData: SiteContent = JSON.parse(JSON.stringify(initialContentData));
const SIMULATED_DELAY = 50;

export const getContent = (): Promise<SiteContent> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(JSON.parse(JSON.stringify(siteContentData)));
        }, SIMULATED_DELAY);
    });
};

export const updateContent = (updates: Partial<SiteContent>): Promise<SiteContent> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            siteContentData = { ...siteContentData, ...updates };
            resolve(JSON.parse(JSON.stringify(siteContentData)));
        }, SIMULATED_DELAY);
    });
};
