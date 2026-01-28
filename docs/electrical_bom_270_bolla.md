# **Project Bill of Materials (BOM) - 270 Bolla Ave**

**Project Name:** 270 Bolla Ave  
**Document Type:** Integrated Systems Specification  
**Integrator Draft:** v1.5 (NUC Standardization & Controller Roles)

---

## **Revision History**
| Version | Date | Description | Status |
| :--- | :--- | :--- | :--- |
| v1.0 | 2026-01-26 | Initial Draft (Core Infrastructure) | Archived |
| v1.1 | 2026-01-27 | Panel Consolidation & Door Entry Re-Spec | Archived |
| v1.2 | 2026-01-27 | Unified DC Security Island & Environmental Hub | Archived |
| v1.3 | 2026-01-27 | Official Part Verification & Manufacturer Hyperlinks | Archived |
| v1.4 | 2026-01-27 | Final Systematic URL Verification & Project Correction | Archived |
| v1.5 | 2026-01-27 | ASUS NUC 13 Standardization across LCP-2/LCP-3 | **Current** |

---

## **1. Project Objectives & System Organization**
The automation system at 270 Bolla Ave is designed for maximum reliability, security hardening, and high-fidelity environmental control. The architecture is organized into three localized **Load Control Panels (LCPs)** to minimize home-run copper and isolate failure domains:

*   **LCP-1 (Garage)**: The "Power Hub" for central living areas, kitchen lighting, and high-inrush holiday circuits.
*   **LCP-2 (Office 2)**: The "Environmental Hub" and Master Wing controller. Houses weather station logic, PM2.5 wildfire interlocks, and master bedroom lighting.
*   **LCP-3 (Tech Room)**: The "Security Island." A 100% battery-backed, DC-powered enclosure that manages 3D face recognition and entry without cloud dependency.

**Core Standards**: All lighting is **DALI-2** (addressable). All logic and switching is **KNX** (distributed). Infrastructure is "Future-Proofed" via stealth pre-wiring for window shades and seasonal exterior lighting.

---

## **Section 1: High-Voltage (HV) Infrastructure**
*Main Service & Smart Panel Telemetry*

