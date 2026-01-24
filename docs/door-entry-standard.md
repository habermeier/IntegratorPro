# Door Entry & Access Control Standard
## 3D Face Recognition, SIP Intercom, and Secure Strike Integration

**Date:** January 23, 2026  
**Version:** v1.4  
**Status:** Prescriptive Specification  

---

## 1. System Overview
The project utilizes an IP-based video intercom and access control system centered on **Akuvox** 3D face recognition hardware. All control and power logic is centralized in a dedicated **DIN-rail LCP (LCP-MDF)** located in the Machine Room.

---

## 2. Hardware Specification

### 2.1 Outdoor & Indoor Units
| Location | Model | Features | Power |
| :--- | :--- | :--- | :--- |
| **Front Door** | **Akuvox X915S** | 8" Touch, 3D Face Rec, IK10 | PoE + 12V DC (Backup) |
| **Service Doors**| **Akuvox E16C** | 5" Screen, 3D Face Rec, Dual Cam | PoE + 12V DC (Backup) |
| **Hallway Tablet**| **Akuvox S567G** | 10" Android 12, Wi-Fi 6 | PoE |

*   **Tablet Placement:** The **S567G** monitor must be wall-mounted in the **Office Hallway area** at 58" AFF.

### 2.2 Secure Logic & Locking (Centralized)
All following components live in **LCP-MDF**:
*   **Secure Relays:** **Akuvox SR01** (One per door). Mounted to DIN rail via adapter clips.
*   **KNX Binary Input:** For power monitoring (AC Fail / Low Bat).
*   **Electric Strike:** **HES 1006** (Fail-Secure). Configured for **24V DC**.
*   **Power Controller:** **Altronix eFlow6N**. Mounted to DIN rail via Altronix DIN-mount kit.
*   **Battery Backup:** **Two (2) 12Ah SLA Batteries** (Series wired for 24V). Placed at the base of the LCP-MDF enclosure.

---

## 3. Machine Room LCP-MDF Configuration

### 3.1 Mounting Standard
The **LCP-MDF** must be a professional DIN-rail enclosure (e.g., Saginaw or similar) to match the project's electrical standards.
*   **Rail 1 (Top):** Power distribution (Altronix board + Fuses).
*   **Rail 2 (Middle):** Secure Relays (SR01s) and KNX Binary Input.
*   **Base (Bottom):** Battery storage.

### 3.2 Power Outage Notification
The **Altronix AC-Fail** and **Low-Bat** dry contacts are wired into the **KNX Binary Input**.
*   **Logic:** If utility power is lost, Home Assistant triggers an immediate "Power Outage" alert to the Owner’s phone.

---

## 4. Connection Map (The "Nervous System")

### 4.1 Home-Runs to LCP-MDF
1.  **Cat6/6a:** From each Intercom/Tablet to the **UniFi PoE Switch** in the rack.
2.  **18/4 Shielded:** From each Intercom to its assigned **SR01** in LCP-MDF.
    *   Pair 1: RS485 Data (Encrypted).
    *   Pair 2: 12V DC Backup Power.
3.  **18/2 (or 14/2):** From each **SR01** in LCP-MDF to its assigned **HES Strike**. (24V Lock Power).

---

## 5. Security & Installation
*   **Pairing:** Intercoms must be software-paired to SR01s to ensure the encrypted link is active.
*   **Firewall:** Garage flush-mounts require **STI SpecSeal Putty Pads**.
*   **Waterproofing:** Silicone seal top and sides; leave bottom weep-hole open.

---
*End of Specification.*
