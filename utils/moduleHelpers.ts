import { HardwareModule, ModuleInstance, Connection, ConnectionType } from '../types';

/**
 * Flattens a list of HardwareModules (Products) into a list of individual physical instances.
 * 
 * Logic:
 * 1. If a module has `instances`, it creates a copy of the parent module for EACH instance.
 *    - The instance's `id`, `location`, `notes`, `position`, `universe` override the parent's.
 * 2. If a module has NO `instances`, it returns the module as-is (Legacy support).
 * 
 * @param products The list of grouped HardwareModule products (SKUs)
 * @returns A flat list of HardwareModule objects representing every physical device.
 */
export const flattenModules = (products: HardwareModule[]): HardwareModule[] => {
    return products.flatMap(product => {
        if (product.instances && product.instances.length > 0) {
            return product.instances.map(inst => ({
                ...product,
                // Override Product Data with Instance Data
                id: inst.id,
                location: inst.location,
                notes: inst.notes || product.notes, // Fallback to product notes if instance has none? Or distinct?
                universe: inst.universe,
                position: inst.position,

                // Ensure quantity is 1 for the physical instance
                quantity: 1,

                // Remove the instances array from the flattened child to avoid recursion/confusion
                instances: undefined
            }));
        } else {
            // Legacy item or Bulk Item (Cable)
            return [product];
        }
    });
};

/**
 * Calculates the total cost of the project from the grouped product list.
 * 
 * Logic:
 * - If instances exist, cost = product.cost * instances.length
 * - If no instances, cost = product.cost * product.quantity
 */
export const calculateTotalCost = (products: HardwareModule[]): number => {
    return products.reduce((acc, p) => {
        const qty = p.instances ? p.instances.length : p.quantity;
        return acc + (p.cost * qty);
    }, 0);
};

/**
 * Helper to get the canonical ID for a connection.
 * Useful if we need to auto-generate IDs based on To/From.
 */
export const getConnectionId = (conn: Connection) => conn.id || `${conn.fromId}-${conn.toId}`;
