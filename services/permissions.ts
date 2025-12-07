
import { Role, Permission } from '../types';
import { rolePermissions as initialRolePermissions } from '../data/permissions';

// Create a mutable, in-memory copy of the data to simulate a database.
let rolePermissions: Map<Role, Permission[]> = new Map(initialRolePermissions.entries());

const SIMULATED_DELAY = 200;

export const getRolePermissions = (): Promise<Map<Role, Permission[]>> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Create a new map from a serialized/deserialized version to ensure no direct mutation
            resolve(new Map(JSON.parse(JSON.stringify(Array.from(rolePermissions.entries())))));
        }, SIMULATED_DELAY);
    });
};

export const updateRolePermissions = (updatedPermissions: Map<Role, Permission[]>): Promise<boolean> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Update the local, in-memory data store.
            rolePermissions = new Map(updatedPermissions.entries());
            resolve(true);
        }, SIMULATED_DELAY);
    });
};
