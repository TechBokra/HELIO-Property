
// Note: This is a mock API. In a real application, these functions would make network requests
// to a backend service. The data is modified in-memory for simulation purposes.

import { portfolioData as initialPortfolioData } from '../data/portfolio';
import type { PortfolioItem } from '../types';

// Create a mutable, in-memory copy of the data to simulate a database.
let portfolioData: PortfolioItem[] = [...initialPortfolioData];

const SIMULATED_DELAY = 300;

export const getAllPortfolioItems = (): Promise<PortfolioItem[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([...portfolioData]);
        }, SIMULATED_DELAY);
    });
};

export const getPortfolioByPartnerId = (partnerId: string): Promise<PortfolioItem[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(portfolioData.filter(item => item.partnerId === partnerId));
        }, SIMULATED_DELAY);
    });
};

export const addPortfolioItem = (item: Omit<PortfolioItem, 'id'>): Promise<PortfolioItem> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newItem: PortfolioItem = {
                ...item,
                id: `port-${Date.now()}`,
            };
            portfolioData.unshift(newItem);
            resolve(newItem);
        }, SIMULATED_DELAY);
    });
};

export const updatePortfolioItem = (itemId: string, updates: Partial<PortfolioItem>): Promise<PortfolioItem | undefined> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const itemIndex = portfolioData.findIndex(p => p.id === itemId);
            if (itemIndex > -1) {
                portfolioData[itemIndex] = { ...portfolioData[itemIndex], ...updates };
                resolve(portfolioData[itemIndex]);
            } else {
                resolve(undefined);
            }
        }, SIMULATED_DELAY);
    });
};

export const deletePortfolioItem = (itemId: string): Promise<boolean> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const initialLength = portfolioData.length;
            portfolioData = portfolioData.filter(p => p.id !== itemId);
            if (portfolioData.length < initialLength) {
                resolve(true);
            } else {
                resolve(false);
            }
        }, SIMULATED_DELAY);
    });
};
