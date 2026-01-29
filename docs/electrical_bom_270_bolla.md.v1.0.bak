# **Project Bill of Materials (BOM) - 270 Bolla Ave**

**Project Name:** 270 Bolla Ave  
**Document Type:** Integrated Systems Specification  
**Integrator Draft:** v1.0 (Baseline for Release)

---

## **Revision History**
| Version | Date | Description | Status |
| :--- | :--- | :--- | :--- |
| v1.0 | 2026-01-27 | Baseline Release: Phased Infrastructure & Subsystem Segregation | **Current** |

---

## **1. Project Objectives & System Organization**
The automation system at 270 Bolla Ave is designed for maximum reliability, security hardening, and high-fidelity environmental control. The architecture is organized into three localized **Load Control Panels (LCPs)** to minimize home-run copper and isolate failure domains:

*   **LCP-1 (Garage)**: The "Power Hub" (12 Circuits). Central living areas, kitchen lighting, and high-inrush holiday circuits.
*   **LCP-2 (Office 2)**: The "Environmental Hub" (11 Circuits). Master Wing, towel warmers, ventilation logic, and weather station.
*   **LCP-3 (Tech Room)**: The "Security Island" (5 Circuits). 100% battery-backed, DC-powered enclosure for entry and 3D vision. 

**Core Standards**: All lighting is **DALI-2** (addressable). All logic and switching is **KNX** (distributed). 
| :--- | :--- | :--- | :--- |
| **Power Feeds**: | **LCP-1**: 12x 15A | **LCP-2**: 11x 15A | **LCP-3**: 5x 15A (+ Rack 30A) |

---

## **Section 1: High-Voltage (HV) Infrastructure**
*Main Service & Smart Panel Telemetry*

