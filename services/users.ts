
// This service is an alias for the partners service, as internal users are stored in the same 'partners' data structure.
// This provides a clearer, domain-specific API for components dealing with internal users.

export {
    getAllPartnersForAdmin as getAllUsers,
    getPartnerById as getUserById,
    addInternalUser,
    updateUser,
    deletePartner as deleteUser,
} from './partners';
