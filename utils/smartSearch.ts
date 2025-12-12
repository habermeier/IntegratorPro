/**
 * Generates a targeted Google Search URL based on vendor preferences.
 * 
 * @param manufacturer - The manufacturer name (e.g. "Siemens")
 * @param productName - The specific product name or SKU (e.g. "5WG1 141-1AB03")
 * @param preferredVendorSite - Optional: A specific vendor domain to restrict to (e.g. "eibabo.com")
 * @returns A fully constructed Google Search URL
 */
export const generateSmartSearchUrl = (
    manufacturer: string,
    productName: string,
    preferredVendorSite?: string
): string => {
    const baseUrl = 'https://www.google.com/search?q=';

    if (preferredVendorSite) {
        // "Green" Search: Site Restricted
        const query = `site:${preferredVendorSite} ${manufacturer} ${productName}`;
        return `${baseUrl}${encodeURIComponent(query)}`;
    } else {
        // "Yellow" Search: Open Market
        const query = `${manufacturer} ${productName} price`;
        return `${baseUrl}${encodeURIComponent(query)}`;
    }
};

/**
 * Metadata helper to determine visual status
 */
export const getLinkStatus = (preferredVendorSite?: string): 'PREFERRED' | 'MARKET' => {
    return preferredVendorSite ? 'PREFERRED' : 'MARKET';
};