| External MPN | Manufacturer | Internal ID | Description | Qty | Phase | Listing / Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [1-03294-02](https://www.span.io/products/main-32) | SPAN | SPAN-GEN2 | Smart Panel Gen 2 (32-Circuit) | 2 | 1 | **UL Listed** | Main Service |
| [MAIN-16](https://span.io/products/panel/16) | SPAN | SPAN-SUB | Smart Panel 16 (16-Circuit) | 1 | 1 | **UL Listed** | Sub-Panel (Logic) |
| [2/0-AL-SER](https://nassaunationalcable.com/products/2-0-2-0-2-0-1-ser) | [Nassau National](https://nassaunationalcable.com/) | SER-2/0-AL | #2/0 AWG Aluminum SER | - | 1 | **UL Listed** | Sub-SPAN Feed |
| [12/2-NM-B](https://nassaunationalcable.com/products/12-2-w-grnd-nm-b-600v-solid-yellow) | [Nassau National](https://nassaunationalcable.com/) | NM-B-12/2 | 12/2 Romex (20A Branch) | - | 1 | **UL Listed** | Kitchen Outlets |
| [6/3-NM-B](https://nassaunationalcable.com/products/6-3-w-grnd-nm-b-600v-stranded-black) | [Nassau National](https://nassaunationalcable.com/) | NM-B-6/3 | 6/3 Romex (50A Circuit) | - | 1 | **UL Listed** | Range / Induction |
| [14/2-NM-B](https://nassaunationalcable.com/products/14-2-w-grnd-nm-b-600v-solid-white) | [Nassau National](https://nassaunationalcable.com/) | NM-B-14/2 | 14/2 Romex (Standard) | - | 1 | **UL Listed** | Lighting/LCP |

---

## **Section 2: Load Control Panel 1 (LCP-1) (Garage) - Kitchen/Main Hub**
*The automation core for the central living areas.*
* **Enclosure**: Saginaw SCE-24H2408LP
* **Dimensions (Outside)**: 24.00" x 24.00" x 8.00" (610 x 610 x 203 mm)
* **Dimensions (Inside Usable)**: 24.00" x 24.00" x 7.75" (610 x 610 x 197 mm)
* **Depth Note**: 8" (203mm) nominal depth easily accommodates the 128.5mm (5.1") Mean Well SDR-480.
* **Internal Outlets**: Install 1x internal 15A duplex receptacle for plug-in logic (UniFi switch/spares).

| External MPN | Manufacturer | Internal ID | Description | Qty | Phase | Listing / Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [SCE-24H2408LP](https://www.saginawcontrol.com/partnumber_info/?n=SCE-24H2408LP) | Saginaw | SAG-24H2408 | 24x24x8 NEMA 4/12 Enclosure | 1 | 1 | **UL Listed** | Outer Box [E69392] |
| [SCE-ELFM24H/W](https://www.saginawcontrol.com/partnumber_info/?n=SCE-ELFM24W) | Saginaw | SAG-FLUSH-KIT | Flush Mount Frame (24x24) | 1 | - | **UL Listed** | **REQUIRED FOR RECESSED** |
| [SDR-480-24](https://www.meanwell.com/productDetail.aspx?i=318) | Mean Well | MW-SDR-480 | 480W 24V DC PSU (UL 508) | 1 | 1 | **UL Recog.** | Main Logic Power |
| [SV/S 30.640.5.1](https://new.abb.com/products/2CDG110146R0011/sv-s30-640-5-1) | ABB | ABB-KNX-PS | KNX Power Supply 640mA | 1 | 1 | **UL Recog.** | Powers Line 1.1 |
| [5WG1512-1CB01](https://hit.sbt.siemens.com/RWD/app.aspx?module=Catalog&action=ShowProduct&key=5WG1512-1CB01) | Siemens | SIE-AKS-512 | 8-fold Load Switch (20A High-C) | 1 | 1 | **UL Listed** | Seasonal & WHF Power |
| [5WG1141-1AB03](https://hit.sbt.siemens.com/RWD/app.aspx?module=Catalog&action=ShowProduct&key=5WG1141-1AB03) | Siemens | SIE-DALI-GW | KNX/DALI Gateway Twin N 141/03 | 1 | 1 | **UL Listed** | Universes 1 & 2 |
| [1060/A](https://www.eldoled.com/product/solodrive-100w-linear-dim-to-dark-1060a/) | eldoLED | ELD-PWR-100 | 100W DALI-2 LED Driver | 6 (TBD) | 1 | **UL Recog.** | Area Tape Lights |
| [MDT-SCN-MBGW.01](https://www.mdt.de/en/products/modbus-gateway.html) | MDT | MDT-SCN-MB | KNX/Modbus Gateway | 1 | 2 | **Non-UL (SELV)** | Telemetry Bridge |

---

## **Section 3: Load Control Panel 2 (LCP-2) (Office 2) - Master Wing Hub**
*The automation core for the Master Bedroom, Bedrooms 3/4, and local environmental logic.*
* **Enclosures**: nVent HOFFMAN ASE24X12X4NK / ASE12X12X4
* **Inside Dimensions**: 
    *   Top (24x12): 23.8" x 11.8" x 3.87" (605 x 300 x 98 mm)
    *   Bottom (12x12): 11.8" x 11.8" x 3.87" (300 x 300 x 98 mm)
* **Depth Note**: **MAX COMPONENT DEPTH 3.5" (89mm)**. No SDR-series PSUs allowed here; use MDR or SV/S series only. (NUC fits @ 37mm).
* **Internal Outlets**: Install 1x internal 15A duplex receptacle for localized IT/logic gear.

| External MPN | Manufacturer | Internal ID | Description | Qty | Phase | Listing / Rating | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [ASE24X12X4NK](https://www.nvent.com/en-us/hoffman/products/encASE24X12X4NK) | nVent HOFFMAN | HOF-ASE24X12X4 | Automation Enclosure (24x12x4) | 1 | 1 | **UL Listed** | Type 1 [E27525] |
| [USW-Pro-8-PoE](https://store.ui.com/us/en/pro/category/all-wifi/products/usw-pro-8-poe) | Ubiquiti | UI-SW-PRO-8 | UniFi Pro 8 PoE (10G SFP+) | 1 | 1 | **UL Listed** | (Bernie) Hub |
| [NUC13ANKi5](https://www.asus.com/displays-desktops/mini-pcs/nuc-mini-pcs/asus-nuc-13-pro/) | ASUS | ASUS-NUC-13 | NUC 13 Pro (i5, 16GB RAM) | 1 | 1 | **Non-UL** | (Bernie) Logic |
| [SV/S 30.640.5.1](https://new.abb.com/products/2CDG110146R0011/sv-s30-640-5-1) | ABB | ABB-KNX-PS | KNX Power Supply 640mA | 1 | 1 | **UL Recog.** | Powers Line 1.2 |
| [5WG1141-1AB03](https://hit.sbt.siemens.com/RWD/app.aspx?module=Catalog&action=ShowProduct&key=5WG1141-1AB03) | Siemens | SIE-DALI-GW | KNX/DALI Gateway Twin | 1 | 1 | **UL Listed** | Universes 3 & 4 |
| [5WG1512-1CB01](https://hit.sbt.siemens.com/RWD/app.aspx?module=Catalog&action=ShowProduct&key=5WG1512-1CB01) | Siemens | SIE-AKS-512 | 8-fold Load Switch (20A High-C) | 1 | 1 | **UL Listed** | Towel Warmers / Vents |
| [MDR-100-24](https://www.meanwell.com/webapp/product/search.aspx?prod=MDR-100) | Mean Well | MW-MDR-100-24 | 100W 24V DC DIN-Rail PSU | 1 | 1 | **UL Recog.** | Logic Power |
| [1060/A](https://www.eldoled.com/product/solodrive-100w-linear-dim-to-dark-1060a/) | eldoLED | ELD-PWR-100 | 100W DALI-2 LED Driver | 6 (TBD) | 1 | **UL Recog.** | Master Accent |

---

## **Section 3.1: Load Control Panel 3 (LCP-3) (Tech Room) - Door Entry MDF**
*The centralized "Security Island" - 100% DC-backed for maximum uptime.*
* **Enclosure Option A (Standard)**: Saginaw SCE-24H2408LP (8" / 203mm Depth)
* **Enclosure Option B (Flush-Clean)**: Saginaw SCE-24H2406LP (6" / 152mm Depth)
* **Dimensions (Inside Usable A)**: 24.00" x 24.00" x 7.75" (610 x 610 x 197 mm)
* **Dimensions (Inside Usable B)**: 24.00" x 24.00" x 5.75" (610 x 610 x 146 mm)
* **Depth Rationale**: 
    *   **Bottleneck 1**: TP-Link Industrial Switch @ 120mm (4.7") depth.
    *   **Bottleneck 2**: Yuasa 12Ah Batteries @ 98mm (3.86") depth.
    *   **Wall Context**: A 2x6 wall (5.5" stud) + drywall (~6" total) makes Option B (6") nearly flush. 

| External MPN | Manufacturer | Internal ID | Description | Qty | Phase | Listing / Rating | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [SCE-24H2408LP](https://www.saginawcontrol.com/partnumber_info/?n=SCE-24H2408LP) | Saginaw | SAG-24H2408 | 24x24x8 NEMA Enclosure | 1 | 1 | **UL Listed** | Hinged Cover |
| [eFlow104N](https://www.altronix.com/products/eFlow104N) | Altronix | ALT-EFLOW104N | 10A Power Supply/Charger | 1 | 1 | **UL Listed** | Managed DC Rail |
| [NP12-12](https://www.yuasa.co.uk/np12-12.html) | Yuasa | BATT-12AH | 12V 12Ah SLA Battery | 2 | 1 | **UL Recog.** | 24V DC String |
| [DDR-60G-15](https://www.meanwell.com/productDetail.aspx?i=845) | Mean Well | MW-DDR-60G-15 | 24V to 15V DC-DC Converter | 1 | 1 | **UL Recog.** | Power for NUC |
| [NUC13ANKi5](https://www.asus.com/displays-desktops/mini-pcs/nuc-mini-pcs/asus-nuc-13-pro/) | ASUS | ASUS-NUC-13 | NUC 13 Pro (i5, 16GB RAM) | 1 | 1 | **Non-UL** | (Bernie) Security Brain |
| [IES210GPP](https://www.tp-link.com/us/business-networking/omada-switch-industrial/ies210gpp/) | TP-Link | TPL-IES210GPP | Industrial 10-Port PoE+ Switch | 1 | 1 | **Non-UL** | (Bernie) DC-Input PoE Source |
| [SR01](https://akuvox.com/productsDisp?pid=74) | Akuvox | AKU-SR01 | Secure Relay Module | 4 | 1 | **Non-UL (SELV)** | Relay Board |
### **3.2 Tech Room Power & Receptacle Spec**
*Differentiating Enclosure Power from Room/Wall Power*

| Load Category | Location | Receptacle | Circuit | Notes |
| :--- | :--- | :--- | :--- |
| **Server UPS** | Wall (Direct) | NEMA L6-30R | 240V / 30A | Dedicated Twist-Lock |
| **Workbench / Lab** | Wall (General) | 3x NEMA 5-20R | 120V / 20A | General Bench Outlets |
| **LCP-3 Logic** | Inside Enclosure | Hardwired | 120V / 15A | **Differentiated Circuit** |
| **LCP-3 Service** | Inside Enclosure | NEMA 5-15R | 120V / 15A | For Switch / Comm. |
| **General Room** | Wall (Entry) | NEMA 5-15R | 120V / 15A | Standard Code Circuit |

---

## **Section 4: Field Devices - KNX / Control**
*Sensors and User Interfaces (Not in Enclosures)*

### **4.1 Sensors (Environmental & Presence)**
| External MPN | Manufacturer | Internal ID | Description | Qty | Phase | Listing / Rating | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [056353](https://www.steinel.de/en/group/sensors/smart-space-sensors/true-presence/multisensor-true-presence-knx-056353.html) | Steinel | STE-TP-KNX | True Presence Multisensor KNX | 5 | 1 | **KNX Certified** | Bath + WC Cluster |

### **4.2 User Interfaces**
| External MPN | Manufacturer | Internal ID | Description | Qty | Phase | Listing / Rating | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [Sentido 4-way](https://www.basalte.be/en/product/sentido) | Basalte | Basalte | Sentido (4-Button) Switch | 12 | 1 | **KNX Certified** | Native KNX |

### **4.3 UI Integration Notes**
*   **Protocol**: Native KNX Multicast. All features (Buttons, RGB LED, Temp Sensor) are standard ETS Group Objects.
*   **No Gateway**: Operates as a standalone bus node. Basalte Core server is NOT required for functionality.
*   **Feedback**: Central RGB LED supports 1-byte or 3-byte status feedback for orientation or system alerts.
*   **Mounting**: **CRITICAL**. Requires European round backbox pattern (60mm screw spacing). Do not use standard US rectangular mud-rings.

---

## **Section 5: Network Infrastructure (Core)**
*Standardized backbone for data connectivity.*

| External MPN | Manufacturer | Internal ID | Description | Qty | Phase | Listing / Rating | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [USW-Pro-Max-24-PoE](https://ui.com/switching/pro-max-24-poe) | Ubiquiti | UI-SW-PRO-24 | UniFi Pro Max 24 PoE | 1 | 1 | **UL Listed** | (Bernie) Core |
| [PDU15B10R](https://www.cyberpowersystems.com/product/pdus/basic/pdu15b10r/) | CyberPower | CYB-PDU-1U | 1U Rack PDU | 1 | 1 | **UL Listed** | (Bernie) Rack Power |
| [SMT1500C](https://www.apc.com/us/en/product/SMT1500C/) | APC | APC-UPS-1500 | Smart-UPS 1500VA | 1 | 1 | **UL Listed** | (Bernie) Rack Backup |

### **5.1 Wireless Infrastructure (WiFi 7)**
| External MPN | Manufacturer | Internal ID | Description | Qty | Phase | Listing / Rating | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [U7-Pro](https://store.ui.com/us/en/pro/category/all-wifi/products/u7-pro) | Ubiquiti | UI-WAP-U7 | UniFi7 Pro Access Point | 4 | 1 | **UL Listed** | (Bernie) WiFi 7 |
| [U-ACC-Pro-AP-Mount](https://store.ui.com/us/en/pro/category/accessories-access-point/products/u-acc-pro-ap-mount) | Ubiquiti | UI-WAP-MOUNT | AP Pro Mounting Bracket | 4 | 1 | **UL Listed** | (Bernie) Mount |

---

## **Section 6: Ventilation & Fans**
*Whole-House, Attic, and Bathroom Exhaust (EC Motors + DALI-2 Control)*

### **6.1 Whole-House Fans (WHF)**
| External MPN | Manufacturer | Internal ID | Description | Qty | Phase | Listing / Rating | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [Stealth Pro 7.0X](https://quietcoolsystems.com/whole-house-fan/stealth-pro-x-whole-house-fan/) | QuietCool | QC-STL-7.0X | Stealth Pro 7.0X (ECM Motor) | 2 | 1 | **UL Listed** | Core Fan |
| [SR-2701S-DT7](https://www.sunricher.com/dali-2-relay-module-sr-2701s-dt7.html) | Sunricher | SUN-2701S-DT7 | DALI-2 Relay Puck | 2 | 1 | **UL Recog.** | Power Control |
| [SR-2303-0-10V-PWM](https://www.sunricher.com/dali-to-0-10v-pwm-sr-2303-0-10v-pwm.html) | Sunricher | SUN-2401-10V | DALI to 0-10V Signal Converter | 2 | 1 | **UL Recog.** | Speed Control |

### **6.2 Attic Exhaust Fans**
| External MPN | Manufacturer | Internal ID | Description | Qty | Phase | Listing / Rating | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [AFG SMT PRO-3.0](https://quietcoolsystems.com/attic-fan/smart-gable-attic-fans/) | QuietCool | QC-AFG-3.0 | AFG SMT PRO-3.0 Gable Fan | 4 | 1 | **UL Listed** | Inspection-Critical |
| [SR-2701S-DT7](https://www.sunricher.com/dali-2-relay-module-sr-2701s-dt7.html) | Sunricher | SUN-2701S-DT7 | DALI-2 Relay Puck | 4 | 1 | **UL Recog.** | Power Control |
| [SR-2303-0-10V-PWM](https://www.sunricher.com/dali-to-0-10v-pwm-sr-2303-0-10v-pwm.html) | Sunricher | SUN-2401-10V | DALI to 0-10V Signal Converter | 4 | 1 | **UL Recog.** | Speed Control |

### **6.3 Bathroom & Laundry Exhaust**
| **Bath 2 (Kids)** | [Fantech FG 6M EC](https://www.fantech.net/en-us/products/fans-and-accessories/inline-duct-fans/fg/?sku=49900) | Fantech LD 6 | RSK 6 | L100 (48") |
| **Bath 3 (Ens)** | [Fantech FG 6M EC](https://www.fantech.net/en-us/products/fans-and-accessories/inline-duct-fans/fg/?sku=49900) | Fantech LD 6 | RSK 6 | L100 (48") |
| **Guest Bath** | [Fantech FG 6M EC](https://www.fantech.net/en-us/products/fans-and-accessories/inline-duct-fans/fg/?sku=49900) | Fantech LD 6 | RSK 6 | L100 (60") |
| **Laundry Room** | [Fantech FG 6M EC](https://www.fantech.net/en-us/products/fans-and-accessories/inline-duct-fans/fg/?sku=49900) | Fantech LD 6 | RSK 6 | S100 (8") |
| **Half Bath** | [Fantech FG 6M EC](https://www.fantech.net/en-us/products/fans-and-accessories/inline-duct-fans/fg/?sku=49900) | Fantech LD 6 | RSK 6 | S100 (6") |

### **6.4 Environmental AI Inputs**
| External MPN | Manufacturer | Internal ID | Description | Qty | Phase | Listing / Rating | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [056353](https://www.steinel.de/en/group/sensors/smart-space-sensors/true-presence/multisensor-true-presence-knx-056353.html) | Steinel | STE-TP-KNX | True Presence Multisensor KNX | 5 | 1 | **KNX Certified** | Envoy Sensors |
| [2064965](https://www.warema.com/en/control-systems/bus-systems/knx-technology/knx-secure-weather-station-pro-reg/) | Warema | WAR-WETH-PRO | KNX Weather Station Pro | 1 | 1 | **KNX Certified** | Master Weather |
| [OAL-PM2.5](https://temcocontrols.com/shop/outdoor-pm2-5-sensor/) | Temco | TEM-PM25 | Outdoor PM2.5 Sensor (Modbus) | 1 | 1 | **Non-UL (SELV)** | Wildfire SMK |
| [SCN-MBGW.01](https://www.mdt.de/en/products/modbus-gateway.html) | MDT | MDT-SCN-MB | KNX/Modbus Gateway | 1 | 1 | **Non-UL (SELV)** | Bridge |

---

## **Section 7: Field Devices - Lighting (DALI-2)**
*Based on current floor plan placements.*

| External MPN | Manufacturer | Internal ID | Description | Qty | Type | Phase | Listing / Rating | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [X-Series](https://www.dmflighting.com/product/x-series/) | DMF Lighting | DMF-X2-SQ-FL | X-Series Square Flangeless | 80 | Recessed | 1 | **UL Listed** | Core Downlight |
| [X-Series Wet](https://www.dmflighting.com/product/x-series/) | DMF Lighting | DMF-X2-WET | X-Series Sq Flangeless (Wet) | 4 | Recessed | 1 | **UL Listed** | Showers |
| [Haiku 52"](https://store.bigassfans.com/en_us/haiku) | Big Ass Fans | BAF-HAIKU-52 | Haiku 52" Aluminum | 3 | Fan+Light | 1 | **UL Listed** | Airflow |
| [PCS-DUO](https://www.southwire.com/wire-cable/non-metallic-sheathed-cable/romex-brand-simpull-pcs-duo-cable/p/PCS-DUO) | Southwire | CAB-NM-PCS | Romex PCS Duo (14/2 + 16/2) | 3 | Spools | 1 | **UL Listed** | Combined Cable |

### **7.1 Decorative & Architectural Lighting (Phase-Ready TBD)**
*These loads are Phase 1 for rough-in/automation but fixtures are TBD. Pucks to be located in J-boxes.*

| External MPN | Manufacturer | Internal ID | Description | Qty | Phase | Listing / Rating | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [86458619](https://www.lunatone.com/en/product/dali-2-pd-300w-phase-dimmer/) | Lunatone | LUN-DALI-PD | DALI-2 Phase Dimmer (300W) | 14 | 1 | **UL Recog.** | Phase Puck |
| [TBD-DECO](https://integratorpro.app/placeholders) | Owner | DECO-MARKER | Fancy Floor-Plan Marker | 14 | 1 | **TBD** | Placeholder |

*   **Locations**: Front Entry (1), Foyer (1), Dining (1), Primary Bath (4), Other Baths (4), Bed 3, Bed 4, Guest Bed.
*   **Note**: Primary WC is excluded from ornamental plan (Canned Lights only).
*   **Requirement**: All decorative J-boxes must be 2-1/8" deep steel to house the DALI puck.

### **7.2 Outdoor Architectural Sconces (Phase 1 Ready)**
*High-performance perimeter lighting home-run to DALI-2 backbone.*

| External MPN | Manufacturer | Internal ID | Description | Qty | Phase | Listing / Rating | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [TBD-OUT-DALI](https://integratorpro.app/placeholders) | TBD (e.g. BEGA) | OUT-SCONCE | DALI-2 Native Outdoor Sconce | 8 | 1 | **UL Listed Req.** | Native DALI |

*   **Logic**: Must be specified as **DALI-2 Native** (with internal DALI driver).
*   **Rationale**: Avoiding external DALI pucks in outdoor J-boxes minimizes moisture-failure points and simplifies IP65 sealing. 
*   **Requirement**: Decision Required in Phase 1 to ensure correct driver compatibility (Digital vs. Phase Cut).

---

## **Section 8: Physical Pathways (Conduit & Enclosures)**

| Item | Manufacturer | Description | Qty | Phase | Listing / Rating | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [BOX-SQ-4IN](https://www.hubbell.com/raco/en/Products/Electrical-Electronic/Boxes/4-in-Square-Boxes-Covers/4-in-Square-Box-2-18-in-Deep-with-Conduit-KOs/p/1670609) | Hubbell | 4" Square Steel Box (2-1/8" D) | - | 1 | **UL Listed** | Basic Box |
| [BOX-FIRE-PAD](https://www.stifirestop.com/products/specseal-putty-pads) | STI | SpecSeal Putty Pad | 1 | 1 | **UL Listed** | Fire Pad |
| [CON-EMT-1IN](https://www.westerntube.com/products/emt-conduit/) | Western Tube | 1" EMT Conduit | 2 | 1 | **UL Listed** | Solar EMT |
| [CON-EMT-2.5IN](https://www.westerntube.com/products/emt-conduit/) | Western Tube | 2.5" EMT Conduit | 2 | 1 | **UL Listed** | Hub EMT |

---

## **Section 9: Door Entry & Access Control (Akuvox)**
*3D Face Recognition & SIP Intercom System*

| External MPN | Manufacturer | Internal ID | Description | Qty | Phase | Listing / Rating | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [X915S](https://www.akuvox.com/productsDisp?pid=37) | Akuvox | AKU-X915S | 8" 3D Face Recognition Intercom | 1 | 1 | **Non-UL (CE/IP65)** | Entry 1 |
| [E16C](https://www.akuvox.com/productsDisp?pid=39) | Akuvox | AKU-E16C | 5" 3D Face Recognition Intercom | 3 | 1 | **Non-UL (CE/IP65)** | Service Entry |
| [E16-A05H](https://www.akuvox.com/products/door-phone/e16c-smart-ip-intercom) | Akuvox | AKU-E16-HOOD | Sun Shield / Rain Hood | 1 | 1 | **N/A** | Add-on |
| [S567G](https://www.akuvox.com/productsDisp?pid=82) | Akuvox | AKU-S567G | 10" Android 12 Indoor Monitor | 1 | 1 | **Non-UL (CE)** | Tablet |
| [1006-CS](https://www.assaabloyesh.com/en/products/electric-strikes/1000-series/1006/) | HES | HES-1006 | Heavy Duty Electric Strike | 4 | 1 | **UL Listed** | Lock |
| [SR01](https://akuvox.com/productsDisp?pid=74) | Akuvox | AKU-SR01 | Secure Relay Module | 4 | 1 | **Non-UL (SELV)** | Relay |

---

## **Section 10: Environmental Sensors (Outdoor)**
*Field-mounted sensors home-run to LCP-2.*

| External MPN | Manufacturer | Internal ID | Description | Qty | Phase | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [2064965](https://www.warema.com/en/control-systems/bus-systems/knx-technology/knx-secure-weather-station-pro-reg/) | Warema | WAR-WETH-PRO | KNX Weather Station Pro | 1 | 1 | North Wall |
| [OAL-PM2.5](https://temcocontrols.com/shop/outdoor-pm2-5-sensor/) | Temco | TEM-PM25 | Outdoor PM2.5 Sensor (Modbus) | 1 | 1 | Smoke Interlock |

---

## **Section 11: Security & Tech Subsystem (Non-Critical)**
*Secondary compute, AI Pattern Learning, and Camera pre-wire.*

| External MPN | Manufacturer | Internal ID | Description | Qty | Phase | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [NUC13ANKi7](https://www.asus.com/displays-desktops/mini-pcs/nuc-mini-pcs/asus-nuc-13-pro/tech-specs/) | ASUS | ASUS-NUC-AI | NUC 13 Pro (i7, 32GB RAM) | 1 | 2 | (Bernie) AI Development Node (Owner) |
| [MZ-V9P4T0B-AM](https://www.samsung.com/us/computing/memory-storage/solid-state-drives/990-pro-pcie-4-0-nvme-ssd-4tb-mz-v9p4t0b-am/) | Samsung | SSD-990-4TB | 990 Pro 4TB NVMe SSD | 1 | 2 | (Bernie) AI Storage |
| [UVC-G5-Pro](https://ui.com/camera-security/g5-pro) | Ubiquiti | UI-CAM-G5P | G5 Professional 4K Camera | 12 | 2 | (Bernie) **Phase 1: Pre-wire only** |

---

## **Section 12: Routing & Pro-Integrator Notes**

### **11.1 KNX Bus Topology (Redundant Loop Strategy)**
*   **Perimeter Run**: Route KNX Green Bus through all habitable walls at **48" AFF** (Switch Height).
*   **Ceiling/Attic Spine**: Provide a central bus run through the attic with drops to all bathroom sensor locations.
*   **Hardened Loop**: All major bus segments must be pulled as a **"Terminated Loop"**. Run the cable from the LCP, through the zone, and back to the LCP. **CRITICAL**: Only one end is to be connected to the bus power supply; the return tail must be labeled and capped. 

### **11.2 LCP Service Spares & Pre-Wire**
*   **Window Shades (Pre-Wire)**: Pull **16/4 Shielded Cable** from LCP-1/2 to every window header. Terminate in "Router & Rescue" vaults per *window-shade-wiring-prep.md*. Coil 3ft of slack in LCP, label, and do not terminate.
*   **LCP-1 (Garage)**: Pull **3x Spare Service Loops** (120V HV In + DUO Control Out) into the attic. **Note**: Requires an internal 15A outlet.
*   **LCP-2 (Office 2)**: Pull **3x Spare Service Loops** (120V HV In + DUO Control Out) into the attic. **Environmental Hub**: Weather station and PM2.5 sensors terminate here. **Note**: Requires an internal 15A outlet.

### **11.3 Box & Finish Standards**
*   **Deep Boxes**: Standardize on 2-1/8" deep steel boxes to allow for DALI relay pucks and KNX pigtail service loops.
*   **Floating Shields**: Drain wires on the KNX bus should be cut and taped at the device end; bond only at the LCP ground rail to prevent ground loops.
*   **Internal Service Receptacles**: Every LCP (1, 2, and 3) must include an internal single or duplex 15A outlet mounted to the enclosure chassis for network switch adapters and service use.

### **11.4 Security Puck (SR01) Placement**
*   **Anti-Tamper Protocol**: All **Akuvox SR01** security relays must be centralized in **LCP-3** (Tech Room). 
*   **NO LOCAL LOGIC**: Under no circumstances should the relay be placed near the door terminal. The connection from door to panel is RS485 encrypted data only. This prevents "paperclip" attacks on the lock hardware.
*   **Mounting**: All pucks to be DIN-rail mounted using official clips. Label each with the corresponding door name.
### **11.5 SPAN Panel Data Connectivity (AI Telemetry)**
*   **Physical Connection**: SPAN panels feature an **internal physical Ethernet port**. Use high-quality Shielded Cat6 (Cable Matters) for this link. Avoid Wi-Fi for telemetry to ensure zero-drop data for AI predictors.
*   **Local API Gateway**: SPAN panels must be commissioned on the **Core LAN** (not a guest/IoT isolate) to allow the AI compute nodes to poll the local API.
*   **Telemetry Frequency**: System must support high-frequency polling (~1Hz) of circuit-level power data for the AI pattern-learning predictors.
*   **Token Persistence**: The "Door Proximity" authentication (3x button press) is a **one-time setup step** to generate a persistent `accessToken`. This token is intended for long-term integration and does **not** requires daily door cycling.
*   **Handoff**: Ensure the integrator provides the permanent API token and static IP address for the Home Assistant SPAN integration bridge during site commissioning.
269: 
270: ### **11.6 Energy Wall Phase Logic**
271: *   **Phase 1 (Rough-in)**: Install all conduits (Section 8) and pull all 6x Cat6 Shielded cables (Section 18.2). This is critical to complete before drywall.
272: *   **Phase 2/3 (Hardware)**: Installation of the Garage Hub Switch, Modbus Gateways, and Hybrid Inverters is deferred. LCP-1 must reserve 6 DIN-rail modules of space for future telemetry gear.

---

## **Section 12: Patio Infrastructure (Pre-Wire Only)**
*High-Current Heating & Outdoor Fan Control*

| External MPN | Manufacturer | Internal ID | Description | Qty | Phase | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [28829001](https://www.southwire.com/wire-cable/non-metallic-sheathed-cable/romex-brand-simpull-nm-b-cable/p/28829001) | Southwire | CAB-10/2-NM | 10/2 Romex (30A 240V) | 3 | 1 | Heater Pre-wire |
| [PCS-DUO](https://www.southwire.com/wire-cable/non-metallic-sheathed-cable/romex-brand-simpull-pcs-duo-cable/p/PCS-DUO) | Southwire | CAB-NM-PCS | Romex PCS Duo (14/2 + 16/2) | 2 | 1 | Fan Pre-wire |
| [18/2 SHLD](https://www.southwire.com/wire-cable/control-cable/18-awg-2-conductor-shielded-control-cable/p/18-2-SHLD) | Southwire | CAB-DALI-G | 18/2 Shielded (DALI Bus) | 1 | 1 | Control Pre-wire |

### **12.1 Patio Implementation Notes**
*   **Heaters (18kW Plan)**: Pull 3x 30A dedicated circuits. Control is via DALI-2 relay/contactor logic (hardware deferred).
*   **Fans**: Pull power + control (Duo) for 2x Outdoor Haiku fans.
*   **Surge Protection**: All outdoor data/bus lines must include a DIN-rail surge protector at the LCP entry point.

---

## **Section 13: Known Missing & Future-Phase TBDs**

### **13.1 Aesthetic & Decorative Lighting (Pending Selection)**
*   **Chandeliers / Pendants**: Dining, Entry, and Kitchen Island fixtures are TBD. **Requirement**: All decorative junction boxes must be 2-1/8" deep to accommodate DALI-2 relay/dimmer pucks.
*   **Vanity Sconces**: All bathroom vanity lighting locations and fixtures are TBD.
*   **Outdoor Architectural Sconces**: Front entry and perimeter wall sconces are TBD.

### **13.2 Seasonal & Holiday Lighting (KNX Controlled)**
*   **Eave Outlets**: 2x Weatherproof outlets mounted under the roof eaves (North/South peaks) for Christmas/Holiday lighting. Home-run to **LCP-1**.
*   **Ground Seasonal Outlets**: 2x Weatherproof outlets at ground level (Front/Side) for seasonal displays. Home-run to **LCP-1**.
*   **Control Logic**: These 4 outlets must be terminated on a **KNX High-Inrush Relay Actuator** in LCP-1 for automated seasonal scheduling.

### **13.3 Exterior Infrastructure (Future Wiring)**
*   **Landscape Spine**: Pull 1" EMT conduit from Garage (LCP-1) to an external NEMA-3R landscape junction box for future landscape lighting expansion.
*   **Under-Awning Future-Proofing**: Pull **14/2 Southwire Duo** to 4 corners of the exterior roofline for future architectural accent lighting. 
*   **Security Camera Drops**: Ensure all 12 Ubiquiti camera locations (Section 5) have Cat6 home-runs to the Tech Room (LCP-3).

### **13.4 Closet & Storage Automation (WIC / Linen / Pantry)**
*   **Reed Switches (Primary)**: Install recessed magnetic contact switches (e.g., Tane Pill-V) in all closet door frames. Home-run 18/2 to the nearest LCP Binary Input.
*   **Stealth mmWave Pre-Wire**: Pull a KNX Bus "tail" to the center ceiling of each WIC and Linen closet. Coil 2ft of slack **above the drywall** (Stealth Vault). 
*   **Future sensor**: Prepared for **Creatrol 24G/60G mmWave** hidden installation (drywall penetration mode).
*   **Requirement**: NO physical light switches are to be installed in closets or small storage areas. Lighting must be 100% sensor/contact driven.

---

## **Section 15: Bathroom Amenities (Towel Warmers)**
*Electronic climate comfort home-run to LCP relay actuators.*

| External MPN | Manufacturer | Internal ID | Description | Qty | Phase | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [HREH06](https://www.hudsonreed.com/products/electric-towel-warmers) | Hudson Reed | REED-TW-LRG | 2-Towel Electric Warmer (Chrome) | 1 | 1 | Large Chrome Collection |
| [HREH02](https://www.hudsonreed.com/products/electric-towel-warmers) | Hudson Reed | REED-TW-SML | 1-Towel Electric Warmer (Chrome) | 5 | 1 | Small Chrome Collection |

### **15.1 Towel Warmer Notes**
*   **Control**: Home-run to **LCP-1/2 High-Inrush Relays**. No wall switches.
*   **Aesthetic**: Clean lines, polished chrome, hidden cable kit.
*   **Capacity**: Primary Bath unit must handle 2 towels; all others 1 towel.

---

## **Section 14: Products Struggling / TBD Direct Links**
The following products have generic or reseller links and require further direct manufacturer verification:
*   **Akuvox E16-A05H Hood**: Currently linked to Low Voltage Dealer. Direct Akuvox accessory page not found.
*   **Unitronic KNX Green Bus**: Current link is LAPP region-specific. Need a global spec sheet for North American compliance (LAPP USA).
*   **Warema Weather Station Pro**: Product ID 2064965 confirmed, but technical documentation is region-locked.
*   **MDT SCN-MBGW.01**: Verified as correct Modbus Gateway; need to confirm specific firmware features for AI PM2.5 interlock.

---

## **Section 16: System-Wide Cabling Schedule**
*Standardized wire types for all subsystems.*

| Subsystem | Wire/Cable Type | Manufacturer | External MPN | Listing / Status | Phase | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Power (Core)** | #2/0 AWG SER Aluminum | [Nassau National](https://nassaunationalcable.com/products/2-0-2-0-2-0-1-ser) | SER-2/0-AL | **UL Listed** | 1 | SPAN Panel Feeds |
| **Power (Core)** | 12/2 Romex SIMpull | [Nassau National](https://nassaunationalcable.com/products/12-2-w-grnd-nm-b-600v-solid-yellow) | NM-B-12/2 | **UL Listed** | 1 | Fridge, DW, 20A Branch |
| **Power (Core)** | 6/3 Romex SIMpull | [Nassau National](https://nassaunationalcable.com/products/6-3-w-grnd-nm-b-600v-stranded-black) | NM-B-6/3 | **UL Listed** | 1 | Range / Induction |
| **Power (Core)** | 14/2 Romex SIMpull | [Nassau National](https://nassaunationalcable.com/products/14-2-w-grnd-nm-b-600v-solid-white) | NM-B-14/2 | **UL Listed** | 1 | 15A Lighting / LCP |
| **Lighting/Fans** | Romex PCS Duo (14/2 + 16/2) | [Nassau National](https://nassaunationalcable.com/products/14-awg-2c-nm-b-pcs-duo-control-signal-copper-conductors-600v-white) | PCS-DUO | **UL Listed** | 1 | Power + Control |
| **KNX Bus** | 18/2 Shielded Twisted Pair | [Nassau National](https://nassaunationalcable.com/products/18-awg-2-conductor-shielded-multi-conductor-cable) | 8760-EQ | **UL Listed** | 1 | KNX Bus Pair |
| **Shade Power** | 16/4 Shielded Cable | [Nassau National](https://nassaunationalcable.com/products/16-awg-4-conductor-shielded-multi-conductor-cable) | 16/4-SHLD | **UL Listed** | 1 | Window Shade Prep |
| **DALI/Signal** | 18/2 Shielded Control | Southwire | [18-2-SHLD](https://www.homedepot.com/p/Southwire-100-ft-18-2-Shielded-Communication-Cable-55307221/300642277) | 1 | 0-10V or DALI Bus |
| **Network (SHLD)** | Cat6 Shielded (F/UTP) | Cable Matters | [160012](https://www.cablematters.com/pc-892-160-cat-6a-snagless-shielded-sstpsftp-ethernet-patch-cable.aspx) | 1 | Core Network Standard |
| **Network (Bulk)** | Cat6 UTP (Bulk) | Cable Matters | [160010](https://www.cablematters.com/pc-892-160-cat-6a-snagless-shielded-sstpsftp-ethernet-patch-cable.aspx) | 1 | General Wall Jacks |
| **Backbone (Fiber)** | 4-Core OS2 Singlemode | FS.com | [151525](https://www.fs.com/products/151525.html) | 1 | 48-Fiber LC Patch Panel (OM4) |
| **Consumables** | KNX Push-Wire Connectors | Wago | 243-211 | 1 | Red/Black (Box 50) |

---

## **Section 18: Inter-Zone Backbone Schedule**
*Trunk lines linking regions to the Server Rack. Fiber provides electrical isolation and 10G+ potential.*

| Trunk Link | Primary Medium | Redundant Medium | Phase | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **LCP-2 (Office) <--> Rack** | 4-Core OS2 Fiber | 1x Cat6 Shielded | 1 | Logic Hub Trunk (10G Link) |
| **LCP-1 (Garage) <--> Rack** | 2x Cat6 Shielded | - | 1 | Uplink (Aggregated Data) |
| **Energy Wall <--> LCP-1** | 6x Cat6 Shielded | 1x 18/2 SHLD | 1 | Local Comm (Telemetery Hub) |
| **LCP-3 (Security) <--> Rack** | 1x Cat6 Patch | - | 1 | Local Tech Room Link |
| **Media Center <--> Rack** | 4-Core OS2 Fiber | 1x Cat6 Shielded | 1 | 8K Future-Ready Media Trunk |

### **18.1 Fiber Deployment Notes**
* **Fiber Selection**: Use **Armored Pre-terminated Singlemode (OS2)**. These come with pulling eyes and a protective sleeve.
* **Cost**: ~100ft runs are roughly **$75 - $110**. It is cheaper than high-end shielded copper over length.
* **Transceivers**: Use standard **10G SFP+ Single Mode modules** (~$20/ea). You can swap these for 25G/40G modules in the future without re-pulling the glass.
* **Difficulty**: With "armored" versions, you can pull them like standard Romex. No special high-sensitivity handling required.

### **18.2 Energy Wall Communication (Solar/Battery)**
*   **Infrastructure**: Pull **6x Cat6 Shielded (F/UTP)** cables from the Energy Wall junction box directly to **LCP-1 (Garage)**.
*   **Rationale**: LCP-1 acts as the local "Data Aggregator." By terminating here, we can use local **Modbus-to-Ethernet gates** (Section 2) to bridge serial inverter data onto the network before sending it up the 2x Cat6 backbone to the Server Rack/AI Center.
*   **Point-to-Point**: Critical interop (Inverter <-> Battery BMS) remains local on the wall; these cables are for "Northbound" data collection and external control.
*   **Usage Map (at LCP-1 Switch)**:
    *   **Drop 1-2**: RS485 Modbus for Inverter data.
    *   **Drop 3**: CAN-Bus monitoring.
    *   **Drop 4**: Local Ethernet Web Gateway.
    *   **Drop 5-6**: External SPAN Panel Ethernet ports.
*   **Labeling**: Both ends must be clearly labeled "ENERGY-COMM-1" through "ENERGY-COMM-6".

---

---

## **Section 17: Load Control Panel Circuit Schedule**
*Defines the 120V Feeder lines from the SPAN panels to the automation enclosures.*

### **17.1 LCP-1 Feed Breakdown (Garage / Main)**
| ID | Load Description | Rating | Notes |
| :--- | :--- | :--- | :--- |
| **L1-01** | **Automation Logic** | 15A | ABB/Siemens/MeanWell PSUs |
| **L1-02** | **Kitchen/Pantry Lighting** | 15A | DALI-2 Driver Hub |
| **L1-03** | **Family/Living/Entry Lighting** | 15A | DALI-2 Driver Hub |
| **L1-04** | **Exterior/Landscape Lighting** | 15A | Perimeter Sconces / Pre-wire |
| **L1-05** | **Interior Accent Lighting** | 15A | eldoLED Tape Drivers (6) |
| **L1-06** | **Whole House Fan 1 (HV)** | 15A | 8.6A High-Inrush (EC Motor) |
| **L1-07** | **Whole House Fan 2 (HV)** | 15A | 8.6A High-Inrush (EC Motor) |
| **L1-08** | **Attic Fans / Ventilation** | 15A | 4x Gable Fans (4.0A Total) |
| **L1-09** | **Seasonal Outlets** | 15A | KNX Relay (Eaves/Ground) |
| **L1-10** | **Reserved (Spare 1)** | 15A | - |
| **L1-11** | **Reserved (Spare 2)** | 15A | - |
| **L1-12** | **Reserved (Spare 3)** | 15A | - |

### **17.2 LCP-2 Feed Breakdown (Office / Master)**
| ID | Load Description | Rating | Notes |
| :--- | :--- | :--- | :--- |
| **L2-01** | **Automation Logic / NUC** | 15A | Logic controller & Hub |
| **L2-02** | **Primary Suite Lighting** | 15A | DALI-2 Zone |
| **L2-03** | **Bedrooms 2/3/4 & Hall Lighting** | 15A | DALI-2 Zone |
| **L2-04** | **Primary/Master Accent Light** | 15A | eldoLED Tape Drivers (6) |
| **L2-05** | **Primary Bath Towel Warmer** | 15A | Dedicated KNX Relay |
| **L2-06** | **Guest/Kids Towel Warmer Group** | 15A | ~8A Continuous Load (5 rails) |
| **L2-07** | **Mechanical/Bath Vents** | 15A | All Bedroom Wing Fans |
| **L2-08** | **Environmental (Skylight/Weath)** | 15A | Logic + 24V Drive |
| **L2-09** | **Reserved (Spare 1)** | 15A | - |
| **L2-10** | **Reserved (Spare 2)** | 15A | - |
| **L2-11** | **Reserved (Spare 3)** | 15A | - |

### **17.3 LCP-3 Feed Breakdown (Tech Room / Security)**
| ID | Load Description | Rating | Notes |
| :--- | :--- | :--- | :--- |
| **L3-01** | **LCP-3 Logic (Managed)** | 15A | Altronix EFlow 104N |
| **L3-02** | **Internal IT Receptacle** | 15A | Switch / Aux / Service |
| **L3-03** | **Reserved (Spare 1)** | 15A | - |
| **L3-04** | **Reserved (Spare 2)** | 15A | - |
| **L3-05** | **Reserved (Spare 3)** | 15A | - |

---

## **Section 19: Architectural Fixture Decision Matrix**
*Decisions required in Phase 1 to ensure automation hardware (DALI-2) matches fixture electronics.*

| Area | Lighting Category | Hardware Needed | Phase | Decision Status |
| :--- | :--- | :--- | :--- | :--- |
| **Outdoor Walls** | Architectural Sconces | DALI-2 Native Driver | 1 | **TBD**: Need DALI-2 Native IP65 |
| **Front Entry** | Foyer Pendant / Art | DALI-2 Phase Puck | 1 | **TBD**: Decision Req. |
| **Dining Room** | Large Feature Pendant | DALI-2 Phase Puck | 1 | **TBD**: Decision Req. |
| **Primary Bath** | Mirror / Ornamental (4) | DALI-2 Phase Puck | 1 | **TBD**: 4x Decisions Req. |
| **Other Baths (4)** | Aesthetic Vanities | DALI-2 Phase Puck | 1 | **TBD**: 1 per bath |
| **Bedrooms (3)** | Center Feature Lights | DALI-2 Phase Puck | 1 | **TBD**: Bed 3, 4, Guest |
| **Main Garage** | Workhorse LED Tape | DALI-2 LED Driver | 2 | **TBD**: Phase 2 Install |
| **Living / Hall** | Accent Pendants | DALI-2 Phase Puck | 3 | **TBD**: Phase 3 Finish |

### **19.1 Decision Notes**
*   **DALI-2 Native vs. Puck**: Priority is to find DALI-2 native fixtures (especially for outdoor), but pucks (Section 7.1) are the fallback for standard 120V dimmable LEDs.
*   **Box Depth**: Reminder for electrician—all fixture locations in this matrix **MUST** use 2-1/8" deep steel boxes to allow for recessed puck installation.