| External MPN | Manufacturer | Internal ID | Description | Qty | Location | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [1-03294-02](https://www.span.io/products/main-32) | SPAN | SPAN-GEN2 | Smart Panel Gen 2 (32-Circuit) | 2 | Garage | Main Service (Side-by-side) |
| [1-03294-02](https://www.span.io/products/main-32) | SPAN | SPAN-SUB | Smart Panel Gen 2 (32-Circuit) | 1 | North Wall | Sub-Panel for Left Wing |
| [13103701](https://www.southwire.com/wire-cable/building-wire/ser-aluminum-service-entrance/p/13103701) | Southwire | SER-1-AL | #1 AWG Aluminum SER Cable | - | Field | Sub-SPAN Feed from Main |
| [28828201](https://www.southwire.com/wire-cable/non-metallic-sheathed-cable/romex-brand-simpull-nm-b-cable/p/28828201) | Southwire | NM-B-12/2 | 12/2 Romex (High Current Loads) | - | Field | Direct to SPAN (Fridge, Range, etc) |

---

## **Section 2: Load Control Panel 1 (LCP-1) (Garage) - Kitchen/Main Hub**
*The automation core for the central living areas.*
* **Enclosure**: Saginaw SCE-24H2408LP
* **Dimensions (Outside)**: 24.00" x 24.00" x 8.00" (610 x 610 x 203 mm)
* **Dimensions (Inside Usable)**: 24.00" x 24.00" x 7.75" (610 x 610 x 197 mm)
* **Depth Note**: 8" (203mm) nominal depth easily accommodates the 128.5mm (5.1") Mean Well SDR-480.

| External MPN | Manufacturer | Internal ID | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [SCE-24H2408LP](https://saginawcontrol.com/product/sce-24h2408lp/) | Saginaw | SAG-24H2408 | 24x24x8 NEMA 4/12 Enclosure | 1 | Hinged Cover |
| [SDR-480-24](https://www.meanwell.com/productDetail.aspx?i=318) | Mean Well | MW-SDR-480 | 480W 24V DC PSU (UL 508) | 1 | Main Logic Power |
| [SV/S 30.640.5.1](https://new.abb.com/products/2CDG110146R0011/sv-s30-640-5-1) | ABB | ABB-KNX-PS | KNX Power Supply 640mA | 1 | Powers Line 1.1 |
| [LK/S 4.2](https://new.abb.com/products/2CDG110171R0011/lk-s-4-2) | ABB | ABB-LK-S | KNX Line Coupler | 1 | Connects 1.1 to Backbone |
| [CBM E4 24DC/0.5-10A-NO](https://www.phoenixcontact.com/en-pc/products/2905743) | Phoenix Contact | PHX-CBM-E4 | Electronic Circuit Protector | 1 | NEC Class 2 Compliance |
| [5WG1141-1AB03](https://hit.sbt.siemens.com/RWD/app.aspx?module=Catalog&action=ShowProduct&key=5WG1141-1AB03) | Siemens | SIE-DALI-GW | KNX/DALI Gateway Twin N 141/03 | 1 | Universes 1 & 2 |
| [1060/A](https://www.eldoled.com/products/detail/1990764/eldoled/solodrive-100w-indoor-linear-1060a) | eldoLED | ELD-PWR-100 | 100W DALI-2 LED Driver | 6 | Garage/Kitchen/Living Tape |
| [86458668](https://www.lunatone.com/en/product/dali-rm8-0-10v-pwm/) | Lunatone | LUN-DALI-010 | DALI 0-10V PWM Interface | 1 | Powder Room Fan Control |

---

## **Section 3: Load Control Panel 2 (LCP-2) (Office 2) - Master Wing Hub**
*The automation core for the Master Bedroom, Bedrooms 3/4, and local environmental logic.*
* **Enclosures**: nVent HOFFMAN ASE24X12X4NK / ASE12X12X4
* **Inside Dimensions**: 
    *   Top (24x12): 23.8" x 11.8" x 3.87" (605 x 300 x 98 mm)
    *   Bottom (12x12): 11.8" x 11.8" x 3.87" (300 x 300 x 98 mm)
* **Depth Note**: **MAX COMPONENT DEPTH 3.5" (89mm)**. No SDR-series PSUs allowed here; use MDR or SV/S series only. (NUC fits @ 37mm).

| External MPN | Manufacturer | Internal ID | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [ASE24X12X4NK](https://www.nvent.com/en-us/hoffman/products/screw-cover-enclosure-type-1-no-knockouts-ase24x12x4nk) | nVent HOFFMAN | HOF-ASE24X12X4 | Automation Enclosure (24x12x4) | 1 | LCP-2 Top Box (DIN Rail) |
| [ASE12X12X4](https://www.nvent.com/en-us/hoffman/products/screw-cover-enclosure-type-1-ase12x12x4) | nVent HOFFMAN | HOF-ASE12X12X4 | Network/Aux Enclosure (12x12x4) | 1 | LCP-2 Bottom Box (Switches) |
| [NUC13ANKi5](https://www.asus.com/displays-desktops/mini-pcs/nuc-mini-pcs/asus-nuc-13-pro/) | ASUS | ASUS-NUC-13 | NUC 13 Pro (i5, 16GB RAM) | 1 | Master Logic Controller (KNX/DALI Hub / HomeWorks-Class Automation) |
| [SV/S 30.640.5.1](https://new.abb.com/products/2CDG110146R0011/sv-s30-640-5-1) | ABB | ABB-KNX-PS | KNX Power Supply 640mA | 1 | Powers Line 1.2 |
| [LK/S 4.2](https://new.abb.com/products/2CDG110171R0011/lk-s-4-2) | ABB | ABB-LK-S | KNX Line Coupler | 1 | Connects 1.2 to Backbone |
| [5WG1141-1AB03](https://hit.sbt.siemens.com/RWD/app.aspx?module=Catalog&action=ShowProduct&key=5WG1141-1AB03) | Siemens | SIE-DALI-GW | KNX/DALI Gateway Twin | 1 | Universes 3 & 4 |
| [1060/A](https://www.eldoled.com/products/detail/1990764/eldoled/solodrive-100w-indoor-linear-1060a) | eldoLED | ELD-PWR-100 | 100W DALI-2 LED Driver | 6 | Master Bed Accent/Coves |
| [86458668](https://www.lunatone.com/en/product/dali-rm8-0-10v-pwm/) | Lunatone | LUN-DALI-010 | DALI 0-10V PWM Interface | 4 | Bath/Laundry Fan Controls |

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

| External MPN | Manufacturer | Internal ID | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [SCE-24H2408LP](https://saginawcontrol.com/product/sce-24h2408lp/) | Saginaw | SAG-24H2408 | 24x24x8 NEMA Enclosure | 1 | Hinged Cover (Security MDF) |
| [eFlow104N](https://www.altronix.com/products/eFlow104N) | Altronix | ALT-EFLOW104N | 10A Power Supply/Charger | 1 | Managed DC Rail |
| [NP12-12](https://www.yuasa.co.uk/np12-12.html) | Yuasa | BATT-12AH | 12V 12Ah SLA Battery | 2 | 24V String (Powers NUC/Switch/Locks) |
| [DDR-60G-15](https://www.meanwell.com/productDetail.aspx?i=845) | Mean Well | MW-DDR-60G-15 | 24V to 15V DC-DC Converter | 1 | Power for NUC (Adj. to 18V) |
| [NUC13ANKi5](https://www.asus.com/displays-desktops/mini-pcs/nuc-mini-pcs/asus-nuc-13-pro/) | ASUS | ASUS-NUC-13 | NUC 13 Pro (i5, 16GB RAM) | 1 | Security Brain (Akuvox SDMC Server / 3D Door Entry) |
| [IES210GPP](https://www.tp-link.com/en/business-networking/omada-sdn-switch/ies210gpp/) | TP-Link | TPL-IES210GPP | Industrial 10-Port PoE+ Switch | 1 | DC-Input (12-55V) PoE Source |
| [SR01](https://akuvox.com/productsDisp?pid=74) | Akuvox | AKU-SR01 | Secure Relay Module | 4 | DIN-Rail Mounted via Clips |
| [BE/S 16.20.3.2](https://new.abb.com/products/2CDG110278R0011/be-s16-20-3-2-binary-input-16-fold-md) | ABB | ABB-BIN-16 | 16-fold Binary Input | 1 | Security/Status Monitoring |

---

## **Section 4: KNX Infrastructure (Field)**
*User Interfaces and Sensors*

### **4.1 Backbone & IP Connectivity**
| External MPN | Manufacturer | Internal ID | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [IPS/S 3.1.1](https://new.abb.com/products/2CDG110177R0011/ips-s3-1-1) | ABB | ABB-IPS-S | KNX IP Interface Secure | 1 | In LCP-2 - High-Speed Logic Link |
| [USB/S 1.2](https://new.abb.com/products/2CDG110243R0011/usb-s-1-2) | ABB | ABB-USB-S | KNX USB Interface | 1 | In LCP-2 - Local Diagnostic Backup |
| [SV/S 30.160.1.1](https://new.abb.com/products/2CDG110130R0011/sv-s30-160-1-1) | ABB | ABB-PS-160 | KNX Power Supply 160mA | 1 | Powers the Main Backbone Line |

### **4.2 Sensors (Environmental & Presence)**
| External MPN | Manufacturer | Internal ID | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [056353](https://www.steinel.de/en/group/sensors/smart-space-sensors/true-presence/multisensor-true-presence-knx-056353.html) | Steinel | STE-TP-KNX | True Presence Multisensor KNX | 4 | Primary Bath, Guest, Bath 3, Laundry |
| [BE/S 16.20.3.2](https://new.abb.com/products/2CDG110278R0011/be-s16-20-3-2-binary-input-16-fold-md) | ABB | ABB-BIN-16 | 16-fold Binary Input | 2 | Door/Window Contacts (In LCPs) |

### **4.3 User Interfaces & Cabling**
| External MPN | Manufacturer | Internal ID | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [Sentido 4-way](https://www.basalte.be/en/products/sentido) | Basalte | BAS-SENT-4 | Sentido (4-Button) Switch | 12 | Minimal code-required placement |
| [KNX Bus Coupler](https://www.basalte.be/en/products/sentido) | Basalte | BAS-BUS-COU | KNX Bus Coupler for Sentido | 12 | Required for switch connection |
| [UNITRONIC BUS EIB/KNX](https://lapplimited.lappgroup.com/products/data-communication-systems/bus-systems/knx-eib.html) | Unitronic | CAB-KNX-G | KNX Green Bus Cable (UL) | 1 | 1000ft Spool |
| [243-211](https://www.wago.com/global/installation-terminal-blocks-and-connectors/p/243-211) | Wago | WAG-KNX-CONN | KNX Push-Wire Connectors | 2 | Red/Black (Boxes of 50) |

---

## **Section 5: Network & AI Compute (Office 2 / MDF Hub)**
*Secondary compute and data storage in rack.*

| External MPN | Manufacturer | Internal ID | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [NUC13ANKi7](https://www.asus.com/displays-desktops/mini-pcs/nuc-mini-pcs/asus-nuc-13-pro/tech-specs/) | ASUS | ASUS-NUC-AI | NUC 13 Pro (i7, 32GB RAM) | 1 | AI Compute Node (Pattern Learning/LLM) |
| [MZ-V9P4T0B-AM](https://www.samsung.com/us/computing/memory-storage/solid-state-drives/990-pro-pcie-4-0-nvme-ssd-4tb-mz-v9p4t0b-am/) | Samsung | SSD-990-4TB | 990 Pro 4TB NVMe SSD | 1 | High-endurance for AI/Logging |
| [USW-Pro-Max-24-PoE](https://ui.com/switching/pro-max-24-poe) | Ubiquiti | UI-SW-PRO-24 | UniFi Pro Max 24 PoE | 1 | Core PoE Backbone |
| [UVC-G5-Pro](https://ui.com/camera-security/g5-pro) | Ubiquiti | UI-CAM-G5P | G5 Professional 4K Camera | 12 | 12x Camera home-runs required |
| [PDU15B10R](https://www.cyberpowersystems.com/product/pdus/basic/pdu15b10r/) | CyberPower | CYB-PDU-1U | 1U Rack PDU | 1 | Powers Server & Network Gear |
| [SMT1500C](https://www.apc.com/us/en/product/SMT1500C/) | APC | APC-UPS-1500 | Smart-UPS 1500VA | 1 | Backup for Linux Box & AI Nodes |

---

## **Section 6: Ventilation & Fans**
*Whole-House, Attic, and Bathroom Exhaust (EC Motors + DALI-2 Control)*

### **6.1 Whole-House Fans (WHF)**
| External MPN | Manufacturer | Internal ID | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [Stealth Pro 7.0X](https://quietcoolsystems.com/whole-house-fan/stealth-pro-x-whole-house-fan/) | QuietCool | QC-STL-7.0X | Stealth Pro 7.0X (ECM Motor) | 2 | 1 per arm of U-shape |
| [SR-2701S-DT7](https://www.sunricher.com/dali-2-relay-module-sr-2701S-dt7.html) | Sunricher | SUN-2701S-DT7 | DALI-2 Relay Puck | 2 | UR Recognized - Power On/Off |
| [SR-2303-0-10V-PWM](https://www.sunricher.com/dali-to-0-10v-pwm-sr-2303-0-10v-pwm.html) | Sunricher | SUN-2401-10V | DALI to 0-10V Signal Converter | 2 | UR Recognized - Variable Speed |

### **6.2 Attic Exhaust Fans**
| External MPN | Manufacturer | Internal ID | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [AFG SMT PRO-3.0](https://quietcoolsystems.com/attic-fan/smart-gable-attic-fans/) | QuietCool | QC-AFG-3.0 | AFG SMT PRO-3.0 Gable Fan | 4 | 2 per gable end |
| [SR-2701S-DT7](https://www.sunricher.com/dali-2-relay-module-sr-2701S-dt7.html) | Sunricher | SUN-2701S-DT7 | DALI-2 Relay Puck | 4 | UR Recognized - Power On/Off |
| [SR-2303-0-10V-PWM](https://www.sunricher.com/dali-to-0-10v-pwm-sr-2303-0-10v-pwm.html) | Sunricher | SUN-2401-10V | DALI to 0-10V Signal Converter | 4 | UR Recognized - Variable Speed |

### **6.3 Bathroom & Laundry Exhaust**
| Location | Fan Motor | Silencer | Backdraft Damper | Diffuser (InviAir) |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Bath** | [Fantech FG 6M EC](https://www.fantech.net/en-us/products/fans-and-accessories/inline-duct-fans/fg/?sku=49900) | Fantech LD 6 | RSK 6 | L100 (60") + S100 (6") |
| **Bath 2 (Kids)** | [Fantech FG 6M EC](https://www.fantech.net/en-us/products/fans-and-accessories/inline-duct-fans/fg/?sku=49900) | Fantech LD 6 | RSK 6 | L100 (48") |
| **Bath 3 (Ens)** | [Fantech FG 6M EC](https://www.fantech.net/en-us/products/fans-and-accessories/inline-duct-fans/fg/?sku=49900) | Fantech LD 6 | RSK 6 | L100 (48") |
| **Guest Bath** | [Fantech FG 6M EC](https://www.fantech.net/en-us/products/fans-and-accessories/inline-duct-fans/fg/?sku=49900) | Fantech LD 6 | RSK 6 | L100 (60") |
| **Laundry Room** | [Fantech FG 6M EC](https://www.fantech.net/en-us/products/fans-and-accessories/inline-duct-fans/fg/?sku=49900) | Fantech LD 6 | RSK 6 | S100 (8") |
| **Half Bath** | [Fantech FG 6M EC](https://www.fantech.net/en-us/products/fans-and-accessories/inline-duct-fans/fg/?sku=49900) | Fantech LD 6 | RSK 6 | S100 (6") |

### **6.4 Environmental AI Inputs**
| External MPN | Manufacturer | Internal ID | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [056353](https://www.steinel.de/en/group/sensors/smart-space-sensors/true-presence/multisensor-true-presence-knx-056353.html) | Steinel | STE-TP-KNX | True Presence Multisensor KNX | 4 | Primary, Guest, Bath 3, Laundry |
| [2064965](https://www.warema.com/en/controls/knx/weather-station-pro-reg.html) | Warema | WAR-WETH-PRO | KNX Weather Station Pro | 1 | Outdoor (North Wall) |
| [OAL-PM2.5](https://temcocontrols.com/shop/outdoor-pm2-5-sensor/) | Temco | TEM-PM25 | Outdoor PM2.5 Sensor (Modbus) | 1 | Wildfire Smoke Interlock |
| [SCN-MBGW.01](https://www.mdt.de/en/products/modbus-gateway.html) | MDT | MDT-SCN-MB | KNX/Modbus Gateway | 1 | Bridge for PM2.5 Data |

---

## **Section 7: Field Devices - Lighting (DALI-2)**
*Based on current floor plan placements.*

| External MPN | Manufacturer | Internal ID | Description | Qty | Type | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [X-Series](https://www.dmflighting.com/product/x-series/) | DMF Lighting | DMF-X2-SQ-FL | X-Series Square Flangeless | 80 | Recessed | UL Listed (IC-rated/Wet) |
| [X-Series Wet](https://www.dmflighting.com/product/x-series/) | DMF Lighting | DMF-X2-WET | X-Series Sq Flangeless (Wet) | 4 | Recessed | 1 per Shower/Tub |
| [Haiku 52"](https://store.bigassfans.com/en_us/haiku) | Big Ass Fans | BAF-HAIKU-52 | Haiku 52" Aluminum | 3 | Fan+Light | Requires 0-10V Int |
| [PCS-DUO](https://www.southwire.com/wire-cable/non-metallic-sheathed-cable/romex-brand-simpull-pcs-duo-cable/p/PCS-DUO) | Southwire | CAB-NM-PCS | Romex PCS Duo (14/2 + 16/2) | 3 | Spools | Power+Control for Lights & Fans |

---

## **Section 8: Bulk Infrastructure & Consumables**

| Item | Manufacturer | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- |
| [CAB-KNX-G](https://products.lappgroup.com/online-catalogue/data-communication-systems/bus-system-eib/fixed-installation/unitronic-bus-eib-knx.html) | Unitronic | KNX Green Bus Cable (UL) | TBD | CMG/PLTC Rated |
| [CAB-CAT6-RIS](https://www.truecable.com/products/cat6-riser-ethernet-cable-unshielded) | TrueCable | Cat6 Riser (Bulk) | TBD | UL Listed (E497331) |
| [CAB-16/4-SHLD](https://www.southwire.com/wire-cable/control-cable/16-awg-4-conductor-stranded-shielded-control-cable/p/16-4-SHLD) | Southwire | 16/4 Shielded (Shade Pre-wire) | TBD | Home-run to LCP-1/2 |
| [BOX-SQ-4IN](https://www.hubbell.com/raco/en/Products/Electrical-Electronic/Boxes/4-in-Square-Boxes-Covers/4-in-Square-Box-2-18-in-Deep-with-Conduit-KOs/p/1670609) | Hubbell | 4" Square Steel Box (2-1/8" D) | - | Deep boxes for DALI pucks |
| [BOX-FIRE-PAD](https://www.stifirestop.com/products/specseal-putty-pads) | STI | SpecSeal Putty Pad | 1 | Required for Garage Intercom |
| [CON-EMT-1IN](https://www.westerntube.com/products/emt/) | Western Tube | 1" EMT Conduit | 2 | Solar Roof-Runs |
| [CON-EMT-2.5IN](https://www.westerntube.com/products/emt/) | Western Tube | 2.5" EMT Conduit | 2 | Energy Wall Super-Conduit |

---

## **Section 9: Door Entry & Access Control (Akuvox)**
*3D Face Recognition & SIP Intercom System*

| External MPN | Manufacturer | Internal ID | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [X915S](https://www.akuvox.com/productsDisp?pid=37) | Akuvox | AKU-X915S | 8" 3D Face Recognition Intercom | 1 | Front Door (CE/FCC) |
| [E16C](https://www.akuvox.com/productsDisp?pid=39) | Akuvox | AKU-E16C | 5" 3D Face Recognition Intercom | 3 | Garage/Side/Laundry |
| [E16-A05H](https://lowvoltagedealer.com/akuvox-e16-a05h-sun-shield-rain-hood-for-e16-a05/) | Akuvox | AKU-E16-HOOD | Sun Shield / Rain Hood | 1 | For Garage Man Door |
| [S567G](https://www.akuvox.com/productsDisp?pid=82) | Akuvox | AKU-S567G | 10" Android 12 Indoor Monitor | 1 | Hallway Tablet (Main) |
| [1006-CS](https://www.hesinnovations.com/en/products/electric-strikes/1006-series) | HES | HES-1006 | Heavy Duty Electric Strike | 4 | UL 1034 Listed |
| [SR01](https://akuvox.com/productsDisp?pid=74) | Akuvox | AKU-SR01 | Secure Relay Module | 4 | Centralized in LCP-3 |

---

## **Section 10: Motorized Skylights & HVAC Integration**
*Centralized 24V DC Actuation & Weather Logic*

| External MPN | Manufacturer | Internal ID | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [JAL-0810.02](https://www.mdt.de/en/products/product-detail/actuators/shutter-actuators/shutter-actuators-jal.html) | MDT | MDT-JAL-0810 | 8-fold Shutter Actuator (24V DC) | 1 | KNX Certified (No UL) |
| [INKNXMBM100](https://www.intesis.com/products/knx-gateways/modbus-knx-gateways/modbus-rtu-knx-client-inknxmbm1000000) | Intesis | INT-MOD-KNX | HVAC Modbus to KNX Gateway | 1 | Bridge for AC/Heat |
| [MDR-100-24](https://www.meanwell.com/webapp/product/search.aspx?prod=MDR-100) | Mean Well | MW-MDR-100-24 | 100W 24V DC DIN-Rail PSU | 1 | UL 508 Listed |
| [2064965](https://www.warema.com/en/controls/knx/weather-station-pro-reg.html) | Warema | WAR-WETH-PRO | KNX Weather Station Pro | 1 | Home-runs to LCP-2 |
| [OAL-PM2.5](https://temcocontrols.com/shop/outdoor-pm2-5-sensor/) | Temco | TEM-PM25 | Outdoor PM2.5 Sensor (Modbus) | 1 | Home-runs to LCP-2 |

---

## **Section 11: Routing & Pro-Integrator Notes**

### **11.1 KNX Bus Topology (Redundant Loop Strategy)**
*   **Perimeter Run**: Route KNX Green Bus through all habitable walls at **48" AFF** (Switch Height).
*   **Ceiling/Attic Spine**: Provide a central bus run through the attic with drops to all bathroom sensor locations.
*   **Hardened Loop**: All major bus segments must be pulled as a **"Terminated Loop"**. Run the cable from the LCP, through the zone, and back to the LCP. **CRITICAL**: Only one end is to be connected to the bus power supply; the return tail must be labeled and capped. 

### **11.2 LCP Service Spares & Pre-Wire**
*   **Window Shades (Pre-Wire)**: Pull **16/4 Shielded Cable** from LCP-1/2 to every window header. Terminate in "Router & Rescue" vaults per *window-shade-wiring-prep.md*. Coil 3ft of slack in LCP, label, and do not terminate.
*   **LCP-1 (Garage)**: Pull **3x Spare Service Loops** (120V HV In + DUO Control Out) into the attic. 
*   **LCP-2 (Office 2)**: Pull **3x Spare Service Loops** (120V HV In + DUO Control Out) into the attic. **Environmental Hub**: Weather station and PM2.5 sensors terminate here.

### **11.3 Box & Finish Standards**
*   **Deep Boxes**: Standardize on 2-1/8" deep steel boxes to allow for DALI relay pucks and KNX pigtail service loops.
*   **Floating Shields**: Drain wires on the KNX bus should be cut and taped at the device end; bond only at the LCP ground rail to prevent ground loops.

### **11.4 Security Puck (SR01) Placement**
*   **Anti-Tamper Protocol**: All **Akuvox SR01** security relays must be centralized in **LCP-3** (Tech Room). 
*   **NO LOCAL LOGIC**: Under no circumstances should the relay be placed near the door terminal. The connection from door to panel is RS485 encrypted data only. This prevents "paperclip" attacks on the lock hardware.
*   **Mounting**: All pucks to be DIN-rail mounted using official clips. Label each with the corresponding door name.

---

## **Section 12: Patio Infrastructure (Pre-Wire Only)**
*High-Current Heating & Outdoor Fan Control*

| External MPN | Manufacturer | Internal ID | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [28829001](https://www.southwire.com/wire-cable/non-metallic-sheathed-cable/romex-brand-simpull-nm-b-cable/p/28829001) | Southwire | CAB-10/2-NM | 10/2 Romex (30A 240V) | 3 | Sub-SPAN to Heater J-Box |
| [PCS-DUO](https://www.southwire.com/wire-cable/non-metallic-sheathed-cable/romex-brand-simpull-pcs-duo-cable/p/PCS-DUO) | Southwire | CAB-NM-PCS | Romex PCS Duo (14/2 + 16/2) | 2 | LCP-2 to Patio Fans |
| [18/2 SHLD](https://www.southwire.com/wire-cable/control-cable/18-awg-2-conductor-shielded-control-cable/p/18-2-SHLD) | Southwire | CAB-DALI-G | 18/2 Shielded (DALI Bus) | 1 | LCP-2 to Heater J-Box |

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

## **Section 14: Products Struggling / TBD Direct Links**
The following products have generic or reseller links and require further direct manufacturer verification:
*   **Akuvox E16-A05H Hood**: Currently linked to Low Voltage Dealer. Direct Akuvox accessory page not found.
*   **Unitronic KNX Green Bus**: Current link is LAPP region-specific. Need a global spec sheet for North American compliance (LAPP USA).
*   **Warema Weather Station Pro**: Product ID 2064965 confirmed, but technical documentation is region-locked.
*   **MDT SCN-MBGW.01**: Verified as correct Modbus Gateway; need to confirm specific firmware features for AI PM2.5 interlock.

---

## **Section 15: Deferred Lighting & Aesthetic Specification (TBD)**
*Items to be finalized in Phase 1B / Interior Finish Phase.*

| Area | Lighting Type | Control | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Main Garage** | High-Lumen LED Tape | DALI-2 (via LCP-1) | **Deferred** | Driven by SDR-480-24 in LCP-1. |
| **Dining / Entry** | Decorative Pendants | DALI-2 Relay/Puck | **TBD** | Requires 2-1/8" deep J-Boxes. |
| **Bath Vanities** | Task Sconces | DALI-2 Relay/Puck | **TBD** | Fixture selection pending. |
| **Outdoor Walls** | Architectural Sconces | DALI-2 Relay/Puck | **TBD** | Aesthetic match for Akuvox entry stations. |
