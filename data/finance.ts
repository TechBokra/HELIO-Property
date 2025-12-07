
import { Transaction } from '../types';

export let transactionsData: Transaction[] = [
    {
        id: 'txn-101',
        userId: 'united-development',
        userName: 'United Development Co.',
        amount: 15000,
        currency: 'EGP',
        type: 'subscription_fee',
        description: 'Elite Plan Subscription - Monthly',
        method: 'card',
        status: 'paid',
        createdAt: '2024-07-01T10:00:00Z',
        updatedAt: '2024-07-01T10:00:00Z',
        referenceNumber: 'PM-884210'
    },
    {
        id: 'txn-102',
        userId: 'el-mottaheda-group',
        userName: 'El Mottaheda Group',
        amount: 3000,
        currency: 'EGP',
        type: 'subscription_fee',
        description: 'Professional Plan Subscription - Monthly',
        method: 'instapay',
        status: 'reviewing',
        createdAt: '2024-07-28T14:30:00Z',
        updatedAt: '2024-07-28T14:35:00Z',
        receiptUrl: 'https://via.placeholder.com/300x500?text=InstaPay+Receipt',
    },
    {
        id: 'txn-103',
        userId: 'individual-listings',
        userName: 'Ahmed Ali (Individual)',
        amount: 500,
        currency: 'EGP',
        type: 'listing_fee',
        description: 'Premium Listing Fee - Apartment in 5th District',
        method: 'card',
        status: 'paid',
        createdAt: '2024-07-25T09:15:00Z',
        updatedAt: '2024-07-25T09:16:00Z',
        relatedEntityId: 'prop-temp-123',
        referenceNumber: 'PM-992102'
    }
];
