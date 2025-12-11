---
description: Update product URLs in constants.ts using targeted web searches.
---

# URL Refresh Workflow

This workflow guides the agent to verify and update product URLs in `constants.ts` to ensure they point to valid, preferred sources.

## Preferred Vendors Strategy

Prioritize **proven US availability**. Use distinct `productUrl` (Distributor) and `specUrl` (Manufacturer).

| Manufacturer | Preferred Vendor | Notes |
| :--- | :--- | :--- |
| **ABB** | **eibabo** | Best for high-value KNX/DALI Gateways & Routers. |
| **MDT** | **eibabo** | Good source if US distros are out of stock. |
| **Mean Well** | **Mouser / TRC** | Excellent US availability for PSUs. |
| **Lunatone** | **Lunatone Direct** | Niche, often direct or specialized. |
| **Generic** | **Mouser / Newark** | Switches, Sensors, General Components. |
| **Cabling** | **KNX Supply** | **MUST BE UL LISTED** for US Inspections. |

## Steps

1.  **Read `constants.ts`**: Identify all `HardwareModule` entries.
2.  **Iterate & Validate**: For each module:
    *   Check if the current URL is valid (is it a 404? - *Note: Agent performs a static check or search verification*).
    *   **Search**: Run a google search for the part number restricted to the preferred domain (if applicable).
        *   Query format: `site:<preferred_domain> <part_number> <name>`
    *   **Select**: Pick the most specific product page (avoid generic category pages).
    *   **Update**: Replace the `url` field in `constants.ts`.

## Execution Guide

When asked to "refresh-urls", the validator should:
1.  Open `constants.ts`.
2.  Pick a batch of items (e.g., 5 at a time).
3.  Perform searches.
4.  Apply updates.
