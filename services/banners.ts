
import { bannersData as initialBannersData } from '../data/banners';
import type { Banner } from '../types';

let bannersData: Banner[] = [...initialBannersData];
const SIMULATED_DELAY = 100;

export const getAllBanners = (): Promise<Banner[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([...bannersData]);
        }, SIMULATED_DELAY);
    });
};

export const addBanner = (banner: Omit<Banner, 'id'>): Promise<Banner> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newBanner: Banner = {
                ...banner,
                id: `banner-${Date.now()}`,
            };
            bannersData.unshift(newBanner);
            resolve(newBanner);
        }, SIMULATED_DELAY);
    });
};

export const updateBanner = (bannerId: string, updates: Partial<Banner>): Promise<Banner | undefined> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const bannerIndex = bannersData.findIndex(b => b.id === bannerId);
            if (bannerIndex > -1) {
                bannersData[bannerIndex] = { ...bannersData[bannerIndex], ...updates };
                resolve(bannersData[bannerIndex]);
            } else {
                resolve(undefined);
            }
        }, SIMULATED_DELAY);
    });
};

export const deleteBanner = (bannerId: string): Promise<boolean> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const initialLength = bannersData.length;
            bannersData = bannersData.filter(b => b.id !== bannerId);
            resolve(bannersData.length < initialLength);
        }, SIMULATED_DELAY);
    });
};
