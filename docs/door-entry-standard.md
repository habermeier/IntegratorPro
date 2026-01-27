# Door Entry & Access Control Standard
## 3D Face Recognition, SIP Intercom, and Secure Strike Integration

**Date:** January 23, 2026  
**Version:** v1.4  
**Status:** Prescriptive Specification  

---

## 1. System Overview
The project utilizes an IP-based video intercom and access control system centered on **Akuvox** 3D face recognition hardware. All control and power logic is centralized in a dedicated **DIN-rail LCP (LCP-3)** located in the **Tech Room**.

---

## 2. Hardware Specification

### 2.1 Outdoor & Indoor Units
| Location | Model | Features | Power |
| :--- | :--- | :--- | :--- |
| **Front Door** | **Akuvox X915S** | 8" Touch, 3D Face Rec, IK10 | PoE + 12V DC (Backup) |
| **Service Doors**| **Akuvox E16C** | 5" Screen, 3D Face Rec, Dual Cam | PoE + 12V DC (Backup) |
| **Hallway Tablet**| **Akuvox S567G** | 10" Android 12, Wi-Fi 6 | PoE |

*   **Tablet Placement:** The **S567G** monitor must be wall-mounted in the **Office Hallway area** at 58" AFF.

### 2.2 Local Management "Brain"
*   **SDMC Server:** **ASUS NUC 13 Pro** (Intel i5, Windows 11 Pro).
*   **Software:** **Akuvox SDMC** (SIP Device Management Center).
*   **Robustness**: Industrial-grade hardware (MIL-STD-810H) designed for 24/7 localized biometric sync.

### 2.3 Secure Logic & Locking (Centralized DC Architecture)
All following components live in **LCP-3** and are powered by a **Unified 24V DC Battery-Backed Rail**:
*   **System Core:** **Altronix eFlow104N** (10A PSU/Charger).
*   **Battery Backup:** Two (2) 12Ah SLA Batteries (24V String).
*   **SDMC Power:** **Mean Well DDR-60G-19** (DC-DC Converter) provides 19V DC to the NUC.
*   **Network Power:** **Industrial PoE Switch** (DC-Input) provides 48V PoE to terminals.
*   **Secure Relays:** **Akuvox SR01** (One per door).
*   **Electric Strike:** **HES 1006** (Fail-Secure). Configured for **24V DC**.

---

## 3. Tech Room LCP-3 Configuration

### 3.1 Mounting Standard
The **LCP-3** must be a **24x24x8** DIN-rail enclosure.
*   **Rail 1 (Top):** Network & Logic (Industrial PoE Switch + ASUS NUC via DC-DC Converter).
*   **Rail 2 (Middle):** Security Logic (Altronix eFlow104N + Secure Relays).
*   **Base (Bottom):** SLA Battery storage (12Ah x 2). No AC UPS is permitted inside the enclosure.

---

## 4. Connection Map (The "Nervous System")

### 4.1 Home-Runs to LCP-3
1.  **Cat6/6a:** From each Intercom/Tablet to the **UniFi PoE Switch** in the rack.
2.  **18/4 Shielded:** From each Intercom to its assigned **SR01** in LCP-3.
    *   Pair 1: RS485 Data (Encrypted).
    *   Pair 2: 12V DC Backup Power.
3.  **18/2 (or 14/2):** From each **SR01** in LCP-3 to its assigned **HES Strike**. (24V Lock Power).

---

## 5. Security & Installation
*   **Pairing:** Intercoms must be software-paired to SR01s to ensure the encrypted link is active.
*   **Firewall:** Garage flush-mounts require **STI SpecSeal Putty Pads**.
*   **Waterproofing:** Silicone seal top and sides; leave bottom weep-hole open.

---

## 6. Installation Notes: Secure Logic (Puck) Placement

### 6.1 The "No Local Logic" Rule (Security Hardening)
*   **MANDATORY**: The **Akuvox SR01** (Security Puck) must **NEVER** be installed inside the door frame, behind the intercom, or in an accessible junction box near the door.
*   **Rationale**: Most residential intercoms have an "Unlock" relay on the back of the unit. This is a security flaw, as pulling the unit off the wall allows an intruder to short the relay and open the door. By centralizing the SR01 in the **LCP-3**, the door strike power is physically separated from the outdoor terminal.
*   **Verification**: The field wiring from the intercom to the LCP is **data-only** (RS485) and low-voltage backup. Cutting or shorting these wires will not trigger the strike.

### 6.2 Mounting & Wire Management
*   **Mounting**: Use the Akuvox DIN-rail clip adapter for all SR01s. Group them on a dedicated rail in the LCP-3.
*   **Service Loops**: Provide a **12" service loop** for both the 18/4 (intercom link) and the 18/2 (strike power) at the panel end.
*   **Labeling**: Each puck must be clearly labeled with the Door ID (e.g., "DOOR-01 FRONT", "DOOR-02 GARAGE MAN").
*   **Drain Wires**: The drain wire from the 18/4 shielded cable must be bonded to the LCP ground bus at the panel end only; cut and tape at the intercom end to prevent ground loops.

### 6.3 Power Distribution
*   **Class 2 Separation**: Ensure strike power (24V DC) wiring is physically separated from any High-Voltage (120V) circuits within the panel using plastic ducting or standoffs.
*   **Fuse Protection**: Use the **Altronix eFlow6N** fused outputs for strike power. Set the jumper to 24V DC.

---
*End of Specification.*
