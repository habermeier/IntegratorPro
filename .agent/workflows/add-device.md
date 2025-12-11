---
description: How to add a new device to constants.ts with a valid, preferred URL.
---

# Playbook: Adding a New Device

Use this playbook when the user asks to "add device-x" to ensure consistency and link validity.

## 1. Gather & Validate Information
*   **Manufacturer & Model**: Get the exact part number.
*   **Official Source**: Identify the manufacturer's official website (for Spec URL).
    *   Examples: `abb.com` (New preferred), `meanwell.com`, `store.ui.com`.
*   **Community Validation (Crucial)**:
    *   Before adding, check Reddit (`r/KNX`, `r/HomeAutomation`) or `knx-user-forum.de`.
    *   Ensure the device is considered reputable/reliable by pros. Avoid "budget" options unless explicitly requested.

## 2. Find the URL (US Sourcing Strategy)
*   **Goal**: Two URLs per device: `productUrl` (Purchase) and `specUrl` (Data).
*   **Product URL (Purchase)**:
    *   **Step 2: US Sourcing (Hybrid Strategy)**
    - **High-Value / Specific Tech** (e.g., ABB Gateways > $300): Check **eibabo.com** (Verified US shipping, good stock).
    - **Cabling & Connectors**: Check **KNX Supply** (Miami) for UL-Listed cable and WAGO connectors.
    - **General Electronics**: Check **Mouser / Newark / DigiKey / B&H** for standard items (NUCs, Cameras, PSUs).
    - **Backup Strategy**: ALWAYS include a `backupUrl` with a Google Search query (e.g., `site:vendor.com PartNumber`) to ensure findability.
    - **Avoid**: Random eBay sellers or distributors without clear US shipping policies.
*   **Spec URL (Data)**:
    *   Official manufacturer product page or datasheet PDF.

## 3. Add to `constants.ts`
*   Open `constants.ts`.
*   Create a new `HardwareModule` object in the appropriate section.
*   **Fields**:
    *   `id`: unique, kebab-case (e.g., `abb-dali-gw`).
    *   `name`: Short, descriptive.
    *   `manufacturer`: Exact name.
    *   `description`: Part number.
    *   `productUrl`: Verified US purchase link.
    *   `specUrl`: Official manufacturer verified link.
    *   `type`, `mountType`, `cost`, `powerWatts`, etc.

## 4. Verify
*   **Availability**: Click the `productUrl` to confirm it's not a 404 and ships to US.
*   **Uniqueness**: Ensure ID is unique.
